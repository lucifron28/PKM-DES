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
  const u1 = "44444444-1111-1111-1111-111111111111";
  const u2 = "44444444-2222-2222-2222-222222222222";
  const u3 = "44444444-3333-3333-3333-333333333333";

  // Cleanup pre-existing
  execute(`
    DELETE FROM public.students WHERE student_id_number IN ('T-CAN-01', 'T-CAN-02', 'T-CAN-03');
    DELETE FROM public.profiles WHERE id IN ('${u1}', '${u2}', '${u3}');
    DELETE FROM auth.users WHERE id IN ('${u1}', '${u2}', '${u3}');
    DELETE FROM public.official_student_records WHERE student_id_number IN ('T-CAN-01', 'T-CAN-02', 'T-CAN-03');
  `);

  // 1. Incoming 1st Year + Female -> APPLICABLE
  const [s1] = query(`
    WITH auth_u AS (
      INSERT INTO auth.users (id, email) VALUES ('${u1}', 'test.canonical.1@example.com')
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    ),
    prof AS (
      INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status)
      VALUES ('${u1}', 'test.canonical.1@example.com', 'student', 'Test', 'One', 'ACTIVE')
      ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name
      RETURNING id
    ),
    osr AS (
      INSERT INTO public.official_student_records (student_id_number, first_name, last_name, email, program_id, year_level, student_type, gender_sex, enrollment_status)
      VALUES ('T-CAN-01', 'Test', 'One', 'test.canonical.1@example.com', '${programId}', '1st Year', 'Incoming 1st Year Student', 'Female', 'NOT ENROLLED')
      RETURNING id
    )
    INSERT INTO public.students (profile_id, official_record_id, student_id_number, program_id, year_level, student_type, enrollment_status)
    SELECT '${u1}', osr.id, 'T-CAN-01', '${programId}', '1st Year', 'Incoming 1st Year Student', 'NOT ENROLLED'
    FROM osr
    RETURNING id;
  `);
  const student1Id = s1[0];

  const [res1] = query(`SELECT private.get_health_requirement_applicability('${student1Id}');`);
  assert.equal(res1[0], "APPLICABLE");

  // 2. Incoming 1st Year + Male -> NOT_APPLICABLE
  const [s2] = query(`
    WITH auth_u AS (
      INSERT INTO auth.users (id, email) VALUES ('${u2}', 'test.canonical.2@example.com')
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    ),
    prof AS (
      INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status)
      VALUES ('${u2}', 'test.canonical.2@example.com', 'student', 'Test', 'Two', 'ACTIVE')
      ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name
      RETURNING id
    ),
    osr AS (
      INSERT INTO public.official_student_records (student_id_number, first_name, last_name, email, program_id, year_level, student_type, gender_sex, enrollment_status)
      VALUES ('T-CAN-02', 'Test', 'Two', 'test.canonical.2@example.com', '${programId}', '1st Year', 'Incoming 1st Year Student', 'Male', 'NOT ENROLLED')
      RETURNING id
    )
    INSERT INTO public.students (profile_id, official_record_id, student_id_number, program_id, year_level, student_type, enrollment_status)
    SELECT '${u2}', osr.id, 'T-CAN-02', '${programId}', '1st Year', 'Incoming 1st Year Student', 'NOT ENROLLED'
    FROM osr
    RETURNING id;
  `);
  const student2Id = s2[0];

  const [res2] = query(`SELECT private.get_health_requirement_applicability('${student2Id}');`);
  assert.equal(res2[0], "NOT_APPLICABLE");

  // 3. Old Student + Female -> NOT_APPLICABLE
  const [s3] = query(`
    WITH auth_u AS (
      INSERT INTO auth.users (id, email) VALUES ('${u3}', 'test.canonical.3@example.com')
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    ),
    prof AS (
      INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status)
      VALUES ('${u3}', 'test.canonical.3@example.com', 'student', 'Test', 'Three', 'ACTIVE')
      ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name
      RETURNING id
    ),
    osr AS (
      INSERT INTO public.official_student_records (student_id_number, first_name, last_name, email, program_id, year_level, student_type, gender_sex, enrollment_status)
      VALUES ('T-CAN-03', 'Test', 'Three', 'test.canonical.3@example.com', '${programId}', '1st Year', 'Old Student', 'Female', 'NOT ENROLLED')
      RETURNING id
    )
    INSERT INTO public.students (profile_id, official_record_id, student_id_number, program_id, year_level, student_type, enrollment_status)
    SELECT '${u3}', osr.id, 'T-CAN-03', '${programId}', '1st Year', 'Old Student', 'NOT ENROLLED'
    FROM osr
    RETURNING id;
  `);
  const student3Id = s3[0];

  const [res3] = query(`SELECT private.get_health_requirement_applicability('${student3Id}');`);
  assert.equal(res3[0], "NOT_APPLICABLE");

  // Cleanup
  execute(`
    DELETE FROM public.students WHERE id IN ('${student1Id}', '${student2Id}', '${student3Id}');
    DELETE FROM public.profiles WHERE id IN ('${u1}', '${u2}', '${u3}');
    DELETE FROM auth.users WHERE id IN ('${u1}', '${u2}', '${u3}');
    DELETE FROM public.official_student_records WHERE email LIKE 'test.canonical.%@example.com';
  `);
});

test("Scenario 19 & 21: Client case — Old Student Female -> Incoming 1st Year Female sync", () => {
  const [prog] = query("SELECT id FROM public.programs WHERE code = 'BSAIS' LIMIT 1;");
  const programId = prog[0];
  const authUserId = "33333333-1111-2222-3333-444444444444";

  // Cleanup pre-existing
  execute(`
    DELETE FROM public.enrollment_clearances WHERE enrollment_id IN (SELECT id FROM public.enrollments WHERE student_id IN (SELECT id FROM public.students WHERE student_id_number = '25-SCEN-19'));
    DELETE FROM public.enrollment_subjects WHERE enrollment_id IN (SELECT id FROM public.enrollments WHERE student_id IN (SELECT id FROM public.students WHERE student_id_number = '25-SCEN-19'));
    DELETE FROM public.enrollments WHERE student_id IN (SELECT id FROM public.students WHERE student_id_number = '25-SCEN-19');
    DELETE FROM public.student_requirements WHERE student_id IN (SELECT id FROM public.students WHERE student_id_number = '25-SCEN-19');
    DELETE FROM public.students WHERE student_id_number = '25-SCEN-19';
    DELETE FROM public.profiles WHERE id = '${authUserId}';
    DELETE FROM auth.users WHERE id = '${authUserId}';
    DELETE FROM public.official_student_records WHERE student_id_number = '25-SCEN-19';
  `);

  // Create student: Year Level = 1st Year, Student Type = Old Student, Gender = Female
  const [created] = query(`
    WITH auth_u AS (
      INSERT INTO auth.users (id, email)
      VALUES ('${authUserId}', 'client.case.19@example.com')
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    ),
    prof AS (
      INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status)
      VALUES ('${authUserId}', 'client.case.19@example.com', 'student', 'Client', 'Case', 'ACTIVE')
      ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name
      RETURNING id
    ),
    osr AS (
      INSERT INTO public.official_student_records (student_id_number, first_name, last_name, email, program_id, year_level, student_type, gender_sex, enrollment_status)
      VALUES ('25-SCEN-19', 'Client', 'Case', 'client.case.19@example.com', '${programId}', '1st Year', 'Old Student', 'Female', 'NOT ENROLLED')
      RETURNING id
    )
    INSERT INTO public.students (profile_id, official_record_id, student_id_number, program_id, year_level, student_type, enrollment_status)
    SELECT '${authUserId}', osr.id, '25-SCEN-19', '${programId}', '1st Year', 'Old Student', 'NOT ENROLLED'
    FROM osr
    RETURNING id, official_record_id;
  `);
  const [studentId, osrId] = created;

  // Submit enrollment as student
  const [sub] = query(`
    SELECT outcome, enrollment_id
    FROM (
      SELECT set_config('request.jwt.claim.sub', '${authUserId}', true) as set_jwt
    ) s,
    LATERAL public.submit_standard_student_enrollment('2025-2026', '2nd Semester');
  `);
  assert.equal(sub[0], "submitted");
  const enrollmentId = sub[1];

  // Immediately after submission: NOT_APPLICABLE
  const [reqBefore] = query(`
    SELECT applicability, status FROM public.student_requirements WHERE student_id = '${studentId}';
  `);
  assert.equal(reqBefore[0], "NOT_APPLICABLE");

  const [clrBefore] = query(`
    SELECT status FROM public.enrollment_clearances WHERE enrollment_id = '${enrollmentId}' AND clearance_type = 'HEALTH_CLEARANCE';
  `);
  assert.equal(clrBefore[0], "NOT_APPLICABLE");

  // Registrar updates student type: Old Student -> Incoming 1st Year Student
  execute(`
    UPDATE public.official_student_records
    SET student_type = 'Incoming 1st Year Student', updated_at = now()
    WHERE id = '${osrId}';

    UPDATE public.students
    SET student_type = 'Incoming 1st Year Student', updated_at = now()
    WHERE id = '${studentId}';
  `);

  // Immediately after update: APPLICABLE & PENDING
  const [reqAfter] = query(`
    SELECT applicability, status FROM public.student_requirements WHERE student_id = '${studentId}';
  `);
  assert.equal(reqAfter[0], "APPLICABLE");
  assert.equal(reqAfter[1], "PENDING");

  const [clrAfter] = query(`
    SELECT status FROM public.enrollment_clearances WHERE enrollment_id = '${enrollmentId}' AND clearance_type = 'HEALTH_CLEARANCE';
  `);
  assert.equal(clrAfter[0], "PENDING");

  // Cleanup
  execute(`
    DELETE FROM public.enrollment_clearances WHERE enrollment_id = '${enrollmentId}';
    DELETE FROM public.enrollment_subjects WHERE enrollment_id = '${enrollmentId}';
    DELETE FROM public.enrollments WHERE id = '${enrollmentId}';
    DELETE FROM public.student_requirements WHERE student_id = '${studentId}';
    DELETE FROM public.students WHERE id = '${studentId}';
    DELETE FROM public.profiles WHERE id = '${authUserId}';
    DELETE FROM auth.users WHERE id = '${authUserId}';
    DELETE FROM public.official_student_records WHERE id = '${osrId}';
  `);
});

test("Scenario 20: Gender correction Male -> Female -> Male", () => {
  const [prog] = query("SELECT id FROM public.programs WHERE code = 'BSAIS' LIMIT 1;");
  const programId = prog[0];
  const authUserId = "33333333-2222-3333-4444-555555555555";

  // Cleanup pre-existing
  execute(`
    DELETE FROM public.enrollment_clearances WHERE enrollment_id IN (SELECT id FROM public.enrollments WHERE student_id IN (SELECT id FROM public.students WHERE student_id_number = '25-SCEN-20'));
    DELETE FROM public.enrollment_subjects WHERE enrollment_id IN (SELECT id FROM public.enrollments WHERE student_id IN (SELECT id FROM public.students WHERE student_id_number = '25-SCEN-20'));
    DELETE FROM public.enrollments WHERE student_id IN (SELECT id FROM public.students WHERE student_id_number = '25-SCEN-20');
    DELETE FROM public.student_requirements WHERE student_id IN (SELECT id FROM public.students WHERE student_id_number = '25-SCEN-20');
    DELETE FROM public.students WHERE student_id_number = '25-SCEN-20';
    DELETE FROM public.profiles WHERE id = '${authUserId}';
    DELETE FROM auth.users WHERE id = '${authUserId}';
    DELETE FROM public.official_student_records WHERE student_id_number = '25-SCEN-20';
  `);

  // Create student: Incoming 1st Year, Male
  const [created] = query(`
    WITH auth_u AS (
      INSERT INTO auth.users (id, email)
      VALUES ('${authUserId}', 'gender.test.20@example.com')
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    ),
    prof AS (
      INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status)
      VALUES ('${authUserId}', 'gender.test.20@example.com', 'student', 'Gender', 'Test', 'ACTIVE')
      ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name
      RETURNING id
    ),
    osr AS (
      INSERT INTO public.official_student_records (student_id_number, first_name, last_name, email, program_id, year_level, student_type, gender_sex, enrollment_status)
      VALUES ('25-SCEN-20', 'Gender', 'Test', 'gender.test.20@example.com', '${programId}', '1st Year', 'Incoming 1st Year Student', 'Male', 'NOT ENROLLED')
      RETURNING id
    )
    INSERT INTO public.students (profile_id, official_record_id, student_id_number, program_id, year_level, student_type, enrollment_status)
    SELECT '${authUserId}', osr.id, '25-SCEN-20', '${programId}', '1st Year', 'Incoming 1st Year Student', 'NOT ENROLLED'
    FROM osr
    RETURNING id, official_record_id;
  `);
  const [studentId, osrId] = created;

  // Submit enrollment
  const [sub] = query(`
    SELECT outcome, enrollment_id
    FROM (
      SELECT set_config('request.jwt.claim.sub', '${authUserId}', true) as set_jwt
    ) s,
    LATERAL public.submit_standard_student_enrollment('2025-2026', '2nd Semester');
  `);
  assert.equal(sub[0], "submitted");
  const enrollmentId = sub[1];

  // At submission: NOT_APPLICABLE
  const [reqInit] = query(`
    SELECT applicability, status FROM public.student_requirements WHERE student_id = '${studentId}';
  `);
  assert.equal(reqInit[0], "NOT_APPLICABLE");

  // Registrar updates Male -> Female
  execute(`
    UPDATE public.official_student_records
    SET gender_sex = 'Female', updated_at = now()
    WHERE id = '${osrId}';
  `);

  const [reqFemale] = query(`
    SELECT applicability, status FROM public.student_requirements WHERE student_id = '${studentId}';
  `);
  assert.equal(reqFemale[0], "APPLICABLE");
  assert.equal(reqFemale[1], "PENDING");

  const [clrFemale] = query(`
    SELECT status FROM public.enrollment_clearances WHERE enrollment_id = '${enrollmentId}' AND clearance_type = 'HEALTH_CLEARANCE';
  `);
  assert.equal(clrFemale[0], "PENDING");

  // Registrar updates Female -> Male before signing
  execute(`
    UPDATE public.official_student_records
    SET gender_sex = 'Male', updated_at = now()
    WHERE id = '${osrId}';
  `);

  const [reqMale] = query(`
    SELECT applicability, status FROM public.student_requirements WHERE student_id = '${studentId}';
  `);
  assert.equal(reqMale[0], "NOT_APPLICABLE");
  assert.equal(reqMale[1], "PENDING");

  const [clrMale] = query(`
    SELECT status FROM public.enrollment_clearances WHERE enrollment_id = '${enrollmentId}' AND clearance_type = 'HEALTH_CLEARANCE';
  `);
  assert.equal(clrMale[0], "NOT_APPLICABLE");

  // Cleanup
  execute(`
    DELETE FROM public.enrollment_clearances WHERE enrollment_id = '${enrollmentId}';
    DELETE FROM public.enrollment_subjects WHERE enrollment_id = '${enrollmentId}';
    DELETE FROM public.enrollments WHERE id = '${enrollmentId}';
    DELETE FROM public.student_requirements WHERE student_id = '${studentId}';
    DELETE FROM public.students WHERE id = '${studentId}';
    DELETE FROM public.profiles WHERE id = '${authUserId}';
    DELETE FROM auth.users WHERE id = '${authUserId}';
    DELETE FROM public.official_student_records WHERE id = '${osrId}';
  `);
});

test("Scenario 23: Signed Health Clearance changes when authoritative eligibility changes", () => {
  const [prog] = query("SELECT id FROM public.programs WHERE code = 'BSAIS' LIMIT 1;");
  const programId = prog[0];
  const authUserId = "33333333-3333-4444-5555-666666666666";
  const nurseUserId = "33333333-4444-5555-6666-777777777777";
  const signatureId = "55555555-5555-5555-5555-555555555555";

  // Cleanup pre-existing
  execute(`
    DO $$
    BEGIN
      PERFORM set_config('pkm.demo_reset', 'true', true);
      DELETE FROM public.audit_logs WHERE actor_profile_id = '${nurseUserId}';
      DELETE FROM public.enrollment_signatures WHERE id = '${signatureId}';
      DELETE FROM public.enrollment_clearances WHERE enrollment_id IN (SELECT id FROM public.enrollments WHERE student_id IN (SELECT id FROM public.students WHERE student_id_number = '25-SCEN-23'));
      DELETE FROM public.enrollment_subjects WHERE enrollment_id IN (SELECT id FROM public.enrollments WHERE student_id IN (SELECT id FROM public.students WHERE student_id_number = '25-SCEN-23'));
      DELETE FROM public.enrollments WHERE student_id IN (SELECT id FROM public.students WHERE student_id_number = '25-SCEN-23');
      DELETE FROM public.student_requirements WHERE student_id IN (SELECT id FROM public.students WHERE student_id_number = '25-SCEN-23');
      DELETE FROM public.students WHERE student_id_number = '25-SCEN-23';
      DELETE FROM public.official_role_assignments WHERE profile_id = '${nurseUserId}';
      DELETE FROM public.profiles WHERE id IN ('${authUserId}', '${nurseUserId}');
      DELETE FROM auth.users WHERE id IN ('${authUserId}', '${nurseUserId}');
      DELETE FROM public.official_student_records WHERE student_id_number = '25-SCEN-23';
    END $$;
  `);

  // Setup Nurse profile
  execute(`
    INSERT INTO auth.users (id, email) VALUES ('${nurseUserId}', 'nurse.scen23@example.com') ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status)
    VALUES ('${nurseUserId}', 'nurse.scen23@example.com', 'admin', 'Nurse', 'Signer', 'ACTIVE')
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.official_role_assignments (profile_id, official_role, program_id, active)
    VALUES ('${nurseUserId}', 'NURSE', null, true)
    ON CONFLICT DO NOTHING;
  `);

  // Create student: Incoming 1st Year, Female
  const [created] = query(`
    WITH auth_u AS (
      INSERT INTO auth.users (id, email)
      VALUES ('${authUserId}', 'sign.test.23@example.com')
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    ),
    prof AS (
      INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status)
      VALUES ('${authUserId}', 'sign.test.23@example.com', 'student', 'Sign', 'Test', 'ACTIVE')
      ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name
      RETURNING id
    ),
    osr AS (
      INSERT INTO public.official_student_records (student_id_number, first_name, last_name, email, program_id, year_level, student_type, gender_sex, enrollment_status)
      VALUES ('25-SCEN-23', 'Sign', 'Test', 'sign.test.23@example.com', '${programId}', '1st Year', 'Incoming 1st Year Student', 'Female', 'NOT ENROLLED')
      RETURNING id
    )
    INSERT INTO public.students (profile_id, official_record_id, student_id_number, program_id, year_level, student_type, enrollment_status)
    SELECT '${authUserId}', osr.id, '25-SCEN-23', '${programId}', '1st Year', 'Incoming 1st Year Student', 'NOT ENROLLED'
    FROM osr
    RETURNING id, official_record_id;
  `);
  const [studentId, osrId] = created;

  // Submit enrollment
  const [sub] = query(`
    SELECT outcome, enrollment_id
    FROM (
      SELECT set_config('request.jwt.claim.sub', '${authUserId}', true) as set_jwt
    ) s,
    LATERAL public.submit_standard_student_enrollment('2025-2026', '2nd Semester');
  `);
  const enrollmentId = sub[1];

  // Compute document hash for Nurse verification
  const [hashRes] = query(`
    SELECT private.health_record_document_hash('${enrollmentId}', '${studentId}', '2025-2026', '2nd Semester', 'APPLICABLE', 'VERIFIED');
  `);
  const docHash = hashRes[0];
  const sigHash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const sigPath = `${enrollmentId}/NURSE/${signatureId}.png`;

  // Nurse verifies & signs
  const [signRes] = query(`
    SELECT outcome
    FROM (
      SELECT set_config('request.jwt.claim.sub', '${nurseUserId}', true) as set_jwt
    ) s,
    LATERAL public.verify_health_requirement_with_signature(
      '${enrollmentId}',
      '${signatureId}',
      '${sigPath}',
      '${sigHash}',
      '${docHash}',
      true,
      'Valid medical form verified'
    );
  `);
  assert.equal(signRes[0], "signed");

  // Check requirement & clearance are VERIFIED / SIGNED
  const [clrSigned] = query(`
    SELECT status FROM public.enrollment_clearances WHERE enrollment_id = '${enrollmentId}' AND clearance_type = 'HEALTH_CLEARANCE';
  `);
  assert.equal(clrSigned[0], "SIGNED");

  // Registrar changes official student type to Old Student
  execute(`
    UPDATE public.official_student_records
    SET student_type = 'Old Student', updated_at = now()
    WHERE id = '${osrId}';
    UPDATE public.students
    SET student_type = 'Old Student', updated_at = now()
    WHERE id = '${studentId}';
  `);

  // Historical signature row still exists and is untouched
  const [sigCheck] = query(`
    SELECT id, signature_hash, document_hash FROM public.enrollment_signatures WHERE id = '${signatureId}';
  `);
  assert.equal(sigCheck[0], signatureId);
  assert.equal(sigCheck[1], sigHash);
  assert.equal(sigCheck[2], docHash);

  // Requirement is now NOT_APPLICABLE and clearance is NOT_APPLICABLE
  const [reqNotApp] = query(`
    SELECT applicability, status, case when verified_at is null then 'null' else 'set' end FROM public.student_requirements WHERE student_id = '${studentId}';
  `);
  assert.equal(reqNotApp[0], "NOT_APPLICABLE");
  assert.equal(reqNotApp[1], "PENDING");
  assert.equal(reqNotApp[2], "null");

  const [clrNotApp] = query(`
    SELECT status FROM public.enrollment_clearances WHERE enrollment_id = '${enrollmentId}' AND clearance_type = 'HEALTH_CLEARANCE';
  `);
  assert.equal(clrNotApp[0], "NOT_APPLICABLE");

  // Changing back to Incoming 1st Year Student -> PENDING (new signature required)
  execute(`
    UPDATE public.official_student_records
    SET student_type = 'Incoming 1st Year Student', updated_at = now()
    WHERE id = '${osrId}';
    UPDATE public.students
    SET student_type = 'Incoming 1st Year Student', updated_at = now()
    WHERE id = '${studentId}';
  `);

  const [clrPendingAgain] = query(`
    SELECT status FROM public.enrollment_clearances WHERE enrollment_id = '${enrollmentId}' AND clearance_type = 'HEALTH_CLEARANCE';
  `);
  assert.equal(clrPendingAgain[0], "PENDING");

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

test("Scenario 24: Historical approved enrollment is not modified when official record changes", () => {
  const [prog] = query("SELECT id FROM public.programs WHERE code = 'BSAIS' LIMIT 1;");
  const programId = prog[0];
  const authUserId = "33333333-5555-6666-7777-888888888888";

  // Cleanup pre-existing
  execute(`
    DELETE FROM public.enrollment_clearances WHERE enrollment_id IN (SELECT id FROM public.enrollments WHERE student_id IN (SELECT id FROM public.students WHERE student_id_number = '25-SCEN-24'));
    DELETE FROM public.enrollment_subjects WHERE enrollment_id IN (SELECT id FROM public.enrollments WHERE student_id IN (SELECT id FROM public.students WHERE student_id_number = '25-SCEN-24'));
    DELETE FROM public.enrollments WHERE student_id IN (SELECT id FROM public.students WHERE student_id_number = '25-SCEN-24');
    DELETE FROM public.student_requirements WHERE student_id IN (SELECT id FROM public.students WHERE student_id_number = '25-SCEN-24');
    DELETE FROM public.students WHERE student_id_number = '25-SCEN-24';
    DELETE FROM public.profiles WHERE id = '${authUserId}';
    DELETE FROM auth.users WHERE id = '${authUserId}';
    DELETE FROM public.official_student_records WHERE student_id_number = '25-SCEN-24';
  `);

  // Create student and APPROVED enrollment
  const [created] = query(`
    WITH auth_u AS (
      INSERT INTO auth.users (id, email)
      VALUES ('${authUserId}', 'hist.approved.24@example.com')
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    ),
    prof AS (
      INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status)
      VALUES ('${authUserId}', 'hist.approved.24@example.com', 'student', 'Hist', 'Approved', 'ACTIVE')
      ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name
      RETURNING id
    ),
    osr AS (
      INSERT INTO public.official_student_records (student_id_number, first_name, last_name, email, program_id, year_level, student_type, gender_sex, enrollment_status)
      VALUES ('25-SCEN-24', 'Hist', 'Approved', 'hist.approved.24@example.com', '${programId}', '1st Year', 'Incoming 1st Year Student', 'Female', 'ENROLLED')
      RETURNING id
    )
    INSERT INTO public.students (profile_id, official_record_id, student_id_number, program_id, year_level, student_type, enrollment_status)
    SELECT '${authUserId}', osr.id, '25-SCEN-24', '${programId}', '1st Year', 'Incoming 1st Year Student', 'ENROLLED'
    FROM osr
    RETURNING id, official_record_id;
  `);
  const [studentId, osrId] = created;

  const [enrRes] = query(`
    INSERT INTO public.enrollments (student_id, program_id, year_level, academic_year, semester, status, reviewed_at)
    VALUES ('${studentId}', '${programId}', '1st Year', '2024-2025', '1st Semester', 'APPROVED', now())
    RETURNING id;
  `);
  const historicalEnrollmentId = enrRes[0];

  // Seed historical requirement using nurse transaction override
  execute(`
    DO $$
    BEGIN
      PERFORM set_config('pkm.health_requirement_mutation', 'true', true);
      INSERT INTO public.student_requirements (student_id, requirement_code, status, academic_year, semester, applicability, verified_at, verified_by)
      VALUES ('${studentId}', 'HEALTH_RECORD_UPDATE', 'VERIFIED', '2024-2025', '1st Semester', 'APPLICABLE', now(), '${authUserId}');

      INSERT INTO public.enrollment_clearances (enrollment_id, clearance_type, status)
      VALUES ('${historicalEnrollmentId}', 'HEALTH_CLEARANCE', 'SIGNED')
      ON CONFLICT (enrollment_id, clearance_type) DO UPDATE SET status = 'SIGNED';
    END $$;
  `);

  // Now Registrar edits current official student type to Old Student
  execute(`
    UPDATE public.official_student_records
    SET student_type = 'Old Student', gender_sex = 'Male', updated_at = now()
    WHERE id = '${osrId}';
    UPDATE public.students
    SET student_type = 'Old Student', updated_at = now()
    WHERE id = '${studentId}';
  `);

  // Historical approved enrollment and clearance are NOT modified
  const [histEnrCheck] = query(`
    SELECT status FROM public.enrollments WHERE id = '${historicalEnrollmentId}';
  `);
  assert.equal(histEnrCheck[0], "APPROVED");

  const [histClrCheck] = query(`
    SELECT status FROM public.enrollment_clearances WHERE enrollment_id = '${historicalEnrollmentId}' AND clearance_type = 'HEALTH_CLEARANCE';
  `);
  assert.equal(histClrCheck[0], "SIGNED");

  // Cleanup
  execute(`
    DELETE FROM public.enrollment_clearances WHERE enrollment_id = '${historicalEnrollmentId}';
    DELETE FROM public.enrollments WHERE id = '${historicalEnrollmentId}';
    DELETE FROM public.student_requirements WHERE student_id = '${studentId}';
    DELETE FROM public.students WHERE id = '${studentId}';
    DELETE FROM public.profiles WHERE id = '${authUserId}';
    DELETE FROM auth.users WHERE id = '${authUserId}';
    DELETE FROM public.official_student_records WHERE id = '${osrId}';
  `);
});

test("Scenario 25: Linked official record authority uses official_record_id over unlinked rows", () => {
  const [prog] = query("SELECT id FROM public.programs WHERE code = 'BSAIS' LIMIT 1;");
  const programId = prog[0];
  const authUserId = "33333333-6666-7777-8888-999999999999";

  // Cleanup pre-existing
  execute(`
    DELETE FROM public.students WHERE student_id_number = '25-LINK-A';
    DELETE FROM public.profiles WHERE id = '${authUserId}';
    DELETE FROM auth.users WHERE id = '${authUserId}';
    DELETE FROM public.official_student_records WHERE student_id_number = '25-LINK-A';
  `);

  // Create Official Record A: Female
  const [osrA] = query(`
    INSERT INTO public.official_student_records (student_id_number, first_name, last_name, email, program_id, year_level, student_type, gender_sex, enrollment_status)
    VALUES ('25-LINK-A', 'Record', 'A', 'record.a@example.com', '${programId}', '1st Year', 'Incoming 1st Year Student', 'Female', 'NOT ENROLLED')
    RETURNING id;
  `);
  const recordAId = osrA[0];

  // Create Student linked explicitly to Record A
  const [stud] = query(`
    WITH auth_u AS (
      INSERT INTO auth.users (id, email)
      VALUES ('${authUserId}', 'record.a@example.com')
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    ),
    prof AS (
      INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status)
      VALUES ('${authUserId}', 'record.a@example.com', 'student', 'Record', 'A', 'ACTIVE')
      ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name
      RETURNING id
    )
    INSERT INTO public.students (profile_id, official_record_id, student_id_number, program_id, year_level, student_type, enrollment_status)
    VALUES ('${authUserId}', '${recordAId}', '25-LINK-A', '${programId}', '1st Year', 'Incoming 1st Year Student', 'NOT ENROLLED')
    RETURNING id;
  `);
  const studentId = stud[0];

  const [appRes] = query(`SELECT private.get_health_requirement_applicability('${studentId}');`);
  assert.equal(appRes[0], "APPLICABLE");

  // Cleanup
  execute(`
    DELETE FROM public.students WHERE id = '${studentId}';
    DELETE FROM public.profiles WHERE id = '${authUserId}';
    DELETE FROM auth.users WHERE id = '${authUserId}';
    DELETE FROM public.official_student_records WHERE id = '${recordAId}';
  `);
});

test("Scenario 22: Null and Unknown gender do not infer Female", () => {
  const [prog] = query("SELECT id FROM public.programs WHERE code = 'BSAIS' LIMIT 1;");
  const programId = prog[0];
  const uNull = "44444444-5555-5555-5555-555555555555";
  const uPref = "44444444-6666-6666-6666-666666666666";

  // 1. Gender = null
  const [sNull] = query(`
    WITH auth_u AS (
      INSERT INTO auth.users (id, email) VALUES ('${uNull}', 'null.gender@example.com') ON CONFLICT (id) DO NOTHING RETURNING id
    ),
    prof AS (
      INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status)
      VALUES ('${uNull}', 'null.gender@example.com', 'student', 'Null', 'Gender', 'ACTIVE')
      ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name RETURNING id
    ),
    osr AS (
      INSERT INTO public.official_student_records (student_id_number, first_name, last_name, email, program_id, year_level, student_type, gender_sex, enrollment_status)
      VALUES ('25-NULL-01', 'Null', 'Gender', 'null.gender@example.com', '${programId}', '1st Year', 'Incoming 1st Year Student', null, 'NOT ENROLLED')
      RETURNING id
    )
    INSERT INTO public.students (profile_id, official_record_id, student_id_number, program_id, year_level, student_type, enrollment_status)
    SELECT '${uNull}', osr.id, '25-NULL-01', '${programId}', '1st Year', 'Incoming 1st Year Student', 'NOT ENROLLED'
    FROM osr RETURNING id;
  `);
  const [resNull] = query(`SELECT private.get_health_requirement_applicability('${sNull[0]}');`);
  assert.equal(resNull[0], "NOT_APPLICABLE");

  // 2. Gender = 'Prefer not to say'
  const [sPref] = query(`
    WITH auth_u AS (
      INSERT INTO auth.users (id, email) VALUES ('${uPref}', 'pref.gender@example.com') ON CONFLICT (id) DO NOTHING RETURNING id
    ),
    prof AS (
      INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status)
      VALUES ('${uPref}', 'pref.gender@example.com', 'student', 'Pref', 'Gender', 'ACTIVE')
      ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name RETURNING id
    ),
    osr AS (
      INSERT INTO public.official_student_records (student_id_number, first_name, last_name, email, program_id, year_level, student_type, gender_sex, enrollment_status)
      VALUES ('25-PREF-01', 'Pref', 'Gender', 'pref.gender@example.com', '${programId}', '1st Year', 'Incoming 1st Year Student', 'Prefer not to say', 'NOT ENROLLED')
      RETURNING id
    )
    INSERT INTO public.students (profile_id, official_record_id, student_id_number, program_id, year_level, student_type, enrollment_status)
    SELECT '${uPref}', osr.id, '25-PREF-01', '${programId}', '1st Year', 'Incoming 1st Year Student', 'NOT ENROLLED'
    FROM osr RETURNING id;
  `);
  const [resPref] = query(`SELECT private.get_health_requirement_applicability('${sPref[0]}');`);
  assert.equal(resPref[0], "NOT_APPLICABLE");

  // Cleanup
  execute(`
    DELETE FROM public.students WHERE id IN ('${sNull[0]}', '${sPref[0]}');
    DELETE FROM public.profiles WHERE id IN ('${uNull}', '${uPref}');
    DELETE FROM auth.users WHERE id IN ('${uNull}', '${uPref}');
    DELETE FROM public.official_student_records WHERE student_id_number IN ('25-NULL-01', '25-PREF-01');
  `);
});

test("Scenario 26: Nurse verification revalidation fails closed if student becomes not applicable", () => {
  const [prog] = query("SELECT id FROM public.programs WHERE code = 'BSAIS' LIMIT 1;");
  const programId = prog[0];
  const authUserId = "44444444-7777-7777-7777-777777777777";
  const nurseUserId = "44444444-8888-8888-8888-888888888888";
  const signatureId = "66666666-6666-6666-6666-666666666666";

  // Setup Nurse
  execute(`
    INSERT INTO auth.users (id, email) VALUES ('${nurseUserId}', 'nurse.race@example.com') ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status)
    VALUES ('${nurseUserId}', 'nurse.race@example.com', 'admin', 'Nurse', 'Race', 'ACTIVE')
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO public.official_role_assignments (profile_id, official_role, program_id, active)
    VALUES ('${nurseUserId}', 'NURSE', null, true)
    ON CONFLICT DO NOTHING;
  `);

  // Create student: Initially Incoming 1st Year Female
  const [created] = query(`
    WITH auth_u AS (
      INSERT INTO auth.users (id, email)
      VALUES ('${authUserId}', 'race.test@example.com')
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    ),
    prof AS (
      INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status)
      VALUES ('${authUserId}', 'race.test@example.com', 'student', 'Race', 'Test', 'ACTIVE')
      ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name
      RETURNING id
    ),
    osr AS (
      INSERT INTO public.official_student_records (student_id_number, first_name, last_name, email, program_id, year_level, student_type, gender_sex, enrollment_status)
      VALUES ('25-RACE-01', 'Race', 'Test', 'race.test@example.com', '${programId}', '1st Year', 'Incoming 1st Year Student', 'Female', 'NOT ENROLLED')
      RETURNING id
    )
    INSERT INTO public.students (profile_id, official_record_id, student_id_number, program_id, year_level, student_type, enrollment_status)
    SELECT '${authUserId}', osr.id, '25-RACE-01', '${programId}', '1st Year', 'Incoming 1st Year Student', 'NOT ENROLLED'
    FROM osr
    RETURNING id, official_record_id;
  `);
  const [studentId, osrId] = created;

  // Submit enrollment
  const [sub] = query(`
    SELECT outcome, enrollment_id
    FROM (
      SELECT set_config('request.jwt.claim.sub', '${authUserId}', true) as set_jwt
    ) s,
    LATERAL public.submit_standard_student_enrollment('2025-2026', '2nd Semester');
  `);
  const enrollmentId = sub[1];

  // Authoritative change happens: Registrar changes gender Female -> Male
  execute(`
    UPDATE public.official_student_records
    SET gender_sex = 'Male', updated_at = now()
    WHERE id = '${osrId}';
  `);

  // Now Nurse attempts to verify and sign
  const [hashRes] = query(`
    SELECT private.health_record_document_hash('${enrollmentId}', '${studentId}', '2025-2026', '2nd Semester', 'APPLICABLE', 'VERIFIED');
  `);
  const docHash = hashRes[0];
  const sigHash = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const sigPath = `${enrollmentId}/NURSE/${signatureId}.png`;

  const [signRes] = query(`
    SELECT outcome
    FROM (
      SELECT set_config('request.jwt.claim.sub', '${nurseUserId}', true) as set_jwt
    ) s,
    LATERAL public.verify_health_requirement_with_signature(
      '${enrollmentId}',
      '${signatureId}',
      '${sigPath}',
      '${sigHash}',
      '${docHash}',
      true,
      'Stale attempt'
    );
  `);
  // Must fail closed with not_applicable
  assert.equal(signRes[0], "not_applicable");

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
      DELETE FROM public.official_role_assignments WHERE profile_id = '${nurseUserId}';
      DELETE FROM public.profiles WHERE id IN ('${authUserId}', '${nurseUserId}');
      DELETE FROM auth.users WHERE id IN ('${authUserId}', '${nurseUserId}');
      DELETE FROM public.official_student_records WHERE id = '${osrId}';
    END $$;
  `);
});

test("Scenario 16: One-time repair function repairs stale pending records", () => {
  const [prog] = query("SELECT id FROM public.programs WHERE code = 'BSAIS' LIMIT 1;");
  const programId = prog[0];
  const authUserId = "44444444-9999-9999-9999-999999999999";

  // Create student: Incoming 1st Year Female
  const [created] = query(`
    WITH auth_u AS (
      INSERT INTO auth.users (id, email)
      VALUES ('${authUserId}', 'repair.test@example.com')
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    ),
    prof AS (
      INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status)
      VALUES ('${authUserId}', 'repair.test@example.com', 'student', 'Repair', 'Test', 'ACTIVE')
      ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name
      RETURNING id
    ),
    osr AS (
      INSERT INTO public.official_student_records (student_id_number, first_name, last_name, email, program_id, year_level, student_type, gender_sex, enrollment_status)
      VALUES ('25-REPAIR-01', 'Repair', 'Test', 'repair.test@example.com', '${programId}', '1st Year', 'Incoming 1st Year Student', 'Female', 'NOT ENROLLED')
      RETURNING id
    )
    INSERT INTO public.students (profile_id, official_record_id, student_id_number, program_id, year_level, student_type, enrollment_status)
    SELECT '${authUserId}', osr.id, '25-REPAIR-01', '${programId}', '1st Year', 'Incoming 1st Year Student', 'NOT ENROLLED'
    FROM osr
    RETURNING id, official_record_id;
  `);
  const [studentId, osrId] = created;

  // Insert a PENDING enrollment
  const [enrRes] = query(`
    INSERT INTO public.enrollments (student_id, program_id, year_level, academic_year, semester, status)
    VALUES ('${studentId}', '${programId}', '1st Year', '2025-2026', '2nd Semester', 'PENDING')
    RETURNING id;
  `);
  const enrollmentId = enrRes[0];

  // Artificially create a stale requirement (NOT_APPLICABLE) and clearance (NOT_APPLICABLE)
  execute(`
    DO $$
    BEGIN
      PERFORM set_config('pkm.health_applicability_reconciliation', 'true', true);
      INSERT INTO public.student_requirements (student_id, requirement_code, status, academic_year, semester, applicability)
      VALUES ('${studentId}', 'HEALTH_RECORD_UPDATE', 'PENDING', '2025-2026', '2nd Semester', 'NOT_APPLICABLE')
      ON CONFLICT (student_id, requirement_code, academic_year, semester) DO UPDATE SET applicability = 'NOT_APPLICABLE';

      INSERT INTO public.enrollment_clearances (enrollment_id, clearance_type, status)
      VALUES ('${enrollmentId}', 'HEALTH_CLEARANCE', 'NOT_APPLICABLE')
      ON CONFLICT (enrollment_id, clearance_type) DO UPDATE SET status = 'NOT_APPLICABLE';
    END $$;
  `);

  // Confirm stale state
  const [staleReq] = query(`SELECT applicability FROM public.student_requirements WHERE student_id = '${studentId}';`);
  assert.equal(staleReq[0], "NOT_APPLICABLE");

  // Run one-time repair function
  execute(`
    DO $$
    DECLARE
      v_rec record;
    BEGIN
      FOR v_rec IN
        SELECT DISTINCT e.student_id
        FROM public.enrollments e
        JOIN public.enrollment_terms et
          ON et.academic_year = e.academic_year
          AND et.semester = e.semester
          AND et.is_active = true
        WHERE e.status = 'PENDING' AND e.student_id = '${studentId}'
      LOOP
        PERFORM private.reconcile_health_requirement_for_student(v_rec.student_id);
      END LOOP;
    END $$;
  `);

  // Confirm repaired state: APPLICABLE & PENDING
  const [repairedReq] = query(`SELECT applicability, status FROM public.student_requirements WHERE student_id = '${studentId}';`);
  assert.equal(repairedReq[0], "APPLICABLE");
  assert.equal(repairedReq[1], "PENDING");

  const [repairedClr] = query(`SELECT status FROM public.enrollment_clearances WHERE enrollment_id = '${enrollmentId}' AND clearance_type = 'HEALTH_CLEARANCE';`);
  assert.equal(repairedClr[0], "PENDING");

  // Cleanup
  execute(`
    DELETE FROM public.enrollment_clearances WHERE enrollment_id = '${enrollmentId}';
    DELETE FROM public.enrollments WHERE id = '${enrollmentId}';
    DELETE FROM public.student_requirements WHERE student_id = '${studentId}';
    DELETE FROM public.students WHERE id = '${studentId}';
    DELETE FROM public.profiles WHERE id = '${authUserId}';
    DELETE FROM auth.users WHERE id = '${authUserId}';
    DELETE FROM public.official_student_records WHERE id = '${osrId}';
  `);
});
