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
  ('00000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'resend.student@example.test', 'not-used', '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.profiles (id, role, first_name, last_name, email, account_status)
values
  ('00000000-0000-4000-8000-000000000001', 'admin', 'Demo', 'Registrar', 'registrar@example.test', 'ACTIVE'),
  ('00000000-0000-4000-8000-000000000002', 'student', 'Applicable', 'Student', 'applicable.student@example.test', 'ACTIVE'),
  ('00000000-0000-4000-8000-000000000003', 'student', 'Nonapplicable', 'Student', 'nonapplicable.student@example.test', 'ACTIVE'),
  ('00000000-0000-4000-8000-000000000004', 'student', 'Setup', 'Student', 'setup.student@example.test', 'SETUP'),
  ('00000000-0000-4000-8000-000000000005', 'student', 'Resend', 'Student', 'resend.student@example.test', 'SETUP');

insert into public.programs (id, name, code)
values ('10000000-0000-4000-8000-000000000001', 'Bachelor of Science in Accounting Information System', 'BSAIS');

insert into public.students (id, profile_id, student_id_number, program_id, year_level, student_type, enrollment_status)
values
  ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', '26-00001', '10000000-0000-4000-8000-000000000001', '1st Year', 'Incoming 1st Year Student', 'NOT ENROLLED'),
  ('20000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003', '26-00002', '10000000-0000-4000-8000-000000000001', '1st Year', 'Old Student', 'NOT ENROLLED');

insert into public.official_student_records (
  student_id_number, first_name, last_name, email, program_id, year_level, student_type, gender_sex, enrollment_status
)
values
  ('26-00001', 'Applicable', 'Student', 'applicable.student@example.test', '10000000-0000-4000-8000-000000000001', '1st Year', 'Incoming 1st Year Student', 'Female', 'NOT ENROLLED'),
  ('26-00002', 'Nonapplicable', 'Student', 'nonapplicable.student@example.test', '10000000-0000-4000-8000-000000000001', '1st Year', 'Old Student', null, 'NOT ENROLLED');

insert into public.subjects (id, program_id, course_code, course_description, units, year_level, semester)
values ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'TEST-101', 'Local verification subject', 3, '1st Year', '1st Semester');

insert into public.enrollments (id, student_id, program_id, year_level, academic_year, semester, status)
values
  ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '1st Year', '2026-2027', '1st Semester', 'PENDING'),
  ('40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '1st Year', '2026-2027', '1st Semester', 'PENDING');

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

reset role;
do $verify$
begin
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

-- Student RLS: owner can read own requirement rows but cannot mutate them or invoke admin verification.
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
do $verify$
declare
  direct_update_denied boolean := false;
begin
  begin
    update public.student_requirements
    set status = 'VERIFIED'
    where student_id = '20000000-0000-4000-8000-000000000001';
  exception
    when insufficient_privilege then
      direct_update_denied := true;
  end;
  if not direct_update_denied then
    raise exception 'student bypassed requirement update RLS';
  end if;
  if (select outcome from public.update_enrollment_requirement_status(
    '40000000-0000-4000-8000-000000000001', 'HEALTH_RECORD_UPDATE', 'VERIFIED', null
  )) <> 'unauthorized' then
    raise exception 'student invoked admin requirement function';
  end if;
end;
$verify$;

-- Applicable current-term approval is blocked until Registrar verification; no partial review write occurs.
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
do $verify$
begin
  if (select outcome from public.review_pending_enrollment(
    '40000000-0000-4000-8000-000000000001', 'APPROVED', null
  )) <> 'unverified_requirements' then
    raise exception 'applicable approval was not blocked';
  end if;
  if (select outcome from public.update_enrollment_requirement_status(
    '40000000-0000-4000-8000-000000000001', 'HEALTH_RECORD_UPDATE', 'VERIFIED', 'Paper form checked'
  )) <> 'updated' then
    raise exception 'admin could not verify applicable requirement';
  end if;
  if (select outcome from public.review_pending_enrollment(
    '40000000-0000-4000-8000-000000000001', 'APPROVED', null
  )) <> 'approved' then
    raise exception 'verified applicable enrollment did not approve';
  end if;
  if (select outcome from public.review_pending_enrollment(
    '40000000-0000-4000-8000-000000000001', 'REJECTED', 'late call'
  )) <> 'already_reviewed' then
    raise exception 'stale review overwrote decision';
  end if;
end;
$verify$;

reset role;
do $verify$
begin
  if (select status from public.enrollments where id = '40000000-0000-4000-8000-000000000001') <> 'APPROVED' then
    raise exception 'verified applicable enrollment did not persist approval';
  end if;
  if (select count(*) from public.audit_logs
    where target_id = '40000000-0000-4000-8000-000000000001' and action = 'APPROVE_ENROLLMENT'
  ) <> 1 then
    raise exception 'approval audit count was not one';
  end if;
end;
$verify$;

-- Non-applicable student is not blocked by Health Record Update.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
do $verify$
begin
  if (select outcome from public.review_pending_enrollment(
    '40000000-0000-4000-8000-000000000002', 'APPROVED', null
  )) <> 'approved' then
    raise exception 'non-applicable enrollment was blocked';
  end if;
end;
$verify$;

-- Service-only resend reservation: first call reserves; second call is held by cooldown.
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
