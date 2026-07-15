import { randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { ACCOUNT_DEMO_RECORDS, CLAIM_ONLY_DEMO_RECORD } from "../demo/demo-records.mjs";

const execFileAsync = promisify(execFile);

export const PREVIEW_CONFIRMATION = "PREPARE_PKM_DES_PREVIEW_CREDENTIALS";
export const MANIFEST_SCHEMA_VERSION = 1;
export const COMPLETE_MANIFEST_FILE = "preview-credentials.local.json";
export const PARTIAL_MANIFEST_FILE = "preview-credentials.partial.local.json";
export const ROTATABLE_KEYS = Object.freeze(["pending", "approved", "rejected"]);

export function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function requireValue(name, value) {
  if (!String(value ?? "").trim()) {
    throw new Error(`${name} is required.`);
  }

  return String(value).trim();
}

export function validatePreviewTarget({ url, expectedHost }) {
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid URL.");
  }

  const normalizedExpectedHost = requireValue("PREVIEW_EXPECTED_SUPABASE_HOST", expectedHost).toLowerCase();
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
  const url = requireValue("NEXT_PUBLIC_SUPABASE_URL", environment.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = requireValue("NEXT_PUBLIC_SUPABASE_ANON_KEY", environment.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const serviceRoleKey = requireValue("SUPABASE_SERVICE_ROLE_KEY", environment.SUPABASE_SERVICE_ROLE_KEY);
  const registrarEmail = normalizeEmail(requireValue("PREVIEW_REGISTRAR_EMAIL", environment.PREVIEW_REGISTRAR_EMAIL));
  const registrarPassword = requireValue("PREVIEW_REGISTRAR_PASSWORD", environment.PREVIEW_REGISTRAR_PASSWORD);
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
  const rotatableRecords = records.filter((record) => ROTATABLE_KEYS.includes(record.key));
  if (rotatableRecords.length !== ROTATABLE_KEYS.length || rotatableRecords.some((record) => !record.hasAccount)) {
    throw new Error("The account-backed preview allowlist is incomplete or invalid.");
  }

  const passwords = new Set();
  const accounts = rotatableRecords.map((record) => {
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

function isForbiddenManifestKey(key) {
  const normalized = key.toLowerCase();
  return normalized.includes("service") || normalized.includes("token") || normalized === "userid" || normalized === "profileid" || normalized === "authuserid";
}

function assertNoForbiddenManifestFields(value) {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (isForbiddenManifestKey(key)) {
      throw new Error("Credential manifest contains a prohibited secret or identity field.");
    }
    assertNoForbiddenManifestFields(child);
  }
}

function assertManifestAccount(account, expectedKey) {
  if (!account || account.key !== expectedKey || !account.role || !account.email || !account.password) {
    throw new Error("Credential manifest is missing a required account.");
  }
}

export function validateCredentialManifest(manifest, { allowPartial = false } = {}) {
  if (!manifest || manifest.schemaVersion !== MANIFEST_SCHEMA_VERSION || typeof manifest.targetHost !== "string") {
    throw new Error("Credential manifest has an unsupported schema.");
  }
  if (manifest.partial && !allowPartial) {
    throw new Error("A partial credential manifest cannot be verified as a complete preview set.");
  }

  assertNoForbiddenManifestFields(manifest);
  const accountKeys = manifest.accounts?.map((account) => account.key) ?? [];
  if (new Set(accountKeys).size !== accountKeys.length) {
    throw new Error("Credential manifest contains duplicate account keys.");
  }

  const requiredKeys = manifest.partial ? ["registrar", ...(manifest.completedStudentKeys ?? [])] : ["registrar", ...ROTATABLE_KEYS];
  for (const key of requiredKeys) {
    assertManifestAccount(manifest.accounts.find((account) => account.key === key), key);
  }

  if (!manifest.partial) {
    const keysAreExact = accountKeys.length === requiredKeys.length && requiredKeys.every((key) => accountKeys.includes(key));
    if (!keysAreExact || !manifest.claimOnly?.email || !manifest.claimOnly?.studentIdNumber || !manifest.claimOnly?.passwordForLiveClaim) {
      throw new Error("Credential manifest is missing required preview identities.");
    }
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

async function assertSafePreviewDirectory(previewDirectory) {
  await fs.mkdir(previewDirectory, { recursive: true });
  const stat = await fs.lstat(previewDirectory);
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error("The .preview directory must be a real directory, not a symbolic link.");
  }
}

export async function writePrivateManifest({ repositoryRoot, manifestPath, manifest, overwrite = false }) {
  const outputPath = await assertManifestGitSafety({ repositoryRoot, manifestPath });
  const previewDirectory = path.dirname(outputPath);
  await assertSafePreviewDirectory(previewDirectory);

  try {
    const existing = await fs.lstat(outputPath);
    if (existing.isSymbolicLink()) throw new Error("Credential manifest path cannot be a symbolic link.");
    if (!overwrite) throw new Error("A credential manifest already exists. Use --overwrite only when intentionally replacing it.");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const temporaryPath = path.join(previewDirectory, `.preview-credentials-${randomBytes(12).toString("hex")}.tmp`);
  try {
    await fs.writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
    await fs.chmod(temporaryPath, 0o600).catch(() => undefined);
    await fs.rename(temporaryPath, outputPath);
    await fs.chmod(outputPath, 0o600).catch(() => undefined);
  } finally {
    await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
  }

  return outputPath;
}

export async function readPrivateManifest({ repositoryRoot, manifestPath }) {
  const outputPath = await assertManifestGitSafety({ repositoryRoot, manifestPath });
  let parsed;
  try {
    parsed = JSON.parse(await fs.readFile(outputPath, "utf8"));
  } catch {
    throw new Error("Credential manifest could not be read.");
  }
  return validateCredentialManifest(parsed);
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

export function createSupabaseClients(configuration) {
  const options = { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } };
  return {
    admin: createClient(configuration.url, configuration.serviceRoleKey, options),
    createAnonClient: () => createClient(configuration.url, configuration.anonKey, options)
  };
}
