import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

const DB_URL =
  process.env.PKM_LOCAL_SUPABASE_TEST_DB_URL ??
  process.env.DISPOSABLE_DB_URL ??
  "postgresql://postgres@127.0.0.1:55433/pkm_test";

const dbUrl = new URL(DB_URL);
if (dbUrl.protocol !== "postgresql:" || (dbUrl.hostname !== "127.0.0.1" && dbUrl.hostname !== "localhost")) {
  throw new Error("Integration tests require a local PostgreSQL URL on 127.0.0.1.");
}

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
  execFileSync("psql", [DB_URL, "-v", "ON_ERROR_STOP=1", "-c", sql], {
    encoding: "utf8"
  });
}

function asUser(userId, sql) {
  return query(`
    SET ROLE authenticated;
    SET "request.jwt.claim.sub" = '${userId}';
    SET "request.jwt.claim.role" = 'authenticated';
    ${sql}
  `);
}

function tryExecuteAsUser(userId, sql) {
  try {
    execFileSync(
      "psql",
      [
        DB_URL,
        "-v",
        "ON_ERROR_STOP=1",
        "-c",
        `SET ROLE authenticated; SET "request.jwt.claim.sub" = '${userId}'; SET "request.jwt.claim.role" = 'authenticated'; ${sql}`
      ],
      { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
    );
    return { ok: true, error: null };
  } catch (err) {
    return { ok: false, error: (err.stderr || err.message || "").toString() };
  }
}

// Fixture Identifiers
const registrarId = "00000000-0000-4000-a000-000000000001";
const librarianId = "00000000-0000-4000-a000-000000000002";
const nurseId     = "00000000-0000-4000-a000-000000000003";
const deanId      = "00000000-0000-4000-a000-000000000004";
const chairAId    = "00000000-0000-4000-a000-000000000005";
const chairBId    = "00000000-0000-4000-a000-000000000006";

const student1ProfileId = "00000000-0000-4000-b000-000000000001";
const student1Id        = "00000000-0000-4000-b000-000000000011";
const osr1Id            = "00000000-0000-4000-b000-000000000021";
const enrollment1Id     = "00000000-0000-4000-b000-000000000031";

const student2ProfileId = "00000000-0000-4000-b000-000000000002";
const student2Id        = "00000000-0000-4000-b000-000000000012";
const osr2Id            = "00000000-0000-4000-b000-000000000022";
const enrollment2Id     = "00000000-0000-4000-b000-000000000032";

const programAId = "00000000-0000-4000-c000-000000000001"; // BSIT
const programBId = "00000000-0000-4000-c000-000000000002"; // BSAIS
const subjectAId = "00000000-0000-4000-e000-000000000001";
const subjectBId = "00000000-0000-4000-e000-000000000002";
const specimenRegId = "00000000-0000-4000-f000-000000000001";
const specimenLibId = "00000000-0000-4000-f000-000000000002";
test("Setup: provision isolated fixture data for authorization boundaries test", () => {
  // Clear any previous test fixtures
  execute(`
    SET pkm.demo_reset = 'true';
    DELETE FROM public.audit_logs WHERE actor_profile_id IN ('${registrarId}', '${librarianId}', '${nurseId}', '${deanId}', '${chairAId}', '${chairBId}');
    DELETE FROM public.signature_specimens WHERE profile_id IN ('${registrarId}', '${librarianId}', '${nurseId}', '${deanId}', '${chairAId}', '${chairBId}');
    DELETE FROM public.enrollment_signatures WHERE enrollment_id IN ('${enrollment1Id}', '${enrollment2Id}');
    DELETE FROM public.enrollment_clearances WHERE enrollment_id IN ('${enrollment1Id}', '${enrollment2Id}');
    DELETE FROM public.enrollment_subjects WHERE enrollment_id IN ('${enrollment1Id}', '${enrollment2Id}');
    DELETE FROM public.student_requirements WHERE student_id IN ('${student1Id}', '${student2Id}');
    DELETE FROM public.enrollments WHERE id IN ('${enrollment1Id}', '${enrollment2Id}');
    DELETE FROM public.students WHERE id IN ('${student1Id}', '${student2Id}');
    DELETE FROM public.official_student_records WHERE id IN ('${osr1Id}', '${osr2Id}') OR program_id IN ('${programAId}', '${programBId}');
    DELETE FROM public.official_role_assignments WHERE profile_id IN ('${registrarId}', '${librarianId}', '${nurseId}', '${deanId}', '${chairAId}', '${chairBId}');
    DELETE FROM public.profiles WHERE id IN ('${registrarId}', '${librarianId}', '${nurseId}', '${deanId}', '${chairAId}', '${chairBId}', '${student1ProfileId}', '${student2ProfileId}');
    DELETE FROM auth.users WHERE id IN ('${registrarId}', '${librarianId}', '${nurseId}', '${deanId}', '${chairAId}', '${chairBId}', '${student1ProfileId}', '${student2ProfileId}');
    DELETE FROM public.subjects WHERE id IN ('${subjectAId}', '${subjectBId}') OR program_id IN ('${programAId}', '${programBId}');
    DELETE FROM public.programs WHERE id IN ('${programAId}', '${programBId}');
  `);

  // Create Programs and Subjects
  execute(`
    INSERT INTO public.programs (id, name, code)
    VALUES
      ('${programAId}', 'Bachelor of Science in Information Technology', 'TEST_BSIT'),
      ('${programBId}', 'Bachelor of Science in Accounting Information System', 'TEST_BSAIS')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.subjects (id, program_id, course_code, course_description, units, year_level, semester)
    VALUES
      ('${subjectAId}', '${programAId}', 'IT101', 'Intro to IT', 3, '1st Year', '1st Semester'),
      ('${subjectBId}', '${programBId}', 'AIS101', 'Intro to AIS', 3, '1st Year', '1st Semester')
    ON CONFLICT (id) DO NOTHING;
  `);

  // Create Users & Profiles
  // Registrar: active admin, NO rows in official_role_assignments
  // Librarian: active admin, role LIBRARIAN (global)
  // Nurse: active admin, role NURSE (global)
  // Dean: active admin, role DEAN (global)
  // Chair A: active admin, role PROGRAM_CHAIR for Program A
  // Chair B: active admin, role PROGRAM_CHAIR for Program B
  execute(`
    INSERT INTO auth.users (id, email) VALUES
      ('${registrarId}', 'registrar.auth@example.test'),
      ('${librarianId}', 'librarian.auth@example.test'),
      ('${nurseId}', 'nurse.auth@example.test'),
      ('${deanId}', 'dean.auth@example.test'),
      ('${chairAId}', 'chairA.auth@example.test'),
      ('${chairBId}', 'chairB.auth@example.test'),
      ('${student1ProfileId}', 'student1.auth@example.test'),
      ('${student2ProfileId}', 'student2.auth@example.test');

    INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status) VALUES
      ('${registrarId}', 'registrar.auth@example.test', 'admin', 'Registrar', 'Admin', 'ACTIVE'),
      ('${librarianId}', 'librarian.auth@example.test', 'admin', 'Librarian', 'Staff', 'ACTIVE'),
      ('${nurseId}', 'nurse.auth@example.test', 'admin', 'Nurse', 'Staff', 'ACTIVE'),
      ('${deanId}', 'dean.auth@example.test', 'admin', 'Dean', 'Staff', 'ACTIVE'),
      ('${chairAId}', 'chairA.auth@example.test', 'admin', 'ChairA', 'Staff', 'ACTIVE'),
      ('${chairBId}', 'chairB.auth@example.test', 'admin', 'ChairB', 'Staff', 'ACTIVE'),
      ('${student1ProfileId}', 'student1.auth@example.test', 'student', 'Student', 'One', 'ACTIVE'),
      ('${student2ProfileId}', 'student2.auth@example.test', 'student', 'Student', 'Two', 'ACTIVE');

    INSERT INTO public.official_role_assignments (profile_id, official_role, program_id, active) VALUES
      ('${librarianId}', 'LIBRARIAN', null, true),
      ('${nurseId}', 'NURSE', null, true),
      ('${deanId}', 'DEAN', null, true),
      ('${chairAId}', 'PROGRAM_CHAIR', '${programAId}', true),
      ('${chairBId}', 'PROGRAM_CHAIR', '${programBId}', true);
  `);

  // Create Student 1 (Program A) and Student 2 (Program B)
  execute(`
    INSERT INTO public.official_student_records (
      id, student_id_number, first_name, last_name, email, program_id, year_level, student_type, gender_sex, enrollment_status
    ) VALUES
      ('${osr1Id}', '26-IT-001', 'Student', 'One', 'student1.auth@example.test', '${programAId}', '1st Year', 'Incoming 1st Year Student', 'Female', 'PENDING'),
      ('${osr2Id}', '26-AIS-002', 'Student', 'Two', 'student2.auth@example.test', '${programBId}', '1st Year', 'Incoming 1st Year Student', 'Male', 'PENDING');

    INSERT INTO public.students (
      id, profile_id, official_record_id, student_id_number, program_id, year_level, student_type, enrollment_status
    ) VALUES
      ('${student1Id}', '${student1ProfileId}', '${osr1Id}', '26-IT-001', '${programAId}', '1st Year', 'Incoming 1st Year Student', 'PENDING'),
      ('${student2Id}', '${student2ProfileId}', '${osr2Id}', '26-AIS-002', '${programBId}', '1st Year', 'Incoming 1st Year Student', 'PENDING');

    INSERT INTO public.enrollments (
      id, student_id, program_id, year_level, academic_year, semester, status
    ) VALUES
      ('${enrollment1Id}', '${student1Id}', '${programAId}', '1st Year', '2026-2027', '1st Semester', 'PENDING'),
      ('${enrollment2Id}', '${student2Id}', '${programBId}', '1st Year', '2026-2027', '1st Semester', 'PENDING');

    INSERT INTO public.enrollment_subjects (
      id, enrollment_id, subject_id, course_code, course_description, units
    ) VALUES
      (gen_random_uuid(), '${enrollment1Id}', '${subjectAId}', 'IT101', 'Intro to IT', 3.0),
      (gen_random_uuid(), '${enrollment2Id}', '${subjectBId}', 'AIS101', 'Intro to AIS', 3.0);
    INSERT INTO public.student_requirements (
      id, student_id, requirement_code, academic_year, semester, status, applicability
    ) VALUES
      (gen_random_uuid(), '${student1Id}', 'HEALTH_RECORD_UPDATE', '2026-2027', '1st Semester', 'PENDING', 'APPLICABLE'),
      (gen_random_uuid(), '${student2Id}', 'HEALTH_RECORD_UPDATE', '2026-2027', '1st Semester', 'PENDING', 'NOT_APPLICABLE');

    INSERT INTO public.signature_specimens (
      id, profile_id, signature_storage_path, signature_hash
    ) VALUES
      ('${specimenRegId}', '${registrarId}', '${registrarId}/${specimenRegId}.png', '${"a".repeat(64)}'),
      ('${specimenLibId}', '${librarianId}', '${librarianId}/${specimenLibId}.png', '${"b".repeat(64)}');
  `);
});

test("Boundary 1: private.is_registrar() accurately identifies Registrar vs Assigned Staff", () => {
  const [isRegistrar] = asUser(registrarId, `SELECT private.is_registrar();`);
  assert.equal(isRegistrar[0], "t", "Registrar with no active assignments must be recognized as registrar");

  for (const staffId of [librarianId, nurseId, deanId, chairAId, chairBId]) {
    const [isStaffRegistrar] = asUser(staffId, `SELECT private.is_registrar();`);
    assert.equal(isStaffRegistrar[0], "f", `Staff ${staffId} with active role must NOT be recognized as registrar`);
  }
});

test("Boundary 2: Assigned officials cannot manage another account's roles (set_official_role_assignment)", () => {
  // Librarian tries to assign DEAN role to Nurse
  const [libAssignResult] = asUser(
    librarianId,
    `SELECT outcome FROM public.set_official_role_assignment('${nurseId}', 'DEAN', true);`
  );
  assert.equal(libAssignResult[0], "unauthorized", "Librarian must be rejected with unauthorized");

  // Nurse tries to revoke Librarian role
  const [nurseRevokeResult] = asUser(
    nurseId,
    `SELECT outcome FROM public.set_official_role_assignment('${librarianId}', 'LIBRARIAN', false);`
  );
  assert.equal(nurseRevokeResult[0], "unauthorized", "Nurse must be rejected with unauthorized");

  // Program Chair tries to assign role
  const [chairAssignResult] = asUser(
    chairAId,
    `SELECT outcome FROM public.set_official_role_assignment('${chairBId}', 'DEAN', true);`
  );
  assert.equal(chairAssignResult[0], "unauthorized", "Program Chair must be rejected with unauthorized");

  // Registrar self-assignment is forbidden
  const [regSelfResult] = asUser(
    registrarId,
    `SELECT outcome FROM public.set_official_role_assignment('${registrarId}', 'LIBRARIAN', true);`
  );
  assert.equal(regSelfResult[0], "self_assignment_forbidden", "Registrar cannot self-assign");

  // Registrar can manage official assignments for another admin
  const [regSuccessResult] = asUser(
    registrarId,
    `SELECT outcome FROM public.set_official_role_assignment('${librarianId}', 'ACCOUNTANT', true);`
  );
  assert.equal(regSuccessResult[0], "assigned", "Registrar can assign official role to another admin");

  // Verify Librarian now has 2 roles and Registrar can revoke it
  const [regRevokeResult] = asUser(
    registrarId,
    `SELECT outcome FROM public.set_official_role_assignment('${librarianId}', 'ACCOUNTANT', false);`
  );
  assert.equal(regRevokeResult[0], "revoked", "Registrar can revoke official role");
});

test("Boundary 3: Assigned officials cannot approve/reject enrollments through Registrar RPC (review_pending_enrollment)", () => {
  for (const staffId of [librarianId, nurseId, deanId, chairAId, chairBId]) {
    const [res] = asUser(
      staffId,
      `SELECT outcome FROM public.review_pending_enrollment('${enrollment1Id}', 'APPROVED', 'Staff bypass attempt');`
    );
    assert.equal(res[0], "unauthorized", `Staff ${staffId} must be rejected from review_pending_enrollment`);
  }

  // Registrar can call review_pending_enrollment (blocked only by business rules, e.g. incomplete clearances)
  const [regReview] = asUser(
    registrarId,
    `SELECT outcome FROM public.review_pending_enrollment('${enrollment1Id}', 'APPROVED', 'Legitimate registrar review');`
  );
  assert.notEqual(regReview[0], "unauthorized", "Registrar must NOT be rejected as unauthorized");
  assert.equal(regReview[0], "incomplete_clearances", "Registrar reaches the authoritative clearance gate");
});

test("Boundary 4: Assigned officials cannot modify sensitive profile fields", () => {
  // Librarian tries to update profiles table directly to elevate student to admin
  const libUpdateOther = tryExecuteAsUser(
    librarianId,
    `UPDATE public.profiles SET role = 'admin' WHERE id = '${student1ProfileId}';`
  );
  assert.ok(libUpdateOther !== undefined);
  // Either 0 rows updated by RLS or exception raised by trigger
  const [checkStudentRole] = query(`SELECT role FROM public.profiles WHERE id = '${student1ProfileId}';`);
  assert.equal(checkStudentRole[0], "student", "Student role must remain student");

  // Librarian tries to change their own role or status
  const libUpdateSelf = tryExecuteAsUser(
    librarianId,
    `UPDATE public.profiles SET role = 'student' WHERE id = '${librarianId}';`
  );
  assert.ok(libUpdateSelf !== undefined);
  const [checkLibRole] = query(`SELECT role FROM public.profiles WHERE id = '${librarianId}';`);
  assert.equal(checkLibRole[0], "admin", "Librarian profile role must remain admin");

  // Even Registrar cannot alter profile.role directly via table update (trigger prevents direct role mutation)
  const regRoleUpdate = tryExecuteAsUser(
    registrarId,
    `UPDATE public.profiles SET role = 'student' WHERE id = '${librarianId}';`
  );
  assert.equal(regRoleUpdate.ok, false, "Direct modification of profile.role must be blocked by trigger");
  assert.match(regRoleUpdate.error, /Profile role cannot be modified directly/i);

  // Registrar CAN update non-sensitive fields (e.g. name sync)
  const regNameUpdate = tryExecuteAsUser(
    registrarId,
    `UPDATE public.profiles SET first_name = 'UpdatedByRegistrar' WHERE id = '${student1ProfileId}';`
  );
  assert.equal(regNameUpdate.ok, true, regNameUpdate.error || "Registrar can update non-sensitive profile field");
  const [updatedName] = query(`SELECT first_name FROM public.profiles WHERE id = '${student1ProfileId}';`);
  assert.equal(updatedName[0], "UpdatedByRegistrar");
});

test("Boundary 5: Official Student Records Scoping & Management", () => {
  // Denied: Librarian cannot call update_official_student_record_and_sync
  const [libSync] = asUser(
    librarianId,
    `SELECT outcome FROM public.update_official_student_record_and_sync('${osr1Id}', '26-IT-001', 'Hacked', 'Name', 'student1.auth@example.test', '${programAId}', '1st Year', 'Incoming 1st Year Student');`
  );
  assert.equal(libSync[0], "unauthorized", "Librarian cannot call update_official_student_record_and_sync");

  // Denied: Nurse cannot direct INSERT into official_student_records
  const nurseInsert = tryExecuteAsUser(
    nurseId,
    `INSERT INTO public.official_student_records (id, first_name, last_name, email, program_id, year_level, student_type, enrollment_status)
     VALUES (gen_random_uuid(), 'Fake', 'Student', 'fake@example.test', '${programAId}', '1st Year', 'Incoming 1st Year Student', 'PENDING');`
  );
  assert.equal(nurseInsert.ok, false, "Nurse cannot direct INSERT into official_student_records");

  // Denied: Program Chair for Program A cannot read official student record for Program B
  const [chairAOsrB] = asUser(
    chairAId,
    `SELECT count(*) FROM public.official_student_records WHERE id = '${osr2Id}';`
  );
  assert.equal(chairAOsrB[0], "0", "Chair A cannot select official record for Program B student");

  // Allowed: Program Chair for Program A CAN read official student record for Program A
  const [chairAOsrA] = asUser(
    chairAId,
    `SELECT count(*) FROM public.official_student_records WHERE id = '${osr1Id}';`
  );
  assert.equal(chairAOsrA[0], "1", "Chair A can select official record for Program A student");

  // Allowed: Registrar can read all official student records
  const [regCount] = asUser(
    registrarId,
    `SELECT count(*) FROM public.official_student_records WHERE id IN ('${osr1Id}', '${osr2Id}');`
  );
  assert.equal(regCount[0], "2", "Registrar can read all official student records");

  // Allowed: Registrar can call update_official_student_record_and_sync
  const [regSync] = asUser(
    registrarId,
    `SELECT outcome FROM public.update_official_student_record_and_sync(
      '${osr1Id}', '26-IT-001', 'OfficialName', 'Synced', 'student1.auth@example.test',
      '${programAId}', '1st Year', 'Incoming 1st Year Student',
      null, null, null, null, null, null, null, null, null, null, 'PENDING'
    );`
  );
  assert.equal(regSync[0], "updated", "Registrar can successfully execute update_official_student_record_and_sync");
});
test("Boundary 6: Program-scoped officials cannot access unauthorized programs", () => {
  // Chair A is assigned to Program A (BSIT). Chair B is assigned to Program B (BSAIS).
  // 1. Enrollments access
  const [chairAEnrollB] = asUser(chairAId, `SELECT count(*) FROM public.enrollments WHERE id = '${enrollment2Id}';`);
  assert.equal(chairAEnrollB[0], "0", "Chair A cannot read Program B enrollment");

  const [chairAEnrollA] = asUser(chairAId, `SELECT count(*) FROM public.enrollments WHERE id = '${enrollment1Id}';`);
  assert.equal(chairAEnrollA[0], "1", "Chair A can read Program A enrollment");

  const [chairBEnrollA] = asUser(chairBId, `SELECT count(*) FROM public.enrollments WHERE id = '${enrollment1Id}';`);
  assert.equal(chairBEnrollA[0], "0", "Chair B cannot read Program A enrollment");

  const [chairBEnrollB] = asUser(chairBId, `SELECT count(*) FROM public.enrollments WHERE id = '${enrollment2Id}';`);
  assert.equal(chairBEnrollB[0], "1", "Chair B can read Program B enrollment");

  // 2. Students access
  const [chairAStudentB] = asUser(chairAId, `SELECT count(*) FROM public.students WHERE id = '${student2Id}';`);
  assert.equal(chairAStudentB[0], "0", "Chair A cannot read Program B student");

  const [chairAStudentA] = asUser(chairAId, `SELECT count(*) FROM public.students WHERE id = '${student1Id}';`);
  assert.equal(chairAStudentA[0], "1", "Chair A can read Program A student");

  // 3. Signing unauthorized program clearance
  const dummySigId = "00000000-0000-4000-d000-000000000001";
  const dummyHash = "a".repeat(64);
  const [chairASignB] = asUser(
    chairAId,
    `SELECT outcome FROM public.record_official_clearance_signature(
      '${enrollment2Id}', 'PROGRAM_CLEARANCE', '${dummySigId}',
      '${enrollment2Id}/PROGRAM_CHAIR/${dummySigId}.png', '${dummyHash}', '${dummyHash}'
    );`
  );
  assert.equal(chairASignB[0], "unauthorized", "Chair A cannot sign PROGRAM_CLEARANCE for Program B enrollment");
});

test("Boundary 7: Cross-role workspace and clearance separation", () => {
  // 1. Librarian cannot read student_requirements
  const [libReq] = asUser(librarianId, `SELECT count(*) FROM public.student_requirements;`);
  assert.equal(libReq[0], "0", "Librarian cannot read student_requirements");

  // 2. Librarian cannot call list_nurse_health_requirements()
  const [libNurseQueue] = asUser(librarianId, `SELECT count(*) FROM public.list_nurse_health_requirements();`);
  assert.equal(libNurseQueue[0], "0", "Librarian cannot read nurse queue");

  // 3. Librarian cannot sign HEALTH_CLEARANCE or DEAN_CLEARANCE
  const dummySigId = "00000000-0000-4000-d000-000000000002";
  const dummyHash = "b".repeat(64);
  const [libSignHealth] = asUser(
    librarianId,
    `SELECT outcome FROM public.record_official_clearance_signature(
      '${enrollment1Id}', 'HEALTH_CLEARANCE', '${dummySigId}',
      '${enrollment1Id}/NURSE/${dummySigId}.png', '${dummyHash}', '${dummyHash}'
    );`
  );
  assert.equal(libSignHealth[0], "unauthorized", "Librarian cannot sign HEALTH_CLEARANCE");

  const [libSignDean] = asUser(
    librarianId,
    `SELECT outcome FROM public.record_official_clearance_signature(
      '${enrollment1Id}', 'DEAN_CLEARANCE', '${dummySigId}',
      '${enrollment1Id}/DEAN/${dummySigId}.png', '${dummyHash}', '${dummyHash}'
    );`
  );
  assert.equal(libSignDean[0], "unauthorized", "Librarian cannot sign DEAN_CLEARANCE");

  // 4. Nurse cannot sign LIBRARY_CLEARANCE or DEAN_CLEARANCE
  const [nurseSignLib] = asUser(
    nurseId,
    `SELECT outcome FROM public.record_official_clearance_signature(
      '${enrollment1Id}', 'LIBRARY_CLEARANCE', '${dummySigId}',
      '${enrollment1Id}/LIBRARIAN/${dummySigId}.png', '${dummyHash}', '${dummyHash}'
    );`
  );
  assert.equal(nurseSignLib[0], "unauthorized", "Nurse cannot sign LIBRARY_CLEARANCE");

  // 5. Nurse CAN read health requirements for their assigned program
  const [nurseReq] = asUser(nurseId, `SELECT count(*) FROM public.student_requirements WHERE student_id = '${student1Id}';`);
  assert.equal(nurseReq[0], "1", "Nurse can read health requirements for enrollment in assigned program");
});

test("Boundary 8: Signature specimen isolation", () => {
  // Librarian cannot read Registrar's specimen
  const [libViewReg] = asUser(librarianId, `SELECT count(*) FROM public.signature_specimens WHERE profile_id = '${registrarId}';`);
  assert.equal(libViewReg[0], "0", "Librarian cannot view Registrar signature specimen");

  // Nurse cannot read Librarian's specimen
  const [nurseViewLib] = asUser(nurseId, `SELECT count(*) FROM public.signature_specimens WHERE profile_id = '${librarianId}';`);
  assert.equal(nurseViewLib[0], "0", "Nurse cannot view Librarian signature specimen");

  // Librarian CAN read own specimen
  const [libViewOwn] = asUser(librarianId, `SELECT count(*) FROM public.signature_specimens WHERE profile_id = '${librarianId}';`);
  assert.equal(libViewOwn[0], "1", "Librarian can view own signature specimen");

  // Registrar CAN read specimens
  const [regViewLib] = asUser(registrarId, `SELECT count(*) FROM public.signature_specimens WHERE profile_id = '${librarianId}';`);
  assert.equal(regViewLib[0], "1", "Registrar can view signature specimens");
});

test("Boundary 9: Authorized officials can complete legitimate clearance workflows", () => {
  // Compute expected fingerprint for Librarian on Enrollment 1
  const [expectedLibHash] = query(`
    SELECT private.enrollment_document_hash('${enrollment1Id}', 'LIBRARIAN', 'LIBRARY_CLEARANCE', 'ENROLLMENT_CLEARANCE');
  `);
  assert.ok(expectedLibHash[0], "Expected document hash should be computed");

  const sigLibId = "00000000-0000-4000-d000-000000000010";
  const dummySigHash = "c".repeat(64);

  // Librarian signs LIBRARY_CLEARANCE
  const [libSignOutcome] = asUser(
    librarianId,
    `SELECT outcome FROM public.record_official_clearance_signature(
      '${enrollment1Id}', 'LIBRARY_CLEARANCE', '${sigLibId}',
      '${enrollment1Id}/LIBRARIAN/${sigLibId}.png', '${dummySigHash}', '${expectedLibHash[0]}'
    );`
  );
  assert.equal(libSignOutcome[0], "signed", "Librarian must be authorized to sign their own clearance");

  // Verify clearance status updated to SIGNED
  const [libClearanceStatus] = query(`
    SELECT status FROM public.enrollment_clearances WHERE enrollment_id = '${enrollment1Id}' AND clearance_type = 'LIBRARY_CLEARANCE';
  `);
  assert.equal(libClearanceStatus[0], "SIGNED");
});

test("Boundary 10: Historical signatures remain immutable", () => {
  // Attempt to update the newly created signature
  const updateResult = tryExecuteAsUser(
    librarianId,
    `UPDATE public.enrollment_signatures SET signer_name_snapshot = 'Tampered' WHERE enrollment_id = '${enrollment1Id}';`
  );
  assert.equal(updateResult.ok, false, "Signature update must be blocked");
  assert.match(updateResult.error, /Enrollment signatures are immutable|permission denied/i);

  // Attempt to delete the signature
  const deleteResult = tryExecuteAsUser(
    registrarId,
    `DELETE FROM public.enrollment_signatures WHERE enrollment_id = '${enrollment1Id}';`
  );
  assert.equal(deleteResult.ok, false, "Signature deletion must be blocked");
  assert.match(deleteResult.error, /Enrollment signatures are immutable|permission denied/i);
});

test("Teardown: clean up test fixtures from disposable database", () => {
  execute(`
    SET pkm.demo_reset = 'true';
    DELETE FROM public.audit_logs WHERE actor_profile_id IN ('${registrarId}', '${librarianId}', '${nurseId}', '${deanId}', '${chairAId}', '${chairBId}');
    DELETE FROM public.signature_specimens WHERE profile_id IN ('${registrarId}', '${librarianId}', '${nurseId}', '${deanId}', '${chairAId}', '${chairBId}');
    DELETE FROM public.enrollment_signatures WHERE enrollment_id IN ('${enrollment1Id}', '${enrollment2Id}');
    DELETE FROM public.enrollment_clearances WHERE enrollment_id IN ('${enrollment1Id}', '${enrollment2Id}');
    DELETE FROM public.enrollment_subjects WHERE enrollment_id IN ('${enrollment1Id}', '${enrollment2Id}');
    DELETE FROM public.student_requirements WHERE student_id IN ('${student1Id}', '${student2Id}');
    DELETE FROM public.enrollments WHERE id IN ('${enrollment1Id}', '${enrollment2Id}');
    DELETE FROM public.students WHERE id IN ('${student1Id}', '${student2Id}');
    DELETE FROM public.official_student_records WHERE id IN ('${osr1Id}', '${osr2Id}') OR program_id IN ('${programAId}', '${programBId}');
    DELETE FROM public.official_role_assignments WHERE profile_id IN ('${registrarId}', '${librarianId}', '${nurseId}', '${deanId}', '${chairAId}', '${chairBId}');
    DELETE FROM public.profiles WHERE id IN ('${registrarId}', '${librarianId}', '${nurseId}', '${deanId}', '${chairAId}', '${chairBId}', '${student1ProfileId}', '${student2ProfileId}');
    DELETE FROM auth.users WHERE id IN ('${registrarId}', '${librarianId}', '${nurseId}', '${deanId}', '${chairAId}', '${chairBId}', '${student1ProfileId}', '${student2ProfileId}');
    DELETE FROM public.subjects WHERE id IN ('${subjectAId}', '${subjectBId}') OR program_id IN ('${programAId}', '${programBId}');
    DELETE FROM public.programs WHERE id IN ('${programAId}', '${programBId}');
  `);
});
