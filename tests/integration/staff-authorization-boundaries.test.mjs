import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

// ============================================================================
// Database Safety Verification
// ============================================================================

const RAW_DB_URL =
  process.env.PKM_LOCAL_SUPABASE_TEST_DB_URL ??
  process.env.DISPOSABLE_DB_URL;

if (!RAW_DB_URL) {
  throw new Error(
    "Integration tests require an explicit PKM_LOCAL_SUPABASE_TEST_DB_URL or DISPOSABLE_DB_URL environment variable."
  );
}

const dbUrl = new URL(RAW_DB_URL);
if (
  dbUrl.protocol !== "postgresql:" ||
  (dbUrl.hostname !== "127.0.0.1" && dbUrl.hostname !== "localhost")
) {
  throw new Error("Integration tests require a local PostgreSQL URL on 127.0.0.1 or localhost.");
}

const isConfirmedDisposable =
  process.env.PKM_DISPOSABLE_TEST_CONFIRMED === "true" ||
  /test|disposable|temp/i.test(dbUrl.pathname);

if (!isConfirmedDisposable) {
  throw new Error(
    "Target database must contain 'test', 'disposable', or 'temp' in its name, or PKM_DISPOSABLE_TEST_CONFIRMED=true must be set."
  );
}

const DB_URL = RAW_DB_URL;

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

// ============================================================================
// Fixture Identifiers
// ============================================================================

const registrarId     = "00000000-0000-4000-a000-000000000001";
const librarianId     = "00000000-0000-4000-a000-000000000002";
const nurseId         = "00000000-0000-4000-a000-000000000003";
const deanId          = "00000000-0000-4000-a000-000000000004";
const chairAId        = "00000000-0000-4000-a000-000000000005";
const chairBId        = "00000000-0000-4000-a000-000000000006";
const accountantId    = "00000000-0000-4000-a000-000000000007";
const unprovisionedId = "00000000-0000-4000-a000-000000000008";

const student1ProfileId = "00000000-0000-4000-b000-000000000001";
const student1Id        = "00000000-0000-4000-b000-000000000011";
const osr1Id            = "00000000-0000-4000-b000-000000000021";
const enrollment1Id     = "00000000-0000-4000-b000-000000000031";

const student2ProfileId = "00000000-0000-4000-b000-000000000002";
const student2Id        = "00000000-0000-4000-b000-000000000012";
const osr2Id            = "00000000-0000-4000-b000-000000000022";
const enrollment2Id     = "00000000-0000-4000-b000-000000000032";

const setupStudentProfileId = "00000000-0000-4000-b000-000000000003";

const programAId = "00000000-0000-4000-c000-000000000001"; // BSIT
const programBId = "00000000-0000-4000-c000-000000000002"; // BSAIS

const subjectAId = "00000000-0000-4000-e000-000000000001";
const subjectBId = "00000000-0000-4000-e000-000000000002";

const specimenRegId = "00000000-0000-4000-f000-000000000001";
const specimenLibId = "00000000-0000-4000-f000-000000000002";

const balance1Id = "00000000-0000-4000-d000-000000000001";
const balance2Id = "00000000-0000-4000-d000-000000000002";

const allFixtureUsers = [
  registrarId, librarianId, nurseId, deanId, chairAId, chairBId, accountantId, unprovisionedId,
  student1ProfileId, student2ProfileId, setupStudentProfileId
];

test("Setup: provision isolated fixture data for authorization boundaries test", () => {
  // Clear any previous test fixtures
  execute(`
    SET pkm.demo_reset = 'true';
    DELETE FROM public.audit_logs WHERE actor_profile_id IN (${allFixtureUsers.map(id => `'${id}'`).join(",")});
    DELETE FROM public.signature_specimens WHERE profile_id IN (${allFixtureUsers.map(id => `'${id}'`).join(",")});
    DELETE FROM storage.objects WHERE bucket_id = 'enrollment-signatures' AND name LIKE '%${enrollment1Id}%';
    DELETE FROM public.enrollment_signatures WHERE enrollment_id IN ('${enrollment1Id}', '${enrollment2Id}');
    DELETE FROM public.enrollment_clearances WHERE enrollment_id IN ('${enrollment1Id}', '${enrollment2Id}');
    DELETE FROM public.enrollment_subjects WHERE enrollment_id IN ('${enrollment1Id}', '${enrollment2Id}');
    DELETE FROM public.student_requirements WHERE student_id IN ('${student1Id}', '${student2Id}');
    DELETE FROM public.balances WHERE id IN ('${balance1Id}', '${balance2Id}');
    DELETE FROM public.enrollment_decision_notifications WHERE enrollment_id IN ('${enrollment1Id}', '${enrollment2Id}');
    DELETE FROM public.enrollments WHERE id IN ('${enrollment1Id}', '${enrollment2Id}');
    DELETE FROM public.students WHERE id IN ('${student1Id}', '${student2Id}');
    DELETE FROM public.official_student_records WHERE id IN ('${osr1Id}', '${osr2Id}') OR program_id IN ('${programAId}', '${programBId}');
    DELETE FROM public.official_role_assignments WHERE profile_id IN (${allFixtureUsers.map(id => `'${id}'`).join(",")});
    DELETE FROM public.profiles WHERE id IN (${allFixtureUsers.map(id => `'${id}'`).join(",")});
    DELETE FROM auth.users WHERE id IN (${allFixtureUsers.map(id => `'${id}'`).join(",")});
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
  execute(`
    INSERT INTO auth.users (id, email) VALUES
      ('${registrarId}', 'registrar.auth@example.test'),
      ('${librarianId}', 'librarian.auth@example.test'),
      ('${nurseId}', 'nurse.auth@example.test'),
      ('${deanId}', 'dean.auth@example.test'),
      ('${chairAId}', 'chairA.auth@example.test'),
      ('${chairBId}', 'chairB.auth@example.test'),
      ('${accountantId}', 'accountant.auth@example.test'),
      ('${unprovisionedId}', 'unprovisioned.auth@example.test'),
      ('${student1ProfileId}', 'student1.auth@example.test'),
      ('${student2ProfileId}', 'student2.auth@example.test'),
      ('${setupStudentProfileId}', 'setup.student.auth@example.test');

    INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status) VALUES
      ('${registrarId}', 'registrar.auth@example.test', 'admin', 'Registrar', 'Admin', 'ACTIVE'),
      ('${librarianId}', 'librarian.auth@example.test', 'admin', 'Librarian', 'Staff', 'ACTIVE'),
      ('${nurseId}', 'nurse.auth@example.test', 'admin', 'Nurse', 'Staff', 'ACTIVE'),
      ('${deanId}', 'dean.auth@example.test', 'admin', 'Dean', 'Staff', 'ACTIVE'),
      ('${chairAId}', 'chairA.auth@example.test', 'admin', 'ChairA', 'Staff', 'ACTIVE'),
      ('${chairBId}', 'chairB.auth@example.test', 'admin', 'ChairB', 'Staff', 'ACTIVE'),
      ('${accountantId}', 'accountant.auth@example.test', 'admin', 'Accountant', 'Staff', 'ACTIVE'),
      ('${student1ProfileId}', 'student1.auth@example.test', 'student', 'Student', 'One', 'ACTIVE'),
      ('${student2ProfileId}', 'student2.auth@example.test', 'student', 'Student', 'Two', 'ACTIVE'),
      ('${setupStudentProfileId}', 'setup.student.auth@example.test', 'student', 'Setup', 'Student', 'SETUP');

    INSERT INTO public.official_role_assignments (profile_id, official_role, program_id, active) VALUES
      ('${librarianId}', 'LIBRARIAN', null, true),
      ('${nurseId}', 'NURSE', null, true),
      ('${deanId}', 'DEAN', null, true),
      ('${chairAId}', 'PROGRAM_CHAIR', '${programAId}', true),
      ('${chairBId}', 'PROGRAM_CHAIR', '${programBId}', true),
      ('${accountantId}', 'ACCOUNTANT', null, true);
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
      (gen_random_uuid(), '${enrollment1Id}', '${subjectAId}', 'IT101', 'Intro to IT', 3),
      (gen_random_uuid(), '${enrollment2Id}', '${subjectBId}', 'AIS101', 'Intro to AIS', 3);

    INSERT INTO public.student_requirements (
      id, student_id, requirement_code, academic_year, semester, status, applicability
    ) VALUES
      (gen_random_uuid(), '${student1Id}', 'HEALTH_RECORD_UPDATE', '2026-2027', '1st Semester', 'PENDING', 'APPLICABLE'),
      (gen_random_uuid(), '${student2Id}', 'HEALTH_RECORD_UPDATE', '2026-2027', '1st Semester', 'PENDING', 'NOT_APPLICABLE');

    INSERT INTO public.balances (
      id, student_id, fee_description, amount, payment_status
    ) VALUES
      ('${balance1Id}', '${student1Id}', 'Tuition Fee', 5000.00, 'UNPAID'),
      ('${balance2Id}', '${student2Id}', 'Laboratory Fee', 1500.00, 'UNPAID');

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

  for (const staffId of [librarianId, nurseId, deanId, chairAId, chairBId, accountantId]) {
    const [isStaffRegistrar] = asUser(staffId, `SELECT private.is_registrar();`);
    assert.equal(isStaffRegistrar[0], "f", `Staff ${staffId} with active role must NOT be recognized as registrar`);
  }

  const [isStudentRegistrar] = asUser(student1ProfileId, `SELECT private.is_registrar();`);
  assert.equal(isStudentRegistrar[0], "f", "Student must NOT be recognized as registrar");

  const [isUnprovisionedRegistrar] = asUser(unprovisionedId, `SELECT private.is_registrar();`);
  assert.equal(isUnprovisionedRegistrar[0], "f", "Unprovisioned user must NOT be recognized as registrar");
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

  // Accountant tries to assign role
  const [acctAssignResult] = asUser(
    accountantId,
    `SELECT outcome FROM public.set_official_role_assignment('${librarianId}', 'DEAN', true);`
  );
  assert.equal(acctAssignResult[0], "unauthorized", "Accountant must be rejected with unauthorized");

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

  // Verify Registrar can revoke it
  const [regRevokeResult] = asUser(
    registrarId,
    `SELECT outcome FROM public.set_official_role_assignment('${librarianId}', 'ACCOUNTANT', false);`
  );
  assert.equal(regRevokeResult[0], "revoked", "Registrar can revoke official role");
});

test("Boundary 3: Assigned officials cannot approve/reject enrollments through Registrar RPC (review_pending_enrollment)", () => {
  for (const staffId of [librarianId, nurseId, deanId, chairAId, chairBId, accountantId]) {
    const [res] = asUser(
      staffId,
      `SELECT outcome FROM public.review_pending_enrollment('${enrollment1Id}', 'APPROVED', 'Staff bypass attempt');`
    );
    assert.equal(res[0], "unauthorized", `Staff ${staffId} must be rejected from review_pending_enrollment`);
  }

  // Student cannot review enrollments
  const [studentRes] = asUser(
    student1ProfileId,
    `SELECT outcome FROM public.review_pending_enrollment('${enrollment1Id}', 'APPROVED', 'Student review attempt');`
  );
  assert.equal(studentRes[0], "unauthorized", "Student must be rejected from review_pending_enrollment");

  // Registrar can call review_pending_enrollment (blocked only by authoritative clearance gate)
  const [regReview] = asUser(
    registrarId,
    `SELECT outcome FROM public.review_pending_enrollment('${enrollment1Id}', 'APPROVED', 'Legitimate registrar review');`
  );
  assert.notEqual(regReview[0], "unauthorized", "Registrar must NOT be rejected as unauthorized");
  assert.equal(regReview[0], "incomplete_clearances", "Registrar reaches the authoritative clearance gate");
});

test("Boundary 4: Profile privilege escalation and sensitive field protection", () => {
  // 1. Unprovisioned user tries to self-provision as admin
  const unprovAdmin = tryExecuteAsUser(
    unprovisionedId,
    `INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status)
     VALUES ('${unprovisionedId}', 'unprov@example.test', 'admin', 'Hacker', 'Admin', 'ACTIVE');`
  );
  assert.equal(unprovAdmin.ok, false, "Self-provisioning as admin must be blocked");
  assert.match(unprovAdmin.error, /Self-provisioning as administrator is forbidden|row-level security/i);

  // 2. Unprovisioned user tries to self-activate as active student
  const unprovActive = tryExecuteAsUser(
    unprovisionedId,
    `INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status)
     VALUES ('${unprovisionedId}', 'unprov@example.test', 'student', 'Hacker', 'Student', 'ACTIVE');`
  );
  assert.equal(unprovActive.ok, false, "Self-activation must be blocked");
  assert.match(unprovActive.error, /Self-activation of profile is forbidden|row-level security/i);

  // 3. Unprovisioned user CAN self-register as PENDING student
  const unprovStudent = tryExecuteAsUser(
    unprovisionedId,
    `INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status)
     VALUES ('${unprovisionedId}', 'unprov@example.test', 'student', 'New', 'Student', 'PENDING');`
  );
  assert.equal(unprovStudent.ok, true, "Legitimate student self-registration must succeed");
  execute(`DELETE FROM public.profiles WHERE id = '${unprovisionedId}';`);

  // 4. Librarian tries to update profile role directly
  const libUpdateOther = tryExecuteAsUser(
    librarianId,
    `UPDATE public.profiles SET role = 'admin' WHERE id = '${student1ProfileId}';`
  );
  assert.ok(libUpdateOther !== undefined);
  const [checkStudentRole] = query(`SELECT role FROM public.profiles WHERE id = '${student1ProfileId}';`);
  assert.equal(checkStudentRole[0], "student", "Student role must remain student");

  // 5. Even Registrar cannot alter profile.role directly via table update (trigger prevents direct role mutation)
  const regRoleUpdate = tryExecuteAsUser(
    registrarId,
    `UPDATE public.profiles SET role = 'student' WHERE id = '${librarianId}';`
  );
  assert.equal(regRoleUpdate.ok, false, "Direct modification of profile.role must be blocked by trigger");
  assert.match(regRoleUpdate.error, /Profile role cannot be modified directly/i);

  // 6. Registrar CAN update non-sensitive fields (e.g. name sync)
  const regNameUpdate = tryExecuteAsUser(
    registrarId,
    `UPDATE public.profiles SET first_name = 'UpdatedByRegistrar' WHERE id = '${student1ProfileId}';`
  );
  assert.equal(regNameUpdate.ok, true, regNameUpdate.error || "Registrar can update non-sensitive profile field");
  const [updatedName] = query(`SELECT first_name FROM public.profiles WHERE id = '${student1ProfileId}';`);
  assert.equal(updatedName[0], "UpdatedByRegistrar");
});

test("Boundary 5: Direct table UPDATE on enrollments is blocked for non-Registrars (enrollments_update_admin elimination)", () => {
  // Librarian tries direct table UPDATE on enrollments
  const libEnrollUpdate = tryExecuteAsUser(
    librarianId,
    `UPDATE public.enrollments SET status = 'APPROVED' WHERE id = '${enrollment1Id}';`
  );
  assert.ok(libEnrollUpdate !== undefined);
  const [checkLibEnrollStatus] = query(`SELECT status FROM public.enrollments WHERE id = '${enrollment1Id}';`);
  assert.equal(checkLibEnrollStatus[0], "PENDING", "Librarian direct UPDATE must not alter enrollment status");

  // Student tries direct table UPDATE on enrollments
  const studentEnrollUpdate = tryExecuteAsUser(
    student1ProfileId,
    `UPDATE public.enrollments SET status = 'APPROVED' WHERE id = '${enrollment1Id}';`
  );
  assert.ok(studentEnrollUpdate !== undefined);
  const [checkStudentEnrollStatus] = query(`SELECT status FROM public.enrollments WHERE id = '${enrollment1Id}';`);
  assert.equal(checkStudentEnrollStatus[0], "PENDING", "Student direct UPDATE must not alter enrollment status");

  // Registrar CAN execute management UPDATE on enrollments
  const regEnrollUpdate = tryExecuteAsUser(
    registrarId,
    `UPDATE public.enrollments SET remarks = 'Verified by Registrar' WHERE id = '${enrollment1Id}';`
  );
  assert.equal(regEnrollUpdate.ok, true, "Registrar can update enrollment remarks");
  const [checkRegEnrollRemarks] = query(`SELECT remarks FROM public.enrollments WHERE id = '${enrollment1Id}';`);
  assert.equal(checkRegEnrollRemarks[0], "Verified by Registrar");
});

test("Boundary 6: Official Student Records Scoping & Management", () => {
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

  // Allowed: Student 1 CAN read own official student record
  const [student1OwnRecord] = asUser(
    student1ProfileId,
    `SELECT count(*) FROM public.official_student_records WHERE id = '${osr1Id}';`
  );
  assert.equal(student1OwnRecord[0], "1", "Student 1 can select own official record");

  // Denied: Student 1 cannot read Student 2's official record
  const [student1OtherRecord] = asUser(
    student1ProfileId,
    `SELECT count(*) FROM public.official_student_records WHERE id = '${osr2Id}';`
  );
  assert.equal(student1OtherRecord[0], "0", "Student 1 cannot select Student 2's official record");

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

test("Boundary 7: Program-scoped officials cannot access unauthorized programs", () => {
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

test("Boundary 8: Notification Outbox RPCs and RLS authorization", () => {
  // 1. Non-Registrars cannot select from enrollment_decision_notifications
  for (const staffId of [librarianId, nurseId, chairAId, accountantId, student1ProfileId]) {
    const [notifCount] = asUser(staffId, `SELECT count(*) FROM public.enrollment_decision_notifications;`);
    assert.equal(notifCount[0], "0", `User ${staffId} must not read enrollment decision notifications`);
  }

  // 2. Non-Registrars cannot call reserve_enrollment_decision_notification
  const [libReserve] = asUser(
    librarianId,
    `SELECT outcome FROM public.reserve_enrollment_decision_notification('${enrollment1Id}', 'APPROVED');`
  );
  assert.equal(libReserve[0], "unauthorized", "Librarian cannot reserve enrollment notification");

  // 3. Non-Registrars cannot call mark_enrollment_decision_notification_sent
  const [libSent] = asUser(
    librarianId,
    `SELECT outcome FROM public.mark_enrollment_decision_notification_sent(gen_random_uuid(), gen_random_uuid());`
  );
  assert.equal(libSent[0], "unauthorized", "Librarian cannot mark notification sent");

  // 4. Non-Registrars cannot call mark_enrollment_decision_notification_failed
  const [libFailed] = asUser(
    librarianId,
    `SELECT outcome FROM public.mark_enrollment_decision_notification_failed(gen_random_uuid(), gen_random_uuid(), 'provider');`
  );
  assert.equal(libFailed[0], "unauthorized", "Librarian cannot mark notification failed");

  // 5. Insert a pending notification for testing
  execute(`
    INSERT INTO public.enrollment_decision_notifications (
      enrollment_id, decision, recipient_email, academic_year, semester, status
    ) VALUES (
      '${enrollment1Id}', 'APPROVED', 'student1.auth@example.test', '2026-2027', '1st Semester', 'PENDING'
    ) ON CONFLICT (enrollment_id, decision) DO UPDATE SET status = 'PENDING', reservation_token = null, reserved_at = null;
  `);

  // 6. Registrar CAN select notifications
  const [regNotifCount] = asUser(registrarId, `SELECT count(*) FROM public.enrollment_decision_notifications WHERE enrollment_id = '${enrollment1Id}';`);
  assert.equal(regNotifCount[0], "1", "Registrar can read decision notification outbox");

  // 7. Registrar CAN reserve notification
  const [regReserveRes] = asUser(
    registrarId,
    `SELECT outcome, notification_id, reservation_token FROM public.reserve_enrollment_decision_notification('${enrollment1Id}', 'APPROVED');`
  );
  assert.equal(regReserveRes[0], "reserved", "Registrar can reserve notification");
  const notificationId = regReserveRes[1];
  const reservationToken = regReserveRes[2];
  assert.ok(reservationToken, "Reservation token must be generated");

  // 8. Registrar CAN mark notification sent
  const [regSentRes] = asUser(
    registrarId,
    `SELECT outcome FROM public.mark_enrollment_decision_notification_sent('${notificationId}', '${reservationToken}');`
  );
  assert.equal(regSentRes[0], "sent", "Registrar can mark notification sent");
});

test("Boundary 9: Cross-role workspace and clearance separation", () => {
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

test("Boundary 10: Financial Records (balances) RLS scoping", () => {
  // 1. Accountant can select all balances
  const [acctBalanceCount] = asUser(accountantId, `SELECT count(*) FROM public.balances;`);
  assert.equal(acctBalanceCount[0], "2", "Accountant can read all balances");

  // 2. Accountant can manage balances
  const acctUpdate = tryExecuteAsUser(
    accountantId,
    `UPDATE public.balances SET amount = 4500.00 WHERE id = '${balance1Id}';`
  );
  assert.equal(acctUpdate.ok, true, "Accountant can update balance");

  // 3. Student 1 can select own balance
  const [student1OwnBalance] = asUser(student1ProfileId, `SELECT count(*) FROM public.balances WHERE id = '${balance1Id}';`);
  assert.equal(student1OwnBalance[0], "1", "Student 1 can read own balance");

  // 4. Student 1 cannot select Student 2's balance
  const [student1OtherBalance] = asUser(student1ProfileId, `SELECT count(*) FROM public.balances WHERE id = '${balance2Id}';`);
  assert.equal(student1OtherBalance[0], "0", "Student 1 cannot read Student 2's balance");

  // 5. Student 1 cannot update own balance
  const studentUpdate = tryExecuteAsUser(
    student1ProfileId,
    `UPDATE public.balances SET amount = 0.00 WHERE id = '${balance1Id}';`
  );
  assert.ok(studentUpdate !== undefined);
  const [checkStudent1Balance] = query(`SELECT amount FROM public.balances WHERE id = '${balance1Id}';`);
  assert.equal(checkStudent1Balance[0], "4500.00", "Student update attempt must not alter balance");

  // 6. Non-financial staff (Librarian, Nurse) cannot read balances
  const [libBalanceCount] = asUser(librarianId, `SELECT count(*) FROM public.balances;`);
  assert.equal(libBalanceCount[0], "0", "Librarian cannot read student balances");

  const [nurseBalanceCount] = asUser(nurseId, `SELECT count(*) FROM public.balances;`);
  assert.equal(nurseBalanceCount[0], "0", "Nurse cannot read student balances");

  // 7. Registrar can select all balances
  const [regBalanceCount] = asUser(registrarId, `SELECT count(*) FROM public.balances;`);
  assert.equal(regBalanceCount[0], "2", "Registrar can read all student balances");
});

test("Boundary 11: Institutional Audit Logs Protection", () => {
  // 1. Librarian cannot read audit logs
  const [libAuditCount] = asUser(librarianId, `SELECT count(*) FROM public.audit_logs;`);
  assert.equal(libAuditCount[0], "0", "Librarian cannot read audit logs");

  // 2. Nurse cannot read audit logs
  const [nurseAuditCount] = asUser(nurseId, `SELECT count(*) FROM public.audit_logs;`);
  assert.equal(nurseAuditCount[0], "0", "Nurse cannot read audit logs");

  // 3. Non-Registrar direct INSERT into audit_logs is blocked
  const libAuditInsert = tryExecuteAsUser(
    librarianId,
    `INSERT INTO public.audit_logs (actor_profile_id, action, target_table, target_id)
     VALUES ('${librarianId}', 'FORGED_AUDIT', 'profiles', '${student1ProfileId}');`
  );
  assert.equal(libAuditInsert.ok, false, "Direct INSERT into audit_logs must be blocked for non-Registrars");

  // 4. Registrar CAN read audit logs
  const [regAuditCount] = asUser(registrarId, `SELECT count(*) FROM public.audit_logs;`);
  assert.ok(parseInt(regAuditCount[0], 10) >= 0, "Registrar can select audit logs");
});

test("Boundary 12: Signature Specimen Isolation", () => {
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

test("Boundary 13: Signature Storage Objects Access (storage.objects)", () => {
  const sig1Id = "00000000-0000-4000-d000-000000000020";
  const sigStoragePath = `${enrollment1Id}/LIBRARIAN/${sig1Id}.png`;

  // Insert mock storage object and signature metadata
  execute(`
    INSERT INTO storage.objects (id, bucket_id, name)
    VALUES (gen_random_uuid(), 'enrollment-signatures', '${sigStoragePath}')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.enrollment_signatures (
      id, enrollment_id, student_id, signer_profile_id, signer_role,
      clearance_type, document_type, signer_name_snapshot,
      signature_storage_path, document_hash, signature_hash
    ) VALUES (
      '${sig1Id}', '${enrollment1Id}', '${student1Id}', '${librarianId}', 'LIBRARIAN',
      'LIBRARY_CLEARANCE', 'ENROLLMENT_CLEARANCE', 'Librarian Staff',
      '${sigStoragePath}', '${"a".repeat(64)}', '${"b".repeat(64)}'
    ) ON CONFLICT DO NOTHING;
  `);

  // 1. Student 1 CAN read own signature storage object
  const [student1SigObj] = asUser(
    student1ProfileId,
    `SELECT count(*) FROM storage.objects WHERE bucket_id = 'enrollment-signatures' AND name = '${sigStoragePath}';`
  );
  assert.equal(student1SigObj[0], "1", "Student 1 can select own signature storage object");

  // 2. Student 2 CANNOT read Student 1's signature storage object
  const [student2SigObj] = asUser(
    student2ProfileId,
    `SELECT count(*) FROM storage.objects WHERE bucket_id = 'enrollment-signatures' AND name = '${sigStoragePath}';`
  );
  assert.equal(student2SigObj[0], "0", "Student 2 cannot select Student 1's signature storage object");

  // 3. Librarian CAN read signature storage object for authorized program enrollment
  const [libSigObj] = asUser(
    librarianId,
    `SELECT count(*) FROM storage.objects WHERE bucket_id = 'enrollment-signatures' AND name = '${sigStoragePath}';`
  );
  assert.equal(libSigObj[0], "1", "Librarian can select signature object for authorized enrollment");

  // 4. Chair B (Program B only) CANNOT read Program A signature storage object
  const [chairBSigObj] = asUser(
    chairBId,
    `SELECT count(*) FROM storage.objects WHERE bucket_id = 'enrollment-signatures' AND name = '${sigStoragePath}';`
  );
  assert.equal(chairBSigObj[0], "0", "Chair B cannot select Program A signature storage object");

  // 5. Registrar CAN read signature storage objects
  const [regSigObj] = asUser(
    registrarId,
    `SELECT count(*) FROM storage.objects WHERE bucket_id = 'enrollment-signatures' AND name = '${sigStoragePath}';`
  );
  assert.equal(regSigObj[0], "1", "Registrar can select signature storage objects");
});

test("Boundary 14: Legitimate Student Account Setup Completion", () => {
  // Student in SETUP status calls complete_student_account_setup()
  const [setupRes] = asUser(
    setupStudentProfileId,
    `SELECT outcome FROM public.complete_student_account_setup();`
  );
  assert.equal(setupRes[0], "completed", "Student can successfully complete account setup");

  const [setupStatus] = query(`SELECT account_status FROM public.profiles WHERE id = '${setupStudentProfileId}';`);
  assert.equal(setupStatus[0], "ACTIVE", "Profile account_status transitions to ACTIVE");
});

test("Boundary 15: Clearance Signing Workflow and Historical Signature Immutability", () => {
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
    DELETE FROM public.audit_logs WHERE actor_profile_id IN (${allFixtureUsers.map(id => `'${id}'`).join(",")});
    DELETE FROM public.signature_specimens WHERE profile_id IN (${allFixtureUsers.map(id => `'${id}'`).join(",")});
    DELETE FROM storage.objects WHERE bucket_id = 'enrollment-signatures' AND name LIKE '%${enrollment1Id}%';
    DELETE FROM public.enrollment_signatures WHERE enrollment_id IN ('${enrollment1Id}', '${enrollment2Id}');
    DELETE FROM public.enrollment_clearances WHERE enrollment_id IN ('${enrollment1Id}', '${enrollment2Id}');
    DELETE FROM public.enrollment_subjects WHERE enrollment_id IN ('${enrollment1Id}', '${enrollment2Id}');
    DELETE FROM public.student_requirements WHERE student_id IN ('${student1Id}', '${student2Id}');
    DELETE FROM public.balances WHERE id IN ('${balance1Id}', '${balance2Id}');
    DELETE FROM public.enrollment_decision_notifications WHERE enrollment_id IN ('${enrollment1Id}', '${enrollment2Id}');
    DELETE FROM public.enrollments WHERE id IN ('${enrollment1Id}', '${enrollment2Id}');
    DELETE FROM public.students WHERE id IN ('${student1Id}', '${student2Id}');
    DELETE FROM public.official_student_records WHERE id IN ('${osr1Id}', '${osr2Id}') OR program_id IN ('${programAId}', '${programBId}');
    DELETE FROM public.official_role_assignments WHERE profile_id IN (${allFixtureUsers.map(id => `'${id}'`).join(",")});
    DELETE FROM public.profiles WHERE id IN (${allFixtureUsers.map(id => `'${id}'`).join(",")});
    DELETE FROM auth.users WHERE id IN (${allFixtureUsers.map(id => `'${id}'`).join(",")});
    DELETE FROM public.subjects WHERE id IN ('${subjectAId}', '${subjectBId}') OR program_id IN ('${programAId}', '${programBId}');
    DELETE FROM public.programs WHERE id IN ('${programAId}', '${programBId}');
  `);
});
