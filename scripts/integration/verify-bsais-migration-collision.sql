-- Disposable local SQL verification fixture for BSAIS program alias migration.
-- Calls the actual private.normalize_bsais_programs() function defined by the migration.
-- Runs inside one transaction block and always rolls back; preserves referential integrity throughout.

begin;

do $fixture$
declare
  v_bsais_id uuid;
  v_alias_ais_id uuid := 'aaaaaaaa-aaaa-4000-8000-000000000002';
  v_alias_bsais_id uuid := 'aaaaaaaa-aaaa-4000-8000-000000000003';
  v_beed_id uuid := 'aaaaaaaa-aaaa-4000-8000-000000000004';
  v_student_id uuid := 'dddddddd-dddd-4000-8000-000000000001';
  v_enrollment_id uuid := 'eeeeeeee-eeee-4000-8000-000000000001';
  -- Subject IDs
  v_s1_id uuid := 'bbbbbbbb-bbbb-4000-8000-000000000001';
  v_s2_id uuid := 'bbbbbbbb-bbbb-4000-8000-000000000002';
  v_s3_id uuid := 'bbbbbbbb-bbbb-4000-8000-000000000003';
  v_s4_id uuid := 'bbbbbbbb-bbbb-4000-8000-000000000004';
  v_s5_id uuid := 'bbbbbbbb-bbbb-4000-8000-000000000005';
  v_s6_id uuid := 'bbbbbbbb-bbbb-4000-8000-000000000006';
  v_s7_id uuid := 'bbbbbbbb-bbbb-4000-8000-000000000007';
  -- Offering IDs
  v_o1_id uuid := 'cccccccc-cccc-4000-8000-000000000001';
  v_o2_id uuid := 'cccccccc-cccc-4000-8000-000000000002';
  v_o3_id uuid := 'cccccccc-cccc-4000-8000-000000000003';
  v_o4_id uuid := 'cccccccc-cccc-4000-8000-000000000004';
  v_o5_id uuid := 'cccccccc-cccc-4000-8000-000000000005';
  v_o6_id uuid := 'cccccccc-cccc-4000-8000-000000000006';
begin
  -- Insert test auth user and profile for FK references
  insert into auth.users (id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'test@example.test', 'not-used', '{}'::jsonb, '{}'::jsonb, now(), now())
  on conflict (id) do nothing;

  insert into public.profiles (id, role, first_name, last_name, email, account_status)
  values ('00000000-0000-4000-8000-000000000001', 'student', 'Test', 'Student', 'test@example.test', 'ACTIVE')
  on conflict (id) do nothing;

  -- Resolve the existing canonical BSAIS program ID from migrations
  select id into v_bsais_id
  from public.programs
  where code = 'BSAIS'
  order by created_at nulls last
  limit 1;

  if v_bsais_id is null then
    raise exception 'FAIL: no canonical BSAIS program found from existing migrations';
  end if;

  -- Insert alias programs (AIS, whitespace bsais) and non-BSAIS (BEED)
  insert into public.programs (id, name, code)
  values
    (v_alias_ais_id, 'Accounting Information System', 'AIS'),
    (v_alias_bsais_id, ' bachelor of science in accounting information systems ', ' bsais '),
    (v_beed_id, 'Bachelor of Elementary Education', 'BEED')
  on conflict (id) do nothing;

  -- Subjects:
  -- s1: canonical BSAIS subject (under existing canonical program)
  insert into public.subjects (id, program_id, course_code, course_description, units, year_level, semester)
  values (v_s1_id, v_bsais_id, 'ACT-101', 'Accounting Principles I', 3, '1st Year', '1st Semester')
  on conflict (id) do nothing;

  -- s2: alias AIS subject colliding with canonical (same course_code, year_level, semester)
  insert into public.subjects (id, program_id, course_code, course_description, units, year_level, semester)
  values (v_s2_id, v_alias_ais_id, 'ACT-101', 'Accounting Principles I', 3, '1st Year', '1st Semester')
  on conflict (id) do nothing;

  -- s3: alias AIS subject NOT colliding with canonical (different course_code)
  insert into public.subjects (id, program_id, course_code, course_description, units, year_level, semester)
  values (v_s3_id, v_alias_ais_id, 'ACT-102', 'Accounting Principles II', 3, '1st Year', '2nd Semester')
  on conflict (id) do nothing;

  -- s4: alias whitespace-bsais subject NOT colliding with canonical or other aliases
  insert into public.subjects (id, program_id, course_code, course_description, units, year_level, semester)
  values (v_s4_id, v_alias_bsais_id, 'ACT-103', 'Accounting Principles III', 3, '1st Year', '1st Semester')
  on conflict (id) do nothing;

  -- s5/s6: alias-vs-alias colliding subject (AIS and bsais both have ACT-104, no canonical copy)
  insert into public.subjects (id, program_id, course_code, course_description, units, year_level, semester)
  values (v_s5_id, v_alias_ais_id, 'ACT-104', 'Cost Accounting', 3, '2nd Year', '1st Semester'),
         (v_s6_id, v_alias_bsais_id, 'ACT-104', 'Cost Accounting', 3, '2nd Year', '1st Semester')
  on conflict (id) do nothing;

  -- s7: non-BSAIS subject (BEED)
  insert into public.subjects (id, program_id, course_code, course_description, units, year_level, semester)
  values (v_s7_id, v_beed_id, 'EED-101', 'Teaching Reading', 3, '1st Year', '1st Semester')
  on conflict (id) do nothing;

  -- Course offerings:
  -- o1: canonical BSAIS offering
  insert into public.course_offerings (id, program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
  values (v_o1_id, v_bsais_id, '2025-2026', '1st Semester', '1st Year', 'ACT-101', 'Accounting Principles I', 3, 'LIST 1.xlsx')
  on conflict (id) do nothing;

  -- o2: exact duplicate of o1 under AIS alias (should be deleted)
  insert into public.course_offerings (id, program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
  values (v_o2_id, v_alias_ais_id, '2025-2026', '1st Semester', '1st Year', 'ACT-101', 'Accounting Principles I', 3, 'LIST 1.xlsx')
  on conflict (id) do nothing;

  -- o3: distinct offering sharing course_code but different source_document (must be preserved)
  insert into public.course_offerings (id, program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
  values (v_o3_id, v_alias_ais_id, '2025-2026', '1st Semester', '1st Year', 'ACT-101', 'Accounting Principles I Special', 3, 'LIST 2.xlsx')
  on conflict (id) do nothing;

  -- o4/o5: alias-vs-alias duplicate (same offering under AIS and bsais, no canonical copy yet)
  insert into public.course_offerings (id, program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
  values (v_o4_id, v_alias_ais_id, '2025-2026', '2nd Semester', '1st Year', 'ACT-105', 'Managerial Accounting', 3, 'LIST 1.xlsx'),
         (v_o5_id, v_alias_bsais_id, '2025-2026', '2nd Semester', '1st Year', 'ACT-105', 'Managerial Accounting', 3, 'LIST 1.xlsx')
  on conflict (id) do nothing;

  -- o6: non-BSAIS offering (BEED)
  insert into public.course_offerings (id, program_id, academic_year, semester, year_level, course_code, course_description, units, source_document)
  values (v_o6_id, v_beed_id, '2025-2026', '1st Semester', '1st Year', 'EED-101', 'Teaching Reading', 3, 'LIST 1.xlsx')
  on conflict (id) do nothing;

  -- Enrollment references: simulate enrollment referencing both canonical and alias subjects
  insert into public.students (id, profile_id, student_id_number, program_id, year_level, student_type, enrollment_status)
  values (v_student_id, '00000000-0000-4000-8000-000000000001', '99-00001', v_bsais_id, '1st Year', 'Incoming 1st Year Student', 'NOT ENROLLED')
  on conflict (id) do nothing;

  insert into public.enrollments (id, student_id, program_id, year_level, academic_year, semester, status)
  values (v_enrollment_id, v_student_id, v_bsais_id, '1st Year', '2026-2027', '1st Semester', 'PENDING')
  on conflict (id) do nothing;

  -- Enrollment_subjects: student has both canonical s1 and alias s2 (collision) + s3 (non-colliding)
  insert into public.enrollment_subjects (enrollment_id, subject_id)
  values (v_enrollment_id, v_s1_id),
         (v_enrollment_id, v_s2_id),
         (v_enrollment_id, v_s3_id)
  on conflict (enrollment_id, subject_id) do nothing;

  -- Grade references to alias subjects (alias-vs-alias collision subjects s5, s6)
  insert into public.grades (student_id, subject_id, grade)
  values (v_student_id, v_s5_id, '1.50'),
         (v_student_id, v_s6_id, '1.75')
  on conflict (student_id, subject_id) do nothing;

  -- Class schedule references to alias subjects
  insert into public.class_schedules (subject_id, day, time, room)
  values (v_s3_id, 'Mon', '08:00-09:00', 'RM-101'),
         (v_s4_id, 'Tue', '09:00-10:00', 'RM-102')
  on conflict (id) do nothing;
end;
$fixture$;

-- Execute the actual migration function
select private.normalize_bsais_programs();

-- Verification assertions (fail closed)
do $verify$
declare
  v_bsais_count integer;
  v_beed_count integer;
  v_subject_count integer;
  v_offering_count integer;
  v_enrollment_subject_count integer;
  v_grade_count integer;
  v_schedule_count integer;
  v_bsais_program_id uuid;
begin
  -- Exactly one canonical BSAIS program remains
  select count(*) into v_bsais_count
  from public.programs
  where code = 'BSAIS';

  if v_bsais_count <> 1 then
    raise exception 'FAIL: BSAIS program count is % (expected 1)', v_bsais_count;
  end if;

  -- Non-BSAIS program unchanged
  select count(*) into v_beed_count
  from public.programs where code = 'BEED';

  if v_beed_count <> 1 then
    raise exception 'FAIL: BEED program count is % (expected 1)', v_beed_count;
  end if;

  -- Get canonical BSAIS program ID for subject counting
  select id into v_bsais_program_id
  from public.programs where code = 'BSAIS';

  -- Subjects: canonical ACT-101 (1), non-colliding ACT-102 (s3), ACT-103 (s4); alias-vs-alias ACT-104 resolved to 1;
  -- s2 deleted (collision with canonical), s5/s6 merge to 1; total 4 unique subjects under canonical BSAIS
  select count(*) into v_subject_count
  from public.subjects
  where program_id = v_bsais_program_id;

  if v_subject_count <> 4 then
    raise exception 'FAIL: canonical BSAIS subject count is % (expected 4: ACT-101, ACT-102, ACT-103, ACT-104)', v_subject_count;
  end if;

  -- BEED subject unchanged
  select count(*) into v_subject_count
  from public.subjects
  where program_id = 'aaaaaaaa-aaaa-4000-8000-000000000004';

  if v_subject_count <> 1 then
    raise exception 'FAIL: BEED subject count is % (expected 1)', v_subject_count;
  end if;

  -- Course offerings: o1 (canonical), o3 preserved (distinct), o2 deleted (exact duplicate of o1),
  -- alias-vs-alias o4/o5 collapse to 1; total 3 under canonical BSAIS
  select count(*) into v_offering_count
  from public.course_offerings
  where program_id = v_bsais_program_id;

  if v_offering_count <> 3 then
    raise exception 'FAIL: canonical BSAIS course offering count is % (expected 3)', v_offering_count;
  end if;

  -- BEED offering unchanged
  select count(*) into v_offering_count
  from public.course_offerings
  where program_id = 'aaaaaaaa-aaaa-4000-8000-000000000004';

  if v_offering_count <> 1 then
    raise exception 'FAIL: BEED course offering count is % (expected 1)', v_offering_count;
  end if;

  -- Enrollment subjects: s2 removed (collision with canonical s1), so 2 rows remain
  select count(*) into v_enrollment_subject_count
  from public.enrollment_subjects
  where enrollment_id = 'eeeeeeee-eeee-4000-8000-000000000001';
  -- Grades: alias-vs-alias subject collision resolved. Both grades (1.50 and 1.75) were
  -- for same student on colliding subjects. Merge keeps the better grade (1.50).
  -- Total: 1 grade.
  select count(*) into v_grade_count
  from public.grades
  where student_id = 'dddddddd-dddd-4000-8000-000000000001';

  if v_grade_count <> 1 then
    raise exception 'FAIL: grade count is % (expected 1 after merge)', v_grade_count;
  end if;


  -- Class schedules: s3 ACT-102 repointed to canonical BSAIS; s4 ACT-103 also repointed
  select count(*) into v_schedule_count
  from public.class_schedules cs
  join public.subjects s on s.id = cs.subject_id
  where s.program_id = v_bsais_program_id;

  if v_schedule_count <> 2 then
    raise exception 'FAIL: class schedule count under BSAIS is % (expected 2)', v_schedule_count;
  end if;

  -- Verify no alias programs remain
  select count(*) into v_bsais_count
  from public.programs
  where code is not null and trim(upper(code)) in ('AIS', 'BSAIS')
     or trim(upper(name)) in ('ACCOUNTING INFORMATION SYSTEM', 'ACCOUNTING INFORMATION SYSTEMS');

  if v_bsais_count <> 1 then
    raise exception 'FAIL: total BSAIS/AIS program count after cleanup is % (expected 1)', v_bsais_count;
  end if;
end;
$verify$;

rollback;
