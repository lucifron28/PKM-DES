-- Digital Health Record Update verification.
--
-- The paper form is represented only by administrative verification state. No
-- clinical fields, uploaded medical forms, or clinical notes are stored.

-- Registrar/admin clients may read the requirement but may not mutate it. The
-- enrollment submission RPC and the Nurse RPCs below run as SECURITY DEFINER
-- transactions and remain the only application write paths.
drop policy if exists "student_requirements_manage_admin" on public.student_requirements;
revoke insert, update, delete on table public.student_requirements from authenticated;
grant select on table public.student_requirements to authenticated;

-- Block direct table writes even if a future grant or SECURITY DEFINER caller
-- accidentally reaches the table without the dedicated Nurse transaction.
create or replace function private.prevent_unscoped_health_requirement_verification()
returns trigger
language plpgsql
as $$
declare
  v_nurse_transaction boolean := coalesce(current_setting('pkm.health_requirement_mutation', true), 'false') = 'true';
begin
  if new.requirement_code = 'HEALTH_RECORD_UPDATE' then
    if tg_op = 'INSERT' then
      if new.status <> 'PENDING' and not v_nurse_transaction then
        raise exception 'Health Record Update writes require the dedicated Nurse transaction.';
      end if;
    elsif (
      new.status is distinct from old.status
      or new.note is distinct from old.note
      or new.verified_at is distinct from old.verified_at
      or new.verified_by is distinct from old.verified_by
    ) and not v_nurse_transaction then
      raise exception 'Health Record Update status changes require the dedicated Nurse transaction.';
    end if;
  end if;

  return new;
end;
$$;

-- The existing trigger name is retained so older database objects are
-- replaced in place by this forward-only migration.
drop trigger if exists prevent_unscoped_health_requirement_verification on public.student_requirements;
create trigger prevent_unscoped_health_requirement_verification
before insert or update on public.student_requirements
for each row execute function private.prevent_unscoped_health_requirement_verification();

-- The old endpoint did not carry a server-validated acknowledgment or note.
-- Remove it before creating the explicit Nurse-only contract so an older
-- authenticated client cannot bypass the new form controls.
drop function if exists public.verify_health_requirement_with_signature(uuid, uuid, text, text, text);

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
  v_applicability text;
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

  select e.*
  into v_enrollment
  from public.enrollments e
  where e.id = p_enrollment_id
  for update;

  if not found then
    return query select 'not_found'::text, null::uuid, null::uuid, null::timestamptz;
    return;
  end if;

  select s.* into v_student
  from public.students s
  where s.id = v_enrollment.student_id;
  select p.* into v_profile
  from public.profiles p
  where p.id = auth.uid();

  if not private.has_official_role_for_program('NURSE', v_enrollment.program_id) then
    return query select 'unauthorized'::text, null::uuid, null::uuid, null::timestamptz;
    return;
  end if;

  if v_enrollment.status <> 'PENDING' then
    return query select 'not_signable'::text, null::uuid, null::uuid, null::timestamptz;
    return;
  end if;

  select case
    when v_student.student_type = 'Incoming 1st Year Student'
      and lower(btrim(coalesce(osr.gender_sex, ''))) = 'female'
      then 'APPLICABLE'
    else 'NOT_APPLICABLE'
  end
  into v_applicability
  from public.official_student_records osr
  where osr.student_id_number = v_student.student_id_number;

  v_applicability := coalesce(v_applicability, 'NOT_APPLICABLE');

  if v_applicability <> 'APPLICABLE' then
    return query select 'not_applicable'::text, null::uuid, null::uuid, null::timestamptz;
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

  if v_requirement.status = 'VERIFIED' and private.health_clearance_is_current(v_enrollment.id) then
    return query select 'already_verified'::text, v_requirement.id, null::uuid, null::timestamptz;
    return;
  end if;

  v_expected_document_hash := private.health_record_document_hash(
    v_enrollment.id,
    v_student.id,
    v_enrollment.academic_year,
    v_enrollment.semester,
    'APPLICABLE',
    'VERIFIED'
  );

  if p_document_hash <> v_expected_document_hash then
    return query select 'fingerprint_mismatch'::text, v_requirement.id, null::uuid, null::timestamptz;
    return;
  end if;

  select ec.status
  into v_clearance_status
  from public.enrollment_clearances ec
  where ec.enrollment_id = v_enrollment.id
    and ec.clearance_type = 'HEALTH_CLEARANCE'
  for update;

  if v_clearance_status = 'SIGNED' then
    update public.enrollment_clearances
    set status = 'INVALIDATED', updated_at = now()
    where enrollment_id = v_enrollment.id
      and clearance_type = 'HEALTH_CLEARANCE';
  end if;

  perform set_config('pkm.health_requirement_mutation', 'true', true);

  update public.student_requirements
  set
    status = 'VERIFIED',
    note = v_note,
    verified_at = v_signed_at,
    verified_by = auth.uid(),
    updated_at = v_signed_at
  where id = v_requirement.id;

  insert into public.enrollment_signatures (
    id, enrollment_id, student_id, signer_profile_id, signer_role,
    clearance_type, document_type, signer_name_snapshot,
    signature_storage_path, signature_hash, document_hash, signed_at
  )
  values (
    p_signature_id,
    v_enrollment.id,
    v_student.id,
    auth.uid(),
    'NURSE',
    'HEALTH_CLEARANCE',
    'HEALTH_RECORD',
    btrim(concat_ws(' ', v_profile.first_name, v_profile.last_name)),
    p_signature_storage_path,
    p_signature_hash,
    p_document_hash,
    v_signed_at
  );

  insert into public.enrollment_clearances (enrollment_id, clearance_type, status)
  values (v_enrollment.id, 'HEALTH_CLEARANCE', 'SIGNED')
  on conflict (enrollment_id, clearance_type)
  do update set status = 'SIGNED', updated_at = now();

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

-- Rejection is a controlled Nurse transition with no signature upload. A
-- previous invalidated signature remains historical evidence and is never
-- deleted or rewritten.
create or replace function public.reject_health_requirement(
  p_enrollment_id uuid,
  p_note text
)
returns table (outcome text, requirement_id uuid, rejected_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_enrollment public.enrollments%rowtype;
  v_student public.students%rowtype;
  v_requirement public.student_requirements%rowtype;
  v_applicability text;
  v_clearance_status text;
  v_note text;
  v_rejected_at timestamptz := now();
begin
  if auth.uid() is null or not private.has_official_role('NURSE') then
    return query select 'unauthorized'::text, null::uuid, null::timestamptz;
    return;
  end if;

  v_note := nullif(btrim(regexp_replace(coalesce(p_note, ''), '[[:space:]]+', ' ', 'g')), '');
  if p_enrollment_id is null
    or v_note is not null and (char_length(v_note) > 240 or v_note ~ '[[:cntrl:]]') then
    return query select 'invalid_request'::text, null::uuid, null::timestamptz;
    return;
  end if;

  select e.* into v_enrollment
  from public.enrollments e
  where e.id = p_enrollment_id
  for update;

  if not found then
    return query select 'not_found'::text, null::uuid, null::timestamptz;
    return;
  end if;

  if not private.has_official_role_for_program('NURSE', v_enrollment.program_id) then
    return query select 'unauthorized'::text, null::uuid, null::timestamptz;
    return;
  end if;

  if v_enrollment.status <> 'PENDING' then
    return query select 'not_signable'::text, null::uuid, null::timestamptz;
    return;
  end if;

  select s.* into v_student
  from public.students s
  where s.id = v_enrollment.student_id;

  select case
    when v_student.student_type = 'Incoming 1st Year Student'
      and lower(btrim(coalesce(osr.gender_sex, ''))) = 'female'
      then 'APPLICABLE'
    else 'NOT_APPLICABLE'
  end
  into v_applicability
  from public.official_student_records osr
  where osr.student_id_number = v_student.student_id_number;

  if coalesce(v_applicability, 'NOT_APPLICABLE') <> 'APPLICABLE' then
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

  if private.health_clearance_is_current(v_enrollment.id) then
    return query select 'already_verified'::text, v_requirement.id, null::timestamptz;
    return;
  end if;

  select ec.status into v_clearance_status
  from public.enrollment_clearances ec
  where ec.enrollment_id = v_enrollment.id
    and ec.clearance_type = 'HEALTH_CLEARANCE'
  for update;

  perform set_config('pkm.health_requirement_mutation', 'true', true);

  update public.student_requirements
  set
    status = 'REJECTED',
    note = v_note,
    verified_at = null,
    verified_by = null,
    updated_at = v_rejected_at
  where id = v_requirement.id;

  if v_clearance_status = 'SIGNED' then
    update public.enrollment_clearances
    set status = 'INVALIDATED', updated_at = now()
    where enrollment_id = v_enrollment.id
      and clearance_type = 'HEALTH_CLEARANCE';
  end if;

  insert into public.audit_logs (actor_profile_id, action, target_table, target_id)
  values (auth.uid(), 'NURSE_REJECT_HEALTH_REQUIREMENT', 'student_requirements', v_requirement.id);

  return query select 'rejected'::text, v_requirement.id, v_rejected_at;
end;
$$;

revoke all on function public.reject_health_requirement(uuid, text) from public;
revoke execute on function public.reject_health_requirement(uuid, text) from anon;
grant execute on function public.reject_health_requirement(uuid, text) to authenticated;

-- The previous generic admin RPC is intentionally no longer an application
-- write path. Keep the function for migration compatibility, but remove its
-- Data API execution grant so Registrar clients are read-only for this row.
revoke execute on function public.update_enrollment_requirement_status(uuid, text, text, text) from authenticated;
