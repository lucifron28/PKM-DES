-- Forward-only migration to establish explicit authorization boundaries
-- between Registrar/Admin, Official Staff, and Students.
--
-- 1. Registrar/Admin: An active admin with no active official role assignments.
--    Authoritatively manages enrollments, official role assignments, student
--    records, catalog items, and notification outbox items.
-- 2. Official Staff: An active admin with one or more active role assignments
--    (LIBRARIAN, NURSE, PROGRAM_CHAIR, ACCOUNTANT, DEAN). Access is strictly
--    scoped to their assigned clearance role and authorized programs.
-- 3. Student: Restricted to their own authorized records.

-- ============================================================================
-- 1. Helper Functions in private schema
-- ============================================================================

-- Returns true if the authenticated user is an active Registrar/Admin
create or replace function private.is_registrar()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.account_status = 'ACTIVE'
      and not exists (
        select 1
        from public.official_role_assignments a
        where a.profile_id = p.id
          and a.active = true
      )
  );
$$;

revoke all on function private.is_registrar() from public;
grant execute on function private.is_registrar() to authenticated;

-- Returns true if the authenticated user has ANY active official role for the program
create or replace function private.has_any_official_role_for_program(p_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    join public.official_role_assignments a on a.profile_id = p.id
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.account_status = 'ACTIVE'
      and a.active = true
      and (a.program_id is null or a.program_id = p_program_id)
  );
$$;

revoke all on function private.has_any_official_role_for_program(uuid) from public;
grant execute on function private.has_any_official_role_for_program(uuid) to authenticated;

-- Returns true if the authenticated user is the student owner of the enrollment
create or replace function private.is_student_enrollment_owner(p_enrollment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.enrollments e
    join public.students s on s.id = e.student_id
    where e.id = p_enrollment_id
      and s.profile_id = auth.uid()
  );
$$;

revoke all on function private.is_student_enrollment_owner(uuid) from public;
grant execute on function private.is_student_enrollment_owner(uuid) to authenticated;

-- Returns true if the authenticated student owns the student record
create or replace function private.is_student_owner(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.students s
    where s.id = p_student_id
      and s.profile_id = auth.uid()
  );
$$;

revoke all on function private.is_student_owner(uuid) from public;
grant execute on function private.is_student_owner(uuid) to authenticated;

-- Returns true if the authenticated staff member is authorized for the student's program
create or replace function private.staff_can_access_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.enrollments e
    where e.student_id = p_student_id
      and private.has_any_official_role_for_program(e.program_id)
  );
$$;

revoke all on function private.staff_can_access_student(uuid) from public;
grant execute on function private.staff_can_access_student(uuid) to authenticated;

-- Returns true if the authenticated student owns the official student record
create or replace function private.student_owns_official_record(p_record_id uuid, p_student_id_number text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.students s
    where (
      s.official_record_id = p_record_id
      or (
        s.official_record_id is null
        and s.student_id_number is not null
        and s.student_id_number <> ''
        and s.student_id_number = p_student_id_number
      )
    )
    and s.profile_id = auth.uid()
  );
$$;

revoke all on function private.student_owns_official_record(uuid, text) from public;
grant execute on function private.student_owns_official_record(uuid, text) to authenticated;

-- Returns true if the authenticated staff member can access the official student record
create or replace function private.staff_can_access_official_student_record(p_record_id uuid, p_student_id_number text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.students s
    join public.enrollments e on e.student_id = s.id
    where (
      s.official_record_id = p_record_id
      or (
        s.official_record_id is null
        and s.student_id_number is not null
        and s.student_id_number <> ''
        and s.student_id_number = p_student_id_number
      )
    )
    and private.has_any_official_role_for_program(e.program_id)
  );
$$;

revoke all on function private.staff_can_access_official_student_record(uuid, text) from public;
grant execute on function private.staff_can_access_official_student_record(uuid, text) to authenticated;

-- Returns true if the authenticated staff member can access the student's profile
create or replace function private.staff_can_access_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.students s
    join public.enrollments e on e.student_id = s.id
    where s.profile_id = p_profile_id
      and private.has_any_official_role_for_program(e.program_id)
  );
$$;

revoke all on function private.staff_can_access_profile(uuid) from public;
grant execute on function private.staff_can_access_profile(uuid) to authenticated;

-- Returns true if the authenticated Nurse can access the student requirement
create or replace function private.nurse_can_access_student_requirement(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.enrollments e
    where e.student_id = p_student_id
      and private.has_official_role_for_program('NURSE', e.program_id)
  );
$$;

revoke all on function private.nurse_can_access_student_requirement(uuid) from public;
grant execute on function private.nurse_can_access_student_requirement(uuid) to authenticated;

-- ============================================================================
-- 2. Official Signer Management RPC (Registrar Only)
-- ============================================================================

create or replace function public.set_official_role_assignment(
  p_profile_id uuid,
  p_official_role text,
  p_active boolean,
  p_program_id uuid default null
)
returns table (outcome text, assignment_id uuid, active boolean)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_target public.profiles%rowtype;
  v_assignment public.official_role_assignments%rowtype;
begin
  if auth.uid() is null or not private.is_registrar() then
    return query select 'unauthorized'::text, null::uuid, null::boolean;
    return;
  end if;

  if p_profile_id is null
    or p_official_role is null
    or p_official_role not in ('LIBRARIAN', 'NURSE', 'PROGRAM_CHAIR', 'ACCOUNTANT', 'DEAN')
    or p_active is null then
    return query select 'invalid_request'::text, null::uuid, null::boolean;
    return;
  end if;

  if p_profile_id = auth.uid() then
    return query select 'self_assignment_forbidden'::text, null::uuid, null::boolean;
    return;
  end if;

  select *
  into v_target
  from public.profiles
  where id = p_profile_id;

  if not found or v_target.role <> 'admin' then
    return query select 'target_not_admin'::text, null::uuid, null::boolean;
    return;
  end if;

  if p_active and v_target.account_status <> 'ACTIVE' then
    return query select 'target_not_active'::text, null::uuid, null::boolean;
    return;
  end if;

  if p_program_id is not null
    and not exists (select 1 from public.programs where id = p_program_id) then
    return query select 'invalid_program'::text, null::uuid, null::boolean;
    return;
  end if;

  select *
  into v_assignment
  from public.official_role_assignments
  where profile_id = p_profile_id
    and official_role = p_official_role
    and program_id is not distinct from p_program_id
  for update;

  if not found then
    if not p_active then
      return query select 'not_found'::text, null::uuid, null::boolean;
      return;
    end if;

    insert into public.official_role_assignments (profile_id, official_role, program_id, active)
    values (p_profile_id, p_official_role, p_program_id, true)
    returning * into v_assignment;

    insert into public.audit_logs (actor_profile_id, action, target_table, target_id)
    values (auth.uid(), 'ASSIGN_OFFICIAL_SIGNING_ROLE', 'official_role_assignments', v_assignment.id);

    return query select 'assigned'::text, v_assignment.id, true;
    return;
  end if;

  if v_assignment.active = p_active then
    return query select 'unchanged'::text, v_assignment.id, v_assignment.active;
    return;
  end if;

  update public.official_role_assignments
  set active = p_active,
      updated_at = now()
  where id = v_assignment.id
  returning * into v_assignment;

  insert into public.audit_logs (actor_profile_id, action, target_table, target_id)
  values (
    auth.uid(),
    case when p_active then 'ASSIGN_OFFICIAL_SIGNING_ROLE' else 'REVOKE_OFFICIAL_SIGNING_ROLE' end,
    'official_role_assignments',
    v_assignment.id
  );

  return query select (case when p_active then 'assigned' else 'revoked' end)::text, v_assignment.id, v_assignment.active;
exception
  when unique_violation then
    return query select 'conflict'::text, null::uuid, null::boolean;
end;
$$;

revoke all on function public.set_official_role_assignment(uuid, text, boolean, uuid) from public;
revoke execute on function public.set_official_role_assignment(uuid, text, boolean, uuid) from anon;
grant execute on function public.set_official_role_assignment(uuid, text, boolean, uuid) to authenticated;

-- ============================================================================
-- 3. Review Pending Enrollment RPC (Registrar Only)
-- ============================================================================

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
  v_subject_count integer;
  v_invalid_subject_count integer;
  v_total_units numeric;
  v_recipient_email text;
begin
  if auth.uid() is null or not private.is_registrar() then
    return query select 'unauthorized'::text, null::uuid, null::text, null::text;
    return;
  end if;

  if p_enrollment_id is null
    or p_decision is null
    or p_decision not in ('APPROVED', 'REJECTED') then
    return query select 'invalid_request'::text, null::uuid, null::text, null::text;
    return;
  end if;

  select * into v_enrollment
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

  select * into v_student
  from public.students
  where id = v_enrollment.student_id
  for update;

  if not found then
    return query select 'invalid_request'::text, null::uuid, null::text, null::text;
    return;
  end if;

  if p_decision = 'APPROVED' then
    select
      count(*)::integer,
      count(*) filter (
        where nullif(btrim(es.course_code), '') is null
           or nullif(btrim(es.course_description), '') is null
           or es.units is null
           or es.units < 0
      )::integer,
      coalesce(sum(es.units), 0)::numeric
    into v_subject_count, v_invalid_subject_count, v_total_units
    from public.enrollment_subjects es
    where es.enrollment_id = v_enrollment.id;

    if v_subject_count < 1
      or v_invalid_subject_count > 0
      or v_total_units <= 0 then
      return query select 'invalid_enrollment_load'::text, v_enrollment.id, v_enrollment.status, null::text;
      return;
    end if;

    if not private.enrollment_required_clearances_are_current(v_enrollment.id) then
      return query select 'incomplete_clearances'::text, v_enrollment.id, v_enrollment.status, null::text;
      return;
    end if;

    v_student_status := 'ENROLLED';
  else
    v_student_status := 'REJECTED';
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
    when exists (select 1 from public.enrollments e where e.student_id = v_student.id and e.status = 'APPROVED') then 'ENROLLED'
    when exists (select 1 from public.enrollments e where e.student_id = v_student.id and e.status = 'PENDING') then 'PENDING'
    else 'NOT ENROLLED'
  end into v_student_status;

  update public.students
  set enrollment_status = v_student_status
  where id = v_student.id;

  insert into public.audit_logs (actor_profile_id, action, target_table, target_id)
  values (
    auth.uid(),
    case when p_decision = 'APPROVED' then 'APPROVE_ENROLLMENT' else 'REJECT_ENROLLMENT' end,
    'enrollments',
    v_enrollment.id
  );

  select btrim(coalesce(p.email, '')) into v_recipient_email
  from public.profiles p
  where p.id = v_student.profile_id;

  insert into public.enrollment_decision_notifications (
    enrollment_id, decision, recipient_email, academic_year, semester,
    status, attempt_count, last_error_code, reserved_at, reservation_token, sent_at
  )
  values (
    v_enrollment.id, p_decision, coalesce(v_recipient_email, ''),
    v_enrollment.academic_year, v_enrollment.semester, 'PENDING', 0,
    null, null, null, null
  )
  on conflict on constraint enrollment_decision_notifications_enrollment_decision_key do nothing;

  return query select lower(p_decision), v_enrollment.id, p_decision, v_student_status;
end;
$$;

revoke all on function public.review_pending_enrollment(uuid, text, text) from public;
revoke execute on function public.review_pending_enrollment(uuid, text, text) from anon;
grant execute on function public.review_pending_enrollment(uuid, text, text) to authenticated;

-- ============================================================================
-- 4. Official Student Record Management RPC (Registrar Only)
-- ============================================================================

create or replace function public.update_official_student_record_and_sync(
  p_record_id uuid,
  p_student_id_number text,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_program_id uuid,
  p_year_level text,
  p_student_type text,
  p_birthdate text default null,
  p_gender_sex text default null,
  p_address text default null,
  p_contact_number text default null,
  p_guardian text default null,
  p_emergency_contact_person text default null,
  p_nationality text default null,
  p_civil_status text default null,
  p_previous_school_information text default null,
  p_admission_status text default null,
  p_enrollment_status text default 'UNENROLLED'
)
returns table (
  outcome text,
  record_id uuid,
  email_mismatch boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller_id uuid;
  v_record record;
  v_student record;
  v_profile record;
  v_clean_student_id text;
  v_clean_email text;
  v_email_mismatch boolean := false;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null or not private.is_registrar() then
    return query select 'unauthorized'::text, p_record_id, false;
    return;
  end if;

  v_clean_student_id := nullif(trim(p_student_id_number), '');
  v_clean_email := lower(trim(p_email));

  select * into v_record
  from public.official_student_records
  where id = p_record_id
  for update;

  if not found then
    return query select 'record_not_found'::text, p_record_id, false;
    return;
  end if;

  if v_clean_student_id is not null then
    if exists (
      select 1 from public.official_student_records
      where id <> p_record_id and trim(student_id_number) = v_clean_student_id
    ) then
      return query select 'student_id_conflict'::text, p_record_id, false;
      return;
    end if;

    if exists (
      select 1 from public.students
      where (official_record_id is null or official_record_id <> p_record_id)
        and trim(student_id_number) = v_clean_student_id
    ) then
      return query select 'student_id_conflict'::text, p_record_id, false;
      return;
    end if;
  end if;

  update public.official_student_records
  set
    student_id_number = v_clean_student_id,
    first_name = trim(p_first_name),
    last_name = trim(p_last_name),
    email = v_clean_email,
    program_id = p_program_id,
    year_level = p_year_level,
    student_type = p_student_type,
    birthdate = case when nullif(trim(p_birthdate), '') is not null then nullif(trim(p_birthdate), '')::date else null end,
    gender_sex = nullif(trim(p_gender_sex), ''),
    address = nullif(trim(p_address), ''),
    contact_number = nullif(trim(p_contact_number), ''),
    guardian = nullif(trim(p_guardian), ''),
    emergency_contact_person = nullif(trim(p_emergency_contact_person), ''),
    nationality = nullif(trim(p_nationality), ''),
    civil_status = nullif(trim(p_civil_status), ''),
    previous_school_information = nullif(trim(p_previous_school_information), ''),
    admission_status = nullif(trim(p_admission_status), ''),
    enrollment_status = p_enrollment_status,
    updated_at = now()
  where id = p_record_id;

  select * into v_student
  from public.students
  where official_record_id = p_record_id
  for update;

  if found then
    select * into v_profile
    from public.profiles
    where id = v_student.profile_id
    for update;

    if found then
      if lower(trim(v_profile.email)) <> v_clean_email then
        v_email_mismatch := true;
      end if;

      update public.profiles
      set
        first_name = trim(p_first_name),
        last_name = trim(p_last_name),
        updated_at = now()
      where id = v_student.profile_id;
    end if;

    update public.students
    set
      program_id = p_program_id,
      year_level = p_year_level,
      student_type = p_student_type,
      student_id_number = v_clean_student_id,
      updated_at = now()
    where id = v_student.id;

    perform private.reconcile_health_requirement_for_student(v_student.id);
  end if;

  return query select 'updated'::text, p_record_id, v_email_mismatch;
end;
$$;

revoke all on function public.update_official_student_record_and_sync from public;
revoke execute on function public.update_official_student_record_and_sync from anon;
grant execute on function public.update_official_student_record_and_sync to authenticated;

-- ============================================================================
-- 5. Student Profile Claim RPC (Registrar Only for Third-Party Claim)
-- ============================================================================

create or replace function public.claim_student_profile(
  p_student_id uuid,
  p_profile_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_target_student record;
  v_existing_claim record;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    return jsonb_build_object('success', false, 'error', 'unauthenticated');
  end if;

  if v_caller_id != p_profile_id and not private.is_registrar() then
    return jsonb_build_object('success', false, 'error', 'forbidden');
  end if;

  select * into v_target_student
  from public.students
  where id = p_student_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'student_not_found');
  end if;

  if v_target_student.profile_id is not null and v_target_student.profile_id != p_profile_id then
    return jsonb_build_object('success', false, 'error', 'already_claimed');
  end if;

  select * into v_existing_claim
  from public.students
  where profile_id = p_profile_id
    and id != p_student_id;

  if found then
    return jsonb_build_object('success', false, 'error', 'profile_already_linked');
  end if;

  update public.students
  set profile_id = p_profile_id,
      updated_at = now()
  where id = p_student_id;

  return jsonb_build_object('success', true);
end;
$$;

-- ============================================================================
-- 6. Enrollment Decision Notification Outbox RPCs (Registrar Only)
-- ============================================================================

create or replace function public.claim_next_enrollment_decision_notification()
returns table (
  notification_id uuid,
  enrollment_id uuid,
  student_id uuid,
  recipient_email text,
  student_first_name text,
  decision text,
  academic_year text,
  semester text,
  claim_token uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_notification public.enrollment_decision_notifications%rowtype;
  v_student_id uuid;
  v_first_name text;
  v_token uuid;
begin
  if auth.uid() is null or not private.is_registrar() then
    return query select 'unauthorized'::text, null::uuid, null::uuid, null::text, null::text, null::text, null::text, null::text, null::uuid;
    return;
  end if;

  select n.*
  into v_notification
  from public.enrollment_decision_notifications n
  where n.status in ('PENDING', 'FAILED')
  order by n.created_at
  limit 1
  for update skip locked;

  if not found then
    return;
  end if;

  v_token := gen_random_uuid();

  update public.enrollment_decision_notifications n
  set
    status = 'SENDING',
    attempt_count = n.attempt_count + 1,
    claim_token = v_token,
    updated_at = now()
  where n.id = v_notification.id;

  select s.id, p.first_name
  into v_student_id, v_first_name
  from public.enrollments e
  join public.students s on s.id = e.student_id
  join public.profiles p on p.id = s.profile_id
  where e.id = v_notification.enrollment_id;

  return query select
    v_notification.id,
    v_notification.enrollment_id,
    v_student_id,
    v_notification.recipient_email,
    coalesce(v_first_name, 'Student'),
    v_notification.decision,
    v_notification.academic_year,
    v_notification.semester,
    v_token;
end;
$$;

create or replace function public.retry_enrollment_decision_notification(
  p_enrollment_id uuid,
  p_decision text
)
returns table (
  outcome text,
  notification_id uuid,
  enrollment_id uuid,
  decision text,
  recipient_email text,
  student_first_name text,
  academic_year text,
  semester text,
  claim_token uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_notification public.enrollment_decision_notifications%rowtype;
  v_first_name text;
  v_token uuid;
  v_existing_status text;
begin
  if auth.uid() is null or not private.is_registrar() then
    return query select 'unauthorized'::text, null::uuid, null::uuid, null::text, null::text, null::text, null::text, null::text, null::uuid;
    return;
  end if;

  if p_enrollment_id is null or p_decision is null or p_decision not in ('APPROVED', 'REJECTED') then
    return query select 'invalid_request'::text, null::uuid, null::uuid, null::text, null::text, null::text, null::text, null::text, null::uuid;
    return;
  end if;

  select n.*
  into v_notification
  from public.enrollment_decision_notifications n
  where n.enrollment_id = p_enrollment_id
    and n.decision = p_decision
    and n.status in ('PENDING', 'FAILED')
  order by n.created_at
  limit 1
  for update skip locked;

  if not found then
    select n.status into v_existing_status
    from public.enrollment_decision_notifications n
    where n.enrollment_id = p_enrollment_id
      and n.decision = p_decision;

    if v_existing_status = 'SENT' then
      return query select 'already_sent'::text, null::uuid, p_enrollment_id, p_decision, null::text, null::text, null::text, null::text, null::uuid;
      return;
    end if;

    if v_existing_status = 'SENDING' then
      return query select 'in_progress'::text, null::uuid, p_enrollment_id, p_decision, null::text, null::text, null::text, null::text, null::uuid;
      return;
    end if;

    return query select 'not_found'::text, null::uuid, p_enrollment_id, p_decision, null::text, null::text, null::text, null::text, null::uuid;
    return;
  end if;

  v_token := gen_random_uuid();

  update public.enrollment_decision_notifications n
  set
    status = 'SENDING',
    attempt_count = n.attempt_count + 1,
    claim_token = v_token,
    updated_at = now()
  where n.id = v_notification.id;

  select p.first_name
  into v_first_name
  from public.enrollments e
  join public.students s on s.id = e.student_id
  join public.profiles p on p.id = s.profile_id
  where e.id = v_notification.enrollment_id;

  return query select
    'claimed'::text,
    v_notification.id,
    v_notification.enrollment_id,
    v_notification.decision,
    v_notification.recipient_email,
    coalesce(v_first_name, 'Student'),
    v_notification.academic_year,
    v_notification.semester,
    v_token;
end;
$$;

create or replace function public.mark_enrollment_notification_delivered(
  p_notification_id uuid,
  p_claim_token uuid
)
returns table (outcome text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_updated integer;
begin
  if auth.uid() is null or not private.is_registrar() then
    return query select 'unauthorized'::text;
    return;
  end if;

  if p_notification_id is null or p_claim_token is null then
    return query select 'invalid_request'::text;
    return;
  end if;

  update public.enrollment_decision_notifications
  set
    status = 'SENT',
    sent_at = now(),
    claim_token = null,
    error_message = null,
    updated_at = now()
  where id = p_notification_id
    and claim_token = p_claim_token
    and status = 'SENDING';

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    return query select 'token_mismatch'::text;
    return;
  end if;

  return query select 'delivered'::text;
end;
$$;

create or replace function public.mark_enrollment_notification_failed(
  p_notification_id uuid,
  p_claim_token uuid,
  p_error_message text
)
returns table (outcome text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_updated integer;
begin
  if auth.uid() is null or not private.is_registrar() then
    return query select 'unauthorized'::text;
    return;
  end if;

  if p_notification_id is null or p_claim_token is null then
    return query select 'invalid_request'::text;
    return;
  end if;

  update public.enrollment_decision_notifications
  set
    status = 'FAILED',
    claim_token = null,
    error_message = left(coalesce(p_error_message, 'Unknown error'), 500),
    updated_at = now()
  where id = p_notification_id
    and claim_token = p_claim_token
    and status = 'SENDING';

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    return query select 'token_mismatch'::text;
    return;
  end if;

  return query select 'failed'::text;
end;
$$;

-- ============================================================================
-- 7. Sensitive Profile Protection & Profiles RLS
-- ============================================================================

create or replace function private.protect_profile_sensitive_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    if new.id is distinct from old.id then
      raise exception 'Profile id cannot be modified.';
    end if;
    if new.role is distinct from old.role then
      raise exception 'Profile role cannot be modified directly.';
    end if;
    -- Registrar is authorized to update profile fields (excluding id and role checked above)
    if private.is_registrar() then
      return new;
    end if;
    -- Allow student completing their own account setup (SETUP -> ACTIVE)
    if old.id = auth.uid()
       and old.role = 'student'
       and old.account_status = 'SETUP'
       and new.account_status = 'ACTIVE'
       and new.email = old.email
       and new.first_name = old.first_name
       and new.last_name = old.last_name then
      return new;
    end if;
    raise exception 'Profile modification forbidden.';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_sensitive_fields_trigger on public.profiles;
create trigger protect_profile_sensitive_fields_trigger
before update on public.profiles
for each row execute function private.protect_profile_sensitive_fields();

drop policy if exists "profiles_update_admin" on public.profiles;
drop policy if exists "profiles_update_registrar" on public.profiles;
create policy "profiles_update_registrar"
on public.profiles for update
to authenticated
using (private.is_registrar())
with check (private.is_registrar());

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
drop policy if exists "profiles_select_scoped" on public.profiles;
create policy "profiles_select_scoped"
on public.profiles for select
to authenticated
using (
  id = auth.uid()
  or private.is_registrar()
  or private.staff_can_access_profile(id)
);

-- ============================================================================
-- 8. Official Role Assignments RLS
-- ============================================================================

drop policy if exists "official_role_assignments_select_own_or_admin" on public.official_role_assignments;
drop policy if exists "official_role_assignments_select_scoped" on public.official_role_assignments;
create policy "official_role_assignments_select_scoped"
on public.official_role_assignments for select
to authenticated
using (profile_id = auth.uid() or private.is_registrar());

-- ============================================================================
-- 9. Signature Specimens RLS
-- ============================================================================

drop policy if exists "signature_specimens_select_own_or_admin" on public.signature_specimens;
drop policy if exists "signature_specimens_select_scoped" on public.signature_specimens;
create policy "signature_specimens_select_scoped"
on public.signature_specimens for select
to authenticated
using (profile_id = auth.uid() or private.is_registrar());

-- ============================================================================
-- 10. Official Student Records RLS
-- ============================================================================

drop policy if exists "official_student_records_select_admin" on public.official_student_records;
drop policy if exists "official_student_records_select_scoped" on public.official_student_records;
create policy "official_student_records_select_scoped"
on public.official_student_records for select
to authenticated
using (
  private.is_registrar()
  or private.student_owns_official_record(id, student_id_number)
  or private.staff_can_access_official_student_record(id, student_id_number)
);

drop policy if exists "official_student_records_insert_admin" on public.official_student_records;
drop policy if exists "official_student_records_insert_registrar" on public.official_student_records;
create policy "official_student_records_insert_registrar"
on public.official_student_records for insert
to authenticated
with check (private.is_registrar());

drop policy if exists "official_student_records_update_admin" on public.official_student_records;
drop policy if exists "official_student_records_update_registrar" on public.official_student_records;
create policy "official_student_records_update_registrar"
on public.official_student_records for update
to authenticated
using (private.is_registrar())
with check (private.is_registrar());

-- ============================================================================
-- 11. Students RLS
-- ============================================================================

drop policy if exists "students_update_admin" on public.students;
drop policy if exists "students_update_registrar" on public.students;
create policy "students_update_registrar"
on public.students for update
to authenticated
using (private.is_registrar())
with check (private.is_registrar());

drop policy if exists "students_select_own_or_admin" on public.students;
drop policy if exists "students_select_scoped" on public.students;
create policy "students_select_scoped"
on public.students for select
to authenticated
using (
  profile_id = auth.uid()
  or private.is_registrar()
  or private.staff_can_access_student(id)
);

-- ============================================================================
-- 12. Enrollments RLS
-- ============================================================================

drop policy if exists "enrollments_manage_admin" on public.enrollments;
drop policy if exists "enrollments_manage_registrar" on public.enrollments;
create policy "enrollments_manage_registrar"
on public.enrollments for all
to authenticated
using (private.is_registrar())
with check (private.is_registrar());

drop policy if exists "enrollments_select_own_or_admin" on public.enrollments;
drop policy if exists "enrollments_select_scoped" on public.enrollments;
create policy "enrollments_select_scoped"
on public.enrollments for select
to authenticated
using (
  private.is_registrar()
  or private.is_student_enrollment_owner(id)
  or private.has_any_official_role_for_program(program_id)
);

-- ============================================================================
-- 13. Enrollment Subjects RLS
-- ============================================================================

drop policy if exists "enrollment_subjects_manage_admin" on public.enrollment_subjects;
drop policy if exists "enrollment_subjects_manage_registrar" on public.enrollment_subjects;
create policy "enrollment_subjects_manage_registrar"
on public.enrollment_subjects for all
to authenticated
using (private.is_registrar())
with check (private.is_registrar());

drop policy if exists "enrollment_subjects_select_own_or_admin" on public.enrollment_subjects;
drop policy if exists "enrollment_subjects_select_scoped" on public.enrollment_subjects;
create policy "enrollment_subjects_select_scoped"
on public.enrollment_subjects for select
to authenticated
using (
  private.is_registrar()
  or private.is_student_enrollment_owner(enrollment_id)
  or exists (
    select 1
    from public.enrollments e
    where e.id = enrollment_subjects.enrollment_id
      and private.has_any_official_role_for_program(e.program_id)
  )
);

-- ============================================================================
-- 14. Enrollment Clearances RLS
-- ============================================================================

drop policy if exists "enrollment_clearances_select_own_or_admin" on public.enrollment_clearances;
drop policy if exists "enrollment_clearances_select_scoped" on public.enrollment_clearances;
create policy "enrollment_clearances_select_scoped"
on public.enrollment_clearances for select
to authenticated
using (
  private.is_registrar()
  or private.is_student_enrollment_owner(enrollment_id)
  or exists (
    select 1
    from public.enrollments e
    where e.id = enrollment_clearances.enrollment_id
      and private.has_any_official_role_for_program(e.program_id)
  )
);

-- ============================================================================
-- 15. Enrollment Signatures RLS
-- ============================================================================

drop policy if exists "enrollment_signatures_select_own_or_admin" on public.enrollment_signatures;
drop policy if exists "enrollment_signatures_select_scoped" on public.enrollment_signatures;
create policy "enrollment_signatures_select_scoped"
on public.enrollment_signatures for select
to authenticated
using (
  private.is_registrar()
  or private.is_student_enrollment_owner(enrollment_id)
  or exists (
    select 1
    from public.enrollments e
    where e.id = enrollment_signatures.enrollment_id
      and private.has_any_official_role_for_program(e.program_id)
  )
);

-- ============================================================================
-- 16. Student Requirements RLS
-- ============================================================================

drop policy if exists "student_requirements_manage_admin" on public.student_requirements;
drop policy if exists "student_requirements_manage_registrar" on public.student_requirements;
create policy "student_requirements_manage_registrar"
on public.student_requirements for all
to authenticated
using (private.is_registrar())
with check (private.is_registrar());

drop policy if exists "student_requirements_select_own_or_admin" on public.student_requirements;
drop policy if exists "student_requirements_select_scoped" on public.student_requirements;
create policy "student_requirements_select_scoped"
on public.student_requirements for select
to authenticated
using (
  private.is_registrar()
  or private.is_student_owner(student_id)
  or (
    student_requirements.requirement_code = 'HEALTH_RECORD_UPDATE'
    and private.nurse_can_access_student_requirement(student_id)
  )
);

-- ============================================================================
-- 17. Enrollment Decision Notifications Outbox RLS
-- ============================================================================

drop policy if exists "enrollment_decision_notifications_select_admin" on public.enrollment_decision_notifications;
drop policy if exists "enrollment_decision_notifications_select_registrar" on public.enrollment_decision_notifications;
create policy "enrollment_decision_notifications_select_registrar"
on public.enrollment_decision_notifications for select
to authenticated
using (private.is_registrar());

-- ============================================================================
-- 18. Programs, Subjects, Grades, Class Schedules Administration RLS
-- ============================================================================

drop policy if exists "programs_manage_admin" on public.programs;
drop policy if exists "programs_manage_registrar" on public.programs;
create policy "programs_manage_registrar"
on public.programs for all
to authenticated
using (private.is_registrar())
with check (private.is_registrar());

drop policy if exists "subjects_manage_admin" on public.subjects;
drop policy if exists "subjects_manage_registrar" on public.subjects;
create policy "subjects_manage_registrar"
on public.subjects for all
to authenticated
using (private.is_registrar())
with check (private.is_registrar());

drop policy if exists "class_schedules_manage_admin" on public.class_schedules;
drop policy if exists "class_schedules_manage_registrar" on public.class_schedules;
create policy "class_schedules_manage_registrar"
on public.class_schedules for all
to authenticated
using (private.is_registrar())
with check (private.is_registrar());

drop policy if exists "grades_manage_admin" on public.grades;
drop policy if exists "grades_manage_registrar" on public.grades;
create policy "grades_manage_registrar"
on public.grades for all
to authenticated
using (private.is_registrar())
with check (private.is_registrar());

drop policy if exists "grades_select_own_or_admin" on public.grades;
drop policy if exists "grades_select_scoped" on public.grades;
create policy "grades_select_scoped"
on public.grades for select
to authenticated
using (
  private.is_registrar()
  or exists (
    select 1
    from public.students s
    where s.id = grades.student_id
      and s.profile_id = auth.uid()
  )
  or exists (
    select 1
    from public.enrollments e
    where e.student_id = grades.student_id
      and private.has_any_official_role_for_program(e.program_id)
  )
);

-- ============================================================================
-- 19. Ensure DML Grants on Managed Tables for Authenticated Role
-- ============================================================================

grant usage on schema private to authenticated;
grant select, insert, update on table public.official_student_records to authenticated;
grant select, update on table public.students to authenticated;
grant select, insert, update on table public.enrollments to authenticated;
grant select, insert, update on table public.enrollment_subjects to authenticated;
grant select on table public.audit_logs to authenticated;
