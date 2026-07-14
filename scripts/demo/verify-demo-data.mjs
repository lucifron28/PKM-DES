import {
  ACCOUNT_DEMO_EMAILS,
  ACCOUNT_DEMO_RECORDS,
  CLAIM_ONLY_DEMO_RECORD,
  DEMO_RECORDS,
  DEMO_STUDENT_IDS,
  DEMO_STUDENT_TYPE,
  DEMO_YEAR_LEVEL,
  recordForEmail,
  recordForStudentId
} from "./demo-records.mjs";
import {
  assertNoError,
  createSupabaseAdminClient,
  printDemoPlan,
  readVerificationConfiguration,
  resolveProgramAndSubjects,
  targetHost
} from "./demo-utils.mjs";

function check(condition, message, failures) {
  if (!condition) {
    failures.push(message);
  }
}

async function getExactOfficialRecord(supabase, record) {
  const { data, error } = await supabase
    .from("official_student_records")
    .select("id, email, student_id_number, program_id, year_level, student_type, enrollment_status")
    .eq("email", record.email)
    .eq("student_id_number", record.studentIdNumber)
    .maybeSingle();
  assertNoError(error, `Could not read official record for ${record.key}`);
  return data;
}

async function getExactProfile(supabase, email) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, role, account_status")
    .eq("email", email)
    .maybeSingle();
  assertNoError(error, `Could not read profile for ${email}`);
  return data;
}

async function getStudentForProfile(supabase, profileId) {
  const { data, error } = await supabase
    .from("students")
    .select("id, profile_id, student_id_number, program_id, year_level, student_type, enrollment_status")
    .eq("profile_id", profileId)
    .maybeSingle();
  assertNoError(error, "Could not read a demo student row");
  return data;
}

async function getCurrentTermEnrollments(supabase, studentId, term) {
  const { data, error } = await supabase
    .from("enrollments")
    .select("id, status, remarks, academic_year, semester, year_level, program_id")
    .eq("student_id", studentId)
    .eq("academic_year", term.academicYear)
    .eq("semester", term.semester);
  assertNoError(error, "Could not read current-term demo enrollments");
  return data ?? [];
}

async function getAttachmentCount(supabase, enrollmentId) {
  const { count, error } = await supabase
    .from("enrollment_subjects")
    .select("id", { count: "exact", head: true })
    .eq("enrollment_id", enrollmentId);
  assertNoError(error, "Could not count enrollment subjects");
  return count ?? 0;
}

async function findExactAuthUsers(supabase) {
  const matches = [];
  const perPage = 1000;

  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    assertNoError(error, "Could not list Auth users");

    const users = data?.users ?? [];
    matches.push(...users.filter((user) => ACCOUNT_DEMO_EMAILS.includes(String(user.email).toLowerCase())));

    if (users.length < perPage) {
      break;
    }
  }

  return matches;
}

async function verifyReservedStudentIds(supabase, failures) {
  const { data: officialRecords, error: officialError } = await supabase
    .from("official_student_records")
    .select("email, student_id_number")
    .in("student_id_number", DEMO_STUDENT_IDS);
  assertNoError(officialError, "Could not verify reserved official-record IDs");

  check((officialRecords ?? []).length === DEMO_RECORDS.length, "Reserved demo Student IDs are missing or duplicated in official records.", failures);
  for (const officialRecord of officialRecords ?? []) {
    const expected = recordForStudentId(officialRecord.student_id_number);
    check(Boolean(expected && expected.email === officialRecord.email), "A reserved demo Student ID is attached to an unexpected official record.", failures);
  }

  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("student_id_number")
    .in("student_id_number", DEMO_STUDENT_IDS);
  assertNoError(studentsError, "Could not verify reserved student-row IDs");

  check((students ?? []).length === ACCOUNT_DEMO_RECORDS.length, "Reserved demo Student IDs are missing or duplicated in student rows.", failures);
  for (const student of students ?? []) {
    check(Boolean(recordForStudentId(student.student_id_number)?.hasAccount), "The claim-only demo Student ID has a student row.", failures);
  }
}

async function verifyClaimOnlyRecord(supabase, programId, failures) {
  const officialRecord = await getExactOfficialRecord(supabase, CLAIM_ONLY_DEMO_RECORD);
  check(Boolean(officialRecord), "Claim-only official record is missing.", failures);

  if (officialRecord) {
    check(officialRecord.program_id === programId, "Claim-only record does not use BSAIS.", failures);
    check(officialRecord.year_level === DEMO_YEAR_LEVEL, "Claim-only record has an unexpected year level.", failures);
    check(officialRecord.student_type === DEMO_STUDENT_TYPE, "Claim-only record has an unexpected student type.", failures);
  }

  const profile = await getExactProfile(supabase, CLAIM_ONLY_DEMO_RECORD.email);
  check(!profile, "Claim-only record has a student profile.", failures);

  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id")
    .eq("student_id_number", CLAIM_ONLY_DEMO_RECORD.studentIdNumber);
  assertNoError(studentsError, "Could not verify claim-only student rows");
  check((students ?? []).length === 0, "Claim-only record has a student row or enrollment path.", failures);
}

async function verifyAccountRecord(supabase, record, programId, term, expectedSubjectCount, failures) {
  const officialRecord = await getExactOfficialRecord(supabase, record);
  check(Boolean(officialRecord), `${record.key}: official record is missing.`, failures);

  const profile = await getExactProfile(supabase, record.email);
  check(Boolean(profile), `${record.key}: profile is missing.`, failures);
  check(profile?.role === "student", `${record.key}: profile role is not student.`, failures);
  check(profile?.account_status === "ACTIVE", `${record.key}: profile is not ACTIVE.`, failures);

  if (!profile || !officialRecord) {
    return { attachmentCount: 0 };
  }

  check(officialRecord.program_id === programId, `${record.key}: official record does not use BSAIS.`, failures);
  check(officialRecord.year_level === DEMO_YEAR_LEVEL, `${record.key}: official record has an unexpected year level.`, failures);
  check(officialRecord.student_type === DEMO_STUDENT_TYPE, `${record.key}: official record has an unexpected student type.`, failures);

  const student = await getStudentForProfile(supabase, profile.id);
  check(Boolean(student), `${record.key}: student row is missing.`, failures);

  if (!student) {
    return { attachmentCount: 0 };
  }

  check(student.student_id_number === record.studentIdNumber, `${record.key}: student ID does not match.`, failures);
  check(student.program_id === programId, `${record.key}: student does not use BSAIS.`, failures);
  check(student.year_level === DEMO_YEAR_LEVEL, `${record.key}: student year level is incorrect.`, failures);
  check(student.student_type === DEMO_STUDENT_TYPE, `${record.key}: student type is incorrect.`, failures);
  check(student.enrollment_status === record.enrollmentStatus, `${record.key}: student enrollment status is incorrect.`, failures);

  const enrollments = await getCurrentTermEnrollments(supabase, student.id, term);
  check(enrollments.length === 1, `${record.key}: expected exactly one current-term enrollment.`, failures);

  const enrollment = enrollments[0];
  if (!enrollment) {
    return { attachmentCount: 0 };
  }

  check(enrollment.status === record.reviewStatus, `${record.key}: review status is incorrect.`, failures);
  check(enrollment.program_id === programId, `${record.key}: enrollment does not use BSAIS.`, failures);
  check(enrollment.year_level === DEMO_YEAR_LEVEL, `${record.key}: enrollment year level is incorrect.`, failures);
  check(enrollment.academic_year === term.academicYear, `${record.key}: academic year is incorrect.`, failures);
  check(enrollment.semester === term.semester, `${record.key}: semester is incorrect.`, failures);
  check(enrollment.remarks === record.remarks, `${record.key}: remarks are incorrect.`, failures);

  const attachmentCount = await getAttachmentCount(supabase, enrollment.id);
  check(attachmentCount === expectedSubjectCount, `${record.key}: expected ${expectedSubjectCount} attached subjects, found ${attachmentCount}.`, failures);

  return { attachmentCount };
}

async function main() {
  const configuration = readVerificationConfiguration();
  const supabase = createSupabaseAdminClient(configuration);
  const { program, subjects } = await resolveProgramAndSubjects(supabase, configuration.term);
  const failures = [];

  printDemoPlan({
    host: targetHost(configuration.url),
    term: configuration.term,
    subjectCount: subjects.length
  });

  await verifyReservedStudentIds(supabase, failures);
  await verifyClaimOnlyRecord(supabase, program.id, failures);

  const authUsers = await findExactAuthUsers(supabase);
  check(authUsers.length === ACCOUNT_DEMO_RECORDS.length, "Expected exactly three fictional Auth users.", failures);
  for (const user of authUsers) {
    check(Boolean(recordForEmail(user.email)?.hasAccount), "A matched Auth user is not an account-backed demo record.", failures);
  }

  const summaries = [];
  for (const record of ACCOUNT_DEMO_RECORDS) {
    const result = await verifyAccountRecord(supabase, record, program.id, configuration.term, subjects.length, failures);
    summaries.push({ record: record.key, status: record.reviewStatus, subjects: result.attachmentCount });
  }

  console.table(summaries);

  if (failures.length) {
    console.error("Demo verification failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("Demo verification passed: Pending 1, Approved 1, Rejected 1, Total enrollment requests 3.");
}

main().catch((error) => {
  console.error(`Demo verification stopped: ${error.message}`);
  process.exitCode = 1;
});
