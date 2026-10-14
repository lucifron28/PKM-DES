create or replace function public.get_registrar_approval(p_enrollment_id uuid)
returns table (name text, approved_at timestamptz)
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select nullif(
    btrim(concat_ws(' ', nullif(btrim(reviewer.first_name), ''), nullif(btrim(reviewer.last_name), ''))),
    ''
  ) as name,
    enrollment.reviewed_at as approved_at
  from public.enrollments enrollment
  join public.students student on student.id = enrollment.student_id
  join public.profiles reviewer on reviewer.id = enrollment.reviewed_by
  where enrollment.id = p_enrollment_id
    and auth.uid() is not null
    and (
      student.profile_id = auth.uid()
      or private.has_registrar_access()
    )
    and enrollment.status in ('APPROVED', 'PULLED_OUT')
    and enrollment.reviewed_by is not null
    and enrollment.reviewed_at is not null
    and nullif(btrim(concat_ws(' ', nullif(btrim(reviewer.first_name), ''), nullif(btrim(reviewer.last_name), ''))), '') is not null
    and (
      enrollment.status <> 'PULLED_OUT'
      or exists (
        select 1
        from (
          select status_event.from_status
          from public.enrollment_status_events status_event
          where status_event.enrollment_id = enrollment.id
            and status_event.event_type = 'PULLED_OUT'
            and status_event.to_status = 'PULLED_OUT'
          order by status_event.event_sequence desc
          limit 1
        ) latest_pull_out
        where latest_pull_out.from_status = 'APPROVED'
      )
    );
$$;

revoke all on function public.get_registrar_approval(uuid) from public, anon;
grant execute on function public.get_registrar_approval(uuid) to authenticated;

drop policy if exists "Admins manage standard loads" on public.standard_load_sets;
create policy "Registrars manage standard loads"
  on public.standard_load_sets
  for all
  to authenticated
  using (private.has_registrar_access())
  with check (private.has_registrar_access());

alter table public.enrollments add column financial_document_version integer
  check (financial_document_version is null or financial_document_version > 0);

create table public.accounting_fee_catalog (
  id uuid primary key default gen_random_uuid(),
  fee_code text not null unique,
  fee_name text not null,
  fee_section text not null check (fee_section in ('MISCELLANEOUS', 'TUITION', 'NSTP', 'SCHOLARSHIP')),
  amount numeric(12, 2) check (
    amount is null or (amount >= 0 and amount <= 9999999999.99)
  ),
  active boolean not null default false,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  constraint accounting_fee_catalog_active_amount check (not active or amount is not null)
);

insert into public.accounting_fee_catalog (fee_code, fee_name, fee_section)
values
  ('ADMISSION_FEE', 'Admission Fee', 'MISCELLANEOUS'),
  ('ATHLETIC_FEE', 'Athletic Fee', 'MISCELLANEOUS'),
  ('COMPUTER_FEE', 'Computer Fee', 'MISCELLANEOUS'),
  ('CULTURAL_FEE', 'Cultural Fee', 'MISCELLANEOUS'),
  ('DEVELOPMENT_FEE', 'Development Fee', 'MISCELLANEOUS'),
  ('ENTRANCE_FEE', 'Entrance Fee', 'MISCELLANEOUS'),
  ('GUIDANCE_FEE', 'Guidance Fee', 'MISCELLANEOUS'),
  ('HANDBOOK_FEE', 'Handbook Fee', 'MISCELLANEOUS'),
  ('LABORATORY_FEE', 'Laboratory Fee', 'MISCELLANEOUS'),
  ('LIBRARY_FEE', 'Library Fee', 'MISCELLANEOUS'),
  ('MEDICAL_AND_DENTAL_FEE', 'Medical and Dental Fee', 'MISCELLANEOUS'),
  ('REGISTRATION_FEE', 'Registration Fee', 'MISCELLANEOUS'),
  ('SCHOOL_ID_FEE', 'School ID Fee', 'MISCELLANEOUS'),
  ('TUITION_FEE', 'Tuition Fee', 'TUITION'),
  ('NSTP_FEE_CWTS', 'NSTP Fee (CWTS)', 'NSTP'),
  ('SCHOLARSHIP', 'Scholarship', 'SCHOLARSHIP');

create table public.enrollment_financial_assessments (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  version integer not null check (version > 0),
  fee_items jsonb not null check (jsonb_typeof(fee_items) = 'array' and jsonb_array_length(fee_items) > 0),
  assessed_amount numeric(12, 2) not null check (assessed_amount >= 0 and assessed_amount <= 9999999999.99),
  assessed_by uuid not null references public.profiles(id),
  assessed_at timestamptz not null default now(),
  constraint enrollment_financial_assessments_version_key unique (enrollment_id, version)
);

create table public.enrollment_financial_payments (
  payment_id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0 and amount <= 9999999999.99),
  paid_at timestamptz not null default now(),
  reference text check (reference is null or char_length(reference) <= 120),
  recorded_by uuid not null references public.profiles(id)
);

create index enrollment_financial_assessments_latest_idx
  on public.enrollment_financial_assessments (enrollment_id, version desc);
create index enrollment_financial_payments_enrollment_idx
  on public.enrollment_financial_payments (enrollment_id, paid_at, payment_id);

alter table public.accounting_fee_catalog enable row level security;
alter table public.enrollment_financial_assessments enable row level security;
alter table public.enrollment_financial_payments enable row level security;
revoke all on table public.accounting_fee_catalog, public.enrollment_financial_assessments, public.enrollment_financial_payments from public, anon, authenticated;
grant all on table public.accounting_fee_catalog, public.enrollment_financial_assessments, public.enrollment_financial_payments to service_role;

create or replace function private.reject_financial_history_changes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' and coalesce(current_setting('pkm.demo_reset', true), 'false') = 'true' then
    return old;
  end if;
  raise exception using errcode = '42501', message = 'Financial assessment and payment history is immutable';
end;
$$;

revoke all on function private.reject_financial_history_changes() from public, anon, authenticated;

create trigger prevent_financial_assessment_changes
before update or delete on public.enrollment_financial_assessments
for each row execute function private.reject_financial_history_changes();

create trigger prevent_financial_payment_changes
before update or delete on public.enrollment_financial_payments
for each row execute function private.reject_financial_history_changes();

create or replace function public.list_accounting_fee_catalog()
returns table (fee_code text, fee_name text, section text, amount numeric, active boolean)
language plpgsql
stable
security definer
set search_path = public, private, pg_temp
as $$
begin
  if auth.uid() is null or not private.has_official_role('ACCOUNTANT') then
    raise exception using errcode = '42501', message = 'Accountant access required';
  end if;

  return query
  select catalog.fee_code, catalog.fee_name, catalog.fee_section, catalog.amount, catalog.active
  from public.accounting_fee_catalog catalog
  order by catalog.fee_section, catalog.fee_name;
end;
$$;

revoke all on function public.list_accounting_fee_catalog() from public, anon;
grant execute on function public.list_accounting_fee_catalog() to authenticated;

create or replace function public.accountant_configure_fee(
  p_fee_code text,
  p_amount numeric,
  p_active boolean
)
returns table (outcome text)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_fee_id uuid;
begin
  if auth.uid() is null or not private.has_official_role('ACCOUNTANT') then
    return query select 'unauthorized'::text;
    return;
  end if;

  if p_fee_code is null
    or p_active is null
    or (p_amount is not null and (p_amount < 0 or p_amount > 9999999999.99 or p_amount <> round(p_amount, 2)))
    or (p_active and p_amount is null) then
    return query select 'invalid_request'::text;
    return;
  end if;

  update public.accounting_fee_catalog catalog
  set amount = p_amount,
      active = p_active,
      updated_by = auth.uid(),
      updated_at = now()
  where catalog.fee_code = p_fee_code
  returning catalog.id into v_fee_id;

  if not found then
    return query select 'not_found'::text;
    return;
  end if;

  insert into public.audit_logs (actor_profile_id, action, target_table, target_id)
  values (auth.uid(), 'CONFIGURE_ACCOUNTING_FEE', 'accounting_fee_catalog', v_fee_id);

  return query select 'updated'::text;
end;
$$;

revoke all on function public.accountant_configure_fee(text, numeric, boolean) from public, anon;
grant execute on function public.accountant_configure_fee(text, numeric, boolean) to authenticated;

create or replace function public.accountant_save_enrollment_assessment(
  p_enrollment_id uuid,
  p_fee_codes text[]
)
returns table (outcome text, assessment_version integer, assessed_amount numeric)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_enrollment public.enrollments%rowtype;
  v_fee_count integer;
  v_unique_count integer;
  v_items jsonb;
  v_total numeric;
  v_version integer;
  v_assessment_id uuid;
begin
  if auth.uid() is null then
    return query select 'unauthorized'::text, null::integer, null::numeric;
    return;
  end if;
  if p_enrollment_id is null
    or p_fee_codes is null
    or cardinality(p_fee_codes) < 1
    or cardinality(p_fee_codes) > 16
    or array_position(p_fee_codes, null) is not null then
    return query select 'invalid_request'::text, null::integer, null::numeric;
    return;
  end if;

  select count(distinct requested.fee_code)::integer
  into v_unique_count
  from unnest(p_fee_codes) as requested(fee_code);
  if v_unique_count <> cardinality(p_fee_codes) then
    return query select 'invalid_request'::text, null::integer, null::numeric;
    return;
  end if;

  select enrollment.* into v_enrollment
  from public.enrollments enrollment
  where enrollment.id = p_enrollment_id
  for update;
  if not found then
    return query select 'not_found'::text, null::integer, null::numeric;
    return;
  end if;
  if not private.has_official_role_for_program('ACCOUNTANT', v_enrollment.program_id) then
    return query select 'unauthorized'::text, null::integer, null::numeric;
    return;
  end if;
  if v_enrollment.status <> 'PENDING' then
    return query select 'not_editable'::text, null::integer, null::numeric;
    return;
  end if;

  perform 1 from public.accounting_fee_catalog catalog
  where catalog.fee_code = any(p_fee_codes)
  order by catalog.fee_code for share;

  select count(*)::integer
  into v_fee_count
  from public.accounting_fee_catalog catalog
  where catalog.fee_code = any(p_fee_codes)
    and catalog.active
    and catalog.amount is not null;
  if v_fee_count <> cardinality(p_fee_codes) then
    return query select 'fee_unavailable'::text, null::integer, null::numeric;
    return;
  end if;

  select
    jsonb_agg(jsonb_build_object(
      'fee_code', catalog.fee_code,
      'fee_name', catalog.fee_name,
      'amount', catalog.amount
    ) order by catalog.fee_code),
    sum(case when catalog.fee_section = 'SCHOLARSHIP' then -catalog.amount else catalog.amount end)
  into v_items, v_total
  from public.accounting_fee_catalog catalog
  where catalog.fee_code = any(p_fee_codes);

  v_total := greatest(coalesce(v_total, 0), 0);
  if v_total > 9999999999.99 then
    return query select 'invalid_amount'::text, null::integer, null::numeric;
    return;
  end if;

  select coalesce(max(assessment.version), 0) + 1
  into v_version
  from public.enrollment_financial_assessments assessment
  where assessment.enrollment_id = p_enrollment_id;

  insert into public.enrollment_financial_assessments (
    enrollment_id, version, fee_items, assessed_amount, assessed_by
  ) values (
    p_enrollment_id, v_version, v_items, v_total, auth.uid()
  ) returning id into v_assessment_id;

  insert into public.audit_logs (actor_profile_id, action, target_table, target_id)
  values (auth.uid(), 'ASSESS_ENROLLMENT_FINANCES', 'enrollment_financial_assessments', v_assessment_id);

  return query select 'assessed'::text, v_version, v_total;
end;
$$;

revoke all on function public.accountant_save_enrollment_assessment(uuid, text[]) from public, anon;
grant execute on function public.accountant_save_enrollment_assessment(uuid, text[]) to authenticated;

create or replace function public.accountant_record_enrollment_payment(
  p_enrollment_id uuid,
  p_amount numeric,
  p_reference text default null
)
returns table (outcome text, payment_id uuid, amount numeric, paid_at timestamptz, reference text)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_enrollment public.enrollments%rowtype;
  v_reference text := nullif(btrim(regexp_replace(coalesce(p_reference, ''), '[[:space:]]+', ' ', 'g')), '');
  v_assessment_version integer;
  v_payment_id uuid;
  v_paid_at timestamptz;
begin
  if auth.uid() is null then
    return query select 'unauthorized'::text, null::uuid, null::numeric, null::timestamptz, null::text;
    return;
  end if;
  if p_enrollment_id is null
    or p_amount is null
    or p_amount <= 0
    or p_amount > 9999999999.99
    or p_amount <> round(p_amount, 2)
    or char_length(v_reference) > 120 then
    return query select 'invalid_request'::text, null::uuid, null::numeric, null::timestamptz, null::text;
    return;
  end if;

  select enrollment.* into v_enrollment
  from public.enrollments enrollment
  where enrollment.id = p_enrollment_id
  for update;
  if not found then
    return query select 'not_found'::text, null::uuid, null::numeric, null::timestamptz, null::text;
    return;
  end if;
  if not private.has_official_role_for_program('ACCOUNTANT', v_enrollment.program_id) then
    return query select 'unauthorized'::text, null::uuid, null::numeric, null::timestamptz, null::text;
    return;
  end if;
  if v_enrollment.status <> 'PENDING' then
    return query select 'not_editable'::text, null::uuid, null::numeric, null::timestamptz, null::text;
    return;
  end if;

  select assessment.version into v_assessment_version
  from public.enrollment_financial_assessments assessment
  where assessment.enrollment_id = p_enrollment_id
  order by assessment.version desc
  limit 1;
  if not found then
    return query select 'assessment_required'::text, null::uuid, null::numeric, null::timestamptz, null::text;
    return;
  end if;

  insert into public.enrollment_financial_payments (
    enrollment_id, amount, reference, recorded_by
  ) values (
    p_enrollment_id, p_amount, v_reference, auth.uid()
  ) returning enrollment_financial_payments.payment_id, enrollment_financial_payments.paid_at
    into v_payment_id, v_paid_at;

  insert into public.audit_logs (actor_profile_id, action, target_table, target_id)
  values (auth.uid(), 'RECORD_ENROLLMENT_PAYMENT', 'enrollment_financial_payments', v_payment_id);

  return query select 'recorded'::text, v_payment_id, p_amount, v_paid_at, v_reference;
end;
$$;

revoke all on function public.accountant_record_enrollment_payment(uuid, numeric, text) from public, anon;
grant execute on function public.accountant_record_enrollment_payment(uuid, numeric, text) to authenticated;

create or replace function public.get_enrollment_financial_summary(p_enrollment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_enrollment public.enrollments%rowtype;
  v_assessment public.enrollment_financial_assessments%rowtype;
  v_paid_amount numeric;
  v_payment_count integer;
  v_receipts jsonb;
  v_payment_status text;
begin
  if auth.uid() is null or p_enrollment_id is null then
    return null;
  end if;

  select enrollment.* into v_enrollment
  from public.enrollments enrollment
  where enrollment.id = p_enrollment_id
  for share;
  if not found then
    return null;
  end if;

  if not exists (
    select 1 from public.students student
    where student.id = v_enrollment.student_id
      and student.profile_id = auth.uid()
  )
  and not private.has_registrar_access()
  and not private.has_official_role_for_program('ACCOUNTANT', v_enrollment.program_id) then
    raise exception using errcode = '42501', message = 'Enrollment finance access denied';
  end if;

  select assessment.* into v_assessment
  from public.enrollment_financial_assessments assessment
  where assessment.enrollment_id = p_enrollment_id
  order by assessment.version desc
  limit 1;
  if not found then
    return jsonb_build_object(
      'fee_items', null,
      'assessment_version', null,
      'assessed_amount', null,
      'paid_amount', null,
      'balance_due', null,
      'currency_code', 'PHP',
      'payment_status', 'UNASSESSED',
      'payment_receipts', '[]'::jsonb
    );
  end if;

  select count(*)::integer,
    sum(payment.amount),
    coalesce(jsonb_agg(jsonb_build_object(
      'payment_id', payment.payment_id,
      'amount', payment.amount,
      'paid_at', payment.paid_at,
      'reference', payment.reference
    ) order by payment.paid_at, payment.payment_id), '[]'::jsonb)
  into v_payment_count, v_paid_amount, v_receipts
  from public.enrollment_financial_payments payment
  where payment.enrollment_id = p_enrollment_id;

  v_payment_status := case
    when v_assessment.assessed_amount = 0 then 'PAID'
    when v_payment_count = 0 then 'UNPAID'
    when v_paid_amount >= v_assessment.assessed_amount then 'PAID'
    else 'PARTIAL'
  end;

  return jsonb_build_object(
    'fee_items', v_assessment.fee_items,
    'assessment_version', v_assessment.version::text,
    'assessed_amount', v_assessment.assessed_amount,
    'paid_amount', case when v_payment_count = 0 then null else v_paid_amount end,
    'balance_due', greatest(v_assessment.assessed_amount - coalesce(v_paid_amount, 0), 0),
    'currency_code', 'PHP',
    'payment_status', v_payment_status,
    'payment_receipts', v_receipts
  );
end;
$$;

revoke all on function public.get_enrollment_financial_summary(uuid) from public, anon;
grant execute on function public.get_enrollment_financial_summary(uuid) to authenticated;

create function private.advance_enrollment_financial_version()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
declare v_status text;
begin
  select status into v_status from public.enrollments where id = new.enrollment_id for update;
  if v_status is distinct from 'PENDING' then
    raise exception 'Financial content may only change on pending enrollments.' using errcode = '55000';
  end if;
  update public.enrollments
  set financial_document_version = coalesce(financial_document_version, 0) + 1
  where id = new.enrollment_id;
  perform private.invalidate_enrollment_clearances(new.enrollment_id, 'ACCOUNTING_CLEARANCE');
  return new;
end;
$$;
revoke all on function private.advance_enrollment_financial_version() from public, anon, authenticated;
create trigger advance_assessment_document_version before insert on public.enrollment_financial_assessments
for each row execute function private.advance_enrollment_financial_version();
create trigger advance_payment_document_version before insert on public.enrollment_financial_payments
for each row execute function private.advance_enrollment_financial_version();

alter function private.enrollment_document_hash(uuid, text, text, text)
rename to enrollment_document_hash_before_finance;
create function private.enrollment_document_hash(p_enrollment_id uuid, p_signer_role text, p_clearance_type text, p_document_type text)
returns text language sql stable security definer set search_path = public, pg_temp as $$
  select case when p_signer_role = 'ACCOUNTANT' and p_clearance_type = 'ACCOUNTING_CLEARANCE'
    and p_document_type = 'ENROLLMENT_CLEARANCE' and e.financial_document_version > 0
    then encode(extensions.digest(private.enrollment_document_hash_before_finance(
      e.id, p_signer_role, p_clearance_type, p_document_type) || chr(10) ||
      'financial_document_version=' || e.financial_document_version::text, 'sha256'), 'hex')
    else private.enrollment_document_hash_before_finance(e.id, p_signer_role, p_clearance_type, p_document_type) end
  from public.enrollments e where e.id = p_enrollment_id;
$$;
revoke all on function private.enrollment_document_hash(uuid, text, text, text) from public, anon, authenticated;
