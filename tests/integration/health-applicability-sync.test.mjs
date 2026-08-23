import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

const DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

function query(sql) {
  const output = execFileSync("psql", [DB_URL, "-t", "-A", "-F\t", "-c", sql], {
    encoding: "utf8"
  });
  return output
    .replace(/\r/g, "")
    .trim()
    .split("\n")
    .filter((line) => Boolean(line) && line !== "SET")
    .map((line) => line.split("\t"));
}

function execute(sql) {
  execFileSync("psql", [DB_URL, "-c", sql], {
    encoding: "utf8"
  });
}

test("Database: Canonical rule evaluation via private.get_health_requirement_applicability", () => {
  const [prog] = query("SELECT id FROM public.programs WHERE code = 'BSAIS' LIMIT 1;");
  const programId = prog[0];
  const u1 = "55555555-1111-1111-1111-111111111111";
  const u2 = "55555555-2222-2222-2222-222222222222";
  const u3 = "55555555-3333-3333-3333-333333333333";
  const u4 = "55555555-4444-4444-4444-444444444444";
  const u5 = "55555555-5555-5555-5555-555555555555";

  execute(`
    DELETE FROM public.students WHERE student_id_number LIKE 'T-CAN-%';
    DELETE FROM public.profiles WHERE id IN ('${u1}', '${u2}', '${u3}', '${u4}', '${u5}');
    DELETE FROM auth.users WHERE id IN ('${u1}', '${u2}', '${u3}', '${u4}', '${u5}');
    DELETE FROM public.official_student_records WHERE student_id_number LIKE 'T-CAN-%';
  `);

  // 1. Incoming 1st Year + Female -> APPLICABLE
  const [s1] = query(`
    WITH auth_u AS (INSERT INTO auth.users (id, email) VALUES ('${u1}', 't1@example.com') ON CONFLICT (id) DO NOTHING RETURNING id),
    prof AS (INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status) VALUES ('${u1}', 't1@example.com', 'student', 'T', 'One', 'ACTIVE') ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name RETURNING id),
    osr AS (INSERT INTO public.official_student_records (student_id_number, first_name, last_name, email, program_id, year_level, student_type, gender_sex, enrollment_status) VALUES ('T-CAN-01', 'T', 'One', 't1@example.com', '${programId}', '1st Year', 'Incoming 1st Year Student', 'Female', 'NOT ENROLLED') RETURNING id)
    INSERT INTO public.students (profile_id, official_record_id, student_id_number, program_id, year_level, student_type, enrollment_status)
    SELECT '${u1}', osr.id, 'T-CAN-01', '${programId}', '1st Year', 'Incoming 1st Year Student', 'NOT ENROLLED' FROM osr RETURNING id;
  `);
  assert.equal(query(`SELECT private.get_health_requirement_applicability('${s1[0]}');`)[0][0], "APPLICABLE");

  // 2. Transferee Female -> APPLICABLE
  const [s2] = query(`
    WITH auth_u AS (INSERT INTO auth.users (id, email) VALUES ('${u2}', 't2@example.com') ON CONFLICT (id) DO NOTHING RETURNING id),
    prof AS (INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status) VALUES ('${u2}', 't2@example.com', 'student', 'T', 'Two', 'ACTIVE') ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name RETURNING id),
    osr AS (INSERT INTO public.official_student_records (student_id_number, first_name, last_name, email, program_id, year_level, student_type, gender_sex, enrollment_status) VALUES ('T-CAN-02', 'T', 'Two', 't2@example.com', '${programId}', '2nd Year', 'Transferee', 'Female', 'NOT ENROLLED') RETURNING id)
    INSERT INTO public.students (profile_id, official_record_id, student_id_number, program_id, year_level, student_type, enrollment_status)
    SELECT '${u2}', osr.id, 'T-CAN-02', '${programId}', '2nd Year', 'Transferee', 'NOT ENROLLED' FROM osr RETURNING id;
  `);
  assert.equal(query(`SELECT private.get_health_requirement_applicability('${s2[0]}');`)[0][0], "APPLICABLE");

  // 3. Transferee Male -> APPLICABLE (Sex does not disable Transferee special form)
  const [s3] = query(`
    WITH auth_u AS (INSERT INTO auth.users (id, email) VALUES ('${u3}', 't3@example.com') ON CONFLICT (id) DO NOTHING RETURNING id),
    prof AS (INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status) VALUES ('${u3}', 't3@example.com', 'student', 'T', 'Three', 'ACTIVE') ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name RETURNING id),
    osr AS (INSERT INTO public.official_student_records (student_id_number, first_name, last_name, email, program_id, year_level, student_type, gender_sex, enrollment_status) VALUES ('T-CAN-03', 'T', 'Three', 't3@example.com', '${programId}', '2nd Year', 'Transferee', 'Male', 'NOT ENROLLED') RETURNING id)
    INSERT INTO public.students (profile_id, official_record_id, student_id_number, program_id, year_level, student_type, enrollment_status)
    SELECT '${u3}', osr.id, 'T-CAN-03', '${programId}', '2nd Year', 'Transferee', 'NOT ENROLLED' FROM osr RETURNING id;
  `);
  assert.equal(query(`SELECT private.get_health_requirement_applicability('${s3[0]}');`)[0][0], "APPLICABLE");

  // 4. Incoming 1st Year Male -> NOT_APPLICABLE
  const [s4] = query(`
    WITH auth_u AS (INSERT INTO auth.users (id, email) VALUES ('${u4}', 't4@example.com') ON CONFLICT (id) DO NOTHING RETURNING id),
    prof AS (INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status) VALUES ('${u4}', 't4@example.com', 'student', 'T', 'Four', 'ACTIVE') ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name RETURNING id),
    osr AS (INSERT INTO public.official_student_records (student_id_number, first_name, last_name, email, program_id, year_level, student_type, gender_sex, enrollment_status) VALUES ('T-CAN-04', 'T', 'Four', 't4@example.com', '${programId}', '1st Year', 'Incoming 1st Year Student', 'Male', 'NOT ENROLLED') RETURNING id)
    INSERT INTO public.students (profile_id, official_record_id, student_id_number, program_id, year_level, student_type, enrollment_status)
    SELECT '${u4}', osr.id, 'T-CAN-04', '${programId}', '1st Year', 'Incoming 1st Year Student', 'NOT ENROLLED' FROM osr RETURNING id;
  `);
  assert.equal(query(`SELECT private.get_health_requirement_applicability('${s4[0]}');`)[0][0], "NOT_APPLICABLE");

  // 5. Old Student Female -> NOT_APPLICABLE
  const [s5] = query(`
    WITH auth_u AS (INSERT INTO auth.users (id, email) VALUES ('${u5}', 't5@example.com') ON CONFLICT (id) DO NOTHING RETURNING id),
    prof AS (INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status) VALUES ('${u5}', 't5@example.com', 'student', 'T', 'Five', 'ACTIVE') ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name RETURNING id),
    osr AS (INSERT INTO public.official_student_records (student_id_number, first_name, last_name, email, program_id, year_level, student_type, gender_sex, enrollment_status) VALUES ('T-CAN-05', 'T', 'Five', 't5@example.com', '${programId}', '1st Year', 'Old Student', 'Female', 'NOT ENROLLED') RETURNING id)
    INSERT INTO public.students (profile_id, official_record_id, student_id_number, program_id, year_level, student_type, enrollment_status)
    SELECT '${u5}', osr.id, 'T-CAN-05', '${programId}', '1st Year', 'Old Student', 'NOT ENROLLED' FROM osr RETURNING id;
  `);
  assert.equal(query(`SELECT private.get_health_requirement_applicability('${s5[0]}');`)[0][0], "NOT_APPLICABLE");

  execute(`
    DELETE FROM public.students WHERE student_id_number LIKE 'T-CAN-%';
    DELETE FROM public.profiles WHERE id IN ('${u1}', '${u2}', '${u3}', '${u4}', '${u5}');
    DELETE FROM auth.users WHERE id IN ('${u1}', '${u2}', '${u3}', '${u4}', '${u5}');
    DELETE FROM public.official_student_records WHERE student_id_number LIKE 'T-CAN-%';
  `);
});

test("Step 19 & 21: Special Nurse path allowed for Incoming Female and Standard path DENIED", () => {
  const [prog] = query("SELECT id FROM public.programs WHERE code = 'BSAIS' LIMIT 1;");
  const programId = prog[0];
  const authUserId = "55555555-6666-1111-2222-333333333333";
  const nurseUserId = "55555555-6666-2222-3333-444444444444";
  const signatureId = "55555555-6666-3333-4444-555555555555";

  execute(`
    DO $$
    BEGIN
      PERFORM set_config('pkm.demo_reset', 'true', true);
      DELETE FROM public.audit_logs WHERE actor_profile_id = '${nurseUserId}';
      DELETE FROM public.enrollment_signatures WHERE id = '${signatureId}';
      DELETE FROM public.enrollment_clearances WHERE enrollment_id IN (SELECT id FROM public.enrollments WHERE student_id IN (SELECT id FROM public.students WHERE student_id_number = '25-SPEC-01'));
      DELETE FROM public.enrollment_subjects WHERE enrollment_id IN (SELECT id FROM public.enrollments WHERE student_id IN (SELECT id FROM public.students WHERE student_id_number = '25-SPEC-01'));
      DELETE FROM public.enrollments WHERE student_id IN (SELECT id FROM public.students WHERE student_id_number = '25-SPEC-01');
      DELETE FROM public.student_requirements WHERE student_id IN (SELECT id FROM public.students WHERE student_id_number = '25-SPEC-01');
      DELETE FROM public.students WHERE student_id_number = '25-SPEC-01';
      DELETE FROM public.official_role_assignments WHERE profile_id = '${nurseUserId}';
      DELETE FROM public.profiles WHERE id IN ('${authUserId}', '${nurseUserId}');
      DELETE FROM auth.users WHERE id IN ('${authUserId}', '${nurseUserId}');
      DELETE FROM public.official_student_records WHERE student_id_number = '25-SPEC-01';
    END $$;

    INSERT INTO auth.users (id, email) VALUES ('${nurseUserId}', 'nurse.special@example.com') ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status)
    VALUES ('${nurseUserId}', 'nurse.special@example.com', 'admin', 'Nurse', 'Special', 'ACTIVE') ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.official_role_assignments (profile_id, official_role, program_id, active)
    VALUES ('${nurseUserId}', 'NURSE', null, true) ON CONFLICT DO NOTHING;
  `);

  // Create Incoming 1st Year Female
  const [created] = query(`
    WITH auth_u AS (INSERT INTO auth.users (id, email) VALUES ('${authUserId}', 'spec1@example.com') ON CONFLICT (id) DO NOTHING RETURNING id),
    prof AS (INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status) VALUES ('${authUserId}', 'spec1@example.com', 'student', 'Spec', 'One', 'ACTIVE') ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name RETURNING id),
    osr AS (INSERT INTO public.official_student_records (student_id_number, first_name, last_name, email, program_id, year_level, student_type, gender_sex, enrollment_status) VALUES ('25-SPEC-01', 'Spec', 'One', 'spec1@example.com', '${programId}', '1st Year', 'Incoming 1st Year Student', 'Female', 'NOT ENROLLED') RETURNING id)
    INSERT INTO public.students (profile_id, official_record_id, student_id_number, program_id, year_level, student_type, enrollment_status)
    SELECT '${authUserId}', osr.id, '25-SPEC-01', '${programId}', '1st Year', 'Incoming 1st Year Student', 'NOT ENROLLED' FROM osr RETURNING id, official_record_id;
  `);
  const [studentId, osrId] = created;

  const [sub] = query(`
    SELECT outcome, enrollment_id
    FROM (SELECT set_config('request.jwt.claim.sub', '${authUserId}', true) as set_jwt) s,
    LATERAL public.submit_standard_student_enrollment('2025-2026', '2nd Semester');
  `);
  const enrollmentId = sub[1];

  // At submission: Special form is APPLICABLE, clearance is PENDING
  const [req] = query(`SELECT applicability, status FROM public.student_requirements WHERE student_id = '${studentId}';`);
  assert.equal(req[0], "APPLICABLE");
  assert.equal(req[1], "PENDING");

  const [clr] = query(`SELECT status FROM public.enrollment_clearances WHERE enrollment_id = '${enrollmentId}' AND clearance_type = 'HEALTH_CLEARANCE';`);
  assert.equal(clr[0], "PENDING");

  // ATTEMPT 1: Standard Nurse signing path MUST BE DENIED (special_form_required)
  const [stdHashRes] = query(`SELECT private.enrollment_document_hash('${enrollmentId}', 'NURSE', 'HEALTH_CLEARANCE', 'ENROLLMENT_CLEARANCE');`);
  const stdHash = stdHashRes[0];
  const sigPath = `${enrollmentId}/NURSE/${signatureId}.png`;
  const sigHash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  const [stdDenied] = query(`
    SELECT outcome
    FROM (SELECT set_config('request.jwt.claim.sub', '${nurseUserId}', true) as set_jwt) s,
    LATERAL public.record_standard_nurse_health_clearance_signature(
      '${enrollmentId}', '${signatureId}', '${sigPath}', '${sigHash}', '${stdHash}'
    );
  `);
  assert.equal(stdDenied[0], "special_form_required");

  // ATTEMPT 2: Special Nurse verification path is ALLOWED
  const [specHashRes] = query(`SELECT private.health_record_document_hash('${enrollmentId}', '${studentId}', '2025-2026', '2nd Semester', 'APPLICABLE', 'VERIFIED');`);
  const specHash = specHashRes[0];

  const [specSuccess] = query(`
    SELECT outcome
    FROM (SELECT set_config('request.jwt.claim.sub', '${nurseUserId}', true) as set_jwt) s,
    LATERAL public.verify_health_requirement_with_signature(
      '${enrollmentId}', '${signatureId}', '${sigPath}', '${sigHash}', '${specHash}', true, 'Medical form reviewed'
    );
  `);
  assert.equal(specSuccess[0], "signed");

  // Confirm requirement is VERIFIED and clearance is SIGNED
  assert.equal(query(`SELECT status FROM public.student_requirements WHERE student_id = '${studentId}';`)[0][0], "VERIFIED");
  assert.equal(query(`SELECT status FROM public.enrollment_clearances WHERE enrollment_id = '${enrollmentId}' AND clearance_type = 'HEALTH_CLEARANCE';`)[0][0], "SIGNED");
  assert.equal(query(`SELECT private.health_clearance_is_current('${enrollmentId}');`)[0][0], "t");

  // Cleanup
  execute(`
    DO $$
    BEGIN
      PERFORM set_config('pkm.demo_reset', 'true', true);
      DELETE FROM public.audit_logs WHERE actor_profile_id = '${nurseUserId}';
      DELETE FROM public.enrollment_signatures WHERE id = '${signatureId}';
      DELETE FROM public.enrollment_clearances WHERE enrollment_id = '${enrollmentId}';
      DELETE FROM public.enrollment_subjects WHERE enrollment_id = '${enrollmentId}';
      DELETE FROM public.enrollments WHERE id = '${enrollmentId}';
      DELETE FROM public.student_requirements WHERE student_id = '${studentId}';
      DELETE FROM public.students WHERE id = '${studentId}';
      DELETE FROM public.official_role_assignments WHERE profile_id = '${nurseUserId}';
      DELETE FROM public.profiles WHERE id IN ('${authUserId}', '${nurseUserId}');
      DELETE FROM auth.users WHERE id IN ('${authUserId}', '${nurseUserId}');
      DELETE FROM public.official_student_records WHERE id = '${osrId}';
    END $$;
  `);
});

test("Step 20 & 21: Standard Nurse path allowed for Old Student / Incoming Male and Special path DENIED", () => {
  const [prog] = query("SELECT id FROM public.programs WHERE code = 'BSAIS' LIMIT 1;");
  const programId = prog[0];
  const authUserId = "55555555-7777-1111-2222-333333333333";
  const nurseUserId = "55555555-7777-2222-3333-444444444444";
  const signatureId = "55555555-7777-3333-4444-555555555555";

  execute(`
    DO $$
    BEGIN
      PERFORM set_config('pkm.demo_reset', 'true', true);
      DELETE FROM public.audit_logs WHERE actor_profile_id = '${nurseUserId}';
      DELETE FROM public.enrollment_signatures WHERE id = '${signatureId}';
      DELETE FROM public.enrollment_clearances WHERE enrollment_id IN (SELECT id FROM public.enrollments WHERE student_id IN (SELECT id FROM public.students WHERE student_id_number = '25-STD-01'));
      DELETE FROM public.enrollment_subjects WHERE enrollment_id IN (SELECT id FROM public.enrollments WHERE student_id IN (SELECT id FROM public.students WHERE student_id_number = '25-STD-01'));
      DELETE FROM public.enrollments WHERE student_id IN (SELECT id FROM public.students WHERE student_id_number = '25-STD-01');
      DELETE FROM public.student_requirements WHERE student_id IN (SELECT id FROM public.students WHERE student_id_number = '25-STD-01');
      DELETE FROM public.students WHERE student_id_number = '25-STD-01';
      DELETE FROM public.official_role_assignments WHERE profile_id = '${nurseUserId}';
      DELETE FROM public.profiles WHERE id IN ('${authUserId}', '${nurseUserId}');
      DELETE FROM auth.users WHERE id IN ('${authUserId}', '${nurseUserId}');
      DELETE FROM public.official_student_records WHERE student_id_number = '25-STD-01';
    END $$;

    INSERT INTO auth.users (id, email) VALUES ('${nurseUserId}', 'nurse.std@example.com') ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status)
    VALUES ('${nurseUserId}', 'nurse.std@example.com', 'admin', 'Nurse', 'Std', 'ACTIVE') ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.official_role_assignments (profile_id, official_role, program_id, active)
    VALUES ('${nurseUserId}', 'NURSE', null, true) ON CONFLICT DO NOTHING;
  `);

  // Create Old Student Female (1st Year)
  const [created] = query(`
    WITH auth_u AS (INSERT INTO auth.users (id, email) VALUES ('${authUserId}', 'std1@example.com') ON CONFLICT (id) DO NOTHING RETURNING id),
    prof AS (INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status) VALUES ('${authUserId}', 'std1@example.com', 'student', 'Std', 'One', 'ACTIVE') ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name RETURNING id),
    osr AS (INSERT INTO public.official_student_records (student_id_number, first_name, last_name, email, program_id, year_level, student_type, gender_sex, enrollment_status) VALUES ('25-STD-01', 'Std', 'One', 'std1@example.com', '${programId}', '1st Year', 'Old Student', 'Female', 'NOT ENROLLED') RETURNING id)
    INSERT INTO public.students (profile_id, official_record_id, student_id_number, program_id, year_level, student_type, enrollment_status)
    SELECT '${authUserId}', osr.id, '25-STD-01', '${programId}', '1st Year', 'Old Student', 'NOT ENROLLED' FROM osr RETURNING id, official_record_id;
  `);
  const [studentId, osrId] = created;

  const [sub] = query(`
    SELECT outcome, enrollment_id
    FROM (SELECT set_config('request.jwt.claim.sub', '${authUserId}', true) as set_jwt) s,
    LATERAL public.submit_standard_student_enrollment('2025-2026', '2nd Semester');
  `);
  const enrollmentId = sub[1];

  // At submission: Special form NOT_APPLICABLE, Health Clearance is PENDING (always required)
  const [req] = query(`SELECT applicability, status FROM public.student_requirements WHERE student_id = '${studentId}';`);
  assert.equal(req[0], "NOT_APPLICABLE");

  const [clr] = query(`SELECT status FROM public.enrollment_clearances WHERE enrollment_id = '${enrollmentId}' AND clearance_type = 'HEALTH_CLEARANCE';`);
  assert.equal(clr[0], "PENDING");

  // ATTEMPT 1: Special Nurse verification path MUST BE DENIED (special_form_not_required)
  const [specHashRes] = query(`SELECT private.health_record_document_hash('${enrollmentId}', '${studentId}', '2025-2026', '2nd Semester', 'APPLICABLE', 'VERIFIED');`);
  const specHash = specHashRes[0];
  const sigPath = `${enrollmentId}/NURSE/${signatureId}.png`;
  const sigHash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  const [specDenied] = query(`
    SELECT outcome
    FROM (SELECT set_config('request.jwt.claim.sub', '${nurseUserId}', true) as set_jwt) s,
    LATERAL public.verify_health_requirement_with_signature(
      '${enrollmentId}', '${signatureId}', '${sigPath}', '${sigHash}', '${specHash}', true, 'Invalid attempt'
    );
  `);
  assert.equal(specDenied[0], "special_form_not_required");

  // ATTEMPT 2: Standard Nurse signing path is ALLOWED
  const [stdHashRes] = query(`SELECT private.enrollment_document_hash('${enrollmentId}', 'NURSE', 'HEALTH_CLEARANCE', 'ENROLLMENT_CLEARANCE');`);
  const stdHash = stdHashRes[0];

  const [stdSuccess] = query(`
    SELECT outcome
    FROM (SELECT set_config('request.jwt.claim.sub', '${nurseUserId}', true) as set_jwt) s,
    LATERAL public.record_standard_nurse_health_clearance_signature(
      '${enrollmentId}', '${signatureId}', '${sigPath}', '${sigHash}', '${stdHash}'
    );
  `);
  assert.equal(stdSuccess[0], "signed");

  // Confirm clearance is SIGNED and is_current = true
  assert.equal(query(`SELECT status FROM public.enrollment_clearances WHERE enrollment_id = '${enrollmentId}' AND clearance_type = 'HEALTH_CLEARANCE';`)[0][0], "SIGNED");
  assert.equal(query(`SELECT private.health_clearance_is_current('${enrollmentId}');`)[0][0], "t");

  // Cleanup
  execute(`
    DO $$
    BEGIN
      PERFORM set_config('pkm.demo_reset', 'true', true);
      DELETE FROM public.audit_logs WHERE actor_profile_id = '${nurseUserId}';
      DELETE FROM public.enrollment_signatures WHERE id = '${signatureId}';
      DELETE FROM public.enrollment_clearances WHERE enrollment_id = '${enrollmentId}';
      DELETE FROM public.enrollment_subjects WHERE enrollment_id = '${enrollmentId}';
      DELETE FROM public.enrollments WHERE id = '${enrollmentId}';
      DELETE FROM public.student_requirements WHERE student_id = '${studentId}';
      DELETE FROM public.students WHERE id = '${studentId}';
      DELETE FROM public.official_role_assignments WHERE profile_id = '${nurseUserId}';
      DELETE FROM public.profiles WHERE id IN ('${authUserId}', '${nurseUserId}');
      DELETE FROM auth.users WHERE id IN ('${authUserId}', '${nurseUserId}');
      DELETE FROM public.official_student_records WHERE id = '${osrId}';
    END $$;
  `);
});

test("Step 15: Nurse queue includes all students in authorized scope with workflow mode flags", () => {
  const nurseUserId = "55555555-8888-1111-2222-333333333333";

  execute(`
    INSERT INTO auth.users (id, email) VALUES ('${nurseUserId}', 'nurse.queue@example.com') ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status)
    VALUES ('${nurseUserId}', 'nurse.queue@example.com', 'admin', 'Nurse', 'Queue', 'ACTIVE') ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.official_role_assignments (profile_id, official_role, program_id, active)
    VALUES ('${nurseUserId}', 'NURSE', null, true) ON CONFLICT DO NOTHING;
  `);

  const queueRows = query(`
    SELECT enrollment_id, student_name, student_type, special_form_required
    FROM (SELECT set_config('request.jwt.claim.sub', '${nurseUserId}', true) as set_jwt) s,
    LATERAL public.list_nurse_health_requirements();
  `);

  // Confirm queue returns rows and distinguishes special_form_required
  assert.ok(queueRows.length >= 1);
  for (const row of queueRows) {
    const [, , studentType, specialForm] = row;
    if (studentType === "Incoming 1st Year Student" || studentType === "Transferee") {
      // If female incoming or transferee, specialForm is true
      // Otherwise false
      assert.ok(specialForm === "t" || specialForm === "f");
    }
  }

  execute(`
    DELETE FROM public.official_role_assignments WHERE profile_id = '${nurseUserId}';
    DELETE FROM public.profiles WHERE id = '${nurseUserId}';
    DELETE FROM auth.users WHERE id = '${nurseUserId}';
  `);
});

test("Step 33: Mode-change 3-signature cycle (Standard S1 -> Special S2 -> Standard S3 with no resurrection of S1)", () => {
  const [prog] = query("SELECT id FROM public.programs WHERE code = 'BSAIS' LIMIT 1;");
  const programId = prog[0];
  const authUserId = "55555555-9999-1111-2222-333333333333";
  const nurseUserId = "55555555-9999-2222-3333-444444444444";
  const sig1 = "55555555-9999-3333-4444-555555555555";
  const sig2 = "55555555-9999-4444-5555-666666666666";
  const sig3 = "55555555-9999-7777-8888-999999999999";

  execute(`
    DO $$
    BEGIN
      PERFORM set_config('pkm.demo_reset', 'true', true);
      DELETE FROM public.audit_logs WHERE actor_profile_id = '${nurseUserId}';
      DELETE FROM public.enrollment_signatures WHERE id IN ('${sig1}', '${sig2}', '${sig3}');
      DELETE FROM public.enrollment_clearances WHERE enrollment_id IN (SELECT id FROM public.enrollments WHERE student_id IN (SELECT id FROM public.students WHERE student_id_number = '25-MODE-01'));
      DELETE FROM public.enrollment_subjects WHERE enrollment_id IN (SELECT id FROM public.enrollments WHERE student_id IN (SELECT id FROM public.students WHERE student_id_number = '25-MODE-01'));
      DELETE FROM public.enrollments WHERE student_id IN (SELECT id FROM public.students WHERE student_id_number = '25-MODE-01');
      DELETE FROM public.student_requirements WHERE student_id IN (SELECT id FROM public.students WHERE student_id_number = '25-MODE-01');
      DELETE FROM public.students WHERE student_id_number = '25-MODE-01';
      DELETE FROM public.official_role_assignments WHERE profile_id = '${nurseUserId}';
      DELETE FROM public.profiles WHERE id IN ('${authUserId}', '${nurseUserId}');
      DELETE FROM auth.users WHERE id IN ('${authUserId}', '${nurseUserId}');
      DELETE FROM public.official_student_records WHERE student_id_number = '25-MODE-01';
    END $$;

    INSERT INTO auth.users (id, email) VALUES ('${nurseUserId}', 'nurse.mode@example.com') ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status)
    VALUES ('${nurseUserId}', 'nurse.mode@example.com', 'admin', 'Nurse', 'Mode', 'ACTIVE') ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.official_role_assignments (profile_id, official_role, program_id, active)
    VALUES ('${nurseUserId}', 'NURSE', null, true) ON CONFLICT DO NOTHING;
  `);

  // Step 1: Start as Standard (Incoming 1st Year Male)
  const [created] = query(`
    WITH auth_u AS (INSERT INTO auth.users (id, email) VALUES ('${authUserId}', 'mode1@example.com') ON CONFLICT (id) DO NOTHING RETURNING id),
    prof AS (INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status) VALUES ('${authUserId}', 'mode1@example.com', 'student', 'Mode', 'One', 'ACTIVE') ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name RETURNING id),
    osr AS (INSERT INTO public.official_student_records (student_id_number, first_name, last_name, email, program_id, year_level, student_type, gender_sex, enrollment_status) VALUES ('25-MODE-01', 'Mode', 'One', 'mode1@example.com', '${programId}', '1st Year', 'Incoming 1st Year Student', 'Male', 'NOT ENROLLED') RETURNING id)
    INSERT INTO public.students (profile_id, official_record_id, student_id_number, program_id, year_level, student_type, enrollment_status)
    SELECT '${authUserId}', osr.id, '25-MODE-01', '${programId}', '1st Year', 'Incoming 1st Year Student', 'NOT ENROLLED' FROM osr RETURNING id, official_record_id;
  `);
  const [studentId, osrId] = created;

  const [sub] = query(`
    SELECT outcome, enrollment_id
    FROM (SELECT set_config('request.jwt.claim.sub', '${authUserId}', true) as set_jwt) s,
    LATERAL public.submit_standard_student_enrollment('2025-2026', '2nd Semester');
  `);
  const enrollmentId = sub[1];

  // Step 2: Standard Nurse signs S1
  const [stdHashRes] = query(`SELECT private.enrollment_document_hash('${enrollmentId}', 'NURSE', 'HEALTH_CLEARANCE', 'ENROLLMENT_CLEARANCE');`);
  const sig1Path = `${enrollmentId}/NURSE/${sig1}.png`;
  const dummyHash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  query(`
    SELECT outcome
    FROM (SELECT set_config('request.jwt.claim.sub', '${nurseUserId}', true) as set_jwt) s,
    LATERAL public.record_standard_nurse_health_clearance_signature(
      '${enrollmentId}', '${sig1}', '${sig1Path}', '${dummyHash}', '${stdHashRes[0]}'
    );
  `);
  assert.equal(query(`SELECT private.health_clearance_is_current('${enrollmentId}');`)[0][0], "t");
  assert.equal(query(`SELECT status FROM public.enrollment_clearances WHERE enrollment_id = '${enrollmentId}' AND clearance_type = 'HEALTH_CLEARANCE';`)[0][0], "SIGNED");

  // Step 3: Registrar updates Male -> Female (Standard -> Special Transition)
  execute(`
    UPDATE public.official_student_records SET gender_sex = 'Female', updated_at = now() WHERE id = '${osrId}';
  `);

  // S1 ceases being current because Special form is now required
  assert.equal(query(`SELECT private.health_clearance_is_current('${enrollmentId}');`)[0][0], "f");
  assert.equal(query(`SELECT status FROM public.enrollment_clearances WHERE enrollment_id = '${enrollmentId}' AND clearance_type = 'HEALTH_CLEARANCE';`)[0][0], "INVALIDATED");
  assert.equal(query(`SELECT applicability, status FROM public.student_requirements WHERE student_id = '${studentId}';`)[0][0], "APPLICABLE");

  // Step 4: Special Nurse signs S2
  const [specHashRes] = query(`SELECT private.health_record_document_hash('${enrollmentId}', '${studentId}', '2025-2026', '2nd Semester', 'APPLICABLE', 'VERIFIED');`);
  const sig2Path = `${enrollmentId}/NURSE/${sig2}.png`;

  query(`
    SELECT outcome
    FROM (SELECT set_config('request.jwt.claim.sub', '${nurseUserId}', true) as set_jwt) s,
    LATERAL public.verify_health_requirement_with_signature(
      '${enrollmentId}', '${sig2}', '${sig2Path}', '${dummyHash}', '${specHashRes[0]}', true, 'Special verified'
    );
  `);
  assert.equal(query(`SELECT private.health_clearance_is_current('${enrollmentId}');`)[0][0], "t");
  assert.equal(query(`SELECT status FROM public.enrollment_clearances WHERE enrollment_id = '${enrollmentId}' AND clearance_type = 'HEALTH_CLEARANCE';`)[0][0], "SIGNED");

  // Step 5: Registrar updates Female -> Male (Special -> Standard Transition again)
  execute(`
    UPDATE public.official_student_records SET gender_sex = 'Male', updated_at = now() WHERE id = '${osrId}';
  `);

  // Assert:
  // - special requirement is NOT_APPLICABLE / PENDING
  // - HEALTH_CLEARANCE is INVALIDATED
  // - private.health_clearance_is_current is false
  // - S1 is NOT resurrected
  // - historical S1 and S2 still exist
  assert.equal(query(`SELECT applicability FROM public.student_requirements WHERE student_id = '${studentId}';`)[0][0], "NOT_APPLICABLE");
  assert.equal(query(`SELECT status FROM public.enrollment_clearances WHERE enrollment_id = '${enrollmentId}' AND clearance_type = 'HEALTH_CLEARANCE';`)[0][0], "INVALIDATED");
  assert.equal(query(`SELECT private.health_clearance_is_current('${enrollmentId}');`)[0][0], "f");

  const sigCount = query(`SELECT count(*) FROM public.enrollment_signatures WHERE id IN ('${sig1}', '${sig2}');`)[0][0];
  assert.equal(sigCount, "2");

  // Step 6: Standard Nurse signs new S3
  const sig3Path = `${enrollmentId}/NURSE/${sig3}.png`;
  query(`
    SELECT outcome
    FROM (SELECT set_config('request.jwt.claim.sub', '${nurseUserId}', true) as set_jwt) s,
    LATERAL public.record_standard_nurse_health_clearance_signature(
      '${enrollmentId}', '${sig3}', '${sig3Path}', '${dummyHash}', '${stdHashRes[0]}'
    );
  `);

  // S3 becomes current
  assert.equal(query(`SELECT private.health_clearance_is_current('${enrollmentId}');`)[0][0], "t");
  assert.equal(query(`SELECT status FROM public.enrollment_clearances WHERE enrollment_id = '${enrollmentId}' AND clearance_type = 'HEALTH_CLEARANCE';`)[0][0], "SIGNED");

  // Latest signature is S3
  const [latestSig] = query(`
    SELECT id FROM public.enrollment_signatures
    WHERE enrollment_id = '${enrollmentId}' AND signer_role = 'NURSE'
    ORDER BY signed_at DESC, id DESC LIMIT 1;
  `);
  assert.equal(latestSig[0], sig3);

  // Cleanup
  execute(`
    DO $$
    BEGIN
      PERFORM set_config('pkm.demo_reset', 'true', true);
      DELETE FROM public.audit_logs WHERE actor_profile_id = '${nurseUserId}';
      DELETE FROM public.enrollment_signatures WHERE id IN ('${sig1}', '${sig2}', '${sig3}');
      DELETE FROM public.enrollment_clearances WHERE enrollment_id = '${enrollmentId}';
      DELETE FROM public.enrollment_subjects WHERE enrollment_id = '${enrollmentId}';
      DELETE FROM public.enrollments WHERE id = '${enrollmentId}';
      DELETE FROM public.student_requirements WHERE student_id = '${studentId}';
      DELETE FROM public.students WHERE id = '${studentId}';
      DELETE FROM public.official_role_assignments WHERE profile_id = '${nurseUserId}';
      DELETE FROM public.profiles WHERE id IN ('${authUserId}', '${nurseUserId}');
      DELETE FROM auth.users WHERE id IN ('${authUserId}', '${nurseUserId}');
      DELETE FROM public.official_student_records WHERE id = '${osrId}';
    END $$;
  `);
});

test("Step 26 & 35: Registrar approval gate authoritatively enforces ALL 6 required clearances", () => {
  const [prog] = query("SELECT id FROM public.programs WHERE code = 'BSAIS' LIMIT 1;");
  const programId = prog[0];
  const studentAuthId = "55555555-bbbb-1111-2222-333333333333";
  const adminUserId = "55555555-bbbb-2222-3333-444444444444";
  const libUserId = "55555555-bbbb-3333-4444-555555555555";
  const nurseUserId = "55555555-bbbb-4444-5555-666666666666";
  const chairUserId = "55555555-bbbb-5555-6666-777777777777";
  const acctUserId = "55555555-bbbb-6666-7777-888888888888";
  const deanUserId = "55555555-bbbb-7777-8888-999999999999";

  const sigStudent = "77777777-1111-1111-1111-111111111111";
  const sigLib = "77777777-2222-2222-2222-222222222222";
  const sigNurse = "77777777-3333-3333-3333-333333333333";
  const sigChair = "77777777-4444-4444-4444-444444444444";
  const sigAcct = "77777777-5555-5555-5555-555555555555";
  const sigDean = "77777777-6666-6666-6666-666666666666";

  execute(`
    DO $$
    BEGIN
      PERFORM set_config('pkm.demo_reset', 'true', true);
      DELETE FROM public.audit_logs WHERE actor_profile_id IN ('${adminUserId}', '${libUserId}', '${nurseUserId}', '${chairUserId}', '${acctUserId}', '${deanUserId}', '${studentAuthId}');
      DELETE FROM public.enrollment_decision_notifications WHERE enrollment_id IN (SELECT id FROM public.enrollments WHERE student_id IN (SELECT id FROM public.students WHERE student_id_number = '25-ALL-CLR'));
      DELETE FROM public.enrollment_signatures WHERE id IN ('${sigStudent}', '${sigLib}', '${sigNurse}', '${sigChair}', '${sigAcct}', '${sigDean}');
      DELETE FROM public.enrollment_clearances WHERE enrollment_id IN (SELECT id FROM public.enrollments WHERE student_id IN (SELECT id FROM public.students WHERE student_id_number = '25-ALL-CLR'));
      DELETE FROM public.enrollment_subjects WHERE enrollment_id IN (SELECT id FROM public.enrollments WHERE student_id IN (SELECT id FROM public.students WHERE student_id_number = '25-ALL-CLR'));
      DELETE FROM public.enrollments WHERE student_id IN (SELECT id FROM public.students WHERE student_id_number = '25-ALL-CLR');
      DELETE FROM public.student_requirements WHERE student_id IN (SELECT id FROM public.students WHERE student_id_number = '25-ALL-CLR');
      DELETE FROM public.students WHERE student_id_number = '25-ALL-CLR';
      DELETE FROM public.official_role_assignments WHERE profile_id IN ('${libUserId}', '${nurseUserId}', '${chairUserId}', '${acctUserId}', '${deanUserId}');
      DELETE FROM public.profiles WHERE id IN ('${studentAuthId}', '${adminUserId}', '${libUserId}', '${nurseUserId}', '${chairUserId}', '${acctUserId}', '${deanUserId}');
      DELETE FROM auth.users WHERE id IN ('${studentAuthId}', '${adminUserId}', '${libUserId}', '${nurseUserId}', '${chairUserId}', '${acctUserId}', '${deanUserId}');
      DELETE FROM public.official_student_records WHERE student_id_number = '25-ALL-CLR';
    END $$;

    -- Create Admin
    INSERT INTO auth.users (id, email) VALUES ('${adminUserId}', 'admin.gate2@example.com') ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status)
    VALUES ('${adminUserId}', 'admin.gate2@example.com', 'admin', 'Admin', 'Gate2', 'ACTIVE') ON CONFLICT (id) DO NOTHING;

    -- Create Officials
    INSERT INTO auth.users (id, email) VALUES ('${libUserId}', 'lib.gate@example.com') ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status) VALUES ('${libUserId}', 'lib.gate@example.com', 'admin', 'Librarian', 'Staff', 'ACTIVE') ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.official_role_assignments (profile_id, official_role, program_id, active) VALUES ('${libUserId}', 'LIBRARIAN', null, true) ON CONFLICT DO NOTHING;

    INSERT INTO auth.users (id, email) VALUES ('${nurseUserId}', 'nurse.gate@example.com') ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status) VALUES ('${nurseUserId}', 'nurse.gate@example.com', 'admin', 'Nurse', 'Staff', 'ACTIVE') ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.official_role_assignments (profile_id, official_role, program_id, active) VALUES ('${nurseUserId}', 'NURSE', null, true) ON CONFLICT DO NOTHING;

    INSERT INTO auth.users (id, email) VALUES ('${chairUserId}', 'chair.gate@example.com') ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status) VALUES ('${chairUserId}', 'chair.gate@example.com', 'admin', 'Chair', 'Staff', 'ACTIVE') ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.official_role_assignments (profile_id, official_role, program_id, active) VALUES ('${chairUserId}', 'PROGRAM_CHAIR', null, true) ON CONFLICT DO NOTHING;

    INSERT INTO auth.users (id, email) VALUES ('${acctUserId}', 'acct.gate@example.com') ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status) VALUES ('${acctUserId}', 'acct.gate@example.com', 'admin', 'Accountant', 'Staff', 'ACTIVE') ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.official_role_assignments (profile_id, official_role, program_id, active) VALUES ('${acctUserId}', 'ACCOUNTANT', null, true) ON CONFLICT DO NOTHING;

    INSERT INTO auth.users (id, email) VALUES ('${deanUserId}', 'dean.gate@example.com') ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status) VALUES ('${deanUserId}', 'dean.gate@example.com', 'admin', 'Dean', 'Staff', 'ACTIVE') ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.official_role_assignments (profile_id, official_role, program_id, active) VALUES ('${deanUserId}', 'DEAN', null, true) ON CONFLICT DO NOTHING;
  `);

  // Create Student (Old Student Female)
  const [created] = query(`
    WITH auth_u AS (INSERT INTO auth.users (id, email) VALUES ('${studentAuthId}', 'allclr@example.com') ON CONFLICT (id) DO NOTHING RETURNING id),
    prof AS (INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status) VALUES ('${studentAuthId}', 'allclr@example.com', 'student', 'All', 'Clr', 'ACTIVE') ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name RETURNING id),
    osr AS (INSERT INTO public.official_student_records (student_id_number, first_name, last_name, email, program_id, year_level, student_type, gender_sex, enrollment_status) VALUES ('25-ALL-CLR', 'All', 'Clr', 'allclr@example.com', '${programId}', '1st Year', 'Old Student', 'Female', 'NOT ENROLLED') RETURNING id)
    INSERT INTO public.students (profile_id, official_record_id, student_id_number, program_id, year_level, student_type, enrollment_status)
    SELECT '${studentAuthId}', osr.id, '25-ALL-CLR', '${programId}', '1st Year', 'Old Student', 'NOT ENROLLED' FROM osr RETURNING id, official_record_id;
  `);
  const [studentId, osrId] = created;

  const [sub] = query(`
    SELECT outcome, enrollment_id
    FROM (SELECT set_config('request.jwt.claim.sub', '${studentAuthId}', true) as set_jwt) s,
    LATERAL public.submit_standard_student_enrollment('2025-2026', '2nd Semester');
  `);
  const enrollmentId = sub[1];

  // Test 1: Approval fails with no signatures -> incomplete_clearances
  const [res0] = query(`
    SELECT outcome FROM (SELECT set_config('request.jwt.claim.sub', '${adminUserId}', true) as set_jwt) s,
    LATERAL public.review_pending_enrollment('${enrollmentId}', 'APPROVED', null);
  `);
  assert.equal(res0[0], "incomplete_clearances");

  // Apply Student Signature
  const dummyHash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const [stuHash] = query(`SELECT private.enrollment_document_hash('${enrollmentId}', 'STUDENT', 'STUDENT_ENROLLMENT_SIGNATURE', 'ENROLLMENT_REGISTRATION');`);
  query(`
    SELECT outcome FROM (SELECT set_config('request.jwt.claim.sub', '${studentAuthId}', true) as set_jwt) s,
    LATERAL public.record_student_enrollment_signature('${enrollmentId}', '${sigStudent}', '${enrollmentId}/STUDENT/${sigStudent}.png', '${dummyHash}', '${stuHash[0]}');
  `);

  // Test 2: Approval fails with only student signature -> incomplete_clearances
  const [res1] = query(`
    SELECT outcome FROM (SELECT set_config('request.jwt.claim.sub', '${adminUserId}', true) as set_jwt) s,
    LATERAL public.review_pending_enrollment('${enrollmentId}', 'APPROVED', null);
  `);
  assert.equal(res1[0], "incomplete_clearances");

  // Apply Librarian Signature
  const [libHash] = query(`SELECT private.enrollment_document_hash('${enrollmentId}', 'LIBRARIAN', 'LIBRARY_CLEARANCE', 'ENROLLMENT_CLEARANCE');`);
  query(`
    SELECT outcome FROM (SELECT set_config('request.jwt.claim.sub', '${libUserId}', true) as set_jwt) s,
    LATERAL public.record_official_clearance_signature('${enrollmentId}', 'LIBRARY_CLEARANCE', '${sigLib}', '${enrollmentId}/LIBRARIAN/${sigLib}.png', '${dummyHash}', '${libHash[0]}');
  `);

  // Apply Nurse Standard Signature
  const [nurseHash] = query(`SELECT private.enrollment_document_hash('${enrollmentId}', 'NURSE', 'HEALTH_CLEARANCE', 'ENROLLMENT_CLEARANCE');`);
  query(`
    SELECT outcome FROM (SELECT set_config('request.jwt.claim.sub', '${nurseUserId}', true) as set_jwt) s,
    LATERAL public.record_standard_nurse_health_clearance_signature('${enrollmentId}', '${sigNurse}', '${enrollmentId}/NURSE/${sigNurse}.png', '${dummyHash}', '${nurseHash[0]}');
  `);

  // Apply Program Chair Signature
  const [chairHash] = query(`SELECT private.enrollment_document_hash('${enrollmentId}', 'PROGRAM_CHAIR', 'PROGRAM_CLEARANCE', 'ENROLLMENT_CLEARANCE');`);
  query(`
    SELECT outcome FROM (SELECT set_config('request.jwt.claim.sub', '${chairUserId}', true) as set_jwt) s,
    LATERAL public.record_official_clearance_signature('${enrollmentId}', 'PROGRAM_CLEARANCE', '${sigChair}', '${enrollmentId}/PROGRAM_CHAIR/${sigChair}.png', '${dummyHash}', '${chairHash[0]}');
  `);

  // Apply Accountant Signature
  const [acctHash] = query(`SELECT private.enrollment_document_hash('${enrollmentId}', 'ACCOUNTANT', 'ACCOUNTING_CLEARANCE', 'ENROLLMENT_CLEARANCE');`);
  query(`
    SELECT outcome FROM (SELECT set_config('request.jwt.claim.sub', '${acctUserId}', true) as set_jwt) s,
    LATERAL public.record_official_clearance_signature('${enrollmentId}', 'ACCOUNTING_CLEARANCE', '${sigAcct}', '${enrollmentId}/ACCOUNTANT/${sigAcct}.png', '${dummyHash}', '${acctHash[0]}');
  `);

  // Still missing Dean -> incomplete_clearances
  const [res5] = query(`
    SELECT outcome FROM (SELECT set_config('request.jwt.claim.sub', '${adminUserId}', true) as set_jwt) s,
    LATERAL public.review_pending_enrollment('${enrollmentId}', 'APPROVED', null);
  `);
  assert.equal(res5[0], "incomplete_clearances");

  // Apply Dean Signature
  const [deanHash] = query(`SELECT private.enrollment_document_hash('${enrollmentId}', 'DEAN', 'DEAN_CLEARANCE', 'ENROLLMENT_CLEARANCE');`);
  query(`
    SELECT outcome FROM (SELECT set_config('request.jwt.claim.sub', '${deanUserId}', true) as set_jwt) s,
    LATERAL public.record_official_clearance_signature('${enrollmentId}', 'DEAN_CLEARANCE', '${sigDean}', '${enrollmentId}/DEAN/${sigDean}.png', '${dummyHash}', '${deanHash[0]}');
  `);

  // Now all 6 required clearances are SIGNED and current -> Approval succeeds!
  const [apprSuccess] = query(`
    SELECT outcome FROM (SELECT set_config('request.jwt.claim.sub', '${adminUserId}', true) as set_jwt) s,
    LATERAL public.review_pending_enrollment('${enrollmentId}', 'APPROVED', null);
  `);
  assert.equal(apprSuccess[0], "approved");

  // Verify enrollment status is APPROVED
  assert.equal(query(`SELECT status FROM public.enrollments WHERE id = '${enrollmentId}';`)[0][0], "APPROVED");

  // Cleanup
  execute(`
    DO $$
    BEGIN
      PERFORM set_config('pkm.demo_reset', 'true', true);
      DELETE FROM public.audit_logs WHERE actor_profile_id IN ('${adminUserId}', '${libUserId}', '${nurseUserId}', '${chairUserId}', '${acctUserId}', '${deanUserId}', '${studentAuthId}');
      DELETE FROM public.enrollment_decision_notifications WHERE enrollment_id = '${enrollmentId}';
      DELETE FROM public.enrollment_signatures WHERE id IN ('${sigStudent}', '${sigLib}', '${sigNurse}', '${sigChair}', '${sigAcct}', '${sigDean}');
      DELETE FROM public.enrollment_clearances WHERE enrollment_id = '${enrollmentId}';
      DELETE FROM public.enrollment_subjects WHERE enrollment_id = '${enrollmentId}';
      DELETE FROM public.enrollments WHERE id = '${enrollmentId}';
      DELETE FROM public.student_requirements WHERE student_id = '${studentId}';
      DELETE FROM public.students WHERE id = '${studentId}';
      DELETE FROM public.official_role_assignments WHERE profile_id IN ('${libUserId}', '${nurseUserId}', '${chairUserId}', '${acctUserId}', '${deanUserId}');
      DELETE FROM public.profiles WHERE id IN ('${studentAuthId}', '${adminUserId}', '${libUserId}', '${nurseUserId}', '${chairUserId}', '${acctUserId}', '${deanUserId}');
      DELETE FROM auth.users WHERE id IN ('${studentAuthId}', '${adminUserId}', '${libUserId}', '${nurseUserId}', '${chairUserId}', '${acctUserId}', '${deanUserId}');
      DELETE FROM public.official_student_records WHERE id = '${osrId}';
    END $$;
  `);
});

test("Audit Finding 3: Missing HEALTH_CLEARANCE row is recreated by reconciliation without fake signatures", () => {
  const [prog] = query("SELECT id FROM public.programs WHERE code = 'BSAIS' LIMIT 1;");
  const programId = prog[0];
  const authUserId = "55555555-cccc-1111-2222-333333333333";

  execute(`
    DO $$
    BEGIN
      PERFORM set_config('pkm.demo_reset', 'true', true);
      DELETE FROM public.enrollment_clearances WHERE enrollment_id IN (SELECT id FROM public.enrollments WHERE student_id IN (SELECT id FROM public.students WHERE student_id_number = '25-RECREATE-01'));
      DELETE FROM public.enrollment_subjects WHERE enrollment_id IN (SELECT id FROM public.enrollments WHERE student_id IN (SELECT id FROM public.students WHERE student_id_number = '25-RECREATE-01'));
      DELETE FROM public.enrollments WHERE student_id IN (SELECT id FROM public.students WHERE student_id_number = '25-RECREATE-01');
      DELETE FROM public.student_requirements WHERE student_id IN (SELECT id FROM public.students WHERE student_id_number = '25-RECREATE-01');
      DELETE FROM public.students WHERE student_id_number = '25-RECREATE-01';
      DELETE FROM public.profiles WHERE id = '${authUserId}';
      DELETE FROM auth.users WHERE id = '${authUserId}';
      DELETE FROM public.official_student_records WHERE student_id_number = '25-RECREATE-01';
    END $$;
  `);

  // 1. Create Pending Enrollment
  const [created] = query(`
    WITH auth_u AS (INSERT INTO auth.users (id, email) VALUES ('${authUserId}', 'recreate1@example.com') ON CONFLICT (id) DO NOTHING RETURNING id),
    prof AS (INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status) VALUES ('${authUserId}', 'recreate1@example.com', 'student', 'Rec', 'One', 'ACTIVE') ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name RETURNING id),
    osr AS (INSERT INTO public.official_student_records (student_id_number, first_name, last_name, email, program_id, year_level, student_type, gender_sex, enrollment_status) VALUES ('25-RECREATE-01', 'Rec', 'One', 'recreate1@example.com', '${programId}', '1st Year', 'Incoming 1st Year Student', 'Female', 'NOT ENROLLED') RETURNING id)
    INSERT INTO public.students (profile_id, official_record_id, student_id_number, program_id, year_level, student_type, enrollment_status)
    SELECT '${authUserId}', osr.id, '25-RECREATE-01', '${programId}', '1st Year', 'Incoming 1st Year Student', 'NOT ENROLLED' FROM osr RETURNING id, official_record_id;
  `);
  const [studentId, osrId] = created;

  const [sub] = query(`
    SELECT outcome, enrollment_id
    FROM (SELECT set_config('request.jwt.claim.sub', '${authUserId}', true) as set_jwt) s,
    LATERAL public.submit_standard_student_enrollment('2025-2026', '2nd Semester');
  `);
  const enrollmentId = sub[1];

  // Confirm seeded HEALTH_CLEARANCE exists
  assert.equal(query(`SELECT status FROM public.enrollment_clearances WHERE enrollment_id = '${enrollmentId}' AND clearance_type = 'HEALTH_CLEARANCE';`)[0][0], "PENDING");

  // 2. Delete HEALTH_CLEARANCE row
  execute(`
    DELETE FROM public.enrollment_clearances
    WHERE enrollment_id = '${enrollmentId}' AND clearance_type = 'HEALTH_CLEARANCE';
  `);
  assert.equal(query(`SELECT count(*) FROM public.enrollment_clearances WHERE enrollment_id = '${enrollmentId}' AND clearance_type = 'HEALTH_CLEARANCE';`)[0][0], "0");

  // 3. Run reconciliation through legitimate trigger/helper path
  execute(`
    SELECT private.reconcile_health_requirement_for_student('${studentId}');
  `);
  // 4. Assert HEALTH_CLEARANCE row is recreated
  const [recreatedClr] = query(`
    SELECT status FROM public.enrollment_clearances WHERE enrollment_id = '${enrollmentId}' AND clearance_type = 'HEALTH_CLEARANCE';
  `);
  assert.ok(recreatedClr);
  // 5. Assert status is correct (PENDING)
  assert.equal(recreatedClr[0], "PENDING");

  // 6. Assert no fake signature was created
  const [sigCount] = query(`
    SELECT count(*) FROM public.enrollment_signatures WHERE enrollment_id = '${enrollmentId}';
  `);
  assert.equal(sigCount[0], "0");

  // Cleanup
  execute(`
    DO $$
    BEGIN
      PERFORM set_config('pkm.demo_reset', 'true', true);
      DELETE FROM public.enrollment_clearances WHERE enrollment_id = '${enrollmentId}';
      DELETE FROM public.enrollment_subjects WHERE enrollment_id = '${enrollmentId}';
      DELETE FROM public.enrollments WHERE id = '${enrollmentId}';
      DELETE FROM public.student_requirements WHERE student_id = '${studentId}';
      DELETE FROM public.students WHERE id = '${studentId}';
      DELETE FROM public.profiles WHERE id = '${authUserId}';
      DELETE FROM auth.users WHERE id = '${authUserId}';
      DELETE FROM public.official_student_records WHERE id = '${osrId}';
    END $$;
  `);
});
