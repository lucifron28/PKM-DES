-- Forward-only collision-safe migration for BSAIS program aliases.
-- Supersedes and repairs collision vulnerabilities in 20260730000003.

-- Define a private normalization function so test fixtures can reuse the same logic.
create or replace function private.normalize_bsais_programs()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_canonical_id uuid;
  v_alias_ids uuid[];
  v_rec record;
  v_subject_found boolean;
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

  -- 2. Identify all alias program IDs (case-insensitive & whitespace trimmed)
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

    -- 3. Repoint foreign keys for students, official_student_records, enrollments
    update public.students set program_id = v_canonical_id where program_id = any(v_alias_ids);
    update public.official_student_records set program_id = v_canonical_id where program_id = any(v_alias_ids);
    update public.enrollments set program_id = v_canonical_id where program_id = any(v_alias_ids);

    -- 4. Deduplicate subjects by (course_code, year_level, semester).
    --    For each alias subject that has an exact match under the canonical program,
    --    repoint ALL dependent references (enrollment_subjects, grades, class_schedules)
    --    to the canonical subject, then delete the alias subject.
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
      -- Handle enrollment_subjects uniqueness: if the same enrollment already references
      -- the canonical subject, delete the alias row (safe because on delete cascade is on enrollment_subjects FK).
      delete from public.enrollment_subjects
      where subject_id = v_rec.alias_subject_id
        and enrollment_id in (
          select es.enrollment_id
          from public.enrollment_subjects es
          where es.subject_id = v_rec.canonical_subject_id
        );

      update public.enrollment_subjects
      set subject_id = v_rec.canonical_subject_id
      where subject_id = v_rec.alias_subject_id;

      -- Handle grades uniqueness constraint (student_id, subject_id).
      -- Merge: keep the better (lower numeric) grade from alias subjects,
      -- then repoint remaining alias-only grades to the canonical subject.
      update public.grades
      set grade = least(grades.grade, alias_grade.grade)
      from public.grades alias_grade
      where grades.subject_id = v_rec.canonical_subject_id
        and grades.student_id = alias_grade.student_id
        and alias_grade.subject_id = v_rec.alias_subject_id;

      delete from public.grades
      where subject_id = v_rec.alias_subject_id
        and student_id in (
          select g.student_id
          from public.grades g
          where g.subject_id = v_rec.canonical_subject_id
        );

      update public.grades
      set subject_id = v_rec.canonical_subject_id
      where subject_id = v_rec.alias_subject_id;

      -- Repoint class_schedules
      update public.class_schedules
      set subject_id = v_rec.canonical_subject_id
      where subject_id = v_rec.alias_subject_id;

      delete from public.subjects where id = v_rec.alias_subject_id;
    end loop;

    -- 4b. Handle alias-vs-alias subject collisions (same course_code/year_level/semester
    --     across different alias programs, where no canonical subject exists yet).
    --     Pick the lowest UUID to keep, repoint references to it, delete duplicates.
    for v_rec in
      select s1.id as keep_id, s2.id as remove_id
      from public.subjects s1
      join public.subjects s2
        on s2.course_code = s1.course_code
       and s2.year_level = s1.year_level
       and s2.semester = s1.semester
       and s2.program_id = any(v_alias_ids)
       and s1.program_id = any(v_alias_ids)
       and s2.id > s1.id
    loop
      select count(*) into v_subject_found
      from public.subjects
      where program_id = v_canonical_id
        and course_code = (select course_code from public.subjects where id = v_rec.keep_id)
        and year_level = (select year_level from public.subjects where id = v_rec.keep_id)
        and semester = (select semester from public.subjects where id = v_rec.keep_id);

      if not v_subject_found then
        delete from public.enrollment_subjects
        where subject_id = v_rec.remove_id
          and enrollment_id in (
            select es.enrollment_id
            from public.enrollment_subjects es
            where es.subject_id = v_rec.keep_id
          );

        update public.enrollment_subjects
        set subject_id = v_rec.keep_id
        where subject_id = v_rec.remove_id;

        -- Merge grades: keep the better (lower numeric) grade, then repoint.
        update public.grades
        set grade = least(grades.grade, alias_grade.grade)
        from public.grades alias_grade
        where grades.subject_id = v_rec.keep_id
          and grades.student_id = alias_grade.student_id
          and alias_grade.subject_id = v_rec.remove_id;

        delete from public.grades
        where subject_id = v_rec.remove_id
          and student_id in (
            select g.student_id
            from public.grades g
            where g.subject_id = v_rec.keep_id
          );

        update public.grades
        set subject_id = v_rec.keep_id
        where subject_id = v_rec.remove_id;

        update public.class_schedules
        set subject_id = v_rec.keep_id
        where subject_id = v_rec.remove_id;

        delete from public.subjects where id = v_rec.remove_id;
      end if;
    end loop;

    -- Repoint remaining non-colliding subjects to v_canonical_id
    update public.subjects
    set program_id = v_canonical_id
    where program_id = any(v_alias_ids);

    -- 5. Course-offerings deduplication using complete unique key.
    --    Remove duplicates across ALL aliases (not only those matching canonical).
    delete from public.course_offerings co_remove
    where co_remove.program_id = any(v_alias_ids)
      and exists (
        select 1 from public.course_offerings co_keep
        where co_keep.id <> co_remove.id
          and (
            (co_keep.program_id = v_canonical_id and co_keep.academic_year = co_remove.academic_year and co_keep.semester = co_remove.semester and co_keep.year_level = co_remove.year_level and co_keep.course_code = co_remove.course_code and co_keep.course_description = co_remove.course_description and co_keep.units = co_remove.units and co_keep.source_document = co_remove.source_document)
            or
            (co_keep.program_id = any(v_alias_ids) and co_keep.program_id <> co_remove.program_id and co_keep.id < co_remove.id and co_keep.academic_year = co_remove.academic_year and co_keep.semester = co_remove.semester and co_keep.year_level = co_remove.year_level and co_keep.course_code = co_remove.course_code and co_keep.course_description = co_remove.course_description and co_keep.units = co_remove.units and co_keep.source_document = co_remove.source_document)
          )
      );

    -- Repoint distinct course_offerings to v_canonical_id
    update public.course_offerings
    set program_id = v_canonical_id
    where program_id = any(v_alias_ids);

    -- 6. Delete repointed duplicate program rows
    delete from public.programs
    where id = any(v_alias_ids);

  end if;
end;
$$;

-- Execute the normalization
select private.normalize_bsais_programs();

-- Revoke execute from public roles; admins can still run via migration context
revoke all on function private.normalize_bsais_programs() from public, anon, authenticated;
