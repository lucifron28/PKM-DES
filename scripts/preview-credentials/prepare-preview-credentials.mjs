import { fileURLToPath } from "node:url";
import path from "node:path";
import { ACCOUNT_DEMO_RECORDS, CLAIM_ONLY_DEMO_RECORD } from "../demo/demo-records.mjs";
import {
  COMPLETE_MANIFEST_FILE,
  assertClaimOnlyReady,
  assertApplyConfirmation,
  createCompleteManifest,
  createPartialManifest,
  createPasswordPlan,
  createSupabaseClients,
  normalizeEmail,
  preflightManifestStorage,
  readPreviewConfiguration,
  redactedPlanSummary,
  removePrivateManifest,
  rotatePreviewPasswords,
  writePrivateManifest
} from "./credential-utils.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const apply = process.argv.includes("--apply");
const overwrite = process.argv.includes("--overwrite");

function stop(stage) {
  throw new Error(stage);
}

async function getExactRows(query, stage) {
  const { data, error } = await query;
  if (error) stop(stage);
  return data ?? [];
}

async function findAuthUsersByEmails(admin, emails) {
  const wanted = new Set(emails.map(normalizeEmail));
  const matches = new Map([...wanted].map((email) => [email, []]));

  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) stop("auth_user_lookup_failed");
    const users = data?.users ?? [];
    for (const user of users) {
      const email = normalizeEmail(user.email);
      if (matches.has(email)) matches.get(email).push(user);
    }
    if (users.length === 0) break;
  }

  return matches;
}

function requireSingleUser(matches, email, stage) {
  const users = matches.get(normalizeEmail(email)) ?? [];
  if (users.length !== 1 || !users[0].id) stop(stage);
  return users[0];
}

async function verifyStudentRecord(admin, record, authUser) {
  const profiles = await getExactRows(
    admin.from("profiles").select("id, email, role, account_status").eq("email", record.email),
    "student_profile_lookup_failed"
  );
  const profile = profiles[0];
  if (
    profiles.length !== 1 ||
    profile.id !== authUser.id ||
    normalizeEmail(profile.email) !== normalizeEmail(record.email) ||
    profile.role !== "student" ||
    profile.account_status !== "ACTIVE"
  ) {
    stop("student_profile_preflight_failed");
  }

  const students = await getExactRows(
    admin
      .from("students")
      .select("id, profile_id, student_id_number")
      .eq("profile_id", profile.id),
    "student_record_lookup_failed"
  );
  if (students.length !== 1 || students[0].profile_id !== profile.id || students[0].student_id_number !== record.studentIdNumber) {
    stop("student_record_preflight_failed");
  }
  const sameIdStudents = await getExactRows(
    admin.from("students").select("id, profile_id, student_id_number").eq("student_id_number", record.studentIdNumber),
    "student_id_collision_lookup_failed"
  );
  if (sameIdStudents.length !== 1 || sameIdStudents[0].profile_id !== profile.id) stop("student_id_collision_preflight_failed");
}

async function verifyClaimOnlyRecord(admin, authMatches) {
  const officialRecords = await getExactRows(
    admin
      .from("official_student_records")
      .select("id, email, student_id_number")
      .eq("email", CLAIM_ONLY_DEMO_RECORD.email)
      .eq("student_id_number", CLAIM_ONLY_DEMO_RECORD.studentIdNumber),
    "claim_record_lookup_failed"
  );
  if (
    officialRecords.length !== 1 ||
    normalizeEmail(officialRecords[0].email) !== normalizeEmail(CLAIM_ONLY_DEMO_RECORD.email) ||
    officialRecords[0].student_id_number !== CLAIM_ONLY_DEMO_RECORD.studentIdNumber
  ) {
    stop("claim_record_preflight_failed");
  }

  if ((authMatches.get(normalizeEmail(CLAIM_ONLY_DEMO_RECORD.email)) ?? []).length !== 0) {
    stop("claim_record_auth_collision");
  }

  const [profiles, students, enrollments] = await Promise.all([
    getExactRows(
    admin.from("profiles").select("id").eq("email", CLAIM_ONLY_DEMO_RECORD.email),
    "claim_profile_lookup_failed"),
    getExactRows(
    admin.from("students").select("id").eq("student_id_number", CLAIM_ONLY_DEMO_RECORD.studentIdNumber),
    "claim_student_lookup_failed"),
    getExactRows(
      admin.from("enrollments").select("id, students!inner(student_id_number)").eq("students.student_id_number", CLAIM_ONLY_DEMO_RECORD.studentIdNumber),
      "claim_enrollment_lookup_failed")
  ]);
  try {
    assertClaimOnlyReady({ officialRecords, authUsers: authMatches.get(normalizeEmail(CLAIM_ONLY_DEMO_RECORD.email)) ?? [], profiles, students, enrollments });
  } catch {
    stop("claim_only_readiness_failed");
  }
}

async function verifyRegistrarSignIn(createAnonClient, configuration, expectedAuthUser) {
  const client = createAnonClient();
  try {
    const { data, error } = await client.auth.signInWithPassword({
      email: configuration.registrarEmail,
      password: configuration.registrarPassword
    });
    if (error || data.user?.id !== expectedAuthUser.id) stop("registrar_sign_in_failed");

    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("id, email, role, account_status")
      .eq("id", expectedAuthUser.id)
      .maybeSingle();
    if (
      profileError ||
      !profile ||
      normalizeEmail(profile.email) !== configuration.registrarEmail ||
      profile.role !== "admin" ||
      profile.account_status !== "ACTIVE"
    ) {
      stop("registrar_profile_preflight_failed");
    }
  } finally {
    await client.auth.signOut();
  }
}

async function preflight(admin, createAnonClient, configuration) {
  const emails = [...ACCOUNT_DEMO_RECORDS.map((record) => record.email), CLAIM_ONLY_DEMO_RECORD.email, configuration.registrarEmail];
  const authMatches = await findAuthUsersByEmails(admin, emails);
  const studentUsers = ACCOUNT_DEMO_RECORDS.map((record) => requireSingleUser(authMatches, record.email, "student_auth_preflight_failed"));
  const registrarUser = requireSingleUser(authMatches, configuration.registrarEmail, "registrar_auth_preflight_failed");

  for (let index = 0; index < ACCOUNT_DEMO_RECORDS.length; index += 1) {
    await verifyStudentRecord(admin, ACCOUNT_DEMO_RECORDS[index], studentUsers[index]);
  }
  await verifyClaimOnlyRecord(admin, authMatches);
  await verifyRegistrarSignIn(createAnonClient, configuration, registrarUser);

  return new Map(ACCOUNT_DEMO_RECORDS.map((record, index) => [record.key, studentUsers[index]]));
}

async function main() {
  const configuration = readPreviewConfiguration();
  assertApplyConfirmation({ apply, confirmation: configuration.confirmation });
  const { admin, createAnonClient } = createSupabaseClients(configuration);
  const usersByRecordKey = await preflight(admin, createAnonClient, configuration);
  const summary = redactedPlanSummary({
    targetHost: configuration.targetHost,
    registrarEmail: configuration.registrarEmail,
    accountKeys: ACCOUNT_DEMO_RECORDS.map((record) => record.key)
  });

  console.log(`Preview target verified: ${summary.targetHost}`);
  console.log("Registrar/Admin credential verified.");
  console.log("Three fictional student accounts and one claim-only record passed preflight.");

  if (!apply) {
    console.log("Dry run complete. No Auth password or database record was changed.");
    console.log("Use --apply only with PREVIEW_CREDENTIALS_CONFIRM set to the documented confirmation value.");
    return;
  }

  const storage = await preflightManifestStorage({ repositoryRoot, overwrite });
  const plan = createPasswordPlan();
  await rotatePreviewPasswords({
    accounts: plan.accounts,
    updatePassword: async (item) => {
      const { error } = await admin.auth.admin.updateUserById(usersByRecordKey.get(item.record.key).id, { password: item.password });
      if (error) stop("student_password_update_failed");
    },
    createComplete: (successfulUpdates) => createCompleteManifest({
      targetHost: configuration.targetHost,
      registrarEmail: configuration.registrarEmail,
      registrarPassword: configuration.registrarPassword,
      accountPasswords: successfulUpdates,
      claimOnlyPassword: plan.claimOnlyPassword
    }),
    writeComplete: (manifest) => writePrivateManifest({ repositoryRoot, manifestPath: storage.paths.complete, manifest, overwrite: true }),
    createPartial: (successfulUpdates) => createPartialManifest({
      targetHost: configuration.targetHost,
      registrarEmail: configuration.registrarEmail,
      registrarPassword: configuration.registrarPassword,
      successfulUpdates
    }),
    writePartial: (manifest) => writePrivateManifest({ repositoryRoot, manifestPath: storage.paths.partial, manifest, overwrite: true }),
    removeComplete: () => removePrivateManifest({ repositoryRoot, manifestPath: storage.paths.complete }),
    removePartial: () => removePrivateManifest({ repositoryRoot, manifestPath: storage.paths.partial })
  });
  console.log(`Private credential manifest prepared at .preview/${COMPLETE_MANIFEST_FILE}.`);
  console.log("Run npm run preview:credentials:verify before presenting.");
}

main().catch((error) => {
  console.error(`Preview credential preparation stopped: ${error.message}`);
  process.exitCode = 1;
});
