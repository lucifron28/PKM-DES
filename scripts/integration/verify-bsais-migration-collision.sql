-- Disposable local SQL verification fixture for BSAIS program alias migration.
-- Calls the actual private.normalize_bsais_programs() function.
-- All fictional data is rolled back at the end.

begin;

do $fixture$
declare
  v_bsais_id uuid;
  v_subject_count integer;
  v_offering_count integer;
begin
  select id into v_bsais_id
  from public.programs
  where code = 'BSAIS'
  limit 1;

  if v_bsais_id is null then
    raise exception 'FAIL: no canonical BSAIS program found from existing migrations';
  end if;

  perform set_config('pkm.fixture.bsais_id', v_bsais_id::text, true);
  select count(*) into v_subject_count from public.subjects where program_id = v_bsais_id;
  select count(*) into v_offering_count from public.course_offerings where program_id = v_bsais_id;
  perform set_config('pkm.fixture.initial_subject_count', v_subject_count::text, true);
  perform set_config('pkm.fixture.initial_offering_count', v_offering_count::text, true);
end;
$fixture$;

insert into auth.users (id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'test.bsais@example.test', 'not-used', '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'test.beed@example.test', 'not-used', '{}'::jsonb, '{}'::jsonb, now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, role, first_name, last_name, email, account_status)
values
  ('00000000-0000-4000-8000-000000000001', 'student', 'Test', 'BSAIS', 'test.bsais@example.test', 'ACTIVE'),
  ('00000000-0000-4000-8000-000000000002', 'student', 'Test', 'BEED', 'test.beed@example.test', 'ACTIVE')
on conflict (id) do nothing;

insert into public.programs (id, name, code)
values
  ('aaaaaaaa-aaaa-4000-8000-000000000002', 'Accounting Information System', 'AIS'),
  ('aaaaaaaa-aaaa-4000-8000-000000000003', 'Bachelor of Science in Accounting Information System', 'bsais'),
  ('aaaaaaaa-aaaa-4000-8000-000000000004', 'Accounting Information System', ' BSAIS '),
  ('aaaaaaaa-aaaa-4000-8000-000000000005', 'Accounting Information Systems', 'AIS-LEGACY'),
  ('aaaaaaaa-aaaa-4000-8000-000000000006', 'Bachelor of Elementary Education', 'BEED')
on conflict (id) do nothing;

insert into public.students (id, profile_id, student_id_number, program_id, year_level, student_type, enrollment_status)
values
  ('dddddddd-dddd-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '99-00001', current_setting('pkm.fixture.bsais_id')::uuid, '1st Year', 'Incoming 1st Year Student', 'NOT ENROLLED'),
  ('dddddddd-dddd-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', '99-00002', 'aaaaaaaa-aaaa-4000-8000-000000000006', '1st Year', 'Incoming 1st Year Student', 'NOT ENROLLED')
on conflict (id) do nothing;

insert into public.enrollments (id, student_id, program_id, year_level, academic_year, semester, status)
values
  ('eeeeeeee-eeee-4000-8000-000000000001', 'dddddddd-dddd-4000-8000-000000000001', current_setting('pkm.fixture.bsais_id')::uuid, '1st Year', '2026-2027', '1st Semester', 'PENDING'),
  ('eeeeeeee-eeee-4000-8000-000000000002', 'dddddddd-dddd-4000-8000-000000000002', 'aaaaaaaa-aaaa-4000-8000-000000000006', '1st Year', '2026-2027', '1st Semester', 'PENDING')
on conflict (id) do nothing;

-- Canonical ACT-101 plus three alias copies: canonical ID must survive.
insert into public.subjects (id, program_id, course_code, course_description, units, year_level, semester)
values
  ('bbbbbbbb-bbbb-4000-8000-000000000001', current_setting('pkm.fixture.bsais_id')::uuid, 'ACT-101', 'Accounting Principles I', 3, '1st Year', '1st Semester'),
  ('bbbbbbbb-bbbb-4000-8000-000000000002', 'aaaaaaaa-aaaa-4000-8000-000000000002', 'ACT-101', 'Accounting Principles I', 3, '1st Year', '1st Semester'),
  ('bbbbbbbb-bbbb-4000-8000-000000000003', 'aaaaaaaa-aaaa-4000-8000-000000000003', 'ACT-101', 'Accounting Principles I', 3, '1st Year', '1st Semester'),
  ('bbbbbbbb-bbbb-4000-8000-000000000004', 'aaaaaaaa-aaaa-4000-8000-000000000004', 'ACT-101', 'Accounting Principles I', 3, '1st Year', '1st Semester'),
  ('bbbbbbbb-bbbb-4000-8000-000000000005', 'aaaaaaaa-aaaa-4000-8000-000000000002', 'ACT-104', 'Cost Accounting', 3, '2nd Year', '1st Semester'),
  ('bbbbbbbb-bbbb-4000-8000-000000000006', 'aaaaaaaa-aaaa-4000-8000-000000000003', 'ACT-104', 'Cost Accounting', 3, '2nd Year', '1st Semester'),
  ('bbbbbbbb-bbbb-4000-8000-000000000007', 'aaaaaaaa-aaaa-4000-8000-000000000004', 'ACT-104', 'Cost Accounting', 3, '2nd Year', '1st Semester'),
  ('bbbbbbbb-bbbb-4000-8000-000000000008', 'aaaaaaaa-aaaa-4000-8000-000000000005', 'ACT-106', 'Accounting Research', 3, '3rd Year', '1st Semester'),
  ('bbbbbbbb-bbbb-4000-8000-000000000009', 'aaaaaaaa-aaaa-4000-8000-000000000002', 'ACT-106', 'Accounting Research', 3, '3rd Year', '1st Semester'),
  ('bbbbbbbb-bbbb-4000-8000-000000000010', 'aaaaaaaa-aaaa-4000-8000-000000000006', 'EED-101', 'Teaching Reading', 3, '1st Year', '1st Semester')
on conflict (id) do nothing;

insert into public.enrollment_subjects (id, enrollment_id, subject_id)
values
  ('ffffffff-ffff-4000-8000-000000000001', 'eeeeeeee-eeee-4000-8000-000000000002', 'bbbbbbbb-bbbb-4000-8000-000000000010'),
  ('ffffffff-ffff-4000-8000-000000000002', 'eeeeeeee-eeee-4000-8000-000000000001', 'bbbbbbbb-bbbb-4000-8000-000000000001'),
  ('ffffffff-ffff-4000-8000-000000000003', 'eeeeeeee-eeee-4000-8000-000000000001', 'bbbbbbbb-bbbb-4000-8000-000000000002'),
  ('ffffffff-ffff-4000-8000-000000000004', 'eeeeeeee-eeee-4000-8000-000000000001', 'bbbbbbbb-bbbb-4000-8000-000000000003'),
  ('ffffffff-ffff-4000-8000-000000000005', 'eeeeeeee-eeee-4000-8000-000000000001', 'bbbbbbbb-bbbb-4000-8000-000000000004'),
  ('ffffffff-ffff-4000-8000-000000000006', 'eeeeeeee-eeee-4000-8000-000000000001', 'bbbbbbbb-bbbb-4000-8000-000000000005'),
  ('ffffffff-ffff-4000-8000-000000000007', 'eeeeeeee-eeee-4000-8000-000000000001', 'bbbbbbbb-bbbb-4000-8000-000000000006'),
  ('ffffffff-ffff-4000-8000-000000000008', 'eeeeeeee-eeee-4000-8000-000000000001', 'bbbbbbbb-bbbb-4000-8000-000000000007')
on conflict (id) do nothing;

-- Compatible duplicate grades for ACT-104 plus a deliberately conflicting pair for ACT-106.
insert into public.grades (id, student_id, subject_id, grade, remarks)
values
  ('11111111-1111-4000-8000-000000000001', 'dddddddd-dddd-4000-8000-000000000001', 'bbbbbbbb-bbbb-4000-8000-000000000005', '1.50', 'Passed'),
  ('11111111-1111-4000-8000-000000000002', 'dddddddd-dddd-4000-8000-000000000001', 'bbbbbbbb-bbbb-4000-8000-000000000006', '1.50', 'Passed'),
  ('11111111-1111-4000-8000-000000000003', 'dddddddd-dddd-4000-8000-000000000001', 'bbbbbbbb-bbbb-4000-8000-000000000008', '2.00', 'Passed'),
  ('11111111-1111-4000-8000-000000000004', 'dddddddd-dddd-4000-8000-000000000001', 'bbbbbbbb-bbbb-4000-8000-000000000009', '2.50', 'Passed')
on conflict (id) do nothing;

insert into public.class_schedules (id, subject_id, day, time, room)
values
  ('22222222-2222-4000-8000-000000000001', 'bbbbbbbb-bbbb-4000-8000-000000000006', 'Mon', '08:00-09:00', 'RM-101'),
  ('22222222-2222-4000-8000-000000000002', 'bbbbbbbb-bbbb-4000-8000-000000000007', 'Tue', '09:00-10:00', 'RM-102'),
  ('22222222-2222-4000-8000-000000000003', 'bbbbbbbb-bbbb-4000-8000-000000000009', 'Wed', '10:00-11:00', 'RM-103')
on conflict (id) do nothing;

insert into public.course_offerings (id, program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
values
  ('33333333-3333-4000-8000-000000000001', current_setting('pkm.fixture.bsais_id')::uuid, '2025-2026', '2nd Semester', '1st Year', 'ACT-101', 'Accounting Principles I', 3, 'LIST 1.xlsx'),
  ('33333333-3333-4000-8000-000000000002', 'aaaaaaaa-aaaa-4000-8000-000000000002', '2025-2026', '2nd Semester', '1st Year', 'ACT-101', 'Accounting Principles I', 3, 'LIST 1.xlsx'),
  ('33333333-3333-4000-8000-000000000003', 'aaaaaaaa-aaaa-4000-8000-000000000003', '2025-2026', '2nd Semester', '1st Year', 'ACT-101', 'Accounting Principles I', 3, 'LIST 1.xlsx'),
  ('33333333-3333-4000-8000-000000000004', 'aaaaaaaa-aaaa-4000-8000-000000000004', '2025-2026', '2nd Semester', '1st Year', 'ACT-101', 'Accounting Principles I', 3, 'LIST 1.xlsx'),
  ('33333333-3333-4000-8000-000000000005', 'aaaaaaaa-aaaa-4000-8000-000000000002', '2025-2026', '2nd Semester', '1st Year', 'ACT-101', 'Accounting Principles I Special', 3, 'LIST 2.xlsx'),
  ('33333333-3333-4000-8000-000000000006', 'aaaaaaaa-aaaa-4000-8000-000000000002', '2025-2026', '2nd Semester', '2nd Year', 'ACT-104', 'Cost Accounting', 3, 'LIST 1.xlsx'),
  ('33333333-3333-4000-8000-000000000007', 'aaaaaaaa-aaaa-4000-8000-000000000003', '2025-2026', '2nd Semester', '2nd Year', 'ACT-104', 'Cost Accounting', 3, 'LIST 1.xlsx'),
  ('33333333-3333-4000-8000-000000000008', 'aaaaaaaa-aaaa-4000-8000-000000000004', '2025-2026', '2nd Semester', '2nd Year', 'ACT-104', 'Cost Accounting', 3, 'LIST 1.xlsx'),
  ('33333333-3333-4000-8000-000000000009', 'aaaaaaaa-aaaa-4000-8000-000000000006', '2025-2026', '2nd Semester', '1st Year', 'EED-101', 'Teaching Reading', 3, 'LIST 1.xlsx')
on conflict (id) do nothing;

do $conflict_check$
declare
  v_failed boolean := false;
begin
  begin
    perform private.normalize_bsais_programs();
  exception when others then
    if position('conflicting academic grades' in sqlerrm) = 0 then
      raise;
    end if;
    v_failed := true;
  end;

  if not v_failed then
    raise exception 'FAIL: conflicting academic grades did not abort normalization';
  end if;

  delete from public.grades
  where id = '11111111-1111-4000-8000-000000000004';

  perform private.normalize_bsais_programs();
end;
$conflict_check$;

do $verify$
declare
  v_bsais_id uuid := current_setting('pkm.fixture.bsais_id')::uuid;
  v_count integer;
begin
  if (select id from public.programs where code = 'BSAIS') <> v_bsais_id then
    raise exception 'FAIL: original exact BSAIS ID was not preserved';
  end if;

  select count(*) into v_count
  from public.programs
  where trim(upper(code)) in ('AIS', 'BSAIS')
     or trim(upper(name)) in ('AIS', 'BSAIS', 'ACCOUNTING INFORMATION SYSTEM', 'ACCOUNTING INFORMATION SYSTEMS');
  if v_count <> 1 then
    raise exception 'FAIL: normalized BSAIS program count is % (expected 1)', v_count;
  end if;

  if (select count(*) from public.programs where id in (
    'aaaaaaaa-aaaa-4000-8000-000000000002',
    'aaaaaaaa-aaaa-4000-8000-000000000003',
    'aaaaaaaa-aaaa-4000-8000-000000000004',
    'aaaaaaaa-aaaa-4000-8000-000000000005'
  )) <> 0 then
    raise exception 'FAIL: alias program rows remain';
  end if;

  if (select count(*) from public.programs where id = 'aaaaaaaa-aaaa-4000-8000-000000000006') <> 1 then
    raise exception 'FAIL: non-BSAIS program changed';
  end if;

  if (select count(*) from public.subjects where program_id = v_bsais_id) <> current_setting('pkm.fixture.initial_subject_count')::integer + 3 then
    raise exception 'FAIL: canonical BSAIS subject count did not preserve baseline plus 3 fixture survivors';
  end if;
  if (select count(*) from public.subjects where id in (
    'bbbbbbbb-bbbb-4000-8000-000000000001',
    'bbbbbbbb-bbbb-4000-8000-000000000005',
    'bbbbbbbb-bbbb-4000-8000-000000000008'
  ) and program_id = v_bsais_id) <> 3 then
    raise exception 'FAIL: deterministic subject survivors are incorrect';
  end if;
  if (select count(*) from public.subjects where id in (
    'bbbbbbbb-bbbb-4000-8000-000000000002',
    'bbbbbbbb-bbbb-4000-8000-000000000003',
    'bbbbbbbb-bbbb-4000-8000-000000000004',
    'bbbbbbbb-bbbb-4000-8000-000000000006',
    'bbbbbbbb-bbbb-4000-8000-000000000007',
    'bbbbbbbb-bbbb-4000-8000-000000000009'
  )) <> 0 then
    raise exception 'FAIL: removed subject rows remain';
  end if;
  if (select count(*) from public.subjects where id = 'bbbbbbbb-bbbb-4000-8000-000000000010' and program_id = 'aaaaaaaa-aaaa-4000-8000-000000000006') <> 1 then
    raise exception 'FAIL: non-BSAIS subject reference changed';
  end if;

  select count(*) into v_count
  from public.enrollment_subjects
  where enrollment_id = 'eeeeeeee-eeee-4000-8000-000000000001';
  if v_count <> 2 then
    raise exception 'FAIL: BSAIS enrollment_subject count is % (expected 2)', v_count;
  end if;
  if (select count(*) from public.enrollment_subjects where enrollment_id = 'eeeeeeee-eeee-4000-8000-000000000001' and subject_id in ('bbbbbbbb-bbbb-4000-8000-000000000001', 'bbbbbbbb-bbbb-4000-8000-000000000005')) <> 2 then
    raise exception 'FAIL: BSAIS enrollment_subject survivors are incorrect';
  end if;
  if exists (
    select 1 from public.enrollment_subjects es1
    join public.enrollment_subjects es2 on es1.enrollment_id = es2.enrollment_id and es1.subject_id = es2.subject_id and es1.id <> es2.id
  ) then
    raise exception 'FAIL: duplicate enrollment_subject pair remains';
  end if;
  if (select count(*) from public.enrollment_subjects where enrollment_id = 'eeeeeeee-eeee-4000-8000-000000000002' and subject_id = 'bbbbbbbb-bbbb-4000-8000-000000000010') <> 1 then
    raise exception 'FAIL: non-BSAIS enrollment subject reference changed';
  end if;

  if (select count(*) from public.grades where student_id = 'dddddddd-dddd-4000-8000-000000000001') <> 2 then
    raise exception 'FAIL: compatible grade count is incorrect';
  end if;
  if (select grade from public.grades where student_id = 'dddddddd-dddd-4000-8000-000000000001' and subject_id = 'bbbbbbbb-bbbb-4000-8000-000000000005') <> '1.50'
     or (select remarks from public.grades where student_id = 'dddddddd-dddd-4000-8000-000000000001' and subject_id = 'bbbbbbbb-bbbb-4000-8000-000000000005') <> 'Passed' then
    raise exception 'FAIL: compatible grade value or remarks changed';
  end if;
  if (select grade from public.grades where student_id = 'dddddddd-dddd-4000-8000-000000000001' and subject_id = 'bbbbbbbb-bbbb-4000-8000-000000000008') <> '2.00' then
    raise exception 'FAIL: surviving grade value is incorrect';
  end if;

  if (select count(*) from public.class_schedules where id in (
    '22222222-2222-4000-8000-000000000001',
    '22222222-2222-4000-8000-000000000002',
    '22222222-2222-4000-8000-000000000003'
  )) <> 3 then
    raise exception 'FAIL: class schedules were not preserved';
  end if;
  if exists (
    select 1 from public.class_schedules cs left join public.subjects s on s.id = cs.subject_id where s.id is null
  ) then
    raise exception 'FAIL: orphan class schedule remains';
  end if;

  if (select count(*) from public.course_offerings where program_id = v_bsais_id) <> current_setting('pkm.fixture.initial_offering_count')::integer + 3 then
    raise exception 'FAIL: canonical BSAIS offering count did not preserve baseline plus 3 fixture survivors';
  end if;
  if (select count(*) from public.course_offerings where id in (
    '33333333-3333-4000-8000-000000000001',
    '33333333-3333-4000-8000-000000000005',
    '33333333-3333-4000-8000-000000000006'
  )) <> 3 then
    raise exception 'FAIL: exact offering survivor set is incorrect';
  end if;
  if (select count(*) from public.course_offerings where id in (
    '33333333-3333-4000-8000-000000000002',
    '33333333-3333-4000-8000-000000000003',
    '33333333-3333-4000-8000-000000000004',
    '33333333-3333-4000-8000-000000000007',
    '33333333-3333-4000-8000-000000000008'
  )) <> 0 then
    raise exception 'FAIL: duplicate course offerings remain';
  end if;
  if (select count(*) from public.course_offerings where id = '33333333-3333-4000-8000-000000000009' and program_id = 'aaaaaaaa-aaaa-4000-8000-000000000006') <> 1 then
    raise exception 'FAIL: non-BSAIS course offering reference changed';
  end if;

  if exists (select 1 from public.enrollment_subjects es left join public.subjects s on s.id = es.subject_id where s.id is null)
     or exists (select 1 from public.grades g left join public.subjects s on s.id = g.subject_id where s.id is null) then
    raise exception 'FAIL: orphan subject reference remains';
  end if;
end;
$verify$;

rollback;
