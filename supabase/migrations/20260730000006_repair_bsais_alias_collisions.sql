-- Forward-only collision-safe migration for BSAIS program aliases.
-- Supersedes and repairs collision vulnerabilities in 20260730000003.

create or replace function private.normalize_bsais_programs()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_canonical_id uuid;
  v_alias_ids uuid[];
  v_target_ids uuid[];
  v_subject record;
  v_grade record;
begin
  -- Prefer an exact canonical code, then increasingly normalized candidates.
  -- The final UUID tie-breaker keeps selection deterministic.
  select p.id
  into v_canonical_id
  from public.programs p
  where p.code = 'BSAIS'
     or lower(p.code) = 'bsais'
     or trim(lower(p.code)) = 'bsais'
     or trim(upper(p.name)) in (
       'BACHELOR OF SCIENCE IN ACCOUNTING INFORMATION SYSTEMS',
       'BACHELOR OF SCIENCE IN ACCOUNTING INFORMATION SYSTEM',
       'ACCOUNTING INFORMATION SYSTEM',
       'ACCOUNTING INFORMATION SYSTEMS'
     )
     or trim(upper(p.code)) = 'AIS'
     or trim(upper(p.name)) = 'AIS'
  order by case
    when p.code = 'BSAIS' then 1
    when lower(p.code) = 'bsais' then 2
    when trim(lower(p.code)) = 'bsais' then 3
    when trim(upper(p.name)) in (
      'BACHELOR OF SCIENCE IN ACCOUNTING INFORMATION SYSTEMS',
      'BACHELOR OF SCIENCE IN ACCOUNTING INFORMATION SYSTEM',
      'ACCOUNTING INFORMATION SYSTEM',
      'ACCOUNTING INFORMATION SYSTEMS'
    ) then 4
    when trim(upper(p.code)) = 'AIS' or trim(upper(p.name)) = 'AIS' then 5
    else 6
  end,
  p.id
  limit 1;

  if v_canonical_id is null then
    insert into public.programs (name, code)
    values ('Bachelor of Science in Accounting Information Systems', 'BSAIS')
    returning id into v_canonical_id;
  elsif exists (
    select 1
    from public.programs p
    where p.code = 'BSAIS'
      and p.id <> v_canonical_id
  ) then
    raise exception 'BSAIS normalization refused duplicate exact canonical program rows';
  else
    update public.programs
    set name = 'Bachelor of Science in Accounting Information Systems',
        code = 'BSAIS'
    where id = v_canonical_id;
  end if;

  select array_agg(p.id order by p.id)
  into v_alias_ids
  from public.programs p
  where (
      trim(upper(p.code)) in ('AIS', 'BSAIS')
      or trim(upper(p.name)) in (
        'AIS',
        'BSAIS',
        'ACCOUNTING INFORMATION SYSTEM',
        'ACCOUNTING INFORMATION SYSTEMS',
        'BACHELOR OF SCIENCE IN ACCOUNTING INFORMATION SYSTEM',
        'BACHELOR OF SCIENCE IN ACCOUNTING INFORMATION SYSTEMS'
      )
    )
    and p.id <> v_canonical_id;

  v_alias_ids := coalesce(v_alias_ids, array[]::uuid[]);
  v_target_ids := array_append(v_alias_ids, v_canonical_id);

  update public.students
  set program_id = v_canonical_id
  where program_id = any(v_alias_ids);

  update public.official_student_records
  set program_id = v_canonical_id
  where program_id = any(v_alias_ids);

  update public.enrollments
  set program_id = v_canonical_id
  where program_id = any(v_alias_ids);

  -- Build one direct remove_id -> survivor_id map for every subject key.
  -- Canonical-program rows win; otherwise the lowest UUID wins.
  drop table if exists pg_temp.bsais_subject_map;
  create temporary table bsais_subject_map (
    remove_id uuid primary key,
    survivor_id uuid not null
  ) on commit drop;

  insert into bsais_subject_map (remove_id, survivor_id)
  with ranked_subjects as (
    select
      s.id,
      first_value(s.id) over (
        partition by s.course_code, s.year_level, s.semester
        order by case when s.program_id = v_canonical_id then 0 else 1 end, s.id
      ) as survivor_id
    from public.subjects s
    where s.program_id = any(v_target_ids)
  )
  select id, survivor_id
  from ranked_subjects
  where id <> survivor_id;

  -- Validate academic-record conflicts before changing any subject references.
  drop table if exists pg_temp.bsais_grade_merge;
  create temporary table bsais_grade_merge on commit drop as
  select
    g.id as grade_id,
    g.student_id,
    g.subject_id,
    coalesce(m.survivor_id, g.subject_id) as survivor_id,
    g.grade,
    g.remarks,
    g.created_at,
    g.updated_at
  from public.grades g
  left join bsais_subject_map m on m.remove_id = g.subject_id
  where g.subject_id in (
    select survivor_id from bsais_subject_map
    union
    select remove_id from bsais_subject_map
  );

  if exists (
    select 1
    from bsais_grade_merge
    group by student_id, survivor_id
    having count(distinct grade) filter (where grade is not null) > 1
  ) then
    raise exception 'BSAIS normalization refused conflicting academic grades; Registrar resolution is required';
  end if;

  if exists (
    select 1
    from bsais_grade_merge
    group by student_id, survivor_id
    having count(distinct remarks) filter (where remarks is not null) > 1
  ) then
    raise exception 'BSAIS normalization refused conflicting academic remarks; Registrar resolution is required';
  end if;

  for v_subject in
    select remove_id, survivor_id
    from bsais_subject_map
    order by remove_id
  loop
    delete from public.enrollment_subjects removed_enrollment_subject
    where removed_enrollment_subject.subject_id = v_subject.remove_id
      and exists (
        select 1
        from public.enrollment_subjects survivor_enrollment_subject
        where survivor_enrollment_subject.enrollment_id = removed_enrollment_subject.enrollment_id
          and survivor_enrollment_subject.subject_id = v_subject.survivor_id
      );

    update public.enrollment_subjects
    set subject_id = v_subject.survivor_id
    where subject_id = v_subject.remove_id;
  end loop;

  -- Merge compatible duplicate grade rows. Populated values are retained and
  -- created_at preserves the earliest creation time. The existing
  -- set_grades_updated_at trigger assigns the migration transaction timestamp.
  for v_grade in
    select
      student_id,
      survivor_id,
      (array_agg(grade_id order by (subject_id = survivor_id) desc, created_at, grade_id))[1] as keep_grade_id,
      max(grade) filter (where grade is not null) as merged_grade,
      max(remarks) filter (where remarks is not null) as merged_remarks,
      min(created_at) as merged_created_at
    from bsais_grade_merge
    group by student_id, survivor_id
    order by student_id, survivor_id
  loop
    update public.grades
    set subject_id = v_grade.survivor_id,
        grade = v_grade.merged_grade,
        remarks = v_grade.merged_remarks,
        created_at = v_grade.merged_created_at
    where id = v_grade.keep_grade_id;

    delete from public.grades
    where student_id = v_grade.student_id
      and subject_id in (
        select remove_id from bsais_subject_map where survivor_id = v_grade.survivor_id
      )
      and id <> v_grade.keep_grade_id;
  end loop;

  update public.class_schedules schedule
  set subject_id = subject_map.survivor_id
  from bsais_subject_map subject_map
  where schedule.subject_id = subject_map.remove_id;

  delete from public.subjects
  where id in (select remove_id from bsais_subject_map);

  update public.subjects
  set program_id = v_canonical_id
  where program_id = any(v_alias_ids);

  -- Course offerings use their complete source key. Exact duplicates collapse
  -- once; distinct offerings sharing a course code remain distinct.
  drop table if exists pg_temp.bsais_offering_map;
  create temporary table bsais_offering_map (
    remove_id uuid primary key,
    survivor_id uuid not null
  ) on commit drop;

  insert into bsais_offering_map (remove_id, survivor_id)
  with ranked_offerings as (
    select
      co.id,
      first_value(co.id) over (
        partition by co.academic_year, co.semester, co.year_level,
          co.course_code, co.course_description, co.units, co.source_document
        order by case when co.program_id = v_canonical_id then 0 else 1 end, co.id
      ) as survivor_id
    from public.course_offerings co
    where co.program_id = any(v_target_ids)
  )
  select id, survivor_id
  from ranked_offerings
  where id <> survivor_id;

  delete from public.course_offerings
  where id in (select remove_id from bsais_offering_map);

  update public.course_offerings
  set program_id = v_canonical_id
  where program_id = any(v_alias_ids);

  delete from public.programs
  where id = any(v_alias_ids);
end;
$$;

select private.normalize_bsais_programs();

revoke all on function private.normalize_bsais_programs() from public, anon, authenticated;
