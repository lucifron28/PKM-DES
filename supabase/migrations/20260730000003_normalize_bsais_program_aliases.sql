-- Transactional program normalization migration for BSAIS aliases
do $$
declare
  v_canonical_id uuid;
  v_alias_ids uuid[];
begin
  -- 1. Locate or create canonical BSAIS program
  select id into v_canonical_id
  from public.programs
  where trim(upper(code)) = 'BSAIS'
     or trim(upper(name)) in ('BACHELOR OF SCIENCE IN ACCOUNTING INFORMATION SYSTEMS', 'ACCOUNTING INFORMATION SYSTEM')
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

  -- 2. Identify all alias program IDs matching AIS or BSAIS (case-insensitive & whitespace trimmed)
  select array_agg(id) into v_alias_ids
  from public.programs
  where (trim(upper(code)) in ('AIS', 'BSAIS')
     or trim(upper(name)) in ('AIS', 'BSAIS', 'ACCOUNTING INFORMATION SYSTEM', 'BACHELOR OF SCIENCE IN ACCOUNTING INFORMATION SYSTEMS'))
    and id <> v_canonical_id;

  if v_alias_ids is not null and array_length(v_alias_ids, 1) > 0 then
    -- 3. Safely repoint foreign keys to v_canonical_id
    update public.students
    set program_id = v_canonical_id
    where program_id = any(v_alias_ids);

    update public.official_student_records
    set program_id = v_canonical_id
    where program_id = any(v_alias_ids);

    update public.enrollments
    set program_id = v_canonical_id
    where program_id = any(v_alias_ids);

    -- 4. Repoint subjects and handle any collisions
    update public.subjects
    set program_id = v_canonical_id
    where program_id = any(v_alias_ids);

    -- 5. Repoint course_offerings and handle unique constraint collisions
    delete from public.course_offerings co_alias
    where co_alias.program_id = any(v_alias_ids)
      and exists (
        select 1 from public.course_offerings co_canonical
        where co_canonical.program_id = v_canonical_id
          and co_canonical.academic_year = co_alias.academic_year
          and co_canonical.semester = co_alias.semester
          and co_canonical.year_level = co_alias.year_level
          and co_canonical.course_code = co_alias.course_code
      );

    update public.course_offerings
    set program_id = v_canonical_id
    where program_id = any(v_alias_ids);

    -- 6. Delete repointed duplicate program rows
    delete from public.programs
    where id = any(v_alias_ids);
  end if;
end $$;
