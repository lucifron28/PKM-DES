BEGIN;
SELECT plan(7);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
values
  (
    'a1000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'registrar-load-test@example.invalid', '',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Load","last_name":"Test Registrar"}'::jsonb,
    now(), now(), false, false
  ),
  (
    'a1000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'crim-third-year-test@example.invalid', '',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Third","last_name":"Year Test"}'::jsonb,
    now(), now(), false, false
  ),
  (
    'a1000000-0000-4000-8000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'crim-first-year-test@example.invalid', '',
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"First","last_name":"Year Test"}'::jsonb,
    now(), now(), false, false
  );

insert into public.profiles (id, role, first_name, last_name, email, account_status)
values
  ('a1000000-0000-4000-8000-000000000001', 'admin', 'Load', 'Test Registrar', 'registrar-load-test@example.invalid', 'ACTIVE'),
  ('a1000000-0000-4000-8000-000000000002', 'student', 'Third', 'Year Test', 'crim-third-year-test@example.invalid', 'ACTIVE'),
  ('a1000000-0000-4000-8000-000000000003', 'student', 'First', 'Year Test', 'crim-first-year-test@example.invalid', 'ACTIVE');

insert into public.students (id, profile_id, student_id_number, program_id, year_level, student_type)
select
  'a2000000-0000-4000-8000-000000000001',
  'a1000000-0000-4000-8000-000000000002',
  'QA-CRIM-3RD',
  program.id,
  '3rd Year',
  'Regular Student'
from public.programs program where program.code = 'CRIM';

insert into public.students (id, profile_id, student_id_number, program_id, year_level, student_type)
select
  'a2000000-0000-4000-8000-000000000002',
  'a1000000-0000-4000-8000-000000000003',
  'QA-CRIM-1ST',
  program.id,
  '1st Year',
  'Regular Student'
from public.programs program where program.code = 'CRIM';

create temporary table crim_test_offering on commit drop as
select offering.id, offering.course_code
from public.course_offerings offering
join public.programs program on program.id = offering.program_id
join public.enrollment_terms term
  on term.academic_year = offering.academic_year
  and term.semester = offering.semester
  and term.is_active
where program.code = 'CRIM'
  and offering.year_level = '1st Year'
order by offering.course_code
limit 1;

create temporary table registrar_load_test_results (
  case_name text not null,
  outcome text not null,
  enrollment_id uuid,
  subject_count integer
) on commit drop;

select set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

insert into registrar_load_test_results
select 'missing-third-year-load', result.outcome, result.enrollment_id, result.subject_count
from public.registrar_create_irregular_enrollment(
  'a2000000-0000-4000-8000-000000000001',
  (select array_agg(id) from crim_test_offering)
) as result;

select is(
  (select outcome from registrar_load_test_results where case_name = 'missing-third-year-load'),
  'created',
  'Registrar can create a pending request when a standard student has no configured year-level load'
);

select is(
  (select enrollment.year_level from public.enrollments enrollment join registrar_load_test_results result on result.enrollment_id = enrollment.id where result.case_name = 'missing-third-year-load'),
  '3rd Year',
  'the created enrollment keeps the student’s saved third-year level'
);

select is(
  (select student.student_type from public.students student where student.id = 'a2000000-0000-4000-8000-000000000001'),
  'Regular Student',
  'the student’s saved classification remains unchanged'
);

select is(
  (select enrollment_subject.course_code from public.enrollment_subjects enrollment_subject join registrar_load_test_results result on result.enrollment_id = enrollment_subject.enrollment_id where result.case_name = 'missing-third-year-load'),
  (select course_code from crim_test_offering),
  'the request attaches a course from an existing active-term CRIM offering'
);

insert into registrar_load_test_results
select 'complete-standard-load', result.outcome, result.enrollment_id, result.subject_count
from public.registrar_create_irregular_enrollment(
  'a2000000-0000-4000-8000-000000000002',
  (select array_agg(id) from crim_test_offering)
) as result;

select is(
  (select outcome from registrar_load_test_results where case_name = 'complete-standard-load'),
  'standard_load_available',
  'Registrar-managed assignment is rejected when a complete standard load exists'
);

select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{}', true);

insert into registrar_load_test_results
select 'unauthenticated', result.outcome, result.enrollment_id, result.subject_count
from public.registrar_create_irregular_enrollment(
  'a2000000-0000-4000-8000-000000000001',
  (select array_agg(id) from crim_test_offering)
) as result;

select is(
  (select outcome from registrar_load_test_results where case_name = 'unauthenticated'),
  'unauthorized',
  'the database routine rejects an unauthenticated assignment attempt'
);

select is(
  (select count(*) from public.enrollment_subjects enrollment_subject join registrar_load_test_results result on result.enrollment_id = enrollment_subject.enrollment_id where result.case_name = 'missing-third-year-load'),
  1::bigint,
  'exactly the selected existing course is attached'
);

SELECT * FROM finish();
ROLLBACK;
