import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the Nurse Health Record form has controlled administrative fields and no clinical inputs", async () => {
  const source = await readFile("components/health/health-record-verification-form.tsx", "utf8");

  assert.match(source, /name="verification_acknowledged"/);
  assert.match(source, /name="verification_note"/);
  assert.match(source, /Verify & Apply E-Signature/);
  assert.match(source, /No clinical details are entered or stored here/);
  assert.doesNotMatch(source, /medical_condition|allergy|medication|menstrual|pregnancy|blood_pressure/i);
});
