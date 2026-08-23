-- Electronic Health Record Update form.
--
-- The form contains sensitive student-provided health information. It is kept
-- separate from the general student record and is exposed only through the
-- student-owner and Nurse-scoped RPCs below.

create table if not exists public.health_record_updates (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  academic_year text not null,
  semester text not null check (semester in ('1st Semester', '2nd Semester')),
  medical_condition_1 text,
  medical_condition_1_identified_on date,
  medical_condition_1_medication text,
  medical_condition_2 text,
  medical_condition_2_identified_on date,
  medical_condition_2_medication text,
  allergy text,
  last_menstrual_period date,
  others text,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint health_record_updates_enrollment_key unique (enrollment_id)
);

create index if not exists health_record_updates_student_term_idx
  on public.health_record_updates (student_id, academic_year, semester);

drop trigger if exists set_health_record_updates_updated_at on public.health_record_updates;
create trigger set_health_record_updates_updated_at
before update on public.health_record_updates
for each row execute function public.set_updated_at();

alter table public.health_record_updates enable row level security;
revoke all on table public.health_record_updates from public, anon, authenticated;
grant select on table public.health_record_updates to authenticated;

drop policy if exists "health_record_updates_select_owner_or_nurse" on public.health_record_updates;
create policy "health_record_updates_select_owner_or_nurse"
on public.health_record_updates for select
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.id = health_record_updates.student_id
      and s.profile_id = auth.uid()
  )
  or exists (
    select 1
    from public.enrollments e
    where e.id = health_record_updates.enrollment_id
      and private.has_official_role_for_program('NURSE', e.program_id)
  )
);

-- Any change to a submitted form invalidates the Nurse clearance. The student
-- submission RPC below rejects edits after the current Nurse signature exists,
-- but this trigger is defense in depth for controlled maintenance operations.
create or replace function private.invalidate_health_clearance_on_form_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and (
    new.medical_condition_1 is distinct from old.medical_condition_1
    or new.medical_condition_1_identified_on is distinct from old.medical_condition_1_identified_on
    or new.medical_condition_1_medication is distinct from old.medical_condition_1_medication
    or new.medical_condition_2 is distinct from old.medical_condition_2
    or new.medical_condition_2_identified_on is distinct from old.medical_condition_2_identified_on
    or new.medical_condition_2_medication is distinct from old.medical_condition_2_medication
    or new.allergy is distinct from old.allergy
    or new.last_menstrual_period is distinct from old.last_menstrual_period
    or new.others is distinct from old.others
  ) then
    update public.enrollment_clearances
    set status = 'INVALIDATED', updated_at = now()
    where enrollment_id = new.enrollment_id
      and clearance_type = 'HEALTH_CLEARANCE'
      and status = 'SIGNED';
  end if;
  return new;
end;
$$;

drop trigger if exists invalidate_health_clearance_after_form_change on public.health_record_updates;
create trigger invalidate_health_clearance_after_form_change
after update on public.health_record_updates
for each row execute function private.invalidate_health_clearance_on_form_change();

create or replace function public.get_health_record_update(p_enrollment_id uuid)
returns table (
  id uuid,
  enrollment_id uuid,
  student_id uuid,
  academic_year text,
  semester text,
  medical_condition_1 text,
  medical_condition_1_identified_on date,
  medical_condition_1_medication text,
  medical_condition_2 text,
  medical_condition_2_identified_on date,
  medical_condition_2_medication text,
  allergy text,
  last_menstrual_period date,
  others text,
  submitted_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_student_id uuid;
  v_program_id uuid;
  v_is_owner boolean;
begin
  if auth.uid() is null or p_enrollment_id is null then
    return;
  end if;

  select e.student_id, e.program_id
  into v_student_id, v_program_id
  from public.enrollments e
  where e.id = p_enrollment_id;

  if not found then
    return;
  end if;

  select exists (
    select 1
    from public.students s
    where s.id = v_student_id
      and s.profile_id = auth.uid()
  )
  into v_is_owner;

  if not v_is_owner and not private.has_official_role_for_program('NURSE', v_program_id) then
    return;
  end if;

  return query
  select h.id, h.enrollment_id, h.student_id, h.academic_year, h.semester,
    h.medical_condition_1, h.medical_condition_1_identified_on,
    h.medical_condition_1_medication, h.medical_condition_2,
    h.medical_condition_2_identified_on, h.medical_condition_2_medication,
    h.allergy, h.last_menstrual_period, h.others, h.submitted_at,
    h.created_at, h.updated_at
  from public.health_record_updates h
  where h.enrollment_id = p_enrollment_id;
end;
$$;

revoke all on function public.get_health_record_update(uuid) from public;
revoke execute on function public.get_health_record_update(uuid) from anon;
grant execute on function public.get_health_record_update(uuid) to authenticated;

create or replace function public.save_health_record_update(
  p_enrollment_id uuid,
  p_medical_condition_1 text,
  p_medical_condition_1_identified_on date,
  p_medical_condition_1_medication text,
  p_medical_condition_2 text,
  p_medical_condition_2_identified_on date,
  p_medical_condition_2_medication text,
  p_allergy text,
  p_last_menstrual_period date,
  p_others text
)
returns table (outcome text, record_id uuid, saved_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_enrollment public.enrollments%rowtype;
  v_student public.students%rowtype;
  v_requirement public.student_requirements%rowtype;
  v_condition_1 text;
  v_condition_1_medication text;
  v_condition_2 text;
  v_condition_2_medication text;
  v_allergy text;
  v_others text;
  v_saved_at timestamptz := now();
  v_record_id uuid;
begin
  if auth.uid() is null or p_enrollment_id is null then
    return query select 'invalid_request'::text, null::uuid, null::timestamptz;
    return;
  end if;

  select e.*
  into v_enrollment
  from public.enrollments e
  join public.students s on s.id = e.student_id
  where e.id = p_enrollment_id
    and s.profile_id = auth.uid()
  for update of e;

  if not found then
    return query select 'not_found'::text, null::uuid, null::timestamptz;
    return;
  end if;

  if v_enrollment.status not in ('PENDING', 'APPROVED') then
    return query select 'not_editable'::text, null::uuid, null::timestamptz;
    return;
  end if;

  select * into v_student
  from public.students s
  where s.id = v_enrollment.student_id
  for update;

  if private.get_health_requirement_applicability(v_student.id) <> 'APPLICABLE' then
    return query select 'not_applicable'::text, null::uuid, null::timestamptz;
    return;
  end if;

  select * into v_requirement
  from public.student_requirements sr
  where sr.student_id = v_student.id
    and sr.requirement_code = 'HEALTH_RECORD_UPDATE'
    and sr.academic_year = v_enrollment.academic_year
    and sr.semester = v_enrollment.semester
  for update;

  if not found or v_requirement.applicability <> 'APPLICABLE' then
    return query select 'requirement_unavailable'::text, null::uuid, null::timestamptz;
    return;
  end if;

  if v_requirement.status = 'VERIFIED' then
    return query select 'already_verified'::text, v_requirement.id, null::timestamptz;
    return;
  end if;

  v_condition_1 := nullif(btrim(regexp_replace(coalesce(p_medical_condition_1, ''), '[[:space:]]+', ' ', 'g')), '');
  v_condition_1_medication := nullif(btrim(regexp_replace(coalesce(p_medical_condition_1_medication, ''), '[[:space:]]+', ' ', 'g')), '');
  v_condition_2 := nullif(btrim(regexp_replace(coalesce(p_medical_condition_2, ''), '[[:space:]]+', ' ', 'g')), '');
  v_condition_2_medication := nullif(btrim(regexp_replace(coalesce(p_medical_condition_2_medication, ''), '[[:space:]]+', ' ', 'g')), '');
  v_allergy := nullif(btrim(regexp_replace(coalesce(p_allergy, ''), '[[:space:]]+', ' ', 'g')), '');
  v_others := nullif(btrim(regexp_replace(coalesce(p_others, ''), '[[:space:]]+', ' ', 'g')), '');

  if coalesce(char_length(v_condition_1), 0) > 240
    or coalesce(char_length(v_condition_1_medication), 0) > 240
    or coalesce(char_length(v_condition_2), 0) > 240
    or coalesce(char_length(v_condition_2_medication), 0) > 240
    or coalesce(char_length(v_allergy), 0) > 240
    or coalesce(char_length(v_others), 0) > 240
    or coalesce(v_condition_1, '') ~ '[[:cntrl:]]'
    or coalesce(v_condition_1_medication, '') ~ '[[:cntrl:]]'
    or coalesce(v_condition_2, '') ~ '[[:cntrl:]]'
    or coalesce(v_condition_2_medication, '') ~ '[[:cntrl:]]'
    or coalesce(v_allergy, '') ~ '[[:cntrl:]]'
    or coalesce(v_others, '') ~ '[[:cntrl:]]'
    or p_medical_condition_1_identified_on > current_date
    or p_medical_condition_2_identified_on > current_date
    or p_last_menstrual_period > current_date then
    return query select 'invalid_request'::text, null::uuid, null::timestamptz;
    return;
  end if;

  insert into public.health_record_updates (
    enrollment_id, student_id, academic_year, semester,
    medical_condition_1, medical_condition_1_identified_on, medical_condition_1_medication,
    medical_condition_2, medical_condition_2_identified_on, medical_condition_2_medication,
    allergy, last_menstrual_period, others, submitted_at
  )
  values (
    v_enrollment.id, v_student.id, v_enrollment.academic_year, v_enrollment.semester,
    v_condition_1, p_medical_condition_1_identified_on, v_condition_1_medication,
    v_condition_2, p_medical_condition_2_identified_on, v_condition_2_medication,
    v_allergy, p_last_menstrual_period, v_others, v_saved_at
  )
  on conflict (enrollment_id) do update set
    student_id = excluded.student_id,
    academic_year = excluded.academic_year,
    semester = excluded.semester,
    medical_condition_1 = excluded.medical_condition_1,
    medical_condition_1_identified_on = excluded.medical_condition_1_identified_on,
    medical_condition_1_medication = excluded.medical_condition_1_medication,
    medical_condition_2 = excluded.medical_condition_2,
    medical_condition_2_identified_on = excluded.medical_condition_2_identified_on,
    medical_condition_2_medication = excluded.medical_condition_2_medication,
    allergy = excluded.allergy,
    last_menstrual_period = excluded.last_menstrual_period,
    others = excluded.others,
    submitted_at = excluded.submitted_at,
    updated_at = v_saved_at
  returning id into v_record_id;

  if v_requirement.status = 'REJECTED' then
    perform set_config('pkm.health_requirement_mutation', 'true', true);
    update public.student_requirements
    set status = 'PENDING', note = null, verified_at = null, verified_by = null, updated_at = v_saved_at
    where id = v_requirement.id;
  end if;

  insert into public.audit_logs (actor_profile_id, action, target_table, target_id)
  values (auth.uid(), 'SUBMIT_HEALTH_RECORD_UPDATE', 'health_record_updates', v_enrollment.id);

  return query select 'saved'::text, v_record_id, v_saved_at;
exception
  when unique_violation then
    return query select 'duplicate'::text, null::uuid, null::timestamptz;
end;
$$;

revoke all on function public.save_health_record_update(uuid, text, date, text, text, date, text, text, date, text) from public;
revoke execute on function public.save_health_record_update(uuid, text, date, text, text, date, text, text, date, text) from anon;
grant execute on function public.save_health_record_update(uuid, text, date, text, text, date, text, text, date, text) to authenticated;

-- Extend the Nurse verification transaction so a signature cannot be recorded
-- for a missing form.
create or replace function public.verify_health_requirement_with_signature(
  p_enrollment_id uuid,
  p_signature_id uuid,
  p_signature_storage_path text,
  p_signature_hash text,
  p_document_hash text,
  p_verification_acknowledged boolean,
  p_note text
)
returns table (outcome text, requirement_id uuid, signature_id uuid, signed_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_enrollment public.enrollments%rowtype;
  v_student public.students%rowtype;
  v_profile public.profiles%rowtype;
  v_requirement public.student_requirements%rowtype;
  v_expected_document_hash text;
  v_clearance_status text;
  v_note text;
  v_signed_at timestamptz := now();
begin
  if auth.uid() is null or not private.has_official_role('NURSE') then
    return query select 'unauthorized'::text, null::uuid, null::uuid, null::timestamptz;
    return;
  end if;

  if not coalesce(p_verification_acknowledged, false) then
    return query select 'acknowledgment_required'::text, null::uuid, null::uuid, null::timestamptz;
    return;
  end if;

  v_note := nullif(btrim(regexp_replace(coalesce(p_note, ''), '[[:space:]]+', ' ', 'g')), '');
  if p_enrollment_id is null
    or p_signature_id is null
    or p_signature_storage_path is null
    or p_signature_hash is null
    or p_signature_hash !~ '^[0-9a-f]{64}$'
    or p_document_hash is null
    or p_document_hash !~ '^[0-9a-f]{64}$'
    or p_signature_storage_path <> format('%s/NURSE/%s.png', p_enrollment_id, p_signature_id)
    or v_note is not null and (char_length(v_note) > 240 or v_note ~ '[[:cntrl:]]') then
    return query select 'invalid_request'::text, null::uuid, null::uuid, null::timestamptz;
    return;
  end if;

  select e.* into v_enrollment
  from public.enrollments e
  where e.id = p_enrollment_id
  for update;
  if not found then
    return query select 'not_found'::text, null::uuid, null::uuid, null::timestamptz;
    return;
  end if;

  select s.* into v_student
  from public.students s
  where s.id = v_enrollment.student_id
  for update;
  select p.* into v_profile from public.profiles p where p.id = auth.uid();

  if not private.has_official_role_for_program('NURSE', v_enrollment.program_id) then
    return query select 'unauthorized'::text, null::uuid, null::uuid, null::timestamptz;
    return;
  end if;
  if v_enrollment.status <> 'PENDING' then
    return query select 'not_signable'::text, null::uuid, null::uuid, null::timestamptz;
    return;
  end if;
  if private.get_health_requirement_applicability(v_student.id) <> 'APPLICABLE' then
    return query select 'special_form_not_required'::text, null::uuid, null::uuid, null::timestamptz;
    return;
  end if;

  select * into v_requirement
  from public.student_requirements sr
  where sr.student_id = v_student.id
    and sr.requirement_code = 'HEALTH_RECORD_UPDATE'
    and sr.academic_year = v_enrollment.academic_year
    and sr.semester = v_enrollment.semester
  for update;
  if not found or v_requirement.applicability <> 'APPLICABLE' then
    return query select 'requirement_unavailable'::text, null::uuid, null::uuid, null::timestamptz;
    return;
  end if;
  if not exists (select 1 from public.health_record_updates h where h.enrollment_id = v_enrollment.id) then
    return query select 'health_record_not_submitted'::text, v_requirement.id, null::uuid, null::timestamptz;
    return;
  end if;
  if v_requirement.status = 'VERIFIED' and private.health_clearance_is_current(v_enrollment.id) then
    return query select 'already_verified'::text, v_requirement.id, null::uuid, null::timestamptz;
    return;
  end if;

  v_expected_document_hash := private.health_record_document_hash(
    v_enrollment.id, v_student.id, v_enrollment.academic_year, v_enrollment.semester, 'APPLICABLE', 'VERIFIED'
  );
  if p_document_hash <> v_expected_document_hash then
    return query select 'fingerprint_mismatch'::text, v_requirement.id, null::uuid, null::timestamptz;
    return;
  end if;

  select ec.status into v_clearance_status
  from public.enrollment_clearances ec
  where ec.enrollment_id = v_enrollment.id and ec.clearance_type = 'HEALTH_CLEARANCE'
  for update;
  if v_clearance_status = 'SIGNED' then
    update public.enrollment_clearances
    set status = 'INVALIDATED', updated_at = now()
    where enrollment_id = v_enrollment.id and clearance_type = 'HEALTH_CLEARANCE';
  end if;

  perform set_config('pkm.health_requirement_mutation', 'true', true);
  update public.student_requirements
  set status = 'VERIFIED', note = v_note, verified_at = v_signed_at, verified_by = auth.uid(), updated_at = v_signed_at
  where id = v_requirement.id;

  insert into public.enrollment_signatures (
    id, enrollment_id, student_id, signer_profile_id, signer_role, clearance_type, document_type,
    signer_name_snapshot, signature_storage_path, signature_hash, document_hash, signed_at
  )
  values (
    p_signature_id, v_enrollment.id, v_student.id, auth.uid(), 'NURSE', 'HEALTH_CLEARANCE', 'HEALTH_RECORD',
    btrim(concat_ws(' ', v_profile.first_name, v_profile.last_name)), p_signature_storage_path,
    p_signature_hash, p_document_hash, v_signed_at
  );

  insert into public.enrollment_clearances (enrollment_id, clearance_type, status)
  values (v_enrollment.id, 'HEALTH_CLEARANCE', 'SIGNED')
  on conflict (enrollment_id, clearance_type) do update set status = 'SIGNED', updated_at = now();

  insert into public.audit_logs (actor_profile_id, action, target_table, target_id)
  values (auth.uid(), 'NURSE_VERIFY_HEALTH_REQUIREMENT', 'student_requirements', v_requirement.id);

  return query select 'signed'::text, v_requirement.id, p_signature_id, v_signed_at;
exception
  when unique_violation then
    return query select 'duplicate'::text, null::uuid, null::uuid, null::timestamptz;
end;
$$;

revoke all on function public.verify_health_requirement_with_signature(uuid, uuid, text, text, text, boolean, text) from public;
revoke execute on function public.verify_health_requirement_with_signature(uuid, uuid, text, text, text, boolean, text) from anon;
grant execute on function public.verify_health_requirement_with_signature(uuid, uuid, text, text, text, boolean, text) to authenticated;

-- A current special-form clearance must have a stored form submission.
create or replace function private.health_clearance_is_current(p_enrollment_id uuid)
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
    left join public.student_requirements sr
      on sr.student_id = s.id
      and sr.requirement_code = 'HEALTH_RECORD_UPDATE'
      and sr.academic_year = e.academic_year
      and sr.semester = e.semester
    join public.enrollment_clearances ec
      on ec.enrollment_id = e.id
      and ec.clearance_type = 'HEALTH_CLEARANCE'
      and ec.status = 'SIGNED'
    join lateral (
      select es_inner.*
      from public.enrollment_signatures es_inner
      where es_inner.enrollment_id = e.id
        and es_inner.student_id = s.id
        and es_inner.signer_role = 'NURSE'
        and es_inner.clearance_type = 'HEALTH_CLEARANCE'
      order by es_inner.signed_at desc, es_inner.id desc
      limit 1
    ) es on true
    where e.id = p_enrollment_id
      and (
        (
          private.get_health_requirement_applicability(s.id) = 'APPLICABLE'
          and sr.applicability = 'APPLICABLE'
          and sr.status = 'VERIFIED'
          and exists (select 1 from public.health_record_updates h where h.enrollment_id = e.id)
          and es.document_type = 'HEALTH_RECORD'
          and es.document_hash = private.health_record_document_hash(
            e.id, s.id, e.academic_year, e.semester, sr.applicability, sr.status::text
          )
        )
        or (
          private.get_health_requirement_applicability(s.id) = 'NOT_APPLICABLE'
          and es.document_type = 'ENROLLMENT_CLEARANCE'
          and es.document_hash = private.enrollment_document_hash(
            e.id, 'NURSE', 'HEALTH_CLEARANCE', 'ENROLLMENT_CLEARANCE'
          )
        )
      )
  );
$$;

revoke all on function private.health_clearance_is_current(uuid) from public;
