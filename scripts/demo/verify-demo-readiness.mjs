import {
  DEMO_ACCOUNTS,
  DEMO_OFFICIAL_ACCOUNTS,
  PRIMARY_DEMO_STUDENT,
  fullName,
  readDemoVerificationConfiguration
} from "./demo-preparation-fixtures.mjs";
import {
  assertNoError,
  createSupabaseAdminClient,
  createSupabaseAuthClient,
  preflightDemoData,
  resolveProgramAndSubjects
} from "./demo-preparation-utils.mjs";

function check(condition, message, failures) {
  if (!condition) failures.push(message);
}

async function readAssignments(admin, profileId) {
  const { data, error } = await admin
    .from("official_role_assignments")
    .select("id, official_role, program_id, active")
    .eq("profile_id", profileId);
  assertNoError(error, "Could not read demo official-role assignments");
  return data ?? [];
}

async function verifyIndependentLogins(authClient, configuration, preflight, failures) {
  for (const account of DEMO_OFFICIAL_ACCOUNTS) {
    const expectedAuthUser = preflight.authByEmail.get(account.email);
    const { data, error } = await authClient.auth.signInWithPassword({
      email: account.email,
      password: configuration.password
    });
    check(!error && Boolean(data.user), `${account.portalRole}: independent login failed`, failures);
    if (data.user && expectedAuthUser) {
      check(data.user.id === expectedAuthUser.id, `${account.portalRole}: login resolved to the wrong Auth identity`, failures);
    }
    await authClient.auth.signOut();
  }
}

async function main() {
  const configuration = readDemoVerificationConfiguration();
  const admin = createSupabaseAdminClient(configuration);
  const authClient = createSupabaseAuthClient(configuration);
  const { program, subjects } = await resolveProgramAndSubjects(admin, configuration.term);
  const preflight = await preflightDemoData(admin);
  const failures = [];
  const accountsOnly = process.argv.includes("--accounts-only");

  await verifyIndependentLogins(authClient, configuration, preflight, failures);

  for (const account of DEMO_ACCOUNTS) {
    const authUser = preflight.authByEmail.get(account.email);
    const profile = preflight.profileByEmail.get(account.email);
    check(Boolean(authUser), `${account.portalRole}: Auth user missing`, failures);
    check(Boolean(profile), `${account.portalRole}: profile missing`, failures);
    if (authUser) {
      check(Boolean(authUser.email_confirmed_at), `${account.portalRole}: email is not confirmed`, failures);
      check(normalizeEmailForCheck(authUser.email) === account.email, `${account.portalRole}: Auth email mismatch`, failures);
    }
    if (profile) {
      check(profile.role === account.role, `${account.portalRole}: profile role is ${profile.role}`, failures);
      check(profile.account_status === "ACTIVE", `${account.portalRole}: profile is not ACTIVE`, failures);
      check(`${profile.first_name} ${profile.last_name}`.replace(/\s+/g, " ").trim() === fullName(account), `${account.portalRole}: display name mismatch`, failures);
    }
  }

  const assignmentsByProfile = new Map();
  for (const account of DEMO_ACCOUNTS) {
    const profile = preflight.profileByEmail.get(account.email);
    if (!profile) continue;
    const assignments = await readAssignments(admin, profile.id);
    assignmentsByProfile.set(account.key, assignments);
    if (account.officialRole) {
      check(
        assignments.some(
          (assignment) => assignment.active && assignment.official_role === account.officialRole && assignment.program_id === null
        ),
        `${account.portalRole}: required ${account.officialRole} assignment is missing`,
        failures
      );
      check(
        !assignments.some(
          (assignment) => assignment.active && (assignment.official_role !== account.officialRole || assignment.program_id !== null)
        ),
        `${account.portalRole}: has an unexpected active assignment`,
        failures
      );
    } else {
      check(!assignments.some((assignment) => assignment.active), `${account.portalRole}: has signing authority`, failures);
    }
  }

  const officialRecord = preflight.officialRecord;
  const student = preflight.student;
  if (!accountsOnly) {
    check(Boolean(officialRecord), "Official student record is missing", failures);
    check(Boolean(student), "Application student row is missing", failures);
  }
  if (!accountsOnly && officialRecord) {
    check(officialRecord.email === PRIMARY_DEMO_STUDENT.email, "Official record email mismatch", failures);
    check(officialRecord.student_id_number === PRIMARY_DEMO_STUDENT.studentIdNumber, "Official record Student ID mismatch", failures);
    check(officialRecord.program_id === program.id, "Official record program mismatch", failures);
    check(officialRecord.year_level === PRIMARY_DEMO_STUDENT.yearLevel, "Official record year level mismatch", failures);
    check(officialRecord.student_type === PRIMARY_DEMO_STUDENT.studentType, "Official record student type mismatch", failures);
    check(officialRecord.gender_sex === PRIMARY_DEMO_STUDENT.genderSex, "Official record gender/sex is not Female", failures);
    check(officialRecord.enrollment_status === "NOT ENROLLED", "Official record is not reset to NOT ENROLLED", failures);
  }
  if (!accountsOnly && student) {
    check(student.profile_id === preflight.profileByEmail.get(PRIMARY_DEMO_STUDENT.email)?.id, "Student profile link mismatch", failures);
    check(student.official_record_id === officialRecord?.id, "Student official-record link mismatch", failures);
    check(student.student_id_number === PRIMARY_DEMO_STUDENT.studentIdNumber, "Student ID mismatch", failures);
    check(student.program_id === program.id, "Student program mismatch", failures);
    check(student.year_level === PRIMARY_DEMO_STUDENT.yearLevel, "Student year level mismatch", failures);
    check(student.student_type === PRIMARY_DEMO_STUDENT.studentType, "Student type mismatch", failures);
    check(student.enrollment_status === "NOT ENROLLED", "Student is not reset to NOT ENROLLED", failures);

    const { data: enrollments, error: enrollmentError } = await admin
      .from("enrollments")
      .select("id")
      .eq("student_id", student.id)
      .eq("academic_year", configuration.term.academicYear)
      .eq("semester", configuration.term.semester);
    assertNoError(enrollmentError, "Could not verify primary demo current-term enrollment");
    check((enrollments ?? []).length === 0, "Primary demo student has a current-term enrollment", failures);

    const { data: requirements, error: requirementsError } = await admin
      .from("student_requirements")
      .select("id, status")
      .eq("student_id", student.id)
      .eq("requirement_code", "HEALTH_RECORD_UPDATE")
      .eq("academic_year", configuration.term.academicYear)
      .eq("semester", configuration.term.semester);
    assertNoError(requirementsError, "Could not verify primary demo health requirement");
    check((requirements ?? []).length === 0, "Primary demo student has a current-term health requirement", failures);

    const { data: signatures, error: signaturesError } = await admin
      .from("enrollment_signatures")
      .select("id")
      .eq("student_id", student.id);
    assertNoError(signaturesError, "Could not verify primary demo signatures");
    check((signatures ?? []).length === 0, "Primary demo student already has an official signature", failures);
  }

  if (failures.length) {
    console.error("Demo readiness verification failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }

  console.log(accountsOnly ? "PKM-DES DEMO ACCOUNT READINESS VERIFIED" : "PKM-DES DEMO READINESS VERIFIED");
  console.log(`Environment: ${configuration.targetEnvironment}`);
  console.log(`Supabase host: ${configuration.targetHost}`);
  console.log(`Program/term: ${program.code} · AY ${configuration.term.academicYear} · ${configuration.term.semester}`);
  console.log(`Accounts: ${DEMO_OFFICIAL_ACCOUNTS.length} official accounts independently authenticated`);
  console.log("Official assignments: LIBRARIAN, NURSE, PROGRAM_CHAIR, ACCOUNTANT, DEAN");
  console.log("Password: fixed shared demo password verified without printing its value");
  if (accountsOnly) return;
  console.log(`Primary student: ${PRIMARY_DEMO_STUDENT.email} · ${PRIMARY_DEMO_STUDENT.studentIdNumber}`);
  console.log("Official record: Female Incoming 1st Year BSAIS");
  console.log("Current enrollment: NONE");
  console.log("Health requirement: READY FOR NORMAL ENROLLMENT FLOW");
  console.log("Signatures: NONE");
  console.log(`Configured standard-load offerings: ${subjects.length}`);
}

function normalizeEmailForCheck(value) {
  return String(value ?? "").trim().toLowerCase();
}

main().catch((error) => {
  console.error(`Demo readiness verification stopped: ${error.message}`);
  process.exitCode = 1;
});
