-- Forward-only collision-safe migration for BSAIS program aliases.
-- Supersedes and repairs collision vulnerabilities in 20260730000003.

do $$
declare
  v_canonical_id uuid;
  v_alias_ids uuid[];
  v_rec record;
begin
  -- 1. Locate or create canonical BSAIS program
  select id into v_canonical_id
  from public.programs
  where trim(upper(code)) = 'BSAIS'
     or trim(upper(name)) in (
       'BACHELOR OF SCIENCE IN ACCOUNTING INFORMATION SYSTEMS',
       'BACHELOR OF SCIENCE IN ACCOUNTING INFORMATION SYSTEM',
       'ACCOUNTING INFORMATION SYSTEM',
       'ACCOUNTING INFORMATION SYSTEMS'
     )
  order by (case when trim(upper(code)) = 'BSAIS' then 1 else 2 end)
  limit 1;

  if v_canonical_id is null then
    insert into public.programs (name, code)
    values ('Bachelor of Science in Accounting Information Systems', 'BSAIS')
    returning id into v_canonical_id;
  else
    update public.programs
    set name = 'Bachelor of Science in Accounting Information Systems',
        code = 'BSAIS'
    where id = v_canonical_id;
  end if;

  -- 2. Identify all alias program IDs matching AIS or BSAIS (case-insensitive & trimmed)
  select array_agg(id) into v_alias_ids
  from public.programs
  where (
      trim(upper(code)) in ('AIS', 'BSAIS')
      or trim(upper(name)) in (
        'AIS',
        'BSAIS',
        'ACCOUNTING INFORMATION SYSTEM',
        'ACCOUNTING INFORMATION SYSTEMS',
        'BACHELOR OF SCIENCE IN ACCOUNTING INFORMATION SYSTEM',
        'BACHELOR OF SCIENCE IN ACCOUNTING INFORMATION SYSTEMS'
      )
    )
    and id <> v_canonical_id;

  if v_alias_ids is not null and array_length(v_alias_ids, 1) > 0 then

    -- 3. Safely repoint foreign keys for students, official_student_records, and enrollments
    update public.students
    set program_id = v_canonical_id
    where program_id = any(v_alias_ids);

    update public.official_student_records
    set program_id = v_canonical_id
    where program_id = any(v_alias_ids);

    update public.enrollments
    set program_id = v_canonical_id
    where program_id = any(v_alias_ids);

    -- 4. Deduplicate subjects before repointing to avoid unique constraint collisions on
    --    (program_id, course_code, year_level, semester).
    --    For each subject under an alias program:
    --    If a matching subject exists under v_canonical_id, repoint any enrollment_subjects to canonical and delete alias subject.
    for v_rec in
      select s_alias.id as alias_subject_id, s_canonical.id as canonical_subject_id
      from public.subjects s_alias
      join public.subjects s_canonical
        on s_canonical.program_id = v_canonical_id
       and s_canonical.course_code = s_alias.course_code
       and s_canonical.year_level = s_alias.year_level
       and s_canonical.semester = s_alias.semester
      where s_alias.program_id = any(v_alias_ids)
    loop
      update public.enrollment_subjects
      set subject_id = v_rec.canonical_subject_id
      where subject_id = v_rec.alias_subject_id;

      delete from public.subjects
      where id = v_rec.alias_subject_id;
    end loop;

    -- Repoint remaining non-colliding subjects to v_canonical_id
    update public.subjects
    set program_id = v_canonical_id
    where program_id = any(v_alias_ids);

    -- 5. Deduplicate course_offerings using full uniqueness key definition:
    --    (program_id, academic_year, semester, year_level, course_code, course_description, units, source_document).
    --    Delete alias course_offerings ONLY where an exact duplicate already exists under v_canonical_id.
    delete from public.course_offerings co_alias
    where co_alias.program_id = any(v_alias_ids)
      and exists (
        select 1 from public.course_offerings co_canonical
        where co_canonical.program_id = v_canonical_id
          and co_canonical.academic_year = co_alias.academic_year
          and co_canonical.semester = co_alias.semester
          and co_canonical.year_level = co_alias.year_level
          and co_canonical.course_code = co_alias.course_code
          and co_canonical.course_description = co_alias.course_description
          and co_canonical.units = co_alias.units
          and co_canonical.source_document = co_alias.source_document
      );

    -- Repoint distinct course_offerings to v_canonical_id
    update public.course_offerings
    set program_id = v_canonical_id
    where program_id = any(v_alias_ids);

    -- 6. Delete repointed duplicate program rows
    delete from public.programs
    where id = any(v_alias_ids);

  end if;
end $$;
