import { fileURLToPath } from "node:url";
import path from "node:path";
import { ACCOUNT_DEMO_RECORDS, CLAIM_ONLY_DEMO_RECORD } from "../demo/demo-records.mjs";
import {
  assertManifestGitSafety,
  createSupabaseClients,
  getManifestPaths,
  normalizeEmail,
  readPreviewConfiguration,
  readPrivateManifest,
  scanTrackedFilesForSecrets
} from "./credential-utils.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function stop(stage) {
  throw new Error(stage);
}

function accountByKey(manifest, key) {
  const account = manifest.accounts.find((candidate) => candidate.key === key);
  if (!account) stop("credential_manifest_account_missing");
  return account;
}

async function verifyLogin(createAnonClient, account, expectedRole, expectedStudentId) {
  const client = createAnonClient();
  try {
    const { data, error } = await client.auth.signInWithPassword({ email: account.email, password: account.password });
    if (error || !data.user?.id) stop("preview_login_failed");

    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("id, email, role, account_status")
      .eq("id", data.user.id)
      .maybeSingle();
    if (
      profileError ||
      !profile ||
      normalizeEmail(profile.email) !== normalizeEmail(account.email) ||
      profile.role !== expectedRole ||
      profile.account_status !== "ACTIVE"
    ) {
      stop("preview_profile_verification_failed");
    }

    if (expectedStudentId) {
      const { data: student, error: studentError } = await client
        .from("students")
        .select("profile_id, student_id_number")
        .eq("profile_id", data.user.id)
        .maybeSingle();
      if (studentError || !student || student.profile_id !== data.user.id || student.student_id_number !== expectedStudentId) {
        stop("preview_student_verification_failed");
      }
    }
  } finally {
    await client.auth.signOut();
  }
}

async function findAuthUserByEmail(admin, email) {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) stop("auth_user_lookup_failed");
    const pageUsers = data?.users ?? [];
    users.push(...pageUsers.filter((user) => normalizeEmail(user.email) === normalizeEmail(email)));
    if (pageUsers.length === 0) break;
  }
  return users;
}

async function verifyClaimOnlyReadiness(admin) {
  const [authUsers, profileResponse, studentResponse, officialResponse] = await Promise.all([
    findAuthUserByEmail(admin, CLAIM_ONLY_DEMO_RECORD.email),
    admin.from("profiles").select("id").eq("email", CLAIM_ONLY_DEMO_RECORD.email),
    admin.from("students").select("id").eq("student_id_number", CLAIM_ONLY_DEMO_RECORD.studentIdNumber),
    admin
      .from("official_student_records")
      .select("id, email, student_id_number")
      .eq("email", CLAIM_ONLY_DEMO_RECORD.email)
      .eq("student_id_number", CLAIM_ONLY_DEMO_RECORD.studentIdNumber)
  ]);
  if (profileResponse.error || studentResponse.error || officialResponse.error) stop("claim_only_readiness_lookup_failed");
  const officialRecords = officialResponse.data ?? [];
  if (
    authUsers.length !== 0 ||
    (profileResponse.data ?? []).length !== 0 ||
    (studentResponse.data ?? []).length !== 0 ||
    officialRecords.length !== 1 ||
    normalizeEmail(officialRecords[0].email) !== normalizeEmail(CLAIM_ONLY_DEMO_RECORD.email) ||
    officialRecords[0].student_id_number !== CLAIM_ONLY_DEMO_RECORD.studentIdNumber
  ) {
    stop("claim_only_readiness_failed");
  }
}

async function main() {
  const configuration = readPreviewConfiguration();
  const paths = getManifestPaths(repositoryRoot);
  await assertManifestGitSafety({ repositoryRoot, manifestPath: paths.complete });
  const manifest = await readPrivateManifest({ repositoryRoot, manifestPath: paths.complete });
  if (manifest.targetHost !== configuration.targetHost) stop("credential_manifest_target_mismatch");

  const leakFindings = await scanTrackedFilesForSecrets({
    repositoryRoot,
    secrets: {
      registrar_password: configuration.registrarPassword,
      registrar_email: configuration.registrarEmail,
      service_role_key: configuration.serviceRoleKey,
      account_claim_secret: process.env.ACCOUNT_CLAIM_SECRET ?? "",
      ...Object.fromEntries(manifest.accounts.map((account) => [`${account.key}_password`, account.password])),
      claim_only_password: manifest.claimOnly.passwordForLiveClaim
    }
  });
  if (leakFindings.length) {
    for (const finding of leakFindings) console.error(`Tracked credential leak detected: ${finding.file} (${finding.labels.join(", ")})`);
    stop("tracked_credential_leak_detected");
  }

  const { admin, createAnonClient } = createSupabaseClients(configuration);
  const registrar = accountByKey(manifest, "registrar");
  if (normalizeEmail(registrar.email) !== configuration.registrarEmail) stop("registrar_manifest_mismatch");
  await verifyLogin(createAnonClient, registrar, "admin");
  for (const record of ACCOUNT_DEMO_RECORDS) {
    const account = accountByKey(manifest, record.key);
    if (normalizeEmail(account.email) !== normalizeEmail(record.email) || account.studentIdNumber !== record.studentIdNumber) {
      stop("student_manifest_mismatch");
    }
    await verifyLogin(createAnonClient, account, "student", record.studentIdNumber);
  }
  await verifyClaimOnlyReadiness(admin);
  console.log(`Preview credentials verified for ${configuration.targetHost}.`);
  console.log("Registrar/Admin, three fictional students, and the claim-only record are ready.");
}

main().catch((error) => {
  console.error(`Preview credential verification stopped: ${error.message}`);
  process.exitCode = 1;
});
