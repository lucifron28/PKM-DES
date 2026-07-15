import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { ACCOUNT_DEMO_RECORDS, CLAIM_ONLY_DEMO_RECORD } from "../demo/demo-records.mjs";
import {
  COMPLETE_MANIFEST_FILE,
  PARTIAL_MANIFEST_FILE,
  assertRegistrarManifestAgreement,
  assertClaimOnlyReady,
  buildCredentialLeakScanEntries,
  createCompleteManifest,
  createPasswordPlan,
  getManifestPaths,
  preflightManifestStorage,
  readPreviewConfiguration,
  rotatePreviewPasswords,
  validateCredentialManifest,
  validateManifestPath,
  validatePreviewTarget
} from "./credential-utils.mjs";

async function temporaryRepository() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "pkm-preview-credentials-"));
  return root;
}

function safeGitSafety({ manifestPath }) {
  return Promise.resolve(manifestPath);
}

function plan() {
  let sequence = 0;
  return createPasswordPlan(ACCOUNT_DEMO_RECORDS, () => `private-password-${sequence++}-long-enough`);
}

function completeManifest() {
  const passwordPlan = plan();
  return createCompleteManifest({
    targetHost: "preview.supabase.co",
    registrarEmail: "registrar.private@example.test",
    registrarPassword: " registrar-password-with-spaces ",
    accountPasswords: passwordPlan.accounts,
    claimOnlyPassword: passwordPlan.claimOnlyPassword
  });
}

test("accepts only the exact HTTPS Supabase target host", () => {
  assert.equal(validatePreviewTarget({ url: "https://preview-id.supabase.co", expectedHost: "preview-id.supabase.co" }), "preview-id.supabase.co");
  assert.throws(() => validatePreviewTarget({ url: "https://other.supabase.co", expectedHost: "preview-id.supabase.co" }));
  assert.throws(() => validatePreviewTarget({ url: "http://preview-id.supabase.co", expectedHost: "preview-id.supabase.co" }));
});

test("preserves secret characters while normalizing email", () => {
  const configuration = readPreviewConfiguration({
    NEXT_PUBLIC_SUPABASE_URL: " https://preview-id.supabase.co ",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: " anon key ",
    SUPABASE_SERVICE_ROLE_KEY: " service role key ",
    PREVIEW_EXPECTED_SUPABASE_HOST: " PREVIEW-ID.SUPABASE.CO ",
    PREVIEW_REGISTRAR_EMAIL: " Registrar@Example.test ",
    PREVIEW_REGISTRAR_PASSWORD: " password with intentional spaces "
  });
  assert.equal(configuration.registrarEmail, "registrar@example.test");
  assert.equal(configuration.anonKey, " anon key ");
  assert.equal(configuration.serviceRoleKey, " service role key ");
  assert.equal(configuration.registrarPassword, " password with intentional spaces ");
});

test("requires exactly the three account-backed allowlisted students", () => {
  assert.equal(plan().accounts.length, 3);
  for (const invalidRecords of [
    ACCOUNT_DEMO_RECORDS.slice(0, 2),
    [...ACCOUNT_DEMO_RECORDS, ACCOUNT_DEMO_RECORDS[0]],
    [...ACCOUNT_DEMO_RECORDS, { ...ACCOUNT_DEMO_RECORDS[0], key: "other" }],
    [...ACCOUNT_DEMO_RECORDS, CLAIM_ONLY_DEMO_RECORD]
  ]) {
    assert.throws(() => createPasswordPlan(invalidRecords));
  }
});

test("existing complete or partial manifests stop storage preflight before mutation", async () => {
  const root = await temporaryRepository();
  const paths = getManifestPaths(root);
  await fs.mkdir(paths.previewDirectory);
  await fs.writeFile(paths.complete, "old");
  await assert.rejects(preflightManifestStorage({ repositoryRoot: root, assertGitSafety: safeGitSafety }));
  await fs.rm(paths.complete);
  await fs.writeFile(paths.partial, "old");
  await assert.rejects(preflightManifestStorage({ repositoryRoot: root, assertGitSafety: safeGitSafety }));
  await assert.doesNotReject(preflightManifestStorage({ repositoryRoot: root, overwrite: true, assertGitSafety: safeGitSafety }));
  await fs.rm(root, { recursive: true, force: true });
});

test("unsafe symlink destinations stop storage preflight and overwrite permits regular destinations", async () => {
  const root = await temporaryRepository();
  const paths = getManifestPaths(root);
  const fsApi = {
    ...fs,
    lstat: async (candidate) => {
      if (candidate === paths.previewDirectory) return { isSymbolicLink: () => true, isDirectory: () => true };
      return fs.lstat(candidate);
    }
  };
  await assert.rejects(preflightManifestStorage({ repositoryRoot: root, fsApi, assertGitSafety: safeGitSafety }));
  const destinationFsApi = {
    ...fs,
    lstat: async (candidate) => {
      if (candidate === paths.complete) return { isSymbolicLink: () => true, isDirectory: () => false };
      return fs.lstat(candidate);
    }
  };
  await assert.rejects(preflightManifestStorage({ repositoryRoot: root, fsApi: destinationFsApi, assertGitSafety: safeGitSafety }));
  await fs.mkdir(paths.previewDirectory, { recursive: true });
  await fs.writeFile(paths.complete, "old");
  await assert.doesNotReject(preflightManifestStorage({ repositoryRoot: root, overwrite: true, assertGitSafety: safeGitSafety }));
  await fs.rm(root, { recursive: true, force: true });
});

test("non-regular destinations and replacement failures stop before an update callback can begin", async () => {
  const root = await temporaryRepository();
  const paths = getManifestPaths(root);
  await fs.mkdir(paths.previewDirectory, { recursive: true });
  await fs.mkdir(paths.complete);
  let updated = false;
  await assert.rejects(preflightManifestStorage({ repositoryRoot: root, overwrite: true, assertGitSafety: safeGitSafety }));
  assert.equal(updated, false);
  await fs.rm(paths.complete, { recursive: true });
  await fs.writeFile(paths.complete, "preserve-me");
  const replacementFailureFs = { ...fs, rename: async () => { throw new Error("replacement unavailable"); } };
  await assert.rejects(preflightManifestStorage({ repositoryRoot: root, overwrite: true, fsApi: replacementFailureFs, assertGitSafety: safeGitSafety }));
  assert.equal(await fs.readFile(paths.complete, "utf8"), "preserve-me");
  assert.equal(updated, false);
  await fs.rm(root, { recursive: true, force: true });
});

test("rotation failures write only completed recovery credentials", async () => {
  const accounts = plan().accounts;
  const partials = [];
  let removedComplete = false;
  await assert.rejects(rotatePreviewPasswords({
    accounts,
    updatePassword: async (account) => {
      if (account.record.key === "approved") throw new Error("update failed");
    },
    createComplete: () => ({}),
    writeComplete: async () => {},
    createPartial: (successful) => successful.map((item) => item.record.key),
    writePartial: async (partial) => partials.push(partial),
    removeComplete: async () => { removedComplete = true; },
    removePartial: async () => {}
  }));
  assert.deepEqual(partials, [["pending"]]);
  assert.equal(removedComplete, true);
});

test("complete-manifest failure recovers every rotated student, while pre-update failure creates no recovery", async () => {
  const accounts = plan().accounts;
  const partials = [];
  await assert.rejects(rotatePreviewPasswords({
    accounts,
    updatePassword: async () => {},
    createComplete: () => { throw new Error("manifest creation failed"); },
    writeComplete: async () => {},
    createPartial: (successful) => successful.map((item) => item.record.key),
    writePartial: async (partial) => partials.push(partial),
    removeComplete: async () => {},
    removePartial: async () => {}
  }));
  assert.deepEqual(partials, [["pending", "approved", "rejected"]]);
  const noRecovery = [];
  await assert.rejects(rotatePreviewPasswords({
    accounts,
    updatePassword: async () => { throw new Error("first update failed"); },
    createComplete: () => ({}), writeComplete: async () => {}, createPartial: () => ({}),
    writePartial: async (partial) => noRecovery.push(partial), removeComplete: async () => {}, removePartial: async () => {}
  }));
  assert.deepEqual(noRecovery, []);
});

test("complete-manifest write failure after all updates writes full recovery and invalidates stale output", async () => {
  const partials = [];
  let removedComplete = false;
  await assert.rejects(rotatePreviewPasswords({
    accounts: plan().accounts,
    updatePassword: async () => {},
    createComplete: (successful) => successful,
    writeComplete: async () => { throw new Error("complete write failed"); },
    createPartial: (successful) => successful.map((item) => item.record.key),
    writePartial: async (partial) => partials.push(partial),
    removeComplete: async () => { removedComplete = true; },
    removePartial: async () => {}
  }));
  assert.deepEqual(partials, [["pending", "approved", "rejected"]]);
  assert.equal(removedComplete, true);
});

test("complete success stores a complete set and removes stale partial output", async () => {
  const writes = [];
  let removedPartial = false;
  const result = await rotatePreviewPasswords({
    accounts: plan().accounts,
    updatePassword: async () => {},
    createComplete: (successful) => successful.map((item) => item.record.key),
    writeComplete: async (complete) => writes.push(complete),
    createPartial: () => ({}), writePartial: async () => {}, removeComplete: async () => {},
    removePartial: async () => { removedPartial = true; }
  });
  assert.equal(result.kind, "complete");
  assert.deepEqual(writes, [["pending", "approved", "rejected"]]);
  assert.equal(removedPartial, true);
});

test("strict manifest schema rejects unknown identity, token, key, and password fields", () => {
  const manifest = completeManifest();
  assert.equal(validateCredentialManifest(manifest).schemaVersion, 1);
  for (const field of ["userId", "user_id", "profileId", "profile_id", "authUserId", "auth_user_id", "studentRowId", "student_row_id", "enrollmentId", "enrollment_id", "accessToken", "refreshToken", "serviceRoleKey", "anonKey", "accountClaimSecret", "databasePassword", "database_password", "vercelToken"]) {
    assert.throws(() => validateCredentialManifest({ ...manifest, [field]: "blocked" }));
  }
  assert.throws(() => validateCredentialManifest({ ...manifest, accounts: "not-an-array" }));
  assert.throws(() => validateCredentialManifest({ ...manifest, accounts: [{ ...manifest.accounts[0], role: "Student" }, ...manifest.accounts.slice(1)] }));
  assert.throws(() => validateCredentialManifest({ ...manifest, claimOnly: { ...manifest.claimOnly, activeBeforeClaim: true } }));
});

test("leak scan entries keep environment and manifest registrar passwords distinct", () => {
  const manifest = completeManifest();
  const entries = buildCredentialLeakScanEntries({
    configuration: { registrarPassword: "env-password", registrarEmail: "registrar.private@example.test", serviceRoleKey: "service-key" },
    manifest
  });
  assert.equal(entries.registrar_environment_password, "env-password");
  assert.equal(entries.registrar_manifest_password, " registrar-password-with-spaces ");
  assert.equal(Object.keys(entries).length, 9);
});

test("Registrar environment and manifest passwords must agree exactly", () => {
  const manifest = completeManifest();
  const registrar = manifest.accounts.find((account) => account.key === "registrar");
  assert.doesNotThrow(() => assertRegistrarManifestAgreement({
    manifestRegistrar: registrar,
    configuration: { registrarEmail: "registrar.private@example.test", registrarPassword: " registrar-password-with-spaces " }
  }));
  assert.throws(() => assertRegistrarManifestAgreement({
    manifestRegistrar: registrar,
    configuration: { registrarEmail: "registrar.private@example.test", registrarPassword: "registrar-password-with-spaces" }
  }));
});

test("claim-only readiness requires one official record and no account or enrollment state", () => {
  const ready = {
    officialRecords: [{ email: CLAIM_ONLY_DEMO_RECORD.email, student_id_number: CLAIM_ONLY_DEMO_RECORD.studentIdNumber }],
    authUsers: [], profiles: [], students: [], enrollments: []
  };
  assert.doesNotThrow(() => assertClaimOnlyReady(ready));
  for (const collision of [
    { authUsers: [{}] }, { profiles: [{}] }, { students: [{}] }, { enrollments: [{}] },
    { officialRecords: [] }, { officialRecords: [ready.officialRecords[0], ready.officialRecords[0]] }
  ]) {
    assert.throws(() => assertClaimOnlyReady({ ...ready, ...collision }));
  }
});

test("approved paths remain limited to the two ignored manifest names", () => {
  const root = path.resolve("C:/workspace/pkm-des");
  assert.equal(validateManifestPath(root, path.join(root, ".preview", COMPLETE_MANIFEST_FILE)), path.join(root, ".preview", COMPLETE_MANIFEST_FILE));
  assert.equal(validateManifestPath(root, path.join(root, ".preview", PARTIAL_MANIFEST_FILE)), path.join(root, ".preview", PARTIAL_MANIFEST_FILE));
  assert.throws(() => validateManifestPath(root, path.join(root, "docs", COMPLETE_MANIFEST_FILE)));
});
