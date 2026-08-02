-- Run only against a disposable local Supabase database.
-- Every fictional row is rolled back at the end of this script.

begin;

insert into auth.users (
  id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-4100-8000-000000000001', 'authenticated', 'authenticated', 'multi.bsais@example.test', 'not-used', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4100-8000-000000000002', 'authenticated', 'authenticated', 'multi.bsma@example.test', 'not-used', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4100-8000-000000000003', 'authenticated', 'authenticated', 'multi.beed@example.test', 'not-used', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4100-8000-000000000004', 'authenticated', 'authenticated', 'multi.transferee@example.test', 'not-used', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4100-8000-000000000005', 'authenticated', 'authenticated', 'multi.unconfigured@example.test', 'not-used', '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.profiles (id, role, first_name, last_name, email, account_status)
values
  ('00000000-0000-4100-8000-000000000001', 'student', 'Multi', 'BSAIS', 'multi.bsais@example.test', 'ACTIVE'),
  ('00000000-0000-4100-8000-000000000002', 'student', 'Multi', 'BSMA', 'multi.bsma@example.test', 'ACTIVE'),
  ('00000000-0000-4100-8000-000000000003', 'student', 'Multi', 'BEED', 'multi.beed@example.test', 'ACTIVE'),
  ('00000000-0000-4100-8000-000000000004', 'student', 'Multi', 'Transferee', 'multi.transferee@example.test', 'ACTIVE'),
  ('00000000-0000-4100-8000-000000000005', 'student', 'Multi', 'Unconfigured', 'multi.unconfigured@example.test', 'ACTIVE');

do $fixture$
declare
  v_bsais uuid;
  v_bsma uuid;
  v_beed uuid;
  v_crim uuid;
begin
  select id into v_bsais from public.programs where code = 'BSAIS' limit 1;
  select id into v_bsma from public.programs where code = 'BSMA' limit 1;
  select id into v_beed from public.programs where code = 'BEED' limit 1;
  select id into v_crim from public.programs where code = 'CRIM' limit 1;

  if v_bsais is null or v_bsma is null or v_beed is null or v_crim is null then
    raise exception 'FAIL: canonical programs required by the multi-program fixture are missing';
  end if;

  if not exists (
    select 1 from public.enrollment_terms
    where academic_year = '2026-2027' and semester = '1st Semester'
      and is_active = true and enrollment_open = true
  ) then
    raise exception 'FAIL: current open enrollment term is missing';
  end if;

  perform set_config('pkm.fixture.bsais_id', v_bsais::text, true);
  perform set_config('pkm.fixture.bsma_id', v_bsma::text, true);
  perform set_config('pkm.fixture.beed_id', v_beed::text, true);
  perform set_config('pkm.fixture.crim_id', v_crim::text, true);
end;
$fixture$;

insert into public.students (id, profile_id, student_id_number, program_id, year_level, student_type, enrollment_status)
values
  ('10000000-0000-4100-8000-000000000001', '00000000-0000-4100-8000-000000000001', 'MP-00001', current_setting('pkm.fixture.bsais_id')::uuid, '1st Year', 'Incoming 1st Year Student', 'NOT ENROLLED'),
  ('10000000-0000-4100-8000-000000000002', '00000000-0000-4100-8000-000000000002', 'MP-00002', current_setting('pkm.fixture.bsma_id')::uuid, '1st Year', 'Regular Student', 'NOT ENROLLED'),
  ('10000000-0000-4100-8000-000000000003', '00000000-0000-4100-8000-000000000003', 'MP-00003', current_setting('pkm.fixture.beed_id')::uuid, '1st Year', 'Continuing Student', 'NOT ENROLLED'),
  ('10000000-0000-4100-8000-000000000004', '00000000-0000-4100-8000-000000000004', 'MP-00004', current_setting('pkm.fixture.bsma_id')::uuid, '1st Year', 'Transferee', 'NOT ENROLLED'),
  ('10000000-0000-4100-8000-000000000005', '00000000-0000-4100-8000-000000000005', 'MP-00005', current_setting('pkm.fixture.crim_id')::uuid, '1st Year', 'Old Student', 'NOT ENROLLED');

insert into public.course_offerings (
  id, program_id, academic_year, semester, year_level, course_code, course_description, units, source_document
)
values
  ('20000000-0000-4100-8000-000000000001', current_setting('pkm.fixture.bsais_id')::uuid, '2026-2027', '1st Semester', '1st Year', 'MP-BSAIS-1', 'Fictional BSAIS fixture course one', 3, 'LOCAL_MULTI_PROGRAM_FIXTURE'),
  ('20000000-0000-4100-8000-000000000002', current_setting('pkm.fixture.bsais_id')::uuid, '2026-2027', '1st Semester', '1st Year', 'MP-BSAIS-2', 'Fictional BSAIS fixture course two', 3, 'LOCAL_MULTI_PROGRAM_FIXTURE'),
  ('20000000-0000-4100-8000-000000000003', current_setting('pkm.fixture.bsma_id')::uuid, '2026-2027', '1st Semester', '1st Year', 'MP-BSMA-1', 'Fictional BSMA fixture course one', 3, 'LOCAL_MULTI_PROGRAM_FIXTURE'),
  ('20000000-0000-4100-8000-000000000004', current_setting('pkm.fixture.bsma_id')::uuid, '2026-2027', '1st Semester', '1st Year', 'MP-BSMA-2', 'Fictional BSMA fixture course two', 3, 'LOCAL_MULTI_PROGRAM_FIXTURE'),
  ('20000000-0000-4100-8000-000000000005', current_setting('pkm.fixture.beed_id')::uuid, '2026-2027', '1st Semester', '1st Year', 'MP-BEED-1', 'Fictional BEED fixture course one', 3, 'LOCAL_MULTI_PROGRAM_FIXTURE'),
  ('20000000-0000-4100-8000-000000000006', current_setting('pkm.fixture.beed_id')::uuid, '2026-2027', '1st Semester', '1st Year', 'MP-BEED-2', 'Fictional BEED fixture course two', 3, 'LOCAL_MULTI_PROGRAM_FIXTURE');

insert into public.standard_load_sets (
  id, program_id, academic_year, semester, year_level, status, expected_course_count, expected_total_units, source_document
)
values
  ('30000000-0000-4100-8000-000000000001', current_setting('pkm.fixture.bsais_id')::uuid, '2026-2027', '1st Semester', '1st Year', 'ACTIVE', 2, 6, 'LOCAL_MULTI_PROGRAM_FIXTURE'),
  ('30000000-0000-4100-8000-000000000002', current_setting('pkm.fixture.bsma_id')::uuid, '2026-2027', '1st Semester', '1st Year', 'ACTIVE', 2, 6, 'LOCAL_MULTI_PROGRAM_FIXTURE'),
  ('30000000-0000-4100-8000-000000000003', current_setting('pkm.fixture.beed_id')::uuid, '2026-2027', '1st Semester', '1st Year', 'ACTIVE', 2, 6, 'LOCAL_MULTI_PROGRAM_FIXTURE');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4100-8000-000000000001', true);

do $verify$
declare
  v_outcome text;
  v_enrollment_id uuid;
  v_count integer;
begin
  select outcome, enrollment_id, attached_subject_count
  into v_outcome, v_enrollment_id, v_count
  from public.submit_standard_student_enrollment('2026-2027', '1st Semester');
  if v_outcome <> 'submitted' or v_enrollment_id is null or v_count <> 2 then
    raise exception 'BSAIS standard-load submission failed: %, % attachments', v_outcome, v_count;
  end if;
  select count(*) into v_count from public.enrollment_subjects where enrollment_id = v_enrollment_id;
  if v_count <> 2
    or exists (select 1 from public.enrollment_subjects where enrollment_id = v_enrollment_id and subject_id is not null)
    or coalesce(
      (select array_agg(es.course_offering_id order by es.course_offering_id)
       from public.enrollment_subjects es
       where es.enrollment_id = v_enrollment_id),
      '{}'::uuid[]
    ) <> array[
      '20000000-0000-4100-8000-000000000001'::uuid,
      '20000000-0000-4100-8000-000000000002'::uuid
    ] then
    raise exception 'BSAIS attachment source, exact set, or count is incorrect';
  end if;
  if exists (
    select 1
    from public.enrollment_subjects es
    join public.course_offerings co on co.id = es.course_offering_id
    where es.enrollment_id = v_enrollment_id
      and (es.course_code <> co.course_code or es.course_description <> co.course_description or es.units <> co.units)
  ) then
    raise exception 'BSAIS attachment snapshots are incorrect';
  end if;
end;
$verify$;

do $verify$
begin
  if (select outcome from public.submit_standard_student_enrollment('2026-2027', '1st Semester')) <> 'duplicate' then
    raise exception 'BSAIS duplicate submission was not rejected';
  end if;
end;
$verify$;

select set_config('request.jwt.claim.sub', '00000000-0000-4100-8000-000000000002', true);
do $verify$
declare
  v_outcome text;
  v_enrollment_id uuid;
  v_count integer;
begin
  select outcome, enrollment_id, attached_subject_count
  into v_outcome, v_enrollment_id, v_count
  from public.submit_standard_student_enrollment('2026-2027', '1st Semester');
  if v_outcome <> 'submitted' or v_enrollment_id is null or v_count <> 2 then
    raise exception 'BSMA standard-load submission failed';
  end if;
  if coalesce(
    (select array_agg(es.course_offering_id order by es.course_offering_id)
     from public.enrollment_subjects es
     where es.enrollment_id = v_enrollment_id),
    '{}'::uuid[]
  ) <> array[
    '20000000-0000-4100-8000-000000000003'::uuid,
    '20000000-0000-4100-8000-000000000004'::uuid
  ] then
    raise exception 'BSMA attachment set is incorrect';
  end if;
  if exists (
    select 1
    from public.enrollment_subjects es
    join public.course_offerings co on co.id = es.course_offering_id
    where es.enrollment_id = v_enrollment_id
      and (es.subject_id is not null or es.course_code <> co.course_code or es.course_description <> co.course_description or es.units <> co.units)
  ) then
    raise exception 'BSMA attachment snapshots are incorrect';
  end if;
end;
$verify$;

select set_config('request.jwt.claim.sub', '00000000-0000-4100-8000-000000000003', true);
do $verify$
declare
  v_outcome text;
  v_enrollment_id uuid;
  v_count integer;
begin
  select outcome, enrollment_id, attached_subject_count
  into v_outcome, v_enrollment_id, v_count
  from public.submit_standard_student_enrollment('2026-2027', '1st Semester');
  if v_outcome <> 'submitted' or v_enrollment_id is null or v_count <> 2 then
    raise exception 'BEED standard-load submission failed';
  end if;
  if coalesce(
    (select array_agg(es.course_offering_id order by es.course_offering_id)
     from public.enrollment_subjects es
     where es.enrollment_id = v_enrollment_id),
    '{}'::uuid[]
  ) <> array[
    '20000000-0000-4100-8000-000000000005'::uuid,
    '20000000-0000-4100-8000-000000000006'::uuid
  ] then
    raise exception 'BEED attachment set is incorrect';
  end if;
  if exists (
    select 1
    from public.enrollment_subjects es
    join public.course_offerings co on co.id = es.course_offering_id
    where es.enrollment_id = v_enrollment_id
      and (es.subject_id is not null or es.course_code <> co.course_code or es.course_description <> co.course_description or es.units <> co.units)
  ) then
    raise exception 'BEED attachment snapshots are incorrect';
  end if;
end;
$verify$;

select set_config('request.jwt.claim.sub', '00000000-0000-4100-8000-000000000004', true);
do $verify$
begin
  if (select outcome from public.submit_standard_student_enrollment('2026-2027', '1st Semester')) <> 'registrar_managed_load' then
    raise exception 'Transferee was not routed to Registrar-managed loading';
  end if;
end;
$verify$;

select set_config('request.jwt.claim.sub', '00000000-0000-4100-8000-000000000005', true);
do $verify$
begin
  if (select outcome from public.submit_standard_student_enrollment('2026-2027', '1st Semester')) <> 'no_configured_load' then
    raise exception 'Unconfigured program did not fail closed';
  end if;
end;
$verify$;

select set_config('request.jwt.claim.sub', '00000000-0000-4100-8000-000000000001', true);
do $verify$
begin
  if (select outcome from public.submit_standard_student_enrollment('2025-2026', '2nd Semester')) <> 'term_not_open' then
    raise exception 'Mismatched term was not rejected';
  end if;
end;
$verify$;

reset role;
do $verify$
declare
  v_attached integer;
begin
  select count(*) into v_attached
  from public.enrollment_subjects es
  join public.enrollments e on e.id = es.enrollment_id
  where e.academic_year = '2026-2027' and e.semester = '1st Semester';
  if v_attached <> 6 then
    raise exception 'Expected six fictional offering-backed attachment rows, found %', v_attached;
  end if;
end;
$verify$;

rollback;
