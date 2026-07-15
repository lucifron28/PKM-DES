import { randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { ACCOUNT_DEMO_RECORDS, CLAIM_ONLY_DEMO_RECORD, DEMO_STUDENT_TYPE } from "../demo/demo-records.mjs";

const execFileAsync = promisify(execFile);

export const PREVIEW_CONFIRMATION = "PREPARE_PKM_DES_PREVIEW_CREDENTIALS";
export const MANIFEST_SCHEMA_VERSION = 1;
export const COMPLETE_MANIFEST_FILE = "preview-credentials.local.json";
export const PARTIAL_MANIFEST_FILE = "preview-credentials.partial.local.json";
export const ROTATABLE_KEYS = Object.freeze(["pending", "approved", "rejected"]);

export class PreviewRecoveryError extends Error {
  constructor(code, { recoveryManifestPath = null } = {}) {
    super(code);
    this.name = "PreviewRecoveryError";
    this.code = code;
    this.recoveryManifestWritten = Boolean(recoveryManifestPath);
    this.recoveryManifestPath = recoveryManifestPath;
  }
}

export function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function requireTrimmedValue(name, value) {
  if (!String(value ?? "").trim()) {
    throw new Error(`${name} is required.`);
  }

  return String(value).trim();
}

export function requireSecretValue(name, value) {
  const secret = String(value ?? "");
  if (!secret.trim()) throw new Error(`${name} is required.`);
  return secret;
}

export function validatePreviewTarget({ url, expectedHost }) {
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid URL.");
  }

  const normalizedExpectedHost = requireTrimmedValue("PREVIEW_EXPECTED_SUPABASE_HOST", expectedHost).toLowerCase();
  if (parsedUrl.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must use HTTPS.");
  }
  if (!parsedUrl.hostname.endsWith(".supabase.co")) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must target a .supabase.co host.");
  }
  if (parsedUrl.hostname.toLowerCase() !== normalizedExpectedHost) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL does not match PREVIEW_EXPECTED_SUPABASE_HOST.");
  }

  return parsedUrl.hostname.toLowerCase();
}

export function readPreviewConfiguration(environment = process.env) {
  const url = requireTrimmedValue("NEXT_PUBLIC_SUPABASE_URL", environment.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = requireSecretValue("NEXT_PUBLIC_SUPABASE_ANON_KEY", environment.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const serviceRoleKey = requireSecretValue("SUPABASE_SERVICE_ROLE_KEY", environment.SUPABASE_SERVICE_ROLE_KEY);
  const registrarEmail = normalizeEmail(requireTrimmedValue("PREVIEW_REGISTRAR_EMAIL", environment.PREVIEW_REGISTRAR_EMAIL));
  const registrarPassword = requireSecretValue("PREVIEW_REGISTRAR_PASSWORD", environment.PREVIEW_REGISTRAR_PASSWORD);
  const targetHost = validatePreviewTarget({
    url,
    expectedHost: environment.PREVIEW_EXPECTED_SUPABASE_HOST
  });

  return {
    url,
    anonKey,
    serviceRoleKey,
    registrarEmail,
    registrarPassword,
    targetHost,
    confirmation: environment.PREVIEW_CREDENTIALS_CONFIRM ?? ""
  };
}

export function assertApplyConfirmation({ apply, confirmation }) {
  if (!apply) {
    return false;
  }
  if (confirmation !== PREVIEW_CONFIRMATION) {
    throw new Error("PREVIEW_CREDENTIALS_CONFIRM must equal PREPARE_PKM_DES_PREVIEW_CREDENTIALS when using --apply.");
  }
  return true;
}

export function generatePreviewPassword() {
  return randomBytes(24).toString("base64url");
}

export function createPasswordPlan(records = ACCOUNT_DEMO_RECORDS, generatePassword = generatePreviewPassword) {
  const keys = records.map((record) => record.key);
  const keysAreExact = keys.length === ROTATABLE_KEYS.length && new Set(keys).size === keys.length && ROTATABLE_KEYS.every((key) => keys.includes(key));
  if (!keysAreExact || records.some((record) => !record.hasAccount || record.key === CLAIM_ONLY_DEMO_RECORD.key)) {
    throw new Error("The account-backed preview allowlist is incomplete or invalid.");
  }

  const passwords = new Set();
  const accounts = ROTATABLE_KEYS.map((key) => records.find((record) => record.key === key)).map((record) => {
    let password = generatePassword();
    while (passwords.has(password)) password = generatePassword();
    passwords.add(password);
    return { record, password };
  });

  const claimOnlyPassword = generatePassword();
  if (passwords.has(claimOnlyPassword)) {
    throw new Error("The generated claim-only password was not unique.");
  }

  return { accounts, claimOnlyPassword };
}

export function getManifestPaths(repositoryRoot) {
  const root = path.resolve(repositoryRoot);
  const previewDirectory = path.resolve(root, ".preview");
  return {
    previewDirectory,
    complete: path.resolve(previewDirectory, COMPLETE_MANIFEST_FILE),
    partial: path.resolve(previewDirectory, PARTIAL_MANIFEST_FILE)
  };
}

export function validateManifestPath(repositoryRoot, candidatePath) {
  const { previewDirectory } = getManifestPaths(repositoryRoot);
  const resolvedPath = path.resolve(candidatePath);
  const allowedPaths = new Set(Object.values(getManifestPaths(repositoryRoot)).filter((value) => value !== previewDirectory));

  if (path.dirname(resolvedPath) !== previewDirectory || !allowedPaths.has(resolvedPath)) {
    throw new Error("Credential manifests must use an approved path inside .preview.");
  }

  return resolvedPath;
}

export function maskEmail(email) {
  const [localPart, domain] = normalizeEmail(email).split("@");
  if (!domain) return "[private identity]";
  return `${localPart.slice(0, 1) || "*"}***@${domain}`;
}

export function redactedPlanSummary({ targetHost, accountKeys, registrarEmail }) {
  return {
    targetHost,
    registrar: maskEmail(registrarEmail),
    accounts: accountKeys.map((key) => `${key} student`),
    claimOnly: "claim-only record"
  };
}

function assertExactKeys(value, allowedKeys) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Credential manifest has an unsupported schema.");
  const keys = Object.keys(value);
  if (keys.length !== allowedKeys.length || keys.some((key) => !allowedKeys.includes(key))) {
    throw new Error("Credential manifest contains an unsupported field.");
  }
}

function assertManifestAccount(account, expectedKey) {
  const isRegistrar = expectedKey === "registrar";
  assertExactKeys(account, isRegistrar ? ["key", "role", "email", "password"] : ["key", "role", "demoState", "email", "studentIdNumber", "password"]);
  if ([account.key, account.role, account.email, account.password].some((value) => typeof value !== "string" || !value)) {
    throw new Error("Credential manifest is missing a required account.");
  }
  if (account.key !== expectedKey || account.role !== (isRegistrar ? "Registrar/Admin" : "Student")) throw new Error("Credential manifest contains an invalid account.");
  if (!isRegistrar && (typeof account.studentIdNumber !== "string" || !account.studentIdNumber || typeof account.demoState !== "string")) {
    throw new Error("Credential manifest is missing a required student identifier.");
  }
}

export function validateCredentialManifest(manifest, { allowPartial = false } = {}) {
  if (!manifest || manifest.schemaVersion !== MANIFEST_SCHEMA_VERSION || typeof manifest.targetHost !== "string") {
    throw new Error("Credential manifest has an unsupported schema.");
  }
  if (manifest.partial && !allowPartial) {
    throw new Error("A partial credential manifest cannot be verified as a complete preview set.");
  }
  const partial = manifest.partial === true;
  assertExactKeys(
    manifest,
    partial
      ? ["schemaVersion", "partial", "generatedAt", "targetHost", "warning", "completedStudentKeys", "accounts"]
      : ["schemaVersion", "generatedAt", "targetHost", "warning", "accounts", "claimOnly"]
  );
  if (!Array.isArray(manifest.accounts)) throw new Error("Credential manifest has an unsupported schema.");
  const accountKeys = manifest.accounts.map((account) => account.key);
  if (new Set(accountKeys).size !== accountKeys.length) {
    throw new Error("Credential manifest contains duplicate account keys.");
  }

  const completedStudentKeys = partial ? manifest.completedStudentKeys : ROTATABLE_KEYS;
  if (!Array.isArray(completedStudentKeys) || (partial && completedStudentKeys.length === 0) || new Set(completedStudentKeys).size !== completedStudentKeys.length || completedStudentKeys.some((key) => !ROTATABLE_KEYS.includes(key))) {
    throw new Error("Credential manifest contains invalid student account keys.");
  }
  const requiredKeys = ["registrar", ...completedStudentKeys];
  const keysAreExact = accountKeys.length === requiredKeys.length && requiredKeys.every((key) => accountKeys.includes(key));
  if (!keysAreExact) throw new Error("Credential manifest is missing required preview identities.");
  for (const key of requiredKeys) {
    assertManifestAccount(manifest.accounts.find((account) => account.key === key), key);
  }

  if (!partial) {
    assertExactKeys(manifest.claimOnly, ["email", "studentIdNumber", "studentType", "passwordForLiveClaim", "activeBeforeClaim", "instruction"]);
    if (!keysAreExact || typeof manifest.claimOnly.email !== "string" || typeof manifest.claimOnly.studentIdNumber !== "string" || typeof manifest.claimOnly.passwordForLiveClaim !== "string" || manifest.claimOnly.activeBeforeClaim !== false) {
      throw new Error("Credential manifest is missing required preview identities.");
    }
    assertCompleteManifestIdentityAgreement(manifest);
  } else {
    assertPartialManifestIdentityAgreement(manifest);
  }

  return manifest;
}

export function createCompleteManifest({ targetHost, registrarEmail, registrarPassword, accountPasswords, claimOnlyPassword }) {
  return {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    targetHost,
    warning: "Private temporary preview credentials. Do not commit or share publicly.",
    accounts: [
      { key: "registrar", role: "Registrar/Admin", email: registrarEmail, password: registrarPassword },
      ...accountPasswords.map(({ record, password }) => ({
        key: record.key,
        role: "Student",
        demoState: record.reviewStatus,
        email: record.email,
        studentIdNumber: record.studentIdNumber,
        password
      }))
    ],
    claimOnly: {
      email: CLAIM_ONLY_DEMO_RECORD.email,
      studentIdNumber: CLAIM_ONLY_DEMO_RECORD.studentIdNumber,
      studentType: "Incoming 1st Year Student",
      passwordForLiveClaim: claimOnlyPassword,
      activeBeforeClaim: false,
      instruction: "Use during live account claim; not active before the claim step."
    }
  };
}

export function createPartialManifest({ targetHost, registrarEmail, registrarPassword, successfulUpdates }) {
  return {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    partial: true,
    generatedAt: new Date().toISOString(),
    targetHost,
    warning: "Private recovery credentials. Resolve the failed account before preparing a complete preview set.",
    completedStudentKeys: successfulUpdates.map(({ record }) => record.key),
    accounts: [
      { key: "registrar", role: "Registrar/Admin", email: registrarEmail, password: registrarPassword },
      ...successfulUpdates.map(({ record, password }) => ({
        key: record.key,
        role: "Student",
        demoState: record.reviewStatus,
        email: record.email,
        studentIdNumber: record.studentIdNumber,
        password
      }))
    ]
  };
}

export function assertCompleteManifestIdentityAgreement(manifest) {
  for (const record of ACCOUNT_DEMO_RECORDS) {
    const account = manifest.accounts.find((candidate) => candidate.key === record.key);
    if (!account || account.email !== record.email || account.studentIdNumber !== record.studentIdNumber || account.demoState !== record.reviewStatus) {
      throw new Error("preview_credential_manifest_identity_mismatch");
    }
  }
  if (
    manifest.claimOnly.email !== CLAIM_ONLY_DEMO_RECORD.email ||
    manifest.claimOnly.studentIdNumber !== CLAIM_ONLY_DEMO_RECORD.studentIdNumber ||
    manifest.claimOnly.studentType !== DEMO_STUDENT_TYPE ||
    manifest.claimOnly.activeBeforeClaim !== false ||
    typeof manifest.claimOnly.passwordForLiveClaim !== "string" ||
    !manifest.claimOnly.passwordForLiveClaim.trim() ||
    typeof manifest.claimOnly.instruction !== "string" ||
    !manifest.claimOnly.instruction.trim()
  ) {
    throw new Error("claim_only_manifest_mismatch");
  }
}

export function assertPartialManifestIdentityAgreement(manifest) {
  const includedKeys = manifest.accounts.filter((account) => account.key !== "registrar").map((account) => account.key);
  if (includedKeys.length !== manifest.completedStudentKeys.length || includedKeys.some((key) => !manifest.completedStudentKeys.includes(key))) {
    throw new Error("preview_credential_recovery_manifest_mismatch");
  }
  for (const key of includedKeys) {
    const record = ACCOUNT_DEMO_RECORDS.find((candidate) => candidate.key === key);
    const account = manifest.accounts.find((candidate) => candidate.key === key);
    if (!record || account.email !== record.email || account.studentIdNumber !== record.studentIdNumber || account.demoState !== record.reviewStatus) {
      throw new Error("preview_credential_recovery_manifest_mismatch");
    }
  }
}

async function commandSucceeds(command, args, options) {
  try {
    await execFileAsync(command, args, options);
    return true;
  } catch (error) {
    if (error.code === 1) return false;
    throw error;
  }
}

export async function assertManifestGitSafety({ repositoryRoot, manifestPath }) {
  const outputPath = validateManifestPath(repositoryRoot, manifestPath);
  const relativePath = path.relative(repositoryRoot, outputPath);
  const ignored = await commandSucceeds("git", ["check-ignore", "-q", "--", relativePath], { cwd: repositoryRoot });
  const tracked = await commandSucceeds("git", ["ls-files", "--error-unmatch", "--", relativePath], { cwd: repositoryRoot });

  if (!ignored || tracked) {
    throw new Error("Credential manifest path is not safely ignored by Git.");
  }

  return outputPath;
}

export async function inspectPreviewManifestState({ repositoryRoot, fsApi = fs, assertGitSafety = assertManifestGitSafety }) {
  const paths = getManifestPaths(repositoryRoot);
  await assertGitSafety({ repositoryRoot, manifestPath: paths.complete });
  await assertGitSafety({ repositoryRoot, manifestPath: paths.partial });
  let directory;
  try {
    directory = await fsApi.lstat(paths.previewDirectory);
  } catch (error) {
    if (error.code === "ENOENT") return { state: "none", paths };
    throw error;
  }
  if (directory.isSymbolicLink?.() || !directory.isDirectory?.()) throw new Error("credential_manifest_storage_not_directory");
  const complete = Boolean(await inspectManifestDestination(paths.complete, fsApi));
  const partial = Boolean(await inspectManifestDestination(paths.partial, fsApi));
  return { state: complete && partial ? "conflict" : complete ? "complete" : partial ? "partial" : "none", paths };
}

async function assertSafePreviewDirectory(previewDirectory, fsApi = fs) {
  await fsApi.mkdir(previewDirectory, { recursive: true });
  const stat = await fsApi.lstat(previewDirectory);
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error("The .preview directory must be a real directory, not a symbolic link.");
  }
}

function assertRegularManifestDestination(stat) {
  if (stat.isSymbolicLink?.() || !stat.isFile?.()) throw new Error("credential_manifest_destination_not_regular");
}

async function inspectManifestDestination(destination, fsApi = fs) {
  try {
    const stat = await fsApi.lstat(destination);
    assertRegularManifestDestination(stat);
    return stat;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function atomicReplaceFile({ destination, contents, fsApi = fs, temporaryPath }) {
  try {
    await fsApi.writeFile(temporaryPath, contents, { encoding: "utf8", mode: 0o600, flag: "wx" });
    await fsApi.chmod(temporaryPath, 0o600).catch(() => undefined);
    await fsApi.rename(temporaryPath, destination);
    await fsApi.chmod(destination, 0o600).catch(() => undefined);
  } finally {
    await fsApi.rm(temporaryPath, { force: true }).catch(() => undefined);
  }
}

async function probeManifestStorage({ previewDirectory, overwriteExisting, fsApi = fs }) {
  const suffix = randomBytes(12).toString("hex");
  const destination = path.join(previewDirectory, `.preview-credentials-probe-${suffix}.destination`);
  const temporary = path.join(previewDirectory, `.preview-credentials-probe-${suffix}.temporary`);
  try {
    if (overwriteExisting) await fsApi.writeFile(destination, "preview-credential-existing-probe\n", { encoding: "utf8", mode: 0o600, flag: "wx" });
    await atomicReplaceFile({
      destination,
      contents: "preview-credential-replacement-probe\n",
      fsApi,
      temporaryPath: temporary
    });
    const contents = await fsApi.readFile(destination, "utf8");
    if (contents !== "preview-credential-replacement-probe\n") throw new Error("credential_manifest_storage_probe_failed");
  } finally {
    await fsApi.rm(temporary, { force: true }).catch(() => undefined);
    await fsApi.rm(destination, { force: true }).catch(() => undefined);
  }
}

export async function preflightManifestStorage({ repositoryRoot, overwrite = false, fsApi = fs, assertGitSafety = assertManifestGitSafety }) {
  const paths = getManifestPaths(repositoryRoot);
  await assertGitSafety({ repositoryRoot, manifestPath: paths.complete });
  await assertGitSafety({ repositoryRoot, manifestPath: paths.partial });
  await assertSafePreviewDirectory(paths.previewDirectory, fsApi);
  const completeExists = Boolean(await inspectManifestDestination(paths.complete, fsApi));
  const partialExists = Boolean(await inspectManifestDestination(paths.partial, fsApi));
  if (!overwrite && (completeExists || partialExists)) {
    throw new Error("A credential manifest already exists. Use --overwrite only when intentionally replacing it.");
  }

  await probeManifestStorage({ previewDirectory: paths.previewDirectory, overwriteExisting: overwrite && (completeExists || partialExists), fsApi });
  return { paths, completeExists, partialExists };
}

export async function writePrivateManifest({ repositoryRoot, manifestPath, manifest, overwrite = false, fsApi = fs }) {
  const outputPath = await assertManifestGitSafety({ repositoryRoot, manifestPath });
  const previewDirectory = path.dirname(outputPath);
  await assertSafePreviewDirectory(previewDirectory, fsApi);

  try {
    const existing = await fsApi.lstat(outputPath);
    assertRegularManifestDestination(existing);
    if (!overwrite) throw new Error("A credential manifest already exists. Use --overwrite only when intentionally replacing it.");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const temporaryPath = path.join(previewDirectory, `.preview-credentials-${randomBytes(12).toString("hex")}.tmp`);
  await atomicReplaceFile({ destination: outputPath, contents: `${JSON.stringify(manifest, null, 2)}\n`, fsApi, temporaryPath });

  return outputPath;
}

export async function removePrivateManifest({ repositoryRoot, manifestPath, fsApi = fs }) {
  const outputPath = await assertManifestGitSafety({ repositoryRoot, manifestPath });
  const exists = await inspectManifestDestination(outputPath, fsApi);
  if (exists) await fsApi.rm(outputPath, { force: true });
}

export async function rotatePreviewPasswords({ accounts, updatePassword, createComplete, writeComplete, createPartial, writePartial, removeComplete, removePartial }) {
  const successfulUpdates = [];
  try {
    for (const account of accounts) {
      await updatePassword(account);
      successfulUpdates.push(account);
    }
    await writeComplete(createComplete(successfulUpdates));
    await removePartial();
    return { kind: "complete", successfulUpdates };
  } catch (error) {
    const failureCode = typeof error?.code === "string" && /^[a-z0-9_]+$/.test(error.code) ? error.code : "preview_credential_preparation_failed";
    if (successfulUpdates.length) {
      try {
        await writePartial(createPartial(successfulUpdates));
      } catch {
        throw new PreviewRecoveryError("credential_recovery_write_failed");
      }
      try {
        await removeComplete();
      } catch {
        throw new PreviewRecoveryError("credential_recovery_complete_invalidation_failed", { recoveryManifestPath: ".preview/preview-credentials.partial.local.json" });
      }
      throw new PreviewRecoveryError(failureCode, { recoveryManifestPath: ".preview/preview-credentials.partial.local.json" });
    }
    throw new PreviewRecoveryError(failureCode);
  }
}

export async function readPrivateManifest({ repositoryRoot, manifestPath }) {
  const outputPath = await assertManifestGitSafety({ repositoryRoot, manifestPath });
  await inspectManifestDestination(outputPath);
  let parsed;
  try {
    parsed = JSON.parse(await fs.readFile(outputPath, "utf8"));
  } catch {
    throw new Error("Credential manifest could not be read.");
  }
  return validateCredentialManifest(parsed);
}

export function assertClaimOnlyReady({ officialRecords, authUsers, profiles, students, enrollments }) {
  const record = officialRecords?.[0];
  if (
    !Array.isArray(officialRecords) ||
    officialRecords.length !== 1 ||
    normalizeEmail(record.email) !== normalizeEmail(CLAIM_ONLY_DEMO_RECORD.email) ||
    record.student_id_number !== CLAIM_ONLY_DEMO_RECORD.studentIdNumber ||
    !Array.isArray(authUsers) || authUsers.length !== 0 ||
    !Array.isArray(profiles) || profiles.length !== 0 ||
    !Array.isArray(students) || students.length !== 0 ||
    !Array.isArray(enrollments) || enrollments.length !== 0
  ) {
    throw new Error("claim_only_readiness_failed");
  }
}

export async function getTrackedFiles(repositoryRoot) {
  const { stdout } = await execFileAsync("git", ["ls-files", "-z"], { cwd: repositoryRoot, encoding: "buffer", maxBuffer: 10 * 1024 * 1024 });
  return stdout.toString("utf8").split("\0").filter(Boolean);
}

export async function scanTrackedFilesForSecrets({ repositoryRoot, secrets }) {
  const trackedFiles = await getTrackedFiles(repositoryRoot);
  const entries = Object.entries(secrets).filter(([, value]) => typeof value === "string" && value.length > 0);
  const findings = [];

  for (const file of trackedFiles) {
    const contents = await fs.readFile(path.join(repositoryRoot, file));
    const labels = entries.filter(([, value]) => contents.includes(Buffer.from(value))).map(([label]) => label);
    if (labels.length) findings.push({ file, labels });
  }

  return findings;
}

export function buildCredentialLeakScanEntries({ configuration, manifest }) {
  const accounts = new Map(manifest.accounts.map((account) => [account.key, account]));
  return {
    registrar_environment_password: configuration.registrarPassword,
    registrar_manifest_password: accounts.get("registrar")?.password ?? "",
    registrar_email: configuration.registrarEmail,
    service_role_key: configuration.serviceRoleKey,
    account_claim_secret: process.env.ACCOUNT_CLAIM_SECRET ?? "",
    pending_student_password: accounts.get("pending")?.password ?? "",
    approved_student_password: accounts.get("approved")?.password ?? "",
    rejected_student_password: accounts.get("rejected")?.password ?? "",
    claim_only_password: manifest.claimOnly?.passwordForLiveClaim ?? ""
  };
}

export function assertRegistrarManifestAgreement({ manifestRegistrar, configuration }) {
  if (
    !manifestRegistrar ||
    normalizeEmail(manifestRegistrar.email) !== configuration.registrarEmail ||
    manifestRegistrar.password !== configuration.registrarPassword
  ) {
    throw new Error("registrar_manifest_mismatch");
  }
}

export function createSupabaseClients(configuration) {
  const options = { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } };
  return {
    admin: createClient(configuration.url, configuration.serviceRoleKey, options),
    createAnonClient: () => createClient(configuration.url, configuration.anonKey, options)
  };
}
