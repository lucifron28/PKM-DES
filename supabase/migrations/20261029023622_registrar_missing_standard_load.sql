create or replace function public.registrar_create_irregular_enrollment(
  p_student_id uuid,
  p_course_offering_ids uuid[]
)
returns table (outcome text, enrollment_id uuid, subject_count integer)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_student public.students%rowtype;
  v_academic_year text;
  v_semester text;
  v_enrollment_id uuid;
  v_count integer;
  v_total_units integer;
  v_load_status text;
  v_expected_course_count integer;
  v_expected_total_units integer;
  v_source_document text;
  v_offering_count integer;
  v_offering_total_units integer;
begin
  if auth.uid() is null or not private.has_registrar_access() then
    return query select 'unauthorized'::text, null::uuid, 0;
    return;
  end if;

  if p_student_id is null
    or p_course_offering_ids is null
    or cardinality(p_course_offering_ids) < 1
    or cardinality(p_course_offering_ids) > 100
    or array_position(p_course_offering_ids, null) is not null
    or cardinality(p_course_offering_ids) <> (select count(distinct id) from unnest(p_course_offering_ids) as ids(id)) then
    return query select 'invalid_request'::text, null::uuid, 0;
    return;
  end if;

  select s.* into v_student
  from public.students s
  where s.id = p_student_id
  for update;

  if not found then
    return query select 'student_not_found'::text, null::uuid, 0;
    return;
  end if;

  select et.academic_year, et.semester
  into v_academic_year, v_semester
  from public.enrollment_terms et
  where et.is_active = true
  limit 1;

  if not found or v_academic_year is null or v_semester is null then
    return query select 'term_unavailable'::text, null::uuid, 0;
    return;
  end if;

  perform pg_advisory_xact_lock_shared(hashtextextended('pkm.standard-load-configuration', 0));

  if v_student.student_type not in ('Transferee', 'Irregular Student') then
    if v_student.student_type not in (
      'Incoming 1st Year Student',
      'Old Student',
      'Continuing Student',
      'Regular Student'
    ) then
      return query select 'registrar_managed_load_required'::text, null::uuid, 0;
      return;
    end if;

    select sls.status::text, sls.expected_course_count, sls.expected_total_units, sls.source_document
    into v_load_status, v_expected_course_count, v_expected_total_units, v_source_document
    from public.standard_load_sets sls
    where sls.program_id = v_student.program_id
      and sls.academic_year = v_academic_year
      and sls.semester = v_semester
      and sls.year_level = v_student.year_level;

    if found and v_load_status = 'ACTIVE' and v_expected_course_count > 0 then
      select count(*)::integer, coalesce(sum(co.units), 0)::integer
      into v_offering_count, v_offering_total_units
      from public.course_offerings co
      where co.program_id = v_student.program_id
        and co.academic_year = v_academic_year
        and co.semester = v_semester
        and co.year_level = v_student.year_level
        and co.source_document = v_source_document;

      if v_offering_count = v_expected_course_count
        and v_offering_total_units = v_expected_total_units then
        return query select 'standard_load_available'::text, null::uuid, 0;
        return;
      end if;
    end if;
  end if;

  if exists (
    select 1 from public.enrollments e
    where e.student_id = v_student.id
      and e.academic_year = v_academic_year
      and e.semester = v_semester
  ) then
    return query select 'duplicate'::text, null::uuid, 0;
    return;
  end if;

  select count(*)::integer, coalesce(sum(co.units), 0)::integer
  into v_count, v_total_units
  from public.course_offerings co
  where co.id = any(p_course_offering_ids)
    and co.program_id = v_student.program_id
    and co.academic_year = v_academic_year
    and co.semester = v_semester
    and nullif(btrim(co.course_code), '') is not null
    and nullif(btrim(co.course_description), '') is not null
    and co.units between 1 and 30;

  if v_count <> cardinality(p_course_offering_ids)
    or v_total_units < 1
    or v_total_units > 60
    or exists (
      select 1 from public.course_offerings co
      where co.id = any(p_course_offering_ids)
      group by upper(btrim(co.course_code))
      having count(*) > 1
    ) then
    return query select 'invalid_enrollment_load'::text, null::uuid, 0;
    return;
  end if;

  insert into public.enrollments (
    student_id, program_id, year_level, academic_year, semester, status
  )
  values (
    v_student.id, v_student.program_id, v_student.year_level,
    v_academic_year, v_semester, 'PENDING'
  )
  returning id into v_enrollment_id;

  insert into public.enrollment_subjects (
    enrollment_id, subject_id, course_offering_id,
    course_code, course_description, units
  )
  select
    v_enrollment_id, null, co.id,
    co.course_code, co.course_description, co.units
  from public.course_offerings co
  where co.id = any(p_course_offering_ids);

  perform private.reconcile_health_requirement_for_student(v_student.id);
  perform private.sync_student_enrollment_status(v_student.id);
  insert into public.audit_logs (actor_profile_id, action, target_table, target_id)
  values (auth.uid(), 'CREATE_IRREGULAR_ENROLLMENT', 'enrollments', v_enrollment_id);

  return query select 'created'::text, v_enrollment_id, v_count;
end;
$$;

revoke all on function public.registrar_create_irregular_enrollment(uuid, uuid[]) from public, anon;
grant execute on function public.registrar_create_irregular_enrollment(uuid, uuid[]) to authenticated;
