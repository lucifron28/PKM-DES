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

const databaseName = decodeURIComponent(dbUrl.pathname.replace(/^\/+/, ""));
const hasDisposableName = /(?:^|[-_])(test|disposable|temp)(?:[-_]|$)/i.test(databaseName);
const disposableConfirmation = process.env.PKM_DISPOSABLE_TEST_CONFIRMED === "true";

if (!hasDisposableName || !disposableConfirmation) {
  throw new Error(
    "Refusing database access: database name must contain a test/disposable/temp marker and PKM_DISPOSABLE_TEST_CONFIRMED=true must be set."
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
const accountantGlobalId = "00000000-0000-4000-a000-000000000009";
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
const grade1Id = "00000000-0000-4000-d100-000000000001";
const grade2Id = "00000000-0000-4000-d100-000000000002";
const student1SignatureId = "00000000-0000-4000-d200-000000000001";
const librarianSignatureId = "00000000-0000-4000-d200-000000000002";
const nurseSignatureId = "00000000-0000-4000-d200-000000000003";
const chairASignatureId = "00000000-0000-4000-d200-000000000004";
const accountantSignatureId = "00000000-0000-4000-d200-000000000005";
const deanSignatureId = "00000000-0000-4000-d200-000000000006";
const chairBSignatureId = "00000000-0000-4000-d200-000000000007";

const allFixtureUsers = [
  registrarId, librarianId, nurseId, deanId, chairAId, chairBId, accountantId, accountantGlobalId, unprovisionedId,
  student1ProfileId, student2ProfileId, setupStudentProfileId
];

test("Setup: provision isolated fixture data for authorization boundaries test", () => {
  // Clear any previous test fixtures
  execute(`
    SET pkm.demo_reset = 'true';
    DELETE FROM public.audit_logs WHERE actor_profile_id IN (${allFixtureUsers.map(id => `'${id}'`).join(",")});
    DELETE FROM public.signature_specimens WHERE profile_id IN (${allFixtureUsers.map(id => `'${id}'`).join(",")});
    DELETE FROM storage.objects WHERE bucket_id = 'enrollment-signatures' AND (name LIKE '%${enrollment1Id}%' OR name LIKE '%${enrollment2Id}%');
    DELETE FROM public.enrollment_signatures WHERE enrollment_id IN ('${enrollment1Id}', '${enrollment2Id}');
    DELETE FROM public.enrollment_clearances WHERE enrollment_id IN ('${enrollment1Id}', '${enrollment2Id}');
    DELETE FROM public.enrollment_subjects WHERE enrollment_id IN ('${enrollment1Id}', '${enrollment2Id}');
    DELETE FROM public.student_requirements WHERE student_id IN ('${student1Id}', '${student2Id}');
    DELETE FROM public.balances WHERE id IN ('${balance1Id}', '${balance2Id}');
    DELETE FROM public.grades WHERE id IN ('${grade1Id}', '${grade2Id}');
    DELETE FROM public.enrollment_decision_notifications WHERE enrollment_id IN ('${enrollment1Id}', '${enrollment2Id}');
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
      ('${accountantGlobalId}', 'accountant.global.auth@example.test'),
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
      ('${accountantId}', 'accountant.auth@example.test', 'admin', 'Accountant', 'Program A', 'ACTIVE'),
      ('${accountantGlobalId}', 'accountant.global.auth@example.test', 'admin', 'Accountant', 'Global', 'ACTIVE'),
      ('${student1ProfileId}', 'student1.auth@example.test', 'student', 'Student', 'One', 'ACTIVE'),
      ('${student2ProfileId}', 'student2.auth@example.test', 'student', 'Student', 'Two', 'ACTIVE'),
      ('${setupStudentProfileId}', 'setup.student.auth@example.test', 'student', 'Setup', 'Student', 'SETUP');

    INSERT INTO public.official_role_assignments (profile_id, official_role, program_id, active) VALUES
      ('${librarianId}', 'LIBRARIAN', null, true),
      ('${nurseId}', 'NURSE', null, true),
      ('${deanId}', 'DEAN', null, true),
      ('${chairAId}', 'PROGRAM_CHAIR', '${programAId}', true),
      ('${chairBId}', 'PROGRAM_CHAIR', '${programBId}', true),
      ('${accountantId}', 'ACCOUNTANT', '${programAId}', true),
      ('${accountantGlobalId}', 'ACCOUNTANT', null, true);
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
    INSERT INTO public.grades (id, student_id, subject_id, grade, remarks) VALUES
      ('${grade1Id}', '${student1Id}', '${subjectAId}', '1.25', 'Test grade A'),
      ('${grade2Id}', '${student2Id}', '${subjectBId}', '1.50', 'Test grade B');

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

  for (const staffId of [librarianId, nurseId, deanId, chairAId, chairBId, accountantId, accountantGlobalId]) {
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
  for (const staffId of [librarianId, nurseId, deanId, chairAId, chairBId, accountantId, accountantGlobalId, unprovisionedId]) {
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
  // Registrar retains authorized provisioning for another account.
  const registrarProvision = tryExecuteAsUser(
    registrarId,
    `INSERT INTO public.profiles (id, email, role, first_name, last_name, account_status)
     VALUES ('${unprovisionedId}', 'unprov@example.test', 'admin', 'Provisioned', 'Admin', 'ACTIVE');`
  );
  assert.equal(registrarProvision.ok, true, "Registrar can provision an authorized administrator profile");
  const [provisionedProfile] = query(`SELECT role, account_status FROM public.profiles WHERE id = '${unprovisionedId}';`);
  assert.deepEqual(provisionedProfile, ["admin", "ACTIVE"]);

  execute(`DELETE FROM public.profiles WHERE id = '${unprovisionedId}';`);


  // 4. Librarian tries to update profile role directly
  tryExecuteAsUser(
    librarianId,
    `UPDATE public.profiles SET role = 'admin' WHERE id = '${student1ProfileId}';`
  );
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
  tryExecuteAsUser(
    librarianId,
    `UPDATE public.enrollments SET status = 'APPROVED' WHERE id = '${enrollment1Id}';`
  );
  const [checkLibEnrollStatus] = query(`SELECT status FROM public.enrollments WHERE id = '${enrollment1Id}';`);
  assert.equal(checkLibEnrollStatus[0], "PENDING", "Librarian direct UPDATE must not alter enrollment status");

  // Student tries direct table UPDATE on enrollments
  tryExecuteAsUser(
    student1ProfileId,
    `UPDATE public.enrollments SET status = 'APPROVED' WHERE id = '${enrollment1Id}';`
  );
  const [checkStudentEnrollStatus] = query(`SELECT status FROM public.enrollments WHERE id = '${enrollment1Id}';`);
  assert.equal(checkStudentEnrollStatus[0], "PENDING", "Student direct UPDATE must not alter enrollment status");

  tryExecuteAsUser(
    unprovisionedId,
    `UPDATE public.enrollments SET status = 'APPROVED' WHERE id = '${enrollment1Id}';`
  );
  const [checkUnprovisionedEnrollStatus] = query(`SELECT status FROM public.enrollments WHERE id = '${enrollment1Id}';`);
  assert.equal(checkUnprovisionedEnrollStatus[0], "PENDING", "Unprovisioned user cannot alter enrollment status");

  // Registrar CAN execute management UPDATE on enrollments
  const regEnrollUpdate = tryExecuteAsUser(
    registrarId,
    `UPDATE public.enrollments SET remarks = 'Verified by Registrar' WHERE id = '${enrollment1Id}';`
  );
  assert.equal(regEnrollUpdate.ok, true, "Registrar can update enrollment remarks");
  const [checkRegEnrollRemarks] = query(`SELECT remarks FROM public.enrollments WHERE id = '${enrollment1Id}';`);
  assert.equal(checkRegEnrollRemarks[0], "Verified by Registrar");
});

test("Boundary 6: Student records and grades are least-privilege", () => {
  // Denied: Librarian cannot call update_official_student_record_and_sync.
  const [libSync] = asUser(
    librarianId,
    `SELECT outcome FROM public.update_official_student_record_and_sync('${osr1Id}', '26-IT-001', 'Hacked', 'Name', 'student1.auth@example.test', '${programAId}', '1st Year', 'Incoming 1st Year Student');`
  );
  assert.equal(libSync[0], "unauthorized", "Librarian cannot call update_official_student_record_and_sync");

  // Denied: Nurse cannot directly insert or read a full official student record.
  const nurseInsert = tryExecuteAsUser(
    nurseId,
    `INSERT INTO public.official_student_records (id, first_name, last_name, email, program_id, year_level, student_type, enrollment_status)
     VALUES (gen_random_uuid(), 'Fake', 'Student', 'fake@example.test', '${programAId}', '1st Year', 'Incoming 1st Year Student', 'PENDING');`
  );
  assert.equal(nurseInsert.ok, false, "Nurse cannot direct INSERT into official_student_records");

  for (const staffId of [librarianId, nurseId, deanId, chairAId, chairBId, accountantId, accountantGlobalId, unprovisionedId]) {
    const [staffRecord] = asUser(
      staffId,
      `SELECT count(*) FROM public.official_student_records WHERE id = '${osr1Id}';`
    );
    assert.equal(staffRecord[0], "0", `Official Staff ${staffId} cannot directly read full official student records`);
  }

  // Nurse still receives the minimum gender/applicability data through the
  // existing role- and program-scoped health requirement RPC.
  const [nurseHealthContext] = asUser(
    nurseId,
    `SELECT gender_sex, requirement_applicability
       FROM public.get_nurse_health_requirement('${enrollment1Id}');`
  );
  assert.deepEqual(nurseHealthContext, ["Female", "APPLICABLE"]);
  const [librarianHealthContext] = asUser(
    librarianId,
    `SELECT count(*) FROM public.get_nurse_health_requirement('${enrollment1Id}');`
  );
  assert.equal(librarianHealthContext[0], "0", "Librarian cannot use Nurse's scoped student-context RPC");

  // Student owners can see their own official records, not another student's.
  const [student1OwnRecord] = asUser(
    student1ProfileId,
    `SELECT count(*) FROM public.official_student_records WHERE id = '${osr1Id}';`
  );
  assert.equal(student1OwnRecord[0], "1");
  const [student1OtherRecord] = asUser(
    student1ProfileId,
    `SELECT count(*) FROM public.official_student_records WHERE id = '${osr2Id}';`
  );
  assert.equal(student1OtherRecord[0], "0");

  // Registrar retains full student-record read and management permissions.
  const [regCount] = asUser(
    registrarId,
    `SELECT count(*) FROM public.official_student_records WHERE id IN ('${osr1Id}', '${osr2Id}');`
  );
  assert.equal(regCount[0], "2", "Registrar can read all official student records");
  const [regSync] = asUser(
    registrarId,
    `SELECT outcome FROM public.update_official_student_record_and_sync(
      '${osr1Id}', '26-IT-001', 'OfficialName', 'Synced', 'student1.auth@example.test',
      '${programAId}', '1st Year', 'Incoming 1st Year Student',
      null, null, null, null, null, null, null, null, null, null, 'PENDING'
    );`
  );
  assert.equal(regSync[0], "updated", "Registrar can update official student records");

  // Staff roles do not require grade access in the application; only the
  // student owner and Registrar can read grades.
  for (const staffId of [librarianId, nurseId, deanId, chairAId, chairBId, accountantId, accountantGlobalId, unprovisionedId]) {
    const [staffGrades] = asUser(staffId, `SELECT count(*) FROM public.grades WHERE id IN ('${grade1Id}', '${grade2Id}');`);
    assert.equal(staffGrades[0], "0", `Official Staff ${staffId} cannot read grades`);
  }
  const [studentOwnGrade] = asUser(student1ProfileId, `SELECT count(*) FROM public.grades WHERE id = '${grade1Id}';`);
  assert.equal(studentOwnGrade[0], "1", "Student can read own grade");
  const [studentOtherGrade] = asUser(student1ProfileId, `SELECT count(*) FROM public.grades WHERE id = '${grade2Id}';`);
  assert.equal(studentOtherGrade[0], "0", "Student cannot read another student's grade");
  const [registrarGrades] = asUser(registrarId, `SELECT count(*) FROM public.grades WHERE id IN ('${grade1Id}', '${grade2Id}');`);
  assert.equal(registrarGrades[0], "2", "Registrar can read grades for management");
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
  for (const staffId of [librarianId, nurseId, chairAId, accountantId, accountantGlobalId, student1ProfileId, unprovisionedId]) {
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

  execute(`
    INSERT INTO public.enrollment_decision_notifications (
      enrollment_id, decision, recipient_email, academic_year, semester, status
    ) VALUES (
      '${enrollment1Id}', 'REJECTED', 'student1.auth@example.test', '2026-2027', '1st Semester', 'PENDING'
    ) ON CONFLICT (enrollment_id, decision) DO UPDATE SET status = 'PENDING', reservation_token = null, reserved_at = null;
  `);

  const [failedReservation] = asUser(
    registrarId,
    `SELECT outcome, notification_id, reservation_token FROM public.reserve_enrollment_decision_notification('${enrollment1Id}', 'REJECTED');`
  );
  assert.equal(failedReservation[0], "reserved");
  const [failedOutcome] = asUser(
    registrarId,
    `SELECT outcome FROM public.mark_enrollment_decision_notification_failed('${failedReservation[1]}', '${failedReservation[2]}', 'provider');`
  );
  assert.equal(failedOutcome[0], "failed", "Registrar can mark notification failed");
  const [failedState] = query(`
    SELECT status = 'FAILED', last_error_code = 'provider', reserved_at IS NULL, reservation_token IS NULL
    FROM public.enrollment_decision_notifications WHERE id = '${failedReservation[1]}';
  `);
  assert.deepEqual(failedState, ["t", "t", "t", "t"]);
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

  const [nurseSignDean] = asUser(
    nurseId,
    `SELECT outcome FROM public.record_official_clearance_signature(
      '${enrollment1Id}', 'DEAN_CLEARANCE', '${dummySigId}',
      '${enrollment1Id}/DEAN/${dummySigId}.png', '${dummyHash}', '${dummyHash}'
    );`
  );
  assert.equal(nurseSignDean[0], "unauthorized", "Nurse cannot sign DEAN_CLEARANCE");

  // 5. Nurse CAN read health requirements for their assigned program
  const [nurseReq] = asUser(nurseId, `SELECT count(*) FROM public.student_requirements WHERE student_id = '${student1Id}';`);
  assert.equal(nurseReq[0], "1", "Nurse can read health requirements for enrollment in assigned program");
});

test("Boundary 10: Accountant balances are program-scoped with global assignment support", () => {
  // Program A-scoped Accountant reads Program A only.
  const [accountantProgramACount] = asUser(
    accountantId,
    `SELECT count(*) FROM public.balances WHERE id IN ('${balance1Id}', '${balance2Id}');`
  );
  assert.equal(accountantProgramACount[0], "1", "Program-scoped Accountant sees only balances in the assigned program");

  const scopedAccountantWriteA = tryExecuteAsUser(
    accountantId,
    `UPDATE public.balances SET amount = 4500.00 WHERE id = '${balance1Id}';`
  );
  assert.equal(scopedAccountantWriteA.ok, true, "Program-scoped Accountant can update assigned-program balances");

  const [scopedAccountantWriteB] = asUser(
    accountantId,
    `WITH changed AS (
       UPDATE public.balances SET amount = 1.00 WHERE id = '${balance2Id}' RETURNING id
     )
     SELECT count(*) FROM changed;`
  );
  assert.equal(scopedAccountantWriteB[0], "0", "Program-scoped Accountant cannot update balances outside assigned program");
  const [balanceBAfterScopedWrite] = query(`SELECT amount FROM public.balances WHERE id = '${balance2Id}';`);
  assert.equal(balanceBAfterScopedWrite[0], "1500.00");

  // A global assignment (program_id IS NULL) retains system-wide scope.
  const [globalAccountantCount] = asUser(
    accountantGlobalId,
    `SELECT count(*) FROM public.balances WHERE id IN ('${balance1Id}', '${balance2Id}');`
  );
  assert.equal(globalAccountantCount[0], "2", "Global Accountant can read balances in all programs");
  const globalAccountantWriteB = tryExecuteAsUser(
    accountantGlobalId,
    `UPDATE public.balances SET amount = 1400.00 WHERE id = '${balance2Id}';`
  );
  assert.equal(globalAccountantWriteB.ok, true, "Global Accountant can update balances in any program");

  // Student access remains limited to their own balance.
  const [student1OwnBalance] = asUser(student1ProfileId, `SELECT count(*) FROM public.balances WHERE id = '${balance1Id}';`);
  assert.equal(student1OwnBalance[0], "1", "Student 1 can read own balance");
  const [student1OtherBalance] = asUser(student1ProfileId, `SELECT count(*) FROM public.balances WHERE id = '${balance2Id}';`);
  assert.equal(student1OtherBalance[0], "0", "Student 1 cannot read Student 2's balance");
  tryExecuteAsUser(
    student1ProfileId,
    `UPDATE public.balances SET amount = 0.00 WHERE id = '${balance1Id}';`
  );
  const [checkStudent1Balance] = query(`SELECT amount FROM public.balances WHERE id = '${balance1Id}';`);
  assert.equal(checkStudent1Balance[0], "4500.00", "Student update attempt must not alter balance");

  for (const staffId of [librarianId, nurseId, deanId, chairAId, chairBId, unprovisionedId]) {
    const [staffBalanceCount] = asUser(staffId, `SELECT count(*) FROM public.balances;`);
    assert.equal(staffBalanceCount[0], "0", `Non-Accountant staff ${staffId} cannot read student balances`);
  }

  const [registrarBalanceCount] = asUser(registrarId, `SELECT count(*) FROM public.balances;`);
  assert.equal(registrarBalanceCount[0], "2", "Registrar can read all student balances");
});

test("Boundary 11: Institutional Audit Logs Protection", () => {
  // 1. Librarian cannot read audit logs
  const [libAuditCount] = asUser(librarianId, `SELECT count(*) FROM public.audit_logs;`);
  assert.equal(libAuditCount[0], "0", "Librarian cannot read audit logs");

  // 2. Nurse cannot read audit logs
  const [nurseAuditCount] = asUser(nurseId, `SELECT count(*) FROM public.audit_logs;`);
  assert.equal(nurseAuditCount[0], "0", "Nurse cannot read audit logs");

  const [unprovisionedAuditCount] = asUser(unprovisionedId, `SELECT count(*) FROM public.audit_logs;`);
  assert.equal(unprovisionedAuditCount[0], "0", "Unprovisioned user cannot read audit logs");

  // 3. Non-Registrar direct INSERT into audit_logs is blocked
  const libAuditInsert = tryExecuteAsUser(
    librarianId,
    `INSERT INTO public.audit_logs (actor_profile_id, action, target_table, target_id)
     VALUES ('${librarianId}', 'FORGED_AUDIT', 'profiles', '${student1ProfileId}');`
  );
  assert.equal(libAuditInsert.ok, false, "Direct INSERT into audit_logs must be blocked for non-Registrars");

  const unprovisionedAuditInsert = tryExecuteAsUser(
    unprovisionedId,
    `INSERT INTO public.audit_logs (actor_profile_id, action, target_table, target_id)
     VALUES ('${unprovisionedId}', 'FORGED_AUDIT', 'profiles', '${student1ProfileId}');`
  );
  assert.equal(unprovisionedAuditInsert.ok, false, "Unprovisioned user cannot insert audit logs");

  // 4. Registrar CAN read audit logs
  const [regAuditCount] = asUser(registrarId, `SELECT count(*) FROM public.audit_logs;`);
  assert.ok(parseInt(regAuditCount[0], 10) > 0, "Registrar can read audit logs");
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

test("Boundary 13: Official signature visibility is role-scoped; complete forms remain available to students and Registrar", () => {
  const signatureFixtures = [
    {
      id: student1SignatureId,
      enrollmentId: enrollment1Id,
      studentId: student1Id,
      profileId: student1ProfileId,
      signerRole: "STUDENT",
      clearanceType: "STUDENT_ENROLLMENT_SIGNATURE",
      documentType: "ENROLLMENT_REGISTRATION",
      name: "Student One"
    },
    {
      id: librarianSignatureId,
      enrollmentId: enrollment1Id,
      studentId: student1Id,
      profileId: librarianId,
      signerRole: "LIBRARIAN",
      clearanceType: "LIBRARY_CLEARANCE",
      documentType: "ENROLLMENT_CLEARANCE",
      name: "Librarian Staff"
    },
    {
      id: nurseSignatureId,
      enrollmentId: enrollment1Id,
      studentId: student1Id,
      profileId: nurseId,
      signerRole: "NURSE",
      clearanceType: "HEALTH_CLEARANCE",
      documentType: "HEALTH_RECORD",
      name: "Nurse Staff"
    },
    {
      id: chairASignatureId,
      enrollmentId: enrollment1Id,
      studentId: student1Id,
      profileId: chairAId,
      signerRole: "PROGRAM_CHAIR",
      clearanceType: "PROGRAM_CLEARANCE",
      documentType: "ENROLLMENT_CLEARANCE",
      name: "Chair A"
    },
    {
      id: accountantSignatureId,
      enrollmentId: enrollment1Id,
      studentId: student1Id,
      profileId: accountantId,
      signerRole: "ACCOUNTANT",
      clearanceType: "ACCOUNTING_CLEARANCE",
      documentType: "ENROLLMENT_CLEARANCE",
      name: "Accountant A"
    },
    {
      id: deanSignatureId,
      enrollmentId: enrollment1Id,
      studentId: student1Id,
      profileId: deanId,
      signerRole: "DEAN",
      clearanceType: "DEAN_CLEARANCE",
      documentType: "ENROLLMENT_CLEARANCE",
      name: "Dean"
    },
    {
      id: chairBSignatureId,
      enrollmentId: enrollment2Id,
      studentId: student2Id,
      profileId: chairBId,
      signerRole: "PROGRAM_CHAIR",
      clearanceType: "PROGRAM_CLEARANCE",
      documentType: "ENROLLMENT_CLEARANCE",
      name: "Chair B"
    }
  ];
  const objectValues = signatureFixtures
    .map((signature) => `(gen_random_uuid(), 'enrollment-signatures', '${signature.enrollmentId}/${signature.signerRole}/${signature.id}.png')`)
    .join(",\n");
  const signatureValues = signatureFixtures
    .map((signature) => `(
      '${signature.id}', '${signature.enrollmentId}', '${signature.studentId}', '${signature.profileId}', '${signature.signerRole}',
      '${signature.clearanceType}', '${signature.documentType}', '${signature.name}',
      '${signature.enrollmentId}/${signature.signerRole}/${signature.id}.png',
      '${"a".repeat(64)}', '${"b".repeat(64)}'
    )`)
    .join(",\n");

  execute(`
    INSERT INTO storage.objects (id, bucket_id, name)
    VALUES ${objectValues}
    ON CONFLICT DO NOTHING;

    INSERT INTO public.enrollment_signatures (
      id, enrollment_id, student_id, signer_profile_id, signer_role,
      clearance_type, document_type, signer_name_snapshot,
      signature_storage_path, document_hash, signature_hash
    ) VALUES ${signatureValues}
    ON CONFLICT DO NOTHING;
  `);

  const visibleTypes = (profileId, enrollmentId) =>
    asUser(
      profileId,
      `SELECT clearance_type FROM public.enrollment_signatures WHERE enrollment_id = '${enrollmentId}' ORDER BY clearance_type;`
    ).map(([clearanceType]) => clearanceType);

  // A completed registration copy is available to its Student and the Registrar.
  assert.deepEqual(visibleTypes(student1ProfileId, enrollment1Id), [
    "ACCOUNTING_CLEARANCE",
    "DEAN_CLEARANCE",
    "HEALTH_CLEARANCE",
    "LIBRARY_CLEARANCE",
    "PROGRAM_CLEARANCE",
    "STUDENT_ENROLLMENT_SIGNATURE"
  ]);
  assert.deepEqual(visibleTypes(registrarId, enrollment1Id), [
    "ACCOUNTING_CLEARANCE",
    "DEAN_CLEARANCE",
    "HEALTH_CLEARANCE",
    "LIBRARY_CLEARANCE",
    "PROGRAM_CLEARANCE",
    "STUDENT_ENROLLMENT_SIGNATURE"
  ]);

  // Decision: staff clearance review needs the Student pledge only for the
  // Nurse Health Record Update form, and each official's own clearance
  // signature. Peer signers' signatures are not required by staff workflows;
  // full registration forms are served through Registrar and Student routes.
  assert.deepEqual(visibleTypes(librarianId, enrollment1Id), ["LIBRARY_CLEARANCE"]);
  assert.deepEqual(visibleTypes(nurseId, enrollment1Id), ["HEALTH_CLEARANCE", "STUDENT_ENROLLMENT_SIGNATURE"]);
  assert.deepEqual(visibleTypes(chairAId, enrollment1Id), ["PROGRAM_CLEARANCE"]);
  assert.deepEqual(visibleTypes(accountantId, enrollment1Id), ["ACCOUNTING_CLEARANCE"]);
  assert.deepEqual(visibleTypes(accountantGlobalId, enrollment1Id), ["ACCOUNTING_CLEARANCE"]);
  assert.deepEqual(visibleTypes(deanId, enrollment1Id), ["DEAN_CLEARANCE"]);
  assert.deepEqual(visibleTypes(chairBId, enrollment1Id), []);
  assert.deepEqual(visibleTypes(chairBId, enrollment2Id), ["PROGRAM_CLEARANCE"]);

  const storageCount = (profileId, path) =>
    asUser(
      profileId,
      `SELECT count(*) FROM storage.objects WHERE bucket_id = 'enrollment-signatures' AND name = '${path}';`
    )[0][0];
  const signerPath = (signature) =>
    `${signature.enrollmentId}/${signature.signerRole}/${signature.id}.png`;
  const storageCountForEnrollment = (profileId, enrollmentId) =>
    asUser(
      profileId,
      `SELECT count(*) FROM storage.objects WHERE bucket_id = 'enrollment-signatures' AND name LIKE '${enrollmentId}/%';`
    )[0][0];

  assert.equal(storageCount(student1ProfileId, signerPath(signatureFixtures[1])), "1", "Student can view a peer's signature on own form");
  assert.equal(storageCount(student2ProfileId, signerPath(signatureFixtures[1])), "0", "Another Student cannot view this signature");
  assert.equal(storageCount(librarianId, signerPath(signatureFixtures[1])), "1", "Librarian can view own clearance signature");
  assert.equal(storageCount(librarianId, signerPath(signatureFixtures[2])), "0", "Librarian cannot view Nurse signature");
  assert.equal(storageCount(librarianId, signerPath(signatureFixtures[0])), "0", "Librarian cannot view Student pledge signature");
  assert.equal(storageCount(nurseId, signerPath(signatureFixtures[2])), "1", "Nurse can view own Health signature");
  assert.equal(storageCount(nurseId, signerPath(signatureFixtures[0])), "1", "Nurse can view Student signature needed for health workflow");
  assert.equal(storageCount(nurseId, signerPath(signatureFixtures[1])), "0", "Nurse cannot view Librarian signature");
  assert.equal(storageCount(chairBId, signerPath(signatureFixtures[1])), "0", "Program B Chair cannot view Program A signature");
  assert.equal(storageCountForEnrollment(student1ProfileId, enrollment1Id), "6", "Student can view every signer for own registration form");
  assert.equal(storageCountForEnrollment(unprovisionedId, enrollment1Id), "0", "Unprovisioned user cannot access signature objects");
  assert.equal(storageCountForEnrollment(registrarId, enrollment1Id), "6", "Registrar can view every signer for complete registration form");
  assert.equal(storageCountForEnrollment(librarianId, enrollment1Id), "1", "Librarian sees only own signature object");
  assert.equal(storageCountForEnrollment(nurseId, enrollment1Id), "2", "Nurse sees own and Student pledge signature objects");
  assert.equal(storageCountForEnrollment(chairAId, enrollment1Id), "1", "Program Chair sees only own clearance signature");
  assert.equal(storageCountForEnrollment(accountantId, enrollment1Id), "1", "Program-scoped Accountant sees only own clearance signature");
  assert.equal(storageCountForEnrollment(accountantGlobalId, enrollment1Id), "1", "Global Accountant still sees only own clearance signature");
  assert.equal(storageCountForEnrollment(deanId, enrollment1Id), "1", "Dean sees only own clearance signature");
  assert.equal(storageCountForEnrollment(chairBId, enrollment1Id), "0", "Program B Chair sees no Program A signature objects");
  assert.equal(storageCountForEnrollment(chairBId, enrollment2Id), "1", "Program B Chair sees own Program B signature");
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
    DELETE FROM storage.objects WHERE bucket_id = 'enrollment-signatures' AND (name LIKE '%${enrollment1Id}%' OR name LIKE '%${enrollment2Id}%');
    DELETE FROM public.enrollment_signatures WHERE enrollment_id IN ('${enrollment1Id}', '${enrollment2Id}');
    DELETE FROM public.enrollment_clearances WHERE enrollment_id IN ('${enrollment1Id}', '${enrollment2Id}');
    DELETE FROM public.enrollment_subjects WHERE enrollment_id IN ('${enrollment1Id}', '${enrollment2Id}');
    DELETE FROM public.student_requirements WHERE student_id IN ('${student1Id}', '${student2Id}');
    DELETE FROM public.grades WHERE id IN ('${grade1Id}', '${grade2Id}');
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
