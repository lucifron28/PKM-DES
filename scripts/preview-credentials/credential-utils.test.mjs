import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import {
  CLAIM_ONLY_DEMO_RECORD,
  ACCOUNT_DEMO_RECORDS
} from "../demo/demo-records.mjs";
import {
  COMPLETE_MANIFEST_FILE,
  createCompleteManifest,
  createPasswordPlan,
  redactedPlanSummary,
  validateCredentialManifest,
  validateManifestPath,
  validatePreviewTarget
} from "./credential-utils.mjs";

test("accepts only the exact HTTPS Supabase target host", () => {
  assert.equal(validatePreviewTarget({ url: "https://preview-id.supabase.co", expectedHost: "preview-id.supabase.co" }), "preview-id.supabase.co");
  assert.throws(() => validatePreviewTarget({ url: "https://other.supabase.co", expectedHost: "preview-id.supabase.co" }));
  assert.throws(() => validatePreviewTarget({ url: "http://preview-id.supabase.co", expectedHost: "preview-id.supabase.co" }));
  assert.throws(() => validatePreviewTarget({ url: "not-a-url", expectedHost: "preview-id.supabase.co" }));
});

test("plans only the three account-backed students and a separate claim password", () => {
  let sequence = 0;
  const plan = createPasswordPlan(ACCOUNT_DEMO_RECORDS, () => `safe-password-${sequence++}-with-enough-length`);
  assert.deepEqual(plan.accounts.map(({ record }) => record.key), ["pending", "approved", "rejected"]);
  assert.equal(plan.accounts.some(({ record }) => record.key === CLAIM_ONLY_DEMO_RECORD.key), false);
  assert.ok(plan.claimOnlyPassword);
});

test("generates unique password-safe values without identity input", () => {
  const plan = createPasswordPlan();
  const values = [...plan.accounts.map(({ password }) => password), plan.claimOnlyPassword];
  assert.equal(new Set(values).size, values.length);
  assert.ok(values.every((value) => value.length >= 32 && !/\s/.test(value)));
  assert.ok(values.every((value) => !value.includes("99-9000") && !value.toLowerCase().includes("pending")));
});

test("accepts only approved manifest paths inside .preview", () => {
  const root = path.resolve("C:/workspace/pkm-des");
  assert.equal(validateManifestPath(root, path.join(root, ".preview", COMPLETE_MANIFEST_FILE)), path.join(root, ".preview", COMPLETE_MANIFEST_FILE));
  assert.throws(() => validateManifestPath(root, path.join(root, ".preview", "..", "leak.json")));
  assert.throws(() => validateManifestPath(root, path.join(root, "docs", COMPLETE_MANIFEST_FILE)));
  assert.throws(() => validateManifestPath(root, path.join(root, "outside.json")));
});

test("redacted summaries do not expose private values", () => {
  const password = "this-is-a-private-password";
  const serviceRoleKey = "this-is-a-service-role-key";
  const registrarEmail = "registrar.private@example.test";
  const summary = JSON.stringify(redactedPlanSummary({ targetHost: "preview.supabase.co", accountKeys: ["pending"], registrarEmail }));
  assert.equal(summary.includes(password), false);
  assert.equal(summary.includes(serviceRoleKey), false);
  assert.equal(summary.includes(registrarEmail), false);
});

test("validates complete manifests and rejects omissions, duplicates, and prohibited fields", () => {
  let sequence = 0;
  const plan = createPasswordPlan(
    ACCOUNT_DEMO_RECORDS,
    () => `unique-password-value-that-is-long-enough-${sequence++}`
  );
  const manifest = createCompleteManifest({
    targetHost: "preview.supabase.co",
    registrarEmail: "registrar.private@example.test",
    registrarPassword: "registrar-password",
    accountPasswords: plan.accounts,
    claimOnlyPassword: plan.claimOnlyPassword
  });

  assert.equal(validateCredentialManifest(manifest).schemaVersion, 1);
  assert.throws(() => validateCredentialManifest({ ...manifest, accounts: manifest.accounts.slice(0, -1) }));
  assert.throws(() => validateCredentialManifest({ ...manifest, accounts: [...manifest.accounts, manifest.accounts[1]] }));
  assert.throws(() => validateCredentialManifest({ ...manifest, serviceRoleKey: "forbidden" }));
});
