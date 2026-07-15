import { fileURLToPath } from "node:url";
import path from "node:path";
import { ACCOUNT_DEMO_RECORDS, CLAIM_ONLY_DEMO_RECORD } from "../demo/demo-records.mjs";
import {
  assertClaimOnlyReady,
  assertCompleteManifestIdentityAgreement,
  assertRegistrarManifestAgreement,
  buildCredentialLeakScanEntries,
  createSupabaseClients,
  inspectPreviewManifestState,
  normalizeEmail,
  readPreviewConfiguration,
  readPrivateManifest,
  scanTrackedFilesForSecrets
} from "./credential-utils.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function stop(stage, metadata = {}) {
  const error = new Error(stage);
  error.code = stage;
  Object.assign(error, metadata);
  throw error;
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
  const [authUsers, profileResponse, studentResponse, officialResponse, enrollmentResponse] = await Promise.all([
    findAuthUserByEmail(admin, CLAIM_ONLY_DEMO_RECORD.email),
    admin.from("profiles").select("id").eq("email", CLAIM_ONLY_DEMO_RECORD.email),
    admin.from("students").select("id").eq("student_id_number", CLAIM_ONLY_DEMO_RECORD.studentIdNumber),
    admin
      .from("official_student_records")
      .select("id, email, student_id_number")
      .eq("email", CLAIM_ONLY_DEMO_RECORD.email)
      .eq("student_id_number", CLAIM_ONLY_DEMO_RECORD.studentIdNumber),
    admin
      .from("enrollments")
      .select("id, students!inner(student_id_number)")
      .eq("students.student_id_number", CLAIM_ONLY_DEMO_RECORD.studentIdNumber)
  ]);
  if (profileResponse.error || studentResponse.error || officialResponse.error || enrollmentResponse.error) stop("claim_only_readiness_lookup_failed");
  try {
    assertClaimOnlyReady({
      officialRecords: officialResponse.data ?? [],
      authUsers,
      profiles: profileResponse.data ?? [],
      students: studentResponse.data ?? [],
      enrollments: enrollmentResponse.data ?? []
    });
  } catch {
    stop("claim_only_readiness_failed");
  }
}

async function main() {
  const configuration = readPreviewConfiguration();
  const manifestState = await inspectPreviewManifestState({ repositoryRoot });
  if (manifestState.state === "none") stop("preview_credential_manifest_missing");
  if (manifestState.state === "partial") stop("preview_credential_recovery_state_active", { recoveryManifestPath: ".preview/preview-credentials.partial.local.json" });
  if (manifestState.state === "conflict") stop("preview_credential_recovery_state_active", { recoveryManifestPath: ".preview/preview-credentials.partial.local.json", completeManifestPath: ".preview/preview-credentials.local.json" });
  const paths = manifestState.paths;
  const manifest = await readPrivateManifest({ repositoryRoot, manifestPath: paths.complete });
  if (manifest.targetHost !== configuration.targetHost) stop("credential_manifest_target_mismatch");
  try {
    assertCompleteManifestIdentityAgreement(manifest);
  } catch (error) {
    stop(error.message === "claim_only_manifest_mismatch" ? "claim_only_manifest_mismatch" : "preview_credential_manifest_identity_mismatch");
  }

  const leakFindings = await scanTrackedFilesForSecrets({
    repositoryRoot,
    secrets: buildCredentialLeakScanEntries({ configuration, manifest })
  });
  if (leakFindings.length) {
    for (const finding of leakFindings) console.error(`Tracked credential leak detected: ${finding.file} (${finding.labels.join(", ")})`);
    stop("tracked_credential_leak_detected");
  }

  const { admin, createAnonClient } = createSupabaseClients(configuration);
  const registrar = accountByKey(manifest, "registrar");
  assertRegistrarManifestAgreement({ manifestRegistrar: registrar, configuration });
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
  const code = typeof error?.code === "string" && /^[a-z0-9_]+$/.test(error.code) ? error.code : "preview_credential_verification_failed";
  console.error(`Preview credential verification stopped: ${code}`);
  if (error.recoveryManifestPath) {
    console.error(`Recovery manifest: ${error.recoveryManifestPath}`);
    if (error.completeManifestPath) console.error(`Complete manifest: ${error.completeManifestPath}`);
    console.error("Resolve the recovery state and rerun preparation intentionally.");
  }
  process.exitCode = 1;
});
