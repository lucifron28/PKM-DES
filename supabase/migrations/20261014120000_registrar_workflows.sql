create or replace function private.has_registrar_access()
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select private.is_admin()
    and not exists (
      select 1
      from public.official_role_assignments a
      where a.profile_id = auth.uid()
        and a.active = true
    );
$$;

revoke all on function private.has_registrar_access() from public, anon;
grant execute on function private.has_registrar_access() to authenticated;

alter table public.enrollments
  drop constraint if exists enrollments_status_check;

alter table public.enrollments
  add constraint enrollments_status_check
  check (status in ('PENDING', 'APPROVED', 'REJECTED', 'PULLED_OUT'));

drop policy if exists "enrollments_update_admin" on public.enrollments;
drop policy if exists "enrollment_subjects_manage_admin" on public.enrollment_subjects;
revoke all on table public.enrollments, public.enrollment_subjects from public, anon, authenticated;
grant select on table public.enrollments, public.enrollment_subjects to authenticated;

create table if not exists public.enrollment_status_events (
  id uuid primary key default gen_random_uuid(),
  event_sequence bigint generated always as identity unique,
  enrollment_id uuid not null references public.enrollments(id) on delete restrict,
  event_type text not null check (event_type in ('PULLED_OUT', 'REINSTATED')),
  from_status text not null check (from_status in ('PENDING', 'APPROVED', 'REJECTED', 'PULLED_OUT')),
  to_status text not null check (to_status in ('PENDING', 'APPROVED', 'REJECTED', 'PULLED_OUT')),
  actor_profile_id uuid not null references public.profiles(id) on delete restrict,
  reason text,
  created_at timestamptz not null default now(),
  constraint enrollment_status_events_reason_length_check
    check (reason is null or char_length(reason) <= 2000),
  constraint enrollment_status_events_pull_out_reason_check
    check (event_type <> 'PULLED_OUT' or nullif(btrim(reason), '') is not null),
  constraint enrollment_status_events_transition_check
    check (
      (event_type = 'PULLED_OUT' and from_status in ('PENDING', 'APPROVED', 'REJECTED') and to_status = 'PULLED_OUT')
      or (event_type = 'REINSTATED' and from_status = 'PULLED_OUT' and to_status in ('PENDING', 'APPROVED', 'REJECTED'))
    )
);

create index if not exists enrollment_status_events_enrollment_created_idx
  on public.enrollment_status_events (enrollment_id, created_at desc);

alter table public.enrollment_status_events enable row level security;
revoke all on table public.enrollment_status_events from public, anon, authenticated;
grant select on table public.enrollment_status_events to authenticated;

drop policy if exists "enrollment_status_events_select_authorized" on public.enrollment_status_events;
create policy "enrollment_status_events_select_authorized"
on public.enrollment_status_events for select
to authenticated
using (
  private.has_registrar_access()
  or exists (
    select 1
    from public.enrollments e
    join public.students s on s.id = e.student_id
    where e.id = enrollment_status_events.enrollment_id
      and s.profile_id = auth.uid()
  )
);

create or replace function public.registrar_review_pending_enrollment(
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
set search_path = public, private, pg_temp
as $$
begin
  if auth.uid() is null or not private.has_registrar_access() then
    return query select 'unauthorized'::text, null::uuid, null::text, null::text;
    return;
  end if;

  return query
  select r.outcome, r.enrollment_id, r.review_status, r.student_enrollment_status
  from public.review_pending_enrollment(p_enrollment_id, p_decision, p_remarks) r;
end;
$$;

revoke all on function public.review_pending_enrollment(uuid, text, text) from public, anon, authenticated;
revoke all on function public.registrar_review_pending_enrollment(uuid, text, text) from public, anon;
grant execute on function public.registrar_review_pending_enrollment(uuid, text, text) to authenticated;

create or replace function public.registrar_bulk_review_enrollments(
  p_enrollment_ids uuid[],
  p_decision text,
  p_remarks text default null
)
returns table (
  outcome text,
  enrollment_id uuid,
  review_status text,
  student_enrollment_status text
)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_enrollment_id uuid;
begin
  if auth.uid() is null or not private.has_registrar_access() then
    return query select 'unauthorized'::text, null::uuid, null::text, null::text;
    return;
  end if;

  if p_enrollment_ids is null
    or cardinality(p_enrollment_ids) < 1
    or cardinality(p_enrollment_ids) > 100
    or array_position(p_enrollment_ids, null) is not null
    or p_decision is null
    or p_decision not in ('APPROVED', 'REJECTED')
    or char_length(coalesce(p_remarks, '')) > 2000 then
    return query select 'invalid_request'::text, null::uuid, null::text, null::text;
    return;
  end if;

  for v_enrollment_id in
    select distinct requested.id
    from unnest(p_enrollment_ids) as requested(id)
    where requested.id is not null
    order by requested.id
  loop
    return query
    select r.outcome, r.enrollment_id, r.review_status, r.student_enrollment_status
    from public.review_pending_enrollment(v_enrollment_id, p_decision, p_remarks) r;
  end loop;
end;
$$;

revoke all on function public.registrar_bulk_review_enrollments(uuid[], text, text) from public, anon;
grant execute on function public.registrar_bulk_review_enrollments(uuid[], text, text) to authenticated;

create or replace function private.sync_student_enrollment_status(p_student_id uuid)
returns text
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_status text;
begin
  select case
    when exists (select 1 from public.enrollments e where e.student_id = p_student_id and e.status = 'APPROVED') then 'ENROLLED'
    when exists (select 1 from public.enrollments e where e.student_id = p_student_id and e.status = 'PENDING') then 'PENDING'
    else 'NOT ENROLLED'
  end into v_status;

  update public.students
  set enrollment_status = v_status
  where id = p_student_id;

  update public.official_student_records osr
  set enrollment_status = v_status
  from public.students s
  where s.id = p_student_id
    and osr.id = s.official_record_id;

  return v_status;
end;
$$;

revoke all on function private.sync_student_enrollment_status(uuid) from public, anon, authenticated;

create or replace function public.pull_out_enrollments(
  p_enrollment_ids uuid[],
  p_reason text
)
returns table (outcome text, enrollment_id uuid, previous_status text, current_status text)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_enrollment_id uuid;
  v_enrollment public.enrollments%rowtype;
  v_reason text := nullif(btrim(p_reason), '');
  v_student_status text;
begin
  if auth.uid() is null or not private.has_registrar_access() then
    return query select 'unauthorized'::text, null::uuid, null::text, null::text;
    return;
  end if;

  if p_enrollment_ids is null
    or cardinality(p_enrollment_ids) < 1
    or cardinality(p_enrollment_ids) > 100
    or array_position(p_enrollment_ids, null) is not null
    or v_reason is null
    or char_length(v_reason) > 2000 then
    return query select 'invalid_request'::text, null::uuid, null::text, null::text;
    return;
  end if;

  for v_enrollment_id in
    select distinct requested.id
    from unnest(p_enrollment_ids) as requested(id)
    where requested.id is not null
    order by requested.id
  loop
    select * into v_enrollment
    from public.enrollments e
    where e.id = v_enrollment_id
    for update;

    if not found then
      return query select 'not_found'::text, v_enrollment_id, null::text, null::text;
      continue;
    end if;
    if v_enrollment.status = 'PULLED_OUT' then
      return query select 'already_pulled_out'::text, v_enrollment.id, v_enrollment.status, v_enrollment.status;
      continue;
    end if;
    if v_enrollment.status not in ('PENDING', 'APPROVED', 'REJECTED') then
      return query select 'not_eligible'::text, v_enrollment.id, v_enrollment.status, v_enrollment.status;
      continue;
    end if;

    update public.enrollments set status = 'PULLED_OUT' where id = v_enrollment.id;
    insert into public.enrollment_status_events (
      enrollment_id, event_type, from_status, to_status, actor_profile_id, reason
    ) values (
      v_enrollment.id, 'PULLED_OUT', v_enrollment.status, 'PULLED_OUT', auth.uid(), v_reason
    );
    insert into public.audit_logs (actor_profile_id, action, target_table, target_id)
    values (auth.uid(), 'PULL_OUT_ENROLLMENT', 'enrollments', v_enrollment.id);

    v_student_status := private.sync_student_enrollment_status(v_enrollment.student_id);
    return query select 'pulled_out'::text, v_enrollment.id, v_enrollment.status, 'PULLED_OUT'::text;
  end loop;
end;
$$;

revoke all on function public.pull_out_enrollments(uuid[], text) from public, anon;
grant execute on function public.pull_out_enrollments(uuid[], text) to authenticated;

create or replace function public.reinstate_enrollments(p_enrollment_ids uuid[])
returns table (outcome text, enrollment_id uuid, restored_status text)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_enrollment_id uuid;
  v_enrollment public.enrollments%rowtype;
  v_restored_status text;
  v_student_status text;
begin
  if auth.uid() is null or not private.has_registrar_access() then
    return query select 'unauthorized'::text, null::uuid, null::text;
    return;
  end if;

  if p_enrollment_ids is null
    or cardinality(p_enrollment_ids) < 1
    or cardinality(p_enrollment_ids) > 100
    or array_position(p_enrollment_ids, null) is not null then
    return query select 'invalid_request'::text, null::uuid, null::text;
    return;
  end if;

  for v_enrollment_id in
    select distinct requested.id
    from unnest(p_enrollment_ids) as requested(id)
    where requested.id is not null
    order by requested.id
  loop
    select * into v_enrollment
    from public.enrollments e
    where e.id = v_enrollment_id
    for update;

    if not found then
      return query select 'not_found'::text, v_enrollment_id, null::text;
      continue;
    end if;
    if v_enrollment.status <> 'PULLED_OUT' then
      return query select 'not_eligible'::text, v_enrollment.id, v_enrollment.status;
      continue;
    end if;

    select event.from_status into v_restored_status
    from public.enrollment_status_events event
    where event.enrollment_id = v_enrollment.id
      and event.event_type = 'PULLED_OUT'
    order by event.event_sequence desc
    limit 1;

    if v_restored_status is null or v_restored_status = 'PULLED_OUT' then
      return query select 'history_unavailable'::text, v_enrollment.id, null::text;
      continue;
    end if;

    if v_restored_status = 'APPROVED'
      and private.enrollment_required_clearances_are_current(v_enrollment.id) is distinct from true then
      return query select 'incomplete_clearances'::text, v_enrollment.id, v_restored_status;
      continue;
    end if;

    update public.enrollments set status = v_restored_status where id = v_enrollment.id;
    insert into public.enrollment_status_events (
      enrollment_id, event_type, from_status, to_status, actor_profile_id
    ) values (
      v_enrollment.id, 'REINSTATED', 'PULLED_OUT', v_restored_status, auth.uid()
    );
    insert into public.audit_logs (actor_profile_id, action, target_table, target_id)
    values (auth.uid(), 'REINSTATE_ENROLLMENT', 'enrollments', v_enrollment.id);

    v_student_status := private.sync_student_enrollment_status(v_enrollment.student_id);
    return query select 'reinstated'::text, v_enrollment.id, v_restored_status;
  end loop;
end;
$$;

revoke all on function public.reinstate_enrollments(uuid[]) from public, anon;
grant execute on function public.reinstate_enrollments(uuid[]) to authenticated;
