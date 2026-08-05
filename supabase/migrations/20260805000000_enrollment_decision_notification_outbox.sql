-- Durable enrollment-decision notification outbox.
-- The Registrar's decision remains authoritative when email delivery is
-- disabled or unavailable. This table stores delivery state only; it never
-- stores rejection remarks or rendered email content.

create table if not exists public.enrollment_decision_notifications (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete restrict,
  decision text not null check (decision in ('APPROVED', 'REJECTED')),
  recipient_email text not null,
  academic_year text not null,
  semester text not null check (semester in ('1st Semester', '2nd Semester')),
  status text not null default 'PENDING' check (status in ('PENDING', 'SENDING', 'SENT', 'FAILED')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error_code text,
  reserved_at timestamptz,
  reservation_token uuid,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enrollment_decision_notifications_enrollment_decision_key
    unique (enrollment_id, decision),
  constraint enrollment_decision_notifications_delivery_state_check
    check (
      (status = 'SENT' and sent_at is not null and reservation_token is null)
      or (status <> 'SENT')
    )
);

create index if not exists enrollment_decision_notifications_delivery_idx
  on public.enrollment_decision_notifications (status, created_at);

create index if not exists enrollment_decision_notifications_enrollment_idx
  on public.enrollment_decision_notifications (enrollment_id);

drop trigger if exists set_enrollment_decision_notifications_updated_at
  on public.enrollment_decision_notifications;

create trigger set_enrollment_decision_notifications_updated_at
before update on public.enrollment_decision_notifications
for each row execute function public.set_updated_at();

alter table public.enrollment_decision_notifications enable row level security;

drop policy if exists "admins_select_enrollment_decision_notifications"
  on public.enrollment_decision_notifications;

create policy "admins_select_enrollment_decision_notifications"
on public.enrollment_decision_notifications for select
to authenticated
using (private.is_admin());

revoke all on table public.enrollment_decision_notifications from public, anon, authenticated;
grant select on table public.enrollment_decision_notifications to authenticated;
grant select, insert, update on table public.enrollment_decision_notifications to service_role;

-- Successful decisions create one PENDING notification in the same transaction
-- as the enrollment, student summary, and audit changes.
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
  v_health_requirement_applies boolean;
  v_subject_count integer;
  v_invalid_subject_count integer;
  v_total_units numeric;
  v_recipient_email text;
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
  end if;

  select exists (
    select 1
    from public.official_student_records osr
    where osr.student_id_number = v_student.student_id_number
      and v_student.student_type = 'Incoming 1st Year Student'
      and lower(btrim(coalesce(osr.gender_sex, ''))) = 'female'
  ) into v_health_requirement_applies;

  if p_decision = 'APPROVED'
    and v_health_requirement_applies
    and not exists (
      select 1
      from public.student_requirements sr
      where sr.student_id = v_student.id
        and sr.requirement_code = 'HEALTH_RECORD_UPDATE'
        and sr.academic_year = v_enrollment.academic_year
        and sr.semester = v_enrollment.semester
        and sr.applicability = 'APPLICABLE'
        and sr.status = 'VERIFIED'
    ) then
    return query select 'unverified_requirements'::text, v_enrollment.id, v_enrollment.status, null::text;
    return;
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
  end into v_student_status;

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

  select btrim(coalesce(p.email, ''))
  into v_recipient_email
  from public.profiles p
  where p.id = v_student.profile_id;

  insert into public.enrollment_decision_notifications (
    enrollment_id,
    decision,
    recipient_email,
    academic_year,
    semester,
    status,
    attempt_count,
    last_error_code,
    reserved_at,
    reservation_token,
    sent_at
  )
  values (
    v_enrollment.id,
    p_decision,
    coalesce(v_recipient_email, ''),
    v_enrollment.academic_year,
    v_enrollment.semester,
    'PENDING',
    0,
    null,
    null,
    null,
    null
  )
  on conflict (enrollment_id, decision) do nothing;

  return query select lower(p_decision), v_enrollment.id, p_decision, v_student_status;
end;
$$;

revoke all on function public.review_pending_enrollment(uuid, text, text) from public;
revoke execute on function public.review_pending_enrollment(uuid, text, text) from anon;
grant execute on function public.review_pending_enrollment(uuid, text, text) to authenticated;

-- Reserve one pending or retryable failed notification. Row locking and the
-- reservation token prevent two workers from sending the same attempt.
create or replace function public.reserve_enrollment_decision_notification(
  p_enrollment_id uuid,
  p_decision text
)
returns table (
  outcome text,
  notification_id uuid,
  enrollment_id uuid,
  decision text,
  recipient_email text,
  first_name text,
  academic_year text,
  semester text,
  reservation_token uuid
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
  if auth.uid() is null or not private.is_admin() then
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
    last_error_code = null,
    reserved_at = now(),
    reservation_token = v_token,
    updated_at = now()
  where n.id = v_notification.id;

  select coalesce(p.first_name, 'Student')
  into v_first_name
  from public.enrollments e
  join public.students s on s.id = e.student_id
  join public.profiles p on p.id = s.profile_id
  where e.id = p_enrollment_id;

  return query select
    'reserved'::text,
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

revoke all on function public.reserve_enrollment_decision_notification(uuid, text) from public;
revoke execute on function public.reserve_enrollment_decision_notification(uuid, text) from anon;
grant execute on function public.reserve_enrollment_decision_notification(uuid, text) to authenticated;

create or replace function public.mark_enrollment_decision_notification_sent(
  p_notification_id uuid,
  p_reservation_token uuid
)
returns table (outcome text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
begin
  if auth.uid() is null or not private.is_admin() then
    return query select 'unauthorized'::text;
    return;
  end if;

  if p_notification_id is null or p_reservation_token is null then
    return query select 'invalid_request'::text;
    return;
  end if;

  update public.enrollment_decision_notifications
  set
    status = 'SENT',
    sent_at = now(),
    reserved_at = null,
    reservation_token = null,
    last_error_code = null,
    updated_at = now()
  where id = p_notification_id
    and status = 'SENDING'
    and reservation_token = p_reservation_token;

  if found then
    return query select 'sent'::text;
    return;
  end if;

  select status into v_status
  from public.enrollment_decision_notifications
  where id = p_notification_id;

  return query select case when v_status = 'SENT' then 'already_sent' else 'stale_reservation' end;
end;
$$;

revoke all on function public.mark_enrollment_decision_notification_sent(uuid, uuid) from public;
revoke execute on function public.mark_enrollment_decision_notification_sent(uuid, uuid) from anon;
grant execute on function public.mark_enrollment_decision_notification_sent(uuid, uuid) to authenticated;

create or replace function public.mark_enrollment_decision_notification_failed(
  p_notification_id uuid,
  p_reservation_token uuid,
  p_error_code text
)
returns table (outcome text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
  v_safe_code text;
begin
  if auth.uid() is null or not private.is_admin() then
    return query select 'unauthorized'::text;
    return;
  end if;

  if p_notification_id is null or p_reservation_token is null then
    return query select 'invalid_request'::text;
    return;
  end if;

  v_safe_code := case
    when p_error_code in ('not_configured', 'invalid_base_url', 'invalid_recipient', 'provider', 'reservation', 'delivery_commit') then p_error_code
    else 'unknown'
  end;

  update public.enrollment_decision_notifications
  set
    status = 'FAILED',
    last_error_code = v_safe_code,
    reserved_at = null,
    reservation_token = null,
    updated_at = now()
  where id = p_notification_id
    and status = 'SENDING'
    and reservation_token = p_reservation_token;

  if found then
    return query select 'failed'::text;
    return;
  end if;

  select status into v_status
  from public.enrollment_decision_notifications
  where id = p_notification_id;

  return query select case when v_status = 'FAILED' then 'already_failed' else 'stale_reservation' end;
end;
$$;

revoke all on function public.mark_enrollment_decision_notification_failed(uuid, uuid, text) from public;
revoke execute on function public.mark_enrollment_decision_notification_failed(uuid, uuid, text) from anon;
grant execute on function public.mark_enrollment_decision_notification_failed(uuid, uuid, text) to authenticated;
