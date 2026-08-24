import {
  DEMO_ACCOUNTS,
  DEMO_EMAILS,
  PRIMARY_DEMO_STUDENT,
  accountForEmail,
  fullName,
  normalizeEmail
} from "./demo-preparation-fixtures.mjs";
import {
  assertNoError,
  createSupabaseAdminClient,
  createSupabaseAuthClient,
  resolveProgramAndSubjects
} from "./demo-utils.mjs";

export { assertNoError, createSupabaseAdminClient, createSupabaseAuthClient, resolveProgramAndSubjects };

export async function listAllAuthUsers(admin) {
  const users = [];
  const perPage = 1000;

  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    assertNoError(error, "Could not list Supabase Auth users");

    const pageUsers = data?.users ?? [];
    users.push(...pageUsers);
    if (pageUsers.length < perPage) return users;
  }

  throw new Error("Supabase Auth user listing exceeded the supported page limit.");
}

function indexUniqueByEmail(rows, label) {
  const result = new Map();
  for (const row of rows ?? []) {
    const email = normalizeEmail(row.email);
    if (!email) continue;
    if (result.has(email)) {
      throw new Error(`Duplicate ${label} email detected for ${email}. Demo preparation stopped.`);
    }
    result.set(email, row);
  }
  return result;
}

async function getMaybeSingle(query, label) {
  const { data, error } = await query.maybeSingle();
  assertNoError(error, `Could not read ${label}`);
  return data ?? null;
}

async function getExactOfficialRecordCandidates(admin) {
  const byEmail = await getMaybeSingle(
    admin
      .from("official_student_records")
      .select("*")
      .eq("email", PRIMARY_DEMO_STUDENT.email),
    "the primary demo official record by email"
  );
  const byStudentId = await getMaybeSingle(
    admin
      .from("official_student_records")
      .select("*")
      .eq("student_id_number", PRIMARY_DEMO_STUDENT.studentIdNumber),
    "the primary demo official record by Student ID"
  );

  if (byEmail && byEmail.student_id_number !== PRIMARY_DEMO_STUDENT.studentIdNumber) {
    throw new Error("The primary demo email is already attached to a different Student ID. Demo preparation stopped.");
  }
  if (byStudentId && normalizeEmail(byStudentId.email) !== PRIMARY_DEMO_STUDENT.email) {
    throw new Error("The primary demo Student ID is already attached to a different email. Demo preparation stopped.");
  }
  if (byEmail && byStudentId && byEmail.id !== byStudentId.id) {
    throw new Error("The primary demo email and Student ID point to different official records. Demo preparation stopped.");
  }

  return byEmail ?? byStudentId;
}

async function getExactStudentCandidates(admin, profile) {
  const byProfile = profile
    ? await getMaybeSingle(
        admin
          .from("students")
          .select("*")
          .eq("profile_id", profile.id),
        "the primary demo student by profile"
      )
    : null;
  const byStudentId = await getMaybeSingle(
    admin
      .from("students")
      .select("*")
      .eq("student_id_number", PRIMARY_DEMO_STUDENT.studentIdNumber),
    "the primary demo student by Student ID"
  );

  if (byProfile && byProfile.student_id_number !== PRIMARY_DEMO_STUDENT.studentIdNumber) {
    throw new Error("The primary demo profile is already linked to a different Student ID. Demo preparation stopped.");
  }
  if (byStudentId && profile && byStudentId.profile_id !== profile.id) {
    throw new Error("The primary demo Student ID is already linked to a different profile. Demo preparation stopped.");
  }
  if (byProfile && byStudentId && byProfile.id !== byStudentId.id) {
    throw new Error("The primary demo profile and Student ID point to different student rows. Demo preparation stopped.");
  }
  if (byStudentId && !profile) {
    throw new Error("The primary demo Student ID exists without its exact demo profile. Demo preparation stopped.");
  }

  return byProfile ?? byStudentId;
}

export async function preflightDemoData(admin) {
  const authUsers = await listAllAuthUsers(admin);
  const authByEmail = new Map();
  for (const user of authUsers) {
    const email = normalizeEmail(user.email);
    if (!DEMO_EMAILS.includes(email)) continue;
    if (authByEmail.has(email)) {
      throw new Error(`Duplicate Supabase Auth user detected for ${email}. Demo preparation stopped.`);
    }
    authByEmail.set(email, user);
  }

  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("id, email, first_name, last_name, role, account_status")
    .in("email", DEMO_EMAILS);
  assertNoError(profilesError, "Could not read demo profiles");
  const profileByEmail = indexUniqueByEmail(profiles, "demo profile");

  for (const profile of profiles ?? []) {
    const email = normalizeEmail(profile.email);
    const authUser = authByEmail.get(email);
    if (!authUser || authUser.id !== profile.id) {
      throw new Error(`Demo profile ${email} is not linked to its exact Auth identity. Demo preparation stopped.`);
    }
  }

  const authIds = [...authByEmail.values()].map((user) => user.id);
  if (authIds.length) {
    const { data: profilesById, error: profilesByIdError } = await admin
      .from("profiles")
      .select("id, email")
      .in("id", authIds);
    assertNoError(profilesByIdError, "Could not validate demo Auth profile links");
    for (const profile of profilesById ?? []) {
      if (!DEMO_EMAILS.includes(normalizeEmail(profile.email))) {
        throw new Error("A demo Auth identity is linked to a non-demo profile. Demo preparation stopped.");
      }
    }
  }

  const studentProfile = profileByEmail.get(PRIMARY_DEMO_STUDENT.email) ?? null;
  const officialRecord = await getExactOfficialRecordCandidates(admin);
  const student = await getExactStudentCandidates(admin, studentProfile);

  if (student && studentProfile && student.profile_id !== studentProfile.id) {
    throw new Error("The primary demo student is linked to the wrong profile. Demo preparation stopped.");
  }

  return { authByEmail, profileByEmail, officialRecord, student };
}

export async function ensureAuthUser(admin, account, password, authByEmail) {
  const existing = authByEmail.get(account.email);
  const attributes = {
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName(account),
      demo_account: true,
      demo_role: account.portalRole
    }
  };

  if (existing) {
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, attributes);
    assertNoError(error, `Could not update Auth user ${account.email}`);
    return data.user;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: account.email,
    ...attributes
  });
  assertNoError(error, `Could not create Auth user ${account.email}`);
  if (!data.user?.id) throw new Error(`Supabase did not return an Auth ID for ${account.email}.`);
  return data.user;
}

export async function ensureProfile(admin, authUser, account) {
  const existing = await getMaybeSingle(
    admin
      .from("profiles")
      .select("id, email, role, account_status")
      .eq("id", authUser.id),
    `the profile for ${account.email}`
  );

  const payload = {
    id: authUser.id,
    first_name: account.firstName,
    last_name: account.lastName,
    email: account.email,
    role: account.role,
    account_status: "ACTIVE"
  };

  if (!existing) {
    const { data, error } = await admin.from("profiles").insert(payload).select("*").single();
    assertNoError(error, `Could not create the profile for ${account.email}`);
    return data;
  }

  const { data, error } = await admin
    .from("profiles")
    .update(payload)
    .eq("id", authUser.id)
    .select("*")
    .single();
  assertNoError(error, `Could not update the profile for ${account.email}`);
  return data;
}

async function setAssignmentActive(admin, id, active) {
  const { error } = await admin
    .from("official_role_assignments")
    .update({ active })
    .eq("id", id);
  assertNoError(error, "Could not update a demo official-role assignment");
}

export async function ensureOfficialAssignment(admin, profileId, officialRole) {
  const { data: assignments, error } = await admin
    .from("official_role_assignments")
    .select("id, official_role, program_id, active")
    .eq("profile_id", profileId);
  assertNoError(error, "Could not read demo official-role assignments");

  const matchingAssignments = (assignments ?? []).filter(
    (assignment) => assignment.official_role === officialRole && assignment.program_id === null
  );
  const globalAssignment = matchingAssignments.find((assignment) => assignment.active) ?? matchingAssignments[0] ?? null;
  for (const assignment of assignments ?? []) {
    const shouldBeActive = assignment.id === globalAssignment?.id;
    if (assignment.active !== shouldBeActive) {
      await setAssignmentActive(admin, assignment.id, shouldBeActive);
    }
  }

  if (globalAssignment) return globalAssignment.id;

  const { data, error: insertError } = await admin
    .from("official_role_assignments")
    .insert({ profile_id: profileId, official_role: officialRole, program_id: null, active: true })
    .select("id")
    .single();
  assertNoError(insertError, `Could not create the ${officialRole} demo assignment`);
  return data.id;
}

export async function deactivateAllOfficialAssignments(admin, profileId) {
  const { data: assignments, error } = await admin
    .from("official_role_assignments")
    .select("id, active")
    .eq("profile_id", profileId);
  assertNoError(error, "Could not read demo assignments for deactivation");

  for (const assignment of assignments ?? []) {
    if (assignment.active) await setAssignmentActive(admin, assignment.id, false);
  }
}

export async function ensureOfficialStudentRecord(admin, { existing, programId, registrarProfileId }) {
  const payload = {
    student_id_number: PRIMARY_DEMO_STUDENT.studentIdNumber,
    first_name: PRIMARY_DEMO_STUDENT.firstName,
    last_name: PRIMARY_DEMO_STUDENT.lastName,
    email: PRIMARY_DEMO_STUDENT.email,
    program_id: programId,
    year_level: PRIMARY_DEMO_STUDENT.yearLevel,
    student_type: PRIMARY_DEMO_STUDENT.studentType,
    gender_sex: PRIMARY_DEMO_STUDENT.genderSex,
    admission_status: "Admitted",
    enrollment_status: PRIMARY_DEMO_STUDENT.enrollmentStatus,
    updated_by: registrarProfileId
  };

  if (!existing) {
    const { data, error } = await admin
      .from("official_student_records")
      .insert({ ...payload, created_by: registrarProfileId })
      .select("*")
      .single();
    assertNoError(error, "Could not create the primary demo official student record");
    return data;
  }

  const { data, error } = await admin
    .from("official_student_records")
    .update(payload)
    .eq("id", existing.id)
    .select("*")
    .single();
  assertNoError(error, "Could not update the primary demo official student record");
  return data;
}

export async function ensureStudent(admin, { existing, profileId, officialRecordId, programId }) {
  const payload = {
    profile_id: profileId,
    student_id_number: PRIMARY_DEMO_STUDENT.studentIdNumber,
    program_id: programId,
    year_level: PRIMARY_DEMO_STUDENT.yearLevel,
    student_type: PRIMARY_DEMO_STUDENT.studentType,
    enrollment_status: PRIMARY_DEMO_STUDENT.enrollmentStatus,
    official_record_id: officialRecordId
  };

  if (!existing) {
    const { data, error } = await admin.from("students").insert(payload).select("*").single();
    assertNoError(error, "Could not create the primary demo student row");
    return data;
  }

  const { data, error } = await admin
    .from("students")
    .update(payload)
    .eq("id", existing.id)
    .select("*")
    .single();
  assertNoError(error, "Could not update the primary demo student row");
  return data;
}

async function readCurrentTermEnrollments(admin, studentId, term) {
  const { data, error } = await admin
    .from("enrollments")
    .select("id, status, academic_year, semester")
    .eq("student_id", studentId)
    .eq("academic_year", term.academicYear)
    .eq("semester", term.semester);
  assertNoError(error, "Could not read the primary demo current-term enrollment");
  return data ?? [];
}

export async function resetPrimaryWorkflow(admin, { student, officialRecord, term }) {
  if (!student) return { enrollmentCount: 0, requirementCount: 0 };

  const enrollments = await readCurrentTermEnrollments(admin, student.id, term);
  const enrollmentIds = enrollments.map((enrollment) => enrollment.id);

  if (enrollmentIds.length) {
    const { data: signatures, error: signaturesError } = await admin
      .from("enrollment_signatures")
      .select("id, enrollment_id")
      .in("enrollment_id", enrollmentIds);
    assertNoError(signaturesError, "Could not check primary demo signature history");
    if ((signatures ?? []).length) {
      throw new Error(
        "The primary demo workflow has immutable current-term signatures. Reset stopped to preserve audit history; use a fresh demo fixture for another recording."
      );
    }

    const { error: notificationsError } = await admin
      .from("enrollment_decision_notifications")
      .delete()
      .in("enrollment_id", enrollmentIds);
    assertNoError(notificationsError, "Could not remove primary demo notification rows");

    const { error: clearancesError } = await admin
      .from("enrollment_clearances")
      .delete()
      .in("enrollment_id", enrollmentIds);
    assertNoError(clearancesError, "Could not remove primary demo clearance rows");

    const { error: subjectsError } = await admin
      .from("enrollment_subjects")
      .delete()
      .in("enrollment_id", enrollmentIds);
    assertNoError(subjectsError, "Could not remove primary demo subject snapshots");

    const { error: enrollmentsError } = await admin
      .from("enrollments")
      .delete()
      .in("id", enrollmentIds);
    assertNoError(enrollmentsError, "Could not remove primary demo current-term enrollments");
  }

  const { data: requirements, error: requirementsError } = await admin
    .from("student_requirements")
    .select("id")
    .eq("student_id", student.id)
    .eq("requirement_code", "HEALTH_RECORD_UPDATE")
    .eq("academic_year", term.academicYear)
    .eq("semester", term.semester);
  assertNoError(requirementsError, "Could not read the primary demo health requirement");

  if ((requirements ?? []).length) {
    const { error } = await admin
      .from("student_requirements")
      .delete()
      .in("id", requirements.map((requirement) => requirement.id));
    assertNoError(error, "Could not remove the primary demo current-term health requirement");
  }

  const { error: studentError } = await admin
    .from("students")
    .update({ enrollment_status: PRIMARY_DEMO_STUDENT.enrollmentStatus })
    .eq("id", student.id);
  assertNoError(studentError, "Could not reset the primary demo student status");

  if (officialRecord?.id) {
    const { error: officialRecordError } = await admin
      .from("official_student_records")
      .update({ enrollment_status: PRIMARY_DEMO_STUDENT.enrollmentStatus })
      .eq("id", officialRecord.id);
    assertNoError(officialRecordError, "Could not reset the primary demo official record status");
  }

  return { enrollmentCount: enrollmentIds.length, requirementCount: requirements?.length ?? 0 };
}

export async function ensurePrimaryCleanState(admin, { student, officialRecord, term }) {
  const enrollments = student ? await readCurrentTermEnrollments(admin, student.id, term) : [];
  if (enrollments.length) throw new Error("Primary demo student still has a current-term enrollment.");

  if (student) {
    const { data: signatures, error } = await admin
      .from("enrollment_signatures")
      .select("id")
      .eq("student_id", student.id);
    assertNoError(error, "Could not verify primary demo signature state");
    if ((signatures ?? []).some(Boolean)) {
      throw new Error("Primary demo student has retained signature history; it is not a clean fixture.");
    }
  }

  if (officialRecord?.enrollment_status !== PRIMARY_DEMO_STUDENT.enrollmentStatus) {
    throw new Error("Primary demo official record is not reset to NOT ENROLLED.");
  }

  return true;
}

export function printPreparationPlan(configuration, program, subjects) {
  console.log("PKM-DES DEMO PREPARATION");
  console.log(`Target environment: ${configuration.targetEnvironment}`);
  console.log(`Target Supabase host: ${configuration.targetHost}`);
  console.log(`Demo term: AY ${configuration.term.academicYear}, ${configuration.term.semester}`);
  console.log(`Program: ${program.code} (${program.name})`);
  console.log(`Configured standard-load offerings: ${subjects.length}`);
  for (const account of DEMO_ACCOUNTS) console.log(`${account.portalRole.padEnd(20)} READY TARGET`);
  console.log(`${fullName(PRIMARY_DEMO_STUDENT).padEnd(20)} CLEAN WORKFLOW TARGET`);
}

export function printReadinessReport({ configuration, program, subjects, accounts, assignments, primary }) {
  console.log("PKM-DES DEMO READINESS");
  console.log(`Target environment: ${configuration.targetEnvironment}`);
  console.log(`Target Supabase host: ${configuration.targetHost}`);
  console.log(`Program/term: ${program.code} · AY ${configuration.term.academicYear} · ${configuration.term.semester}`);
  for (const account of accounts) console.log(`${account.portalRole.padEnd(20)} READY`);
  console.log(`Official assignments  ${assignments} READY`);
  console.log(`Official record       ${primary.officialRecord ? "READY" : "MISSING"}`);
  console.log(`Enrollment fixture    ${primary.enrollmentCount === 0 ? "CLEAN" : "NOT CLEAN"}`);
  console.log(`Health requirement    ${primary.requirementCount === 0 ? "READY FOR DEMO" : "PRESENT"}`);
  console.log(`Signatures            ${primary.signatureCount === 0 ? "NONE" : "PRESENT"}`);
  console.log(`Standard load         ${subjects.length} offerings`);
  console.log("Demo environment ready.");
}

export function countActiveAssignments(assignmentsByProfile) {
  let count = 0;
  for (const assignments of assignmentsByProfile.values()) {
    count += (assignments ?? []).filter((assignment) => assignment.active).length;
  }
  return count;
}

export function accountMapFromUsers(users) {
  const result = new Map();
  for (const user of users) {
    const account = accountForEmail(user.email);
    if (account) result.set(account.key, user);
  }
  return result;
}
