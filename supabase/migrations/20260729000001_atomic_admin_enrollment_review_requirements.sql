-- Update review_pending_enrollment to enforce requirement verification (e.g., Health Record Update)

create or replace function public.review_pending_enrollment(
  p_enrollment_id uuid,
  p_decision text,
  p_remarks text
)
returns table (
  outcome text,
  enrollment_id uuid,
  review_status text,
  student_enrollment_status text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_enrollment public.enrollments%rowtype;
  v_student public.students%rowtype;
  v_remarks text;
  v_student_status text;
begin
  if auth.uid() is null or not private.is_admin() then
    return query select 'unauthorized'::text, null::uuid, null::text, null::text;
    return;
  end if;

  if p_enrollment_id is null
    or p_decision is null
    or p_decision not in ('APPROVED', 'REJECTED') then
    return query select 'invalid_request'::text, null::uuid, null::text, null::text;
    return;
  end if;

  select *
  into v_enrollment
  from public.enrollments
  where id = p_enrollment_id
  for update;

  if not found then
    return query select 'not_found'::text, null::uuid, null::text, null::text;
    return;
  end if;

  if v_enrollment.status <> 'PENDING' then
    return query select 'already_reviewed'::text, v_enrollment.id, v_enrollment.status, null::text;
    return;
  end if;

  select *
  into v_student
  from public.students
  where id = v_enrollment.student_id
  for update;

  if not found then
    return query select 'invalid_request'::text, null::uuid, null::text, null::text;
    return;
  end if;

  -- Gate approval on requirement verification
  if p_decision = 'APPROVED' then
    if v_student.year_level = '1st Year' or v_student.student_type = 'Incoming 1st Year Student' then
      if not exists (
        select 1
        from public.student_requirements sr
        where sr.student_id = v_student.id
          and sr.requirement_code = 'HEALTH_RECORD_UPDATE'
          and sr.status = 'VERIFIED'
      ) then
        return query select 'unverified_requirements'::text, v_enrollment.id, v_enrollment.status, null::text;
        return;
      end if;
    end if;
  end if;

  v_remarks := case
    when p_decision = 'REJECTED' then nullif(btrim(coalesce(p_remarks, '')), '')
    else null
  end;

  update public.enrollments
  set
    status = p_decision,
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    remarks = v_remarks
  where id = v_enrollment.id;

  select case
    when exists (
      select 1
      from public.enrollments e
      where e.student_id = v_student.id
        and e.status = 'APPROVED'
    ) then 'ENROLLED'
    when exists (
      select 1
      from public.enrollments e
      where e.student_id = v_student.id
        and e.status = 'PENDING'
    ) then 'PENDING'
    else 'NOT ENROLLED'
  end
  into v_student_status;

  update public.students
  set enrollment_status = v_student_status
  where id = v_student.id;

  insert into public.audit_logs (
    actor_profile_id,
    action,
    target_table,
    target_id
  )
  values (
    auth.uid(),
    case when p_decision = 'APPROVED' then 'APPROVE_ENROLLMENT' else 'REJECT_ENROLLMENT' end,
    'enrollments',
    v_enrollment.id
  );

  return query select
    lower(p_decision),
    v_enrollment.id,
    p_decision,
    v_student_status;
end;
$$;
