import {
  ACCOUNT_DEMO_RECORDS,
  CLAIM_ONLY_DEMO_RECORD,
  DEMO_EMAILS,
  DEMO_RECORDS,
  DEMO_STUDENT_IDS,
  DEMO_STUDENT_TYPE,
  DEMO_YEAR_LEVEL,
  recordForStudentId
} from "./demo-records.mjs";
import {
  assertNoError,
  createSupabaseAdminClient,
  calculateDashboardCounts,
  printDemoPlan,
  readVerificationConfiguration,
  resolveOptionalReviewerId,
  resolveProgramAndSubjects,
  targetHost,
  validateExactOfferingSnapshotSet
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
    .select("id, status, remarks, academic_year, semester, year_level, program_id, reviewed_at, reviewed_by")
    .eq("student_id", studentId)
    .eq("academic_year", term.academicYear)
    .eq("semester", term.semester);
  assertNoError(error, "Could not read current-term demo enrollments");
  return data ?? [];
}

async function getEnrollmentAttachments(supabase, enrollmentId) {
  const { data, error } = await supabase
    .from("enrollment_subjects")
    .select("subject_id, course_offering_id, course_code, course_description, units")
    .eq("enrollment_id", enrollmentId);
  assertNoError(error, "Could not read enrollment attachments");
  return data ?? [];
}

async function findExactAuthUsers(supabase) {
  const matches = [];
  const perPage = 1000;

  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    assertNoError(error, "Could not list Auth users");

    const users = data?.users ?? [];
    matches.push(...users.filter((user) => DEMO_EMAILS.includes(String(user.email).toLowerCase())));

    if (users.length < perPage) {
      break;
    }
  }

  return matches;
}

function verifyAuthUsers(authUsers, failures) {
  for (const record of DEMO_RECORDS) {
    const matchingUsers = authUsers.filter((user) => String(user.email).toLowerCase() === record.email);

    if (!record.hasAccount) {
      check(matchingUsers.length === 0, "Claim-only demo email has an Auth user.", failures);
      continue;
    }

    check(matchingUsers.length === 1, `${record.key}: expected exactly one Auth user.`, failures);
    const authUser = matchingUsers[0];
    if (authUser) {
      check(Boolean(authUser.email_confirmed_at), `${record.key}: Auth email is not confirmed.`, failures);
    }
  }
}

async function verifyDashboardCounts(supabase, failures) {
  const { data, error } = await supabase.from("enrollments").select("status");
  assertNoError(error, "Could not read enrollment records for dashboard verification");

  const counts = calculateDashboardCounts(data ?? []);
  const isExpected = counts.pending === 1 && counts.approved === 1 && counts.rejected === 1 && counts.total === 3;
  check(
    isExpected,
    `Dashboard totals are Pending ${counts.pending}, Approved ${counts.approved}, Rejected ${counts.rejected}, Total ${counts.total}. The database contains additional records or an unexpected presentation state, so documented dashboard totals cannot be guaranteed.`,
    failures
  );
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

async function verifyAccountRecord(supabase, record, programId, term, expectedOfferings, reviewerId, authUser, failures) {
  const officialRecord = await getExactOfficialRecord(supabase, record);
  check(Boolean(officialRecord), `${record.key}: official record is missing.`, failures);

  const profile = await getExactProfile(supabase, record.email);
  check(Boolean(profile), `${record.key}: profile is missing.`, failures);
  check(profile?.role === "student", `${record.key}: profile role is not student.`, failures);
  check(profile?.account_status === "ACTIVE", `${record.key}: profile is not ACTIVE.`, failures);
  check(profile?.id === authUser?.id, `${record.key}: profile ID does not match its Auth user.`, failures);

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

  if (record.reviewStatus === "PENDING") {
    check(enrollment.reviewed_at === null, `${record.key}: pending enrollment has a reviewed timestamp.`, failures);
    check(enrollment.reviewed_by === null, `${record.key}: pending enrollment has a reviewer.`, failures);
  } else {
    const reviewedAt = enrollment.reviewed_at ? new Date(enrollment.reviewed_at) : null;
    check(Boolean(reviewedAt && !Number.isNaN(reviewedAt.valueOf())), `${record.key}: reviewed timestamp is missing or invalid.`, failures);
    check(Boolean(reviewedAt && reviewedAt.valueOf() <= Date.now()), `${record.key}: reviewed timestamp is in the future.`, failures);
    check(
      enrollment.reviewed_by === null || enrollment.reviewed_by === reviewerId,
      `${record.key}: reviewer is not the optional Registrar profile.`,
      failures
    );
  }

  const attachments = await getEnrollmentAttachments(supabase, enrollment.id);
  try {
    validateExactOfferingSnapshotSet(expectedOfferings, attachments);
  } catch (error) {
    check(false, `${record.key}: ${error.message}`, failures);
  }

  return { attachmentCount: attachments.length };
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
  verifyAuthUsers(authUsers, failures);
  const authUserByEmail = new Map(authUsers.map((user) => [String(user.email).toLowerCase(), user]));

  const reviewerId = await resolveOptionalReviewerId(supabase, configuration.registrarEmail);

  const summaries = [];
  for (const record of ACCOUNT_DEMO_RECORDS) {
    const result = await verifyAccountRecord(
      supabase,
      record,
      program.id,
      configuration.term,
      subjects,
      reviewerId,
      authUserByEmail.get(record.email),
      failures
    );
    summaries.push({ record: record.key, status: record.reviewStatus, subjects: result.attachmentCount });
  }

  console.table(summaries);

  await verifyDashboardCounts(supabase, failures);

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
