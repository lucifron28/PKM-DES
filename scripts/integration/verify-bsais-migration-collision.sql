-- Disposable local SQL verification fixture for BSAIS program alias migration.
-- Calls the actual private.normalize_bsais_programs() function defined by the migration.
-- All fictional data is rolled back at the end.

begin;

do $fixture$
declare
  v_bsais_id uuid;
  v_canonical_subject_count integer;
  v_canonical_offering_count integer;
  v_all_programs_count integer;
begin
  select id into v_bsais_id
  from public.programs
  where code = 'BSAIS'
  limit 1;

  if v_bsais_id is null then
    raise exception 'FAIL: no canonical BSAIS program found from existing migrations';
  end if;

  perform set_config('pkm.fixture.bsais_id', v_bsais_id::text, true);
  select count(*) into v_canonical_subject_count from public.subjects where program_id = v_bsais_id;
  select count(*) into v_canonical_offering_count from public.course_offerings where program_id = v_bsais_id;
  select count(*) into v_all_programs_count from public.programs;
  perform set_config('pkm.fixture.canonical_subject_count', v_canonical_subject_count::text, true);
  perform set_config('pkm.fixture.canonical_offering_count', v_canonical_offering_count::text, true);
  perform set_config('pkm.fixture.all_programs_count', v_all_programs_count::text, true);
end;
$fixture$;

-- Auth users and profiles for FK references
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

-- Alias programs: 4 AIS/BSAIS variants + 1 non-BSAIS (BEED)
insert into public.programs (id, name, code)
values
  ('aaaaaaaa-aaaa-4000-8000-000000000002', 'Accounting Information System', 'AIS'),
  ('aaaaaaaa-aaaa-4000-8000-000000000003', 'Bachelor of Science in Accounting Information System', 'bsais'),
  ('aaaaaaaa-aaaa-4000-8000-000000000004', 'Accounting Information System', ' BSAIS '),
  ('aaaaaaaa-aaaa-4000-8000-000000000005', 'Accounting Information Systems', 'AIS-LEGACY'),
  ('aaaaaaaa-aaaa-4000-8000-000000000006', 'Bachelor of Elementary Education', 'BEED')
on conflict (id) do nothing;

-- Non-BSAIS official student record, student, enrollment (must remain unchanged)
insert into public.official_student_records (id, student_id_number, first_name, last_name, email, program_id, year_level, student_type, gender_sex, enrollment_status)
values ('aaaaaaaa-aaaa-4000-8000-000000000010', '99-00002', 'Test', 'BEED', 'test.beed@example.test', 'aaaaaaaa-aaaa-4000-8000-000000000006', '1st Year', 'Incoming 1st Year Student', 'Female', 'NOT ENROLLED')
on conflict (id) do nothing;

insert into public.students (id, profile_id, student_id_number, program_id, year_level, student_type, enrollment_status, official_record_id)
values
  ('dddddddd-dddd-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '99-00001', current_setting('pkm.fixture.bsais_id')::uuid, '1st Year', 'Incoming 1st Year Student', 'NOT ENROLLED', null),
  ('dddddddd-dddd-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', '99-00002', 'aaaaaaaa-aaaa-4000-8000-000000000006', '1st Year', 'Incoming 1st Year Student', 'NOT ENROLLED', 'aaaaaaaa-aaaa-4000-8000-000000000010')
on conflict (id) do nothing;

insert into public.enrollments (id, student_id, program_id, year_level, academic_year, semester, status)
values
  ('eeeeeeee-eeee-4000-8000-000000000001', 'dddddddd-dddd-4000-8000-000000000001', current_setting('pkm.fixture.bsais_id')::uuid, '1st Year', '2026-2027', '1st Semester', 'PENDING'),
  ('eeeeeeee-eeee-4000-8000-000000000002', 'dddddddd-dddd-4000-8000-000000000002', 'aaaaaaaa-aaaa-4000-8000-000000000006', '1st Year', '2026-2027', '1st Semester', 'PENDING')
on conflict (id) do nothing;

-- Subjects:
-- ACT-101: canonical + 3 alias copies (canonical survives)
-- ACT-104: 3 alias copies only (lowest UUID survives)
-- ACT-106: 2 alias copies (lowest UUID survives); conflicting grades
-- EED-101: non-BSAIS subject (must remain unchanged)
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

-- Grades:
-- ACT-104: compatible (both 1.50 "Passed") → no conflict
-- ACT-106: conflicting (2.00 "Passed" vs 2.50 "Passed") → must be resolved by deleting one
insert into public.grades (id, student_id, subject_id, grade, remarks, created_at, updated_at)
values
  ('11111111-1111-4000-8000-000000000001', 'dddddddd-dddd-4000-8000-000000000001', 'bbbbbbbb-bbbb-4000-8000-000000000005', '1.50', 'Passed', '2026-01-01 00:00:00+0', '2026-06-01 00:00:00+0'),
  ('11111111-1111-4000-8000-000000000002', 'dddddddd-dddd-4000-8000-000000000001', 'bbbbbbbb-bbbb-4000-8000-000000000006', '1.50', 'Passed', '2026-01-15 00:00:00+0', '2026-06-15 00:00:00+0'),
  ('11111111-1111-4000-8000-000000000003', 'dddddddd-dddd-4000-8000-000000000001', 'bbbbbbbb-bbbb-4000-8000-000000000008', '2.00', 'Passed', '2026-02-01 00:00:00+0', '2026-07-01 00:00:00+0'),
  ('11111111-1111-4000-8000-000000000004', 'dddddddd-dddd-4000-8000-000000000001', 'bbbbbbbb-bbbb-4000-8000-000000000009', '2.50', 'Passed', '2026-02-15 00:00:00+0', '2026-07-15 00:00:00+0')
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

-- ══════════════════════════════════════════════════════════════════════
-- PRE-CALL ASSERTIONS: fixture data is in expected pre-normalization state
-- ══════════════════════════════════════════════════════════════════════

do $precheck$
declare
  v_bsais_id uuid := current_setting('pkm.fixture.bsais_id')::uuid;
  v_count integer;
begin
  select count(*) into v_count from public.programs;
  if v_count <> current_setting('pkm.fixture.all_programs_count')::integer + 5 then
    raise exception 'PRECHECK FAIL: total program count is % (expected canonical + 5 fixture)', v_count;
  end if;
  select count(*) into v_count from public.subjects where program_id = v_bsais_id;
  if v_count <> current_setting('pkm.fixture.canonical_subject_count')::integer + 1 then
    raise exception 'PRECHECK FAIL: canonical subject count is %', v_count;
  end if;
  select count(*) into v_count from public.course_offerings where program_id = v_bsais_id;
  if v_count <> current_setting('pkm.fixture.canonical_offering_count')::integer + 1 then
    raise exception 'PRECHECK FAIL: canonical offering count is %', v_count;
  end if;
  select count(*) into v_count from public.enrollment_subjects;
  if v_count <> 8 then raise exception 'PRECHECK FAIL: enrollment_subject count is %', v_count; end if;
  select count(*) into v_count from public.grades;
  if v_count <> 4 then raise exception 'PRECHECK FAIL: grade count is %', v_count; end if;
  select count(*) into v_count from public.class_schedules;
  if v_count <> 3 then raise exception 'PRECHECK FAIL: class_schedule count is %', v_count; end if;

  -- Non-BSAIS references are correct before normalization
  if (select program_id from public.students where id = 'dddddddd-dddd-4000-8000-000000000002') <> 'aaaaaaaa-aaaa-4000-8000-000000000006' then
    raise exception 'PRECHECK FAIL: non-BSAIS student program_id';
  end if;
  if (select program_id from public.enrollments where id = 'eeeeeeee-eeee-4000-8000-000000000002') <> 'aaaaaaaa-aaaa-4000-8000-000000000006' then
    raise exception 'PRECHECK FAIL: non-BSAIS enrollment program_id';
  end if;
  if (select program_id from public.official_student_records where id = 'aaaaaaaa-aaaa-4000-8000-000000000010') <> 'aaaaaaaa-aaaa-4000-8000-000000000006' then
    raise exception 'PRECHECK FAIL: non-BSAIS OSR program_id';
  end if;
end;
$precheck$;

-- ══════════════════════════════════════════════════════════════════════
-- FIRST CALL: conflicting grades for ACT-106 → function must refuse
-- ══════════════════════════════════════════════════════════════════════

do $conflict_check$
declare
  v_refused boolean := false;
begin
  begin
    perform private.normalize_bsais_programs();
  exception when others then
    if sqlerrm like '%conflicting academic grades%' then
      v_refused := true;
    else
      raise;
    end if;
  end;

  if not v_refused then
    raise exception 'FAIL: conflicting academic grades did not abort normalization (expected BSAIS normalization refused)';
  end if;
end;
$conflict_check$;

-- Assert pre-call state is still intact after the refused call
do $post_refuse_check$
declare
  v_count integer;
begin
  select count(*) into v_count from public.grades;
  if v_count <> 4 then raise exception 'POST-REFUSE FAIL: grades were modified after refused normalization'; end if;
  select count(*) into v_count from public.subjects;
  if v_count <> current_setting('pkm.fixture.canonical_subject_count')::integer + 10 then
    raise exception 'POST-REFUSE FAIL: subjects were modified after refused normalization';
  end if;
  select count(*) into v_count from public.course_offerings;
  if v_count <> current_setting('pkm.fixture.canonical_offering_count')::integer + 9 then
    raise exception 'POST-REFUSE FAIL: offerings were modified after refused normalization';
  end if;
  select count(*) into v_count from public.enrollment_subjects;
  if v_count <> 8 then raise exception 'POST-REFUSE FAIL: enrollment_subjects were modified'; end if;
  select count(*) into v_count from public.class_schedules;
  if v_count <> 3 then raise exception 'POST-REFUSE FAIL: schedules were modified'; end if;
  if (select program_id from public.students where id = 'dddddddd-dddd-4000-8000-000000000002') <> 'aaaaaaaa-aaaa-4000-8000-000000000006' then
    raise exception 'POST-REFUSE FAIL: non-BSAIS student changed';
  end if;
end;
$post_refuse_check$;

-- Delete the conflicting ACT-106 grade (keep the better 2.00 one)
delete from public.grades where id = '11111111-1111-4000-8000-000000000004';

-- ══════════════════════════════════════════════════════════════════════
-- SECOND CALL: conflict resolved → normalization succeeds
-- ══════════════════════════════════════════════════════════════════════

select private.normalize_bsais_programs();

-- ══════════════════════════════════════════════════════════════════════
-- POST-CALL VERIFICATION
-- ══════════════════════════════════════════════════════════════════════

do $verify$
declare
  v_bsais_id uuid := current_setting('pkm.fixture.bsais_id')::uuid;
  v_count integer;
begin
  -- Exactly one BSAIS program with original ID preserved
  if (select id from public.programs where code = 'BSAIS') <> v_bsais_id then
    raise exception 'FAIL: original BSAIS ID was not preserved';
  end if;
  select count(*) into v_count
  from public.programs
  where trim(upper(coalesce(code, ''))) in ('AIS', 'BSAIS')
     or trim(upper(coalesce(name, ''))) in ('AIS', 'BSAIS', 'ACCOUNTING INFORMATION SYSTEM', 'ACCOUNTING INFORMATION SYSTEMS');
  if v_count <> 1 then raise exception 'FAIL: BSAIS program count is % (expected 1)', v_count; end if;
  if (select count(*) from public.programs where id in ('aaaaaaaa-aaaa-4000-8000-000000000002','aaaaaaaa-aaaa-4000-8000-000000000003','aaaaaaaa-aaaa-4000-8000-000000000004','aaaaaaaa-aaaa-4000-8000-000000000005')) <> 0 then
    raise exception 'FAIL: alias program rows remain';
  end if;
  if (select count(*) from public.programs where id = 'aaaaaaaa-aaaa-4000-8000-000000000006') <> 1 then
    raise exception 'FAIL: non-BSAIS program changed';
  end if;

  -- Subjects: canonical ACT-101 + surviving ACT-104 + surviving ACT-106 = 3 new subjects under canonical
  if (select count(*) from public.subjects where program_id = v_bsais_id) <> current_setting('pkm.fixture.canonical_subject_count')::integer + 3 then
    raise exception 'FAIL: canonical subject count did not preserve baseline + 3 survivors';
  end if;
  if (select count(*) from public.subjects where id in ('bbbbbbbb-bbbb-4000-8000-000000000001','bbbbbbbb-bbbb-4000-8000-000000000005','bbbbbbbb-bbbb-4000-8000-000000000008') and program_id = v_bsais_id) <> 3 then
    raise exception 'FAIL: deterministic subject survivors are incorrect';
  end if;
  if (select count(*) from public.subjects where id in ('bbbbbbbb-bbbb-4000-8000-000000000002','bbbbbbbb-bbbb-4000-8000-000000000003','bbbbbbbb-bbbb-4000-8000-000000000004','bbbbbbbb-bbbb-4000-8000-000000000006','bbbbbbbb-bbbb-4000-8000-000000000007','bbbbbbbb-bbbb-4000-8000-000000000009')) <> 0 then
    raise exception 'FAIL: removed subject rows remain';
  end if;
  if (select count(*) from public.subjects where id = 'bbbbbbbb-bbbb-4000-8000-000000000010' and program_id = 'aaaaaaaa-aaaa-4000-8000-000000000006') <> 1 then
    raise exception 'FAIL: non-BSAIS subject reference changed';
  end if;

  -- Enrollment subjects: BSAIS enrollment has 2 survivors (canonical ACT-101, surviving ACT-104)
  select count(*) into v_count from public.enrollment_subjects where enrollment_id = 'eeeeeeee-eeee-4000-8000-000000000001';
  if v_count <> 2 then raise exception 'FAIL: BSAIS enrollment_subject count is % (expected 2)', v_count; end if;
  if (select count(*) from public.enrollment_subjects where enrollment_id = 'eeeeeeee-eeee-4000-8000-000000000001' and subject_id in ('bbbbbbbb-bbbb-4000-8000-000000000001','bbbbbbbb-bbbb-4000-8000-000000000005')) <> 2 then
    raise exception 'FAIL: BSAIS enrollment_subject survivors are incorrect';
  end if;
  if exists (select 1 from public.enrollment_subjects es1 join public.enrollment_subjects es2 on es1.enrollment_id = es2.enrollment_id and es1.subject_id = es2.subject_id and es1.id <> es2.id) then
    raise exception 'FAIL: duplicate enrollment_subject pair remains';
  end if;
  if (select count(*) from public.enrollment_subjects where enrollment_id = 'eeeeeeee-eeee-4000-8000-000000000002' and subject_id = 'bbbbbbbb-bbbb-4000-8000-000000000010') <> 1 then
    raise exception 'FAIL: non-BSAIS enrollment subject reference changed';
  end if;

  -- Grades: ACT-104 compatible (survives 1), ACT-106 conflict resolved (survives 1) → 2 total
  select count(*) into v_count from public.grades where student_id = 'dddddddd-dddd-4000-8000-000000000001';
  if v_count <> 2 then raise exception 'FAIL: grade count is % (expected 2)', v_count; end if;

  -- ACT-104: exact grade and remarks preserved
  if (select grade from public.grades where student_id = 'dddddddd-dddd-4000-8000-000000000001' and subject_id = 'bbbbbbbb-bbbb-4000-8000-000000000005') <> '1.50'
     or (select remarks from public.grades where student_id = 'dddddddd-dddd-4000-8000-000000000001' and subject_id = 'bbbbbbbb-bbbb-4000-8000-000000000005') <> 'Passed' then
    raise exception 'FAIL: ACT-104 grade value or remarks changed';
  end if;

  -- ACT-106: surviving grade is 2.00, "Passed" (better of 2.00 and 2.50)
  if (select grade from public.grades where student_id = 'dddddddd-dddd-4000-8000-000000000001' and subject_id = 'bbbbbbbb-bbbb-4000-8000-000000000008') <> '2.00'
     or (select remarks from public.grades where student_id = 'dddddddd-dddd-4000-8000-000000000001' and subject_id = 'bbbbbbbb-bbbb-4000-8000-000000000008') <> 'Passed' then
    raise exception 'FAIL: ACT-106 surviving grade value or remarks is incorrect';
  end if;

  -- ACT-106 created_at preserved (updated_at may change due to trigger)
  if (select created_at from public.grades where student_id = 'dddddddd-dddd-4000-8000-000000000001' and subject_id = 'bbbbbbbb-bbbb-4000-8000-000000000008') <> '2026-02-01 00:00:00+0'::timestamptz then
    raise exception 'FAIL: ACT-106 created_at was not preserved';
  end if;

  -- Class schedules: all 3 preserved, no orphans
  if (select count(*) from public.class_schedules where id in ('22222222-2222-4000-8000-000000000001','22222222-2222-4000-8000-000000000002','22222222-2222-4000-8000-000000000003')) <> 3 then
    raise exception 'FAIL: class schedules were not preserved';
  end if;
  if exists (select 1 from public.class_schedules cs left join public.subjects s on s.id = cs.subject_id where s.id is null) then
    raise exception 'FAIL: orphan class schedule remains';
  end if;

  -- Course offerings: canonical ACT-101 + distinct ACT-101 Special + surviving ACT-104 = 3
  if (select count(*) from public.course_offerings where program_id = v_bsais_id) <> current_setting('pkm.fixture.canonical_offering_count')::integer + 3 then
    raise exception 'FAIL: canonical offering count did not preserve baseline + 3 survivors';
  end if;
  if (select count(*) from public.course_offerings where id in ('33333333-3333-4000-8000-000000000001','33333333-3333-4000-8000-000000000005','33333333-3333-4000-8000-000000000006')) <> 3 then
    raise exception 'FAIL: exact offering survivor set is incorrect';
  end if;
  if (select count(*) from public.course_offerings where id in ('33333333-3333-4000-8000-000000000002','33333333-3333-4000-8000-000000000003','33333333-3333-4000-8000-000000000004','33333333-3333-4000-8000-000000000007','33333333-3333-4000-8000-000000000008')) <> 0 then
    raise exception 'FAIL: duplicate course offerings remain';
  end if;
  if (select count(*) from public.course_offerings where id = '33333333-3333-4000-8000-000000000009' and program_id = 'aaaaaaaa-aaaa-4000-8000-000000000006') <> 1 then
    raise exception 'FAIL: non-BSAIS course offering reference changed';
  end if;

  -- Non-BSAIS reference integrity
  if (select program_id from public.students where id = 'dddddddd-dddd-4000-8000-000000000002') <> 'aaaaaaaa-aaaa-4000-8000-000000000006' then
    raise exception 'FAIL: non-BSAIS student program_id changed';
  end if;
  if (select program_id from public.enrollments where id = 'eeeeeeee-eeee-4000-8000-000000000002') <> 'aaaaaaaa-aaaa-4000-8000-000000000006' then
    raise exception 'FAIL: non-BSAIS enrollment program_id changed';
  end if;
  if (select program_id from public.official_student_records where id = 'aaaaaaaa-aaaa-4000-8000-000000000010') <> 'aaaaaaaa-aaaa-4000-8000-000000000006' then
    raise exception 'FAIL: non-BSAIS official_student_record program_id changed';
  end if;

  -- Orphan detection
  if exists (select 1 from public.enrollment_subjects es left join public.subjects s on s.id = es.subject_id where s.id is null)
     or exists (select 1 from public.grades g left join public.subjects s on s.id = g.subject_id where s.id is null) then
    raise exception 'FAIL: orphan subject reference remains';
  end if;
end;
$verify$;

rollback;
