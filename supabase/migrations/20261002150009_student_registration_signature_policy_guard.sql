alter table public.enrollments
  add column registration_pledge_version text;

-- Pending enrollments are still active work and must be signed against the
-- newly introduced pledge. Leave approved and rejected history at NULL so its
-- existing Student signature fingerprint remains unchanged.
update public.enrollments
set registration_pledge_version = 'pledge-v1'
where status = 'PENDING';

alter table public.enrollments
  alter column registration_pledge_version set default 'pledge-v1';

create or replace function private.enrollment_document_hash(
  p_enrollment_id uuid,
  p_signer_role text,
  p_clearance_type text,
  p_document_type text
)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with enrollment_data as (
    select
      e.id,
      e.academic_year,
      e.semester,
      e.program_id,
      e.year_level,
      e.registration_pledge_version,
      coalesce(
        (
          select string_agg(
            format('%s|%s|%s', es.course_code, es.course_description, es.units::text),
            chr(10)
            order by es.course_code, es.course_description, es.units
          )
          from public.enrollment_subjects es
          where es.enrollment_id = e.id
        ),
        ''
      ) as subject_material,
      coalesce((select sum(es.units) from public.enrollment_subjects es where es.enrollment_id = e.id), 0)::text as total_units
    from public.enrollments e
    where e.id = p_enrollment_id
  ),
  fingerprint_material as (
    select
      case
        when p_signer_role = 'STUDENT'
          and p_clearance_type = 'STUDENT_ENROLLMENT_SIGNATURE'
          and p_document_type = 'ENROLLMENT_REGISTRATION'
          and registration_pledge_version is not null
          and registration_pledge_version <> 'pledge-v1'
          then null
        else format(
          'ENROLLMENT' || chr(10) ||
          'enrollment_id=%s' || chr(10) ||
          'academic_year=%s' || chr(10) ||
          'semester=%s' || chr(10) ||
          'program_id=%s' || chr(10) ||
          'year_level=%s' || chr(10) ||
          'subjects=%s' || chr(10) ||
          'total_units=%s' || chr(10) ||
          'signer_role=%s' || chr(10) ||
          'clearance_type=%s' || chr(10) ||
          'document_type=%s',
          id,
          academic_year,
          semester,
          program_id,
          year_level,
          subject_material,
          total_units,
          p_signer_role,
          p_clearance_type,
          p_document_type
        ) || case
          when p_signer_role = 'STUDENT'
            and p_clearance_type = 'STUDENT_ENROLLMENT_SIGNATURE'
            and p_document_type = 'ENROLLMENT_REGISTRATION'
            and registration_pledge_version = 'pledge-v1'
          then chr(10) || 'pledge_policy_version=pledge-v1'
          else ''
        end
      end as material
    from enrollment_data
  )
  select encode(extensions.digest(material, 'sha256'), 'hex')
  from fingerprint_material;
$$;

revoke all on function private.enrollment_document_hash(uuid, text, text, text) from public;

-- Keep this value aligned with lib/registration-form/policy.ts.
-- The old overload is disabled so callers must provide explicit policy consent.
revoke all on function public.record_student_enrollment_signature(uuid, uuid, text, text, text)
  from public, anon, authenticated;

create or replace function public.record_student_enrollment_signature(
  p_enrollment_id uuid,
  p_signature_id uuid,
  p_signature_storage_path text,
  p_signature_hash text,
  p_document_hash text,
  p_policy_acknowledged boolean
)
returns table (outcome text, signature_id uuid, signed_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_enrollment public.enrollments%rowtype;
  v_student public.students%rowtype;
  v_profile public.profiles%rowtype;
  v_expected_document_hash text;
  v_clearance_status text;
  v_signed_at timestamptz := now();
begin
  if auth.uid() is null then
    return query select 'unauthorized'::text, null::uuid, null::timestamptz;
    return;
  end if;

  if p_enrollment_id is null
    or p_signature_id is null
    or p_signature_storage_path is null
    or p_signature_hash is null
    or p_signature_hash !~ '^[0-9a-f]{64}$'
    or p_document_hash is null
    or p_document_hash !~ '^[0-9a-f]{64}$'
    or p_signature_storage_path <> format('%s/STUDENT/%s.png', p_enrollment_id, p_signature_id) then
    return query select 'invalid_request'::text, null::uuid, null::timestamptz;
    return;
  end if;

  select e.*
  into v_enrollment
  from public.enrollments e
  join public.students s on s.id = e.student_id
  join public.profiles p on p.id = s.profile_id
  where e.id = p_enrollment_id
    and s.profile_id = auth.uid()
    and p.role = 'student'
    and p.account_status = 'ACTIVE'
  for update of e;

  if not found then
    return query select 'unauthorized'::text, null::uuid, null::timestamptz;
    return;
  end if;

  select s.* into v_student
  from public.students s
  where s.id = v_enrollment.student_id;
  select p.* into v_profile
  from public.profiles p
  where p.id = v_student.profile_id;

  if v_enrollment.status not in ('PENDING', 'APPROVED') then
    return query select 'not_signable'::text, null::uuid, null::timestamptz;
    return;
  end if;

  if p_policy_acknowledged is distinct from true then
    return query select 'policy_acknowledgment_required'::text, null::uuid, null::timestamptz;
    return;
  end if;

  if v_enrollment.registration_pledge_version is distinct from 'pledge-v1' then
    return query select 'unsupported_policy_version'::text, null::uuid, null::timestamptz;
    return;
  end if;

  v_expected_document_hash := private.enrollment_document_hash(
    v_enrollment.id,
    'STUDENT',
    'STUDENT_ENROLLMENT_SIGNATURE',
    'ENROLLMENT_REGISTRATION'
  );

  if p_document_hash <> v_expected_document_hash then
    return query select 'fingerprint_mismatch'::text, null::uuid, null::timestamptz;
    return;
  end if;

  select ec.status
  into v_clearance_status
  from public.enrollment_clearances ec
  where ec.enrollment_id = v_enrollment.id
    and ec.clearance_type = 'STUDENT_ENROLLMENT_SIGNATURE'
  for update;

  if v_clearance_status = 'SIGNED'
     and exists (
       select 1 from public.enrollment_signatures es
       where es.enrollment_id = v_enrollment.id
         and es.clearance_type = 'STUDENT_ENROLLMENT_SIGNATURE'
         and es.document_hash = v_expected_document_hash
     ) then
    return query select 'duplicate'::text, null::uuid, null::timestamptz;
    return;
  end if;

  if v_clearance_status = 'SIGNED' then
    update public.enrollment_clearances
    set status = 'INVALIDATED', updated_at = now()
    where enrollment_id = v_enrollment.id
      and clearance_type = 'STUDENT_ENROLLMENT_SIGNATURE';
  end if;

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
    'STUDENT',
    'STUDENT_ENROLLMENT_SIGNATURE',
    'ENROLLMENT_REGISTRATION',
    btrim(concat_ws(' ', v_profile.first_name, v_profile.last_name)),
    p_signature_storage_path,
    p_signature_hash,
    p_document_hash,
    v_signed_at
  );

  insert into public.enrollment_clearances (enrollment_id, clearance_type, status)
  values (v_enrollment.id, 'STUDENT_ENROLLMENT_SIGNATURE', 'SIGNED')
  on conflict (enrollment_id, clearance_type) do update set status = 'SIGNED', updated_at = now();

  insert into public.audit_logs (actor_profile_id, action, target_table, target_id)
  values (auth.uid(), 'APPLY_STUDENT_SIGNATURE', 'enrollment_signatures', p_signature_id);

  return query select 'signed'::text, p_signature_id, v_signed_at;
exception
  when unique_violation then
    return query select 'duplicate'::text, null::uuid, null::timestamptz;
end;
$$;

revoke all on function public.record_student_enrollment_signature(uuid, uuid, text, text, text, boolean)
  from public;
revoke execute on function public.record_student_enrollment_signature(uuid, uuid, text, text, text, boolean)
  from anon;
grant execute on function public.record_student_enrollment_signature(uuid, uuid, text, text, text, boolean)
  to authenticated;
