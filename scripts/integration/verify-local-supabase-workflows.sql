-- Run only against a disposable local Supabase database.
-- The script creates fictional records inside one transaction and always rolls back.

begin;

insert into auth.users (
  id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'registrar@example.test', 'not-used', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'applicable.student@example.test', 'not-used', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'nonapplicable.student@example.test', 'not-used', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'setup.student@example.test', 'not-used', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'delivery.student@example.test', 'not-used', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'gate.student@example.test', 'not-used', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'nurse@example.test', 'not-used', '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.profiles (id, role, first_name, last_name, email, account_status)
values
  ('00000000-0000-4000-8000-000000000001', 'admin', 'Demo', 'Registrar', 'registrar@example.test', 'ACTIVE'),
  ('00000000-0000-4000-8000-000000000002', 'student', 'Applicable', 'Student', 'applicable.student@example.test', 'ACTIVE'),
  ('00000000-0000-4000-8000-000000000003', 'student', 'Nonapplicable', 'Student', 'nonapplicable.student@example.test', 'ACTIVE'),
  ('00000000-0000-4000-8000-000000000004', 'student', 'Setup', 'Student', 'setup.student@example.test', 'SETUP'),
  ('00000000-0000-4000-8000-000000000005', 'student', 'Delivery', 'Student', 'delivery.student@example.test', 'SETUP'),
  ('00000000-0000-4000-8000-000000000006', 'student', 'Gate', 'Student', 'gate.student@example.test', 'ACTIVE'),
  ('00000000-0000-4000-8000-000000000007', 'admin', 'Assigned', 'Nurse', 'nurse@example.test', 'ACTIVE');

insert into public.official_role_assignments (profile_id, official_role, program_id, active)
values ('00000000-0000-4000-8000-000000000007', 'NURSE', null, true);

do $program_fixture$
declare
  v_program_id uuid;
begin
  insert into public.programs (id, name, code)
  values ('10000000-0000-4000-8000-000000000001', 'Bachelor of Science in Accounting Information System', 'BSAIS')
  on conflict (code) do nothing
  returning id into v_program_id;

  if v_program_id is null then
    select id into v_program_id from public.programs where code = 'BSAIS' limit 1;
  end if;

  if v_program_id is null then
    raise exception 'FAIL: no BSAIS program available for local workflow fixture';
  end if;

  perform set_config('pkm.fixture.bsais_id', v_program_id::text, true);
end;
$program_fixture$;

insert into public.students (id, profile_id, student_id_number, program_id, year_level, student_type, enrollment_status)
values
  ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', '26-00001', current_setting('pkm.fixture.bsais_id')::uuid, '1st Year', 'Incoming 1st Year Student', 'NOT ENROLLED'),
  ('20000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003', '26-00002', current_setting('pkm.fixture.bsais_id')::uuid, '1st Year', 'Old Student', 'NOT ENROLLED'),
  ('20000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000006', '26-00003', current_setting('pkm.fixture.bsais_id')::uuid, '1st Year', 'Incoming 1st Year Student', 'NOT ENROLLED');

insert into public.official_student_records (
  student_id_number, first_name, last_name, email, program_id, year_level, student_type, gender_sex, enrollment_status
)
values
  ('26-00001', 'Applicable', 'Student', 'applicable.student@example.test', current_setting('pkm.fixture.bsais_id')::uuid, '1st Year', 'Incoming 1st Year Student', 'Female', 'NOT ENROLLED'),
  ('26-00002', 'Nonapplicable', 'Student', 'nonapplicable.student@example.test', current_setting('pkm.fixture.bsais_id')::uuid, '1st Year', 'Old Student', null, 'NOT ENROLLED'),
  ('26-00003', 'Gate', 'Student', 'gate.student@example.test', current_setting('pkm.fixture.bsais_id')::uuid, '1st Year', 'Incoming 1st Year Student', 'Female', 'NOT ENROLLED');

insert into public.subjects (id, program_id, course_code, course_description, units, year_level, semester)
values ('30000000-0000-4000-8000-000000000001', current_setting('pkm.fixture.bsais_id')::uuid, 'TEST-101', 'Local verification subject', 3, '1st Year', '2nd Semester');

insert into public.enrollments (id, student_id, program_id, year_level, academic_year, semester, status)
values
  ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', current_setting('pkm.fixture.bsais_id')::uuid, '1st Year', '2025-2026', '2nd Semester', 'PENDING'),
  ('40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', current_setting('pkm.fixture.bsais_id')::uuid, '1st Year', '2025-2026', '2nd Semester', 'PENDING'),
  ('40000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', current_setting('pkm.fixture.bsais_id')::uuid, '1st Year', '2025-2026', '2nd Semester', 'PENDING'),
  ('40000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', current_setting('pkm.fixture.bsais_id')::uuid, '1st Year', '2024-2025', '1st Semester', 'PENDING');

insert into public.enrollment_subjects (
  id, enrollment_id, subject_id, course_code, course_description, units
)
values
  ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'TEST-101', 'Local verification subject', 3),
  ('50000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 'TEST-101', 'Local verification subject', 3),
  ('50000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', 'TEST-101', 'Local verification subject', 3);

insert into public.student_requirements (
  student_id, requirement_code, academic_year, semester, applicability, status, verified_at, verified_by
)
values (
  '20000000-0000-4000-8000-000000000001',
  'HEALTH_RECORD_UPDATE',
  '2025-2026',
  '2nd Semester',
  'APPLICABLE',
  'PENDING',
  null,
  null
);

-- The existing ownership policy resolves through public.students. Grant its read prerequisite
-- only inside this rolled-back local fixture; production permission changes are outside this PR.
grant select on public.students to authenticated;

-- Setup completion: SETUP student succeeds exactly once; non-SETUP and admin callers fail.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000004', true);

do $verify$
begin
  if (select outcome from public.complete_student_account_setup()) <> 'completed' then
    raise exception 'SETUP student did not complete setup';
  end if;
  if (select outcome from public.complete_student_account_setup()) <> 'invalid_setup' then
    raise exception 'ACTIVE student completed setup again';
  end if;
end;
$verify$;

-- Approval refuses an empty or malformed subject load without mutating the request.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
do $verify$
begin
  if has_function_privilege(current_user, 'public.review_pending_enrollment(uuid,text,text)', 'EXECUTE') then
    raise exception 'authenticated role can still execute the unguarded review endpoint';
  end if;
end;
$verify$;
do $verify$
declare
  before_status text;
  before_student_status text;
begin
  select status into before_status from public.enrollments where id = '40000000-0000-4000-8000-000000000004';
  select enrollment_status into before_student_status from public.students where id = '20000000-0000-4000-8000-000000000001';
  if (select outcome from public.registrar_review_pending_enrollment(
    '40000000-0000-4000-8000-000000000004', 'APPROVED', null
  )) <> 'invalid_enrollment_load' then
    raise exception 'empty enrollment load was approved';
  end if;
  if (select status from public.enrollments where id = '40000000-0000-4000-8000-000000000004') <> before_status
    or (select enrollment_status from public.students where id = '20000000-0000-4000-8000-000000000001') <> before_student_status then
    raise exception 'invalid load review mutated protected records';
  end if;
end;
$verify$;

reset role;
do $verify$
begin
  if (select count(*) from public.audit_logs where target_id = '40000000-0000-4000-8000-000000000004') <> 0
    or (select count(*) from public.enrollment_decision_notifications where enrollment_id = '40000000-0000-4000-8000-000000000004') <> 0 then
    raise exception 'invalid load review wrote an audit record or decision notification';
  end if;
  if (select account_status from public.profiles where id = '00000000-0000-4000-8000-000000000004') <> 'ACTIVE' then
    raise exception 'setup completion did not activate profile';
  end if;
end;
$verify$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
do $verify$
begin
  if (select outcome from public.complete_student_account_setup()) <> 'invalid_setup' then
    raise exception 'admin completed student setup';
  end if;
end;
$verify$;

-- Student RLS: owner can read exactly their own row, another student cannot read it, and direct updates are ignored.
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
do $verify$
declare
  visible_count integer;
  changed_count integer;
  function_outcome text;
begin
  select count(*) into visible_count
  from public.student_requirements
  where student_id = '20000000-0000-4000-8000-000000000001'
    and requirement_code = 'HEALTH_RECORD_UPDATE'
    and academic_year = '2025-2026'
    and semester = '2nd Semester';
  if visible_count <> 1 then
    raise exception 'owning student could not select exactly their requirement row';
  end if;

  perform set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000003', true);
  select count(*) into visible_count
  from public.student_requirements
  where student_id = '20000000-0000-4000-8000-000000000001'
    and requirement_code = 'HEALTH_RECORD_UPDATE'
    and academic_year = '2025-2026'
    and semester = '2nd Semester';
  if visible_count <> 0 then
    raise exception 'another student selected a private requirement row';
  end if;

  perform set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
  begin
    update public.student_requirements
    set status = 'VERIFIED'
    where student_id = '20000000-0000-4000-8000-000000000001'
      and requirement_code = 'HEALTH_RECORD_UPDATE'
      and academic_year = '2025-2026'
      and semester = '2nd Semester';
    get diagnostics changed_count = row_count;
  exception when insufficient_privilege then
    changed_count := 0;
  end;
  if changed_count <> 0 then
    raise exception 'student bypassed requirement update RLS';
  end if;
  if (select status from public.student_requirements
    where student_id = '20000000-0000-4000-8000-000000000001'
      and requirement_code = 'HEALTH_RECORD_UPDATE'
      and academic_year = '2025-2026'
      and semester = '2nd Semester') <> 'PENDING' then
    raise exception 'student direct update changed requirement status';
  end if;
  begin
    select outcome into function_outcome from public.update_enrollment_requirement_status(
      '40000000-0000-4000-8000-000000000001', 'HEALTH_RECORD_UPDATE', 'VERIFIED', null
    );
  exception when insufficient_privilege then
    function_outcome := 'execute_denied';
  end;
  if function_outcome not in ('unauthorized', 'execute_denied') then
    raise exception 'student invoked admin requirement function';
  end if;
end;
$verify$;

-- The generic status RPC is intentionally unavailable to authenticated users;
-- applicable health requirements are cleared only through the student form and Nurse signature flow.
reset role;
select set_config('pkm.fixture.health_document_hash', private.health_record_document_hash(
  '40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
  '2025-2026', '2nd Semester', 'APPLICABLE', 'VERIFIED'
), true);
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
do $verify$
begin
  if has_function_privilege(current_user, 'public.update_enrollment_requirement_status(uuid,text,text,text)', 'EXECUTE') then
    raise exception 'authenticated admin can execute the revoked generic requirement RPC';
  end if;
  begin
    perform 1 from public.update_enrollment_requirement_status(
      '40000000-0000-4000-8000-000000000001', 'HEALTH_RECORD_UPDATE', 'VERIFIED', 'Must use Nurse verification'
    );
    raise exception 'authenticated admin unexpectedly executed the generic requirement RPC';
  exception when insufficient_privilege then
    null;
  end;
end;
$verify$;

-- A Nurse cannot sign before the student submits the required form.
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000007', true);
do $verify$
declare
  v_outcome text;
  v_signature_id uuid := '60000000-0000-4000-8000-000000000001';
  v_signature_hash text := repeat('a', 64);
  v_document_hash text;
begin
  v_document_hash := current_setting('pkm.fixture.health_document_hash');
  select outcome into v_outcome
  from public.verify_health_requirement_with_signature(
    '40000000-0000-4000-8000-000000000001', v_signature_id,
    '40000000-0000-4000-8000-000000000001/NURSE/60000000-0000-4000-8000-000000000001.png',
    v_signature_hash, v_document_hash, true, 'Required form was not submitted'
  );
  if v_outcome <> 'health_record_not_submitted'
    or exists (select 1 from public.enrollment_signatures where id = v_signature_id) then
    raise exception 'Nurse verification did not deny the missing form without recording a signature';
  end if;
end;
$verify$;

-- Submit the form through the student-owned RPC, then record the current Nurse signature.
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
do $verify$
begin
  if (select outcome from public.save_health_record_update(
    '40000000-0000-4000-8000-000000000001', 'No condition reported', null, null,
    null, null, null, 'None reported', null, null
  )) <> 'saved' then
    raise exception 'student-owned health form submission did not save';
  end if;
end;
$verify$;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000007', true);
do $verify$
declare
  v_outcome text;
  v_signature_id uuid := '60000000-0000-4000-8000-000000000001';
  v_signature_hash text := repeat('a', 64);
  v_document_hash text := current_setting('pkm.fixture.health_document_hash');
begin
  select outcome into v_outcome
  from public.verify_health_requirement_with_signature(
    '40000000-0000-4000-8000-000000000001', v_signature_id,
    '40000000-0000-4000-8000-000000000001/NURSE/60000000-0000-4000-8000-000000000001.png',
    v_signature_hash, v_document_hash, true, 'Medical form reviewed'
  );
  if v_outcome <> 'signed' then
    raise exception 'assigned Nurse could not sign the submitted Health Record Update (outcome: %)', v_outcome;
  end if;
end;
$verify$;

reset role;
do $verify$
begin
  if (select status from public.student_requirements
    where student_id = '20000000-0000-4000-8000-000000000001'
      and requirement_code = 'HEALTH_RECORD_UPDATE'
      and academic_year = '2025-2026'
      and semester = '2nd Semester') <> 'VERIFIED' then
    raise exception 'admin requirement verification did not persist';
  end if;
  if (select verified_at from public.student_requirements
    where student_id = '20000000-0000-4000-8000-000000000001'
      and requirement_code = 'HEALTH_RECORD_UPDATE'
      and academic_year = '2025-2026'
      and semester = '2nd Semester') is null then
    raise exception 'admin requirement verification did not set verified_at';
  end if;
  if (select verified_by from public.student_requirements
    where student_id = '20000000-0000-4000-8000-000000000001'
      and requirement_code = 'HEALTH_RECORD_UPDATE'
      and academic_year = '2025-2026'
      and semester = '2nd Semester') <> '00000000-0000-4000-8000-000000000007' then
    raise exception 'Nurse verification did not set verified_by';
  end if;
  if (select count(*) from public.audit_logs
    where target_id = (select id from public.student_requirements
      where student_id = '20000000-0000-4000-8000-000000000001'
        and requirement_code = 'HEALTH_RECORD_UPDATE'
        and academic_year = '2025-2026'
        and semester = '2nd Semester')
      and action = 'NURSE_VERIFY_HEALTH_REQUIREMENT'
  ) <> 1 then
    raise exception 'Nurse requirement audit count was not one';
  end if;
  if not exists (select 1 from public.health_record_updates where enrollment_id = '40000000-0000-4000-8000-000000000001')
    or not private.health_clearance_is_current('40000000-0000-4000-8000-000000000001') then
    raise exception 'submitted form or signed Nurse health clearance is not current';
  end if;
end;
$verify$;

-- Applicable current-term approval is blocked until Registrar verification; no partial review write occurs.
select private.reconcile_health_requirement_for_student('20000000-0000-4000-8000-000000000003');
-- This fixture combines normally separate RPC transactions. End the reconciliation flag here.
select set_config('pkm.health_applicability_reconciliation', 'false', true);
select set_config('pkm.fixture.gate_health_document_hash', private.health_record_document_hash(
  '40000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003',
  '2025-2026', '2nd Semester', 'APPLICABLE', 'VERIFIED'
), true);
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
do $verify$
declare
  v_outcome text;
  v_signature_id uuid := '60000000-0000-4000-8000-000000000002';
  v_signature_hash text := repeat('b', 64);
  v_document_hash text;
begin
  select outcome into v_outcome from public.registrar_review_pending_enrollment(
    '40000000-0000-4000-8000-000000000003', 'APPROVED', null
  );
  if v_outcome <> 'incomplete_clearances' then
    raise exception 'applicable approval was not blocked by requirements (outcome: %)', v_outcome;
  end if;
  perform set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000007', true);
  v_document_hash := current_setting('pkm.fixture.gate_health_document_hash');
  select outcome into v_outcome
  from public.verify_health_requirement_with_signature(
    '40000000-0000-4000-8000-000000000003', v_signature_id,
    '40000000-0000-4000-8000-000000000003/NURSE/60000000-0000-4000-8000-000000000002.png',
    v_signature_hash, v_document_hash, true, 'Required form was not submitted'
  );
  if v_outcome <> 'health_record_not_submitted' then
    raise exception 'Nurse verification did not deny the gate fixture without a submitted form';
  end if;
  if exists (select 1 from public.enrollment_signatures where id = v_signature_id) then
    raise exception 'missing-form denial recorded a Nurse signature for the gate fixture';
  end if;

  perform set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000006', true);
  select outcome into v_outcome
  from public.save_health_record_update(
    '40000000-0000-4000-8000-000000000003', 'No condition reported', null, null,
    null, null, null, 'None reported', null, null
  );
  if v_outcome <> 'saved' then
    raise exception 'gate student could not submit the required Health Record Update';
  end if;

  perform set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000007', true);
  select outcome into v_outcome
  from public.verify_health_requirement_with_signature(
    '40000000-0000-4000-8000-000000000003', v_signature_id,
    '40000000-0000-4000-8000-000000000003/NURSE/60000000-0000-4000-8000-000000000002.png',
    v_signature_hash, v_document_hash, true, 'Medical form reviewed'
  );
  if v_outcome <> 'signed' then
    raise exception 'assigned Nurse could not sign the submitted gate fixture form (outcome: %)', v_outcome;
  end if;

  perform set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
  if (select outcome from public.registrar_review_pending_enrollment(
    '40000000-0000-4000-8000-000000000003', 'APPROVED', null
  )) <> 'incomplete_clearances' then
    raise exception 'Nurse verification bypassed the other required clearances';
  end if;
  if (select outcome from public.registrar_review_pending_enrollment(
    '40000000-0000-4000-8000-000000000003', 'REJECTED', 'Other clearances incomplete'
  )) <> 'rejected' then
    raise exception 'Registrar could not reject the incomplete enrollment';
  end if;
  if (select outcome from public.registrar_review_pending_enrollment(
    '40000000-0000-4000-8000-000000000003', 'REJECTED', 'late call'
  )) <> 'already_reviewed' then
    raise exception 'stale review overwrote decision';
  end if;
end;
$verify$;

reset role;
do $verify$
begin
  if (select status from public.enrollments where id = '40000000-0000-4000-8000-000000000003') <> 'REJECTED' then
    raise exception 'incomplete enrollment did not persist rejection';
  end if;
  if (select count(*) from public.audit_logs
    where target_id = '40000000-0000-4000-8000-000000000003' and action = 'REJECT_ENROLLMENT'
  ) <> 1 then
    raise exception 'rejection audit count was not one';
  end if;
  if (select count(*) from public.enrollment_decision_notifications
    where enrollment_id = '40000000-0000-4000-8000-000000000003'
      and decision = 'REJECTED'
      and status = 'PENDING'
  ) <> 1 then
    raise exception 'rejected enrollment did not create one pending notification';
  end if;
end;
$verify$;

-- Non-applicable students still require all six current clearances.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
do $verify$
begin
  if (select outcome from public.registrar_review_pending_enrollment(
    '40000000-0000-4000-8000-000000000002', 'APPROVED', null
  )) <> 'incomplete_clearances' then
    raise exception 'non-applicable enrollment bypassed required clearances';
  end if;
  if (select outcome from public.registrar_review_pending_enrollment(
    '40000000-0000-4000-8000-000000000002', 'REJECTED', 'Other clearances incomplete'
  )) <> 'rejected' then
    raise exception 'non-applicable enrollment could not be rejected';
  end if;
  if (select count(*) from public.enrollment_decision_notifications
    where enrollment_id = '40000000-0000-4000-8000-000000000002'
      and decision = 'REJECTED'
      and status = 'PENDING'
  ) <> 1 then
    raise exception 'rejected non-applicable enrollment did not create one pending notification';
  end if;
end;
$verify$;

-- PULL OUT is reversible, records the prior status and actor, and retains student and subject rows.
do $verify$
declare
  v_rejected integer;
  v_pulled integer;
  v_already_pulled integer;
  v_reinstate_outcome text;
begin
  select count(*) into v_rejected
  from public.registrar_bulk_review_enrollments(
    array[
      '40000000-0000-4000-8000-000000000001',
      '40000000-0000-4000-8000-000000000004'
    ]::uuid[], 'REJECTED', 'Rejected before pull out'
  ) where outcome = 'rejected';
  if v_rejected <> 2 then
    raise exception 'authenticated Registrar bulk rejection did not process both pending records';
  end if;
  if (select outcome from public.pull_out_enrollments(
    array['40000000-0000-4000-8000-000000000004']::uuid[], 'Rejected enrollment pull out'
  )) <> 'pulled_out' then
    raise exception 'rejected enrollment could not be marked PULL OUT';
  end if;

  select count(*) into v_pulled
  from public.pull_out_enrollments(
    array[
      '40000000-0000-4000-8000-000000000001',
      '40000000-0000-4000-8000-000000000004'
    ]::uuid[], 'Mixed bulk pull out'
  ) where outcome = 'pulled_out';
  select count(*) into v_already_pulled
  from public.enrollment_status_events
  where enrollment_id = '40000000-0000-4000-8000-000000000004'
    and event_type = 'PULLED_OUT'
    and from_status = 'REJECTED'
    and actor_profile_id = '00000000-0000-4000-8000-000000000001'
    and reason = 'Rejected enrollment pull out'
    and created_at is not null;
  if v_pulled <> 1 or v_already_pulled <> 1 then
    raise exception 'bulk PULL OUT did not report one change and retain one already-pulled record';
  end if;
  if (select status from public.enrollments where id = '40000000-0000-4000-8000-000000000001') <> 'PULLED_OUT'
    or (select status from public.enrollments where id = '40000000-0000-4000-8000-000000000004') <> 'PULLED_OUT'
    or not exists (select 1 from public.students where id = '20000000-0000-4000-8000-000000000001')
    or not exists (select 1 from public.enrollments where id = '40000000-0000-4000-8000-000000000001')
    or (select count(*) from public.enrollment_subjects where enrollment_id = '40000000-0000-4000-8000-000000000001') <> 1 then
    raise exception 'PULL OUT deleted student, enrollment, or subject history';
  end if;
  select outcome into v_reinstate_outcome from public.reinstate_enrollments(array['40000000-0000-4000-8000-000000000001']::uuid[]);
  if v_reinstate_outcome <> 'reinstated'
    or (select status from public.enrollments where id = '40000000-0000-4000-8000-000000000001') <> 'REJECTED'
    or not exists (
      select 1 from public.enrollment_status_events
      where enrollment_id = '40000000-0000-4000-8000-000000000001'
        and event_type = 'REINSTATED' and from_status = 'PULLED_OUT' and to_status = 'REJECTED'
    ) then
    raise exception 'rejected enrollment status could not be restored from retained event history';
  end if;
  if has_table_privilege(current_user, 'public.enrollments', 'UPDATE')
    or has_table_privilege(current_user, 'public.enrollment_subjects', 'UPDATE') then
    raise exception 'authenticated Registrar can directly edit enrollment content';
  end if;
end;
$verify$;

-- An assigned official must not gain Registrar approval or PULL OUT access through shared admin identity.
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000007', true);
do $verify$
begin
  if (select outcome from public.registrar_review_pending_enrollment(
    '40000000-0000-4000-8000-000000000001', 'APPROVED', null
  )) <> 'unauthorized' then
    raise exception 'assigned Nurse could invoke Registrar review';
  end if;
  if (select outcome from public.registrar_bulk_review_enrollments(
    array['40000000-0000-4000-8000-000000000002']::uuid[], 'REJECTED', null
  )) <> 'unauthorized' then
    raise exception 'assigned Nurse could invoke Registrar bulk review';
  end if;
  if (select outcome from public.pull_out_enrollments(
    array['40000000-0000-4000-8000-000000000001']::uuid[], 'Should be denied'
  )) <> 'unauthorized' then
    raise exception 'assigned Nurse could invoke Registrar PULL OUT';
  end if;
end;
$verify$;

-- Service-only setup-email reservation: first call reserves; second call is held by cooldown.
reset role;
set local role service_role;
do $verify$
begin
  if (select outcome from public.reserve_student_setup_email_delivery(
    '00000000-0000-4000-8000-000000000005'
  )) <> 'reserved' then
    raise exception 'first setup email reservation failed';
  end if;
  if (select outcome from public.reserve_student_setup_email_delivery(
    '00000000-0000-4000-8000-000000000005'
  )) <> 'cooldown' then
    raise exception 'setup email cooldown did not hold';
  end if;
end;
$verify$;

rollback;
