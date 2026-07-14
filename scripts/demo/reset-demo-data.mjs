import {
  ACCOUNT_DEMO_RECORDS,
  DEMO_EMAILS,
  DEMO_RECORDS,
  DEMO_REVIEWED_AT,
  DEMO_STUDENT_IDS,
  recordForEmail,
  recordForStudentId
} from "./demo-records.mjs";
import {
  assertNoError,
  createOfficialRecordPayload,
  createSupabaseAdminClient,
  printDemoPlan,
  readResetConfiguration,
  resolveProgramAndSubjects,
  targetHost
} from "./demo-utils.mjs";

const isDryRun = process.argv.includes("--dry-run");

function exactRecordMatches(record, expected) {
  return record && expected && record.email === expected.email && record.student_id_number === expected.studentIdNumber;
}

async function fetchExactOfficialRecords(supabase) {
  const records = [];

  for (const demoRecord of DEMO_RECORDS) {
    const { data: byEmail, error: emailError } = await supabase
      .from("official_student_records")
      .select("id, email, student_id_number")
      .eq("email", demoRecord.email)
      .maybeSingle();
    assertNoError(emailError, `Could not check official record email ${demoRecord.email}`);

    const { data: byStudentId, error: studentIdError } = await supabase
      .from("official_student_records")
      .select("id, email, student_id_number")
      .eq("student_id_number", demoRecord.studentIdNumber)
      .maybeSingle();
    assertNoError(studentIdError, `Could not check official record ID ${demoRecord.studentIdNumber}`);

    for (const candidate of [byEmail, byStudentId].filter(Boolean)) {
      const expected = recordForEmail(candidate.email) || recordForStudentId(candidate.student_id_number);
      if (!exactRecordMatches(candidate, expected)) {
        throw new Error("A reserved demo email or Student ID is associated with a non-demo official record. Demo data was not changed.");
      }

      if (!records.some((record) => record.id === candidate.id)) {
        records.push(candidate);
      }
    }
  }

  return records;
}

async function fetchExactAuthUsers(supabase) {
  const users = [];
  const perPage = 1000;

  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    assertNoError(error, "Could not list Auth users");

    const pageUsers = data?.users ?? [];
    users.push(...pageUsers.filter((user) => DEMO_EMAILS.includes(String(user.email).toLowerCase())));

    if (pageUsers.length < perPage) {
      break;
    }
  }

  return users;
}

async function fetchAndValidateDemoProfilesAndStudents(supabase, authUsers) {
  const authUserIds = authUsers.map((user) => user.id);
  const { data: authProfiles, error: authProfilesError } = authUserIds.length
    ? await supabase.from("profiles").select("id, email").in("id", authUserIds)
    : { data: [], error: null };
  assertNoError(authProfilesError, "Could not validate demo Auth profiles");

  const authUserById = new Map(authUsers.map((user) => [user.id, user]));
  for (const profile of authProfiles ?? []) {
    const authUser = authUserById.get(profile.id);
    const expected = recordForEmail(profile.email);
    if (!authUser || String(authUser.email).toLowerCase() !== profile.email || !expected) {
      throw new Error("A matched Auth user has a non-demo profile. Demo data was not changed.");
    }
  }

  const { data: emailProfiles, error: emailProfilesError } = await supabase
    .from("profiles")
    .select("id, email")
    .in("email", DEMO_EMAILS);
  assertNoError(emailProfilesError, "Could not check demo profiles");

  for (const profile of emailProfiles ?? []) {
    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(profile.id);
    assertNoError(authError, "Could not validate an exact demo profile Auth user");

    if (String(authData.user?.email).toLowerCase() !== profile.email) {
      throw new Error("An exact demo profile is linked to a different Auth identity. Demo data was not changed.");
    }
  }

  const profileIds = (emailProfiles ?? []).map((profile) => profile.id);
  const { data: studentsByProfile, error: studentsByProfileError } = profileIds.length
    ? await supabase.from("students").select("id, profile_id, student_id_number").in("profile_id", profileIds)
    : { data: [], error: null };
  assertNoError(studentsByProfileError, "Could not check demo student rows");

  const { data: studentsByStudentId, error: studentsByStudentIdError } = await supabase
    .from("students")
    .select("id, profile_id, student_id_number")
    .in("student_id_number", DEMO_STUDENT_IDS);
  assertNoError(studentsByStudentIdError, "Could not check reserved demo Student IDs");

  const profileById = new Map((emailProfiles ?? []).map((profile) => [profile.id, profile]));
  const students = [...(studentsByProfile ?? []), ...(studentsByStudentId ?? [])].filter(
    (student, index, list) => list.findIndex((candidate) => candidate.id === student.id) === index
  );

  for (const student of students) {
    const profile = profileById.get(student.profile_id);
    const expected = profile ? recordForEmail(profile.email) : recordForStudentId(student.student_id_number);
    if (!expected || student.student_id_number !== expected.studentIdNumber) {
      throw new Error("A reserved demo Student ID is associated with a non-demo student row. Demo data was not changed.");
    }
  }

  return { profiles: emailProfiles ?? [], students };
}

async function removeExistingDemoData(supabase) {
  const officialRecords = await fetchExactOfficialRecords(supabase);
  const authUsers = await fetchExactAuthUsers(supabase);
  const { profiles, students } = await fetchAndValidateDemoProfilesAndStudents(supabase, authUsers);

  for (const user of authUsers) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    assertNoError(error, "Could not delete an exact demo Auth user");
  }

  if (profiles.length) {
    const { error } = await supabase.from("profiles").delete().in("id", profiles.map((profile) => profile.id));
    assertNoError(error, "Could not remove remaining exact demo profiles");
  }

  if (students.length) {
    const { error } = await supabase.from("students").delete().in("id", students.map((student) => student.id));
    assertNoError(error, "Could not remove remaining exact demo students");
  }

  for (const record of officialRecords) {
    const { error } = await supabase
      .from("official_student_records")
      .delete()
      .eq("email", record.email)
      .eq("student_id_number", record.student_id_number);
    assertNoError(error, "Could not remove an exact demo official record");
  }
}

async function findOptionalReviewerId(supabase, registrarEmail) {
  if (!registrarEmail) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", registrarEmail)
    .eq("role", "admin")
    .maybeSingle();
  assertNoError(error, "Could not look up the optional demo reviewer");

  return data?.id ?? null;
}

async function createOfficialRecords(supabase, programId) {
  const { error } = await supabase
    .from("official_student_records")
    .insert(DEMO_RECORDS.map((record) => createOfficialRecordPayload(record, programId)));
  assertNoError(error, "Could not create fictional official student records");
}

async function createAccountBackedDemoRecord(supabase, record, programId, password, term, subjectIds, reviewerId) {
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: record.email,
    password,
    email_confirm: true
  });
  assertNoError(authError, `Could not create Auth user for ${record.key}`);

  const userId = authData?.user?.id;
  if (!userId) {
    throw new Error(`Auth user ID was not returned for ${record.key}.`);
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: userId,
    role: "student",
    first_name: record.firstName,
    last_name: record.lastName,
    email: record.email,
    account_status: "ACTIVE"
  });
  assertNoError(profileError, `Could not create profile for ${record.key}`);

  const { data: student, error: studentError } = await supabase
    .from("students")
    .insert({
      profile_id: userId,
      student_id_number: record.studentIdNumber,
      program_id: programId,
      year_level: "1st Year",
      student_type: "Incoming 1st Year Student",
      enrollment_status: record.enrollmentStatus
    })
    .select("id")
    .single();
  assertNoError(studentError, `Could not create student row for ${record.key}`);

  const enrollmentPayload = {
    student_id: student.id,
    program_id: programId,
    year_level: "1st Year",
    academic_year: term.academicYear,
    semester: term.semester,
    status: record.reviewStatus,
    remarks: record.remarks,
    reviewed_at: record.reviewStatus === "PENDING" ? null : DEMO_REVIEWED_AT,
    reviewed_by: record.reviewStatus === "PENDING" ? null : reviewerId
  };

  const { data: enrollment, error: enrollmentError } = await supabase
    .from("enrollments")
    .insert(enrollmentPayload)
    .select("id")
    .single();
  assertNoError(enrollmentError, `Could not create ${record.key} enrollment`);

  const { error: attachmentError } = await supabase.from("enrollment_subjects").insert(
    subjectIds.map((subjectId) => ({
      enrollment_id: enrollment.id,
      subject_id: subjectId
    }))
  );
  assertNoError(attachmentError, `Could not attach subjects for ${record.key}`);
}

async function main() {
  const configuration = readResetConfiguration();
  const supabase = createSupabaseAdminClient(configuration);
  const { program, subjects } = await resolveProgramAndSubjects(supabase, configuration.term);

  printDemoPlan({
    host: targetHost(configuration.url),
    term: configuration.term,
    subjectCount: subjects.length
  });
  console.log("Exact fictional identities to replace:");
  for (const record of DEMO_RECORDS) {
    console.log(`- ${record.key}: ${record.email} (${record.studentIdNumber})`);
  }
  console.log("Expected enrollment requests: Pending 1, Approved 1, Rejected 1, Total 3");

  if (isDryRun) {
    console.log("DRY RUN - NO DATA WAS CHANGED");
    return;
  }

  await removeExistingDemoData(supabase);
  await createOfficialRecords(supabase, program.id);

  const reviewerId = await findOptionalReviewerId(supabase, configuration.registrarEmail);
  const subjectIds = subjects.map((subject) => subject.id);

  for (const record of ACCOUNT_DEMO_RECORDS) {
    await createAccountBackedDemoRecord(
      supabase,
      record,
      program.id,
      configuration.password,
      configuration.term,
      subjectIds,
      reviewerId
    );
  }

  console.log("Fictional PKM-DES demonstration data reset completed.");
}

main().catch((error) => {
  console.error(`Demo reset stopped: ${error.message}`);
  process.exitCode = 1;
});
