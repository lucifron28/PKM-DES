import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the Nurse Health Record review shows the completed paper form before signing", async () => {
  const source = await readFile("components/health/health-record-verification-form.tsx", "utf8");

  assert.match(source, /name="verification_acknowledged"/);
  assert.match(source, /name="verification_note"/);
  assert.match(source, /Verify & Apply E-Signature/);
  assert.match(source, /HealthRecordUpdatePaper/);
  assert.match(source, /completed Health Record Update/);
});
