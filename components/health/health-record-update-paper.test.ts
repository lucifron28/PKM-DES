import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the Health Record Update paper form matches the supplied form sections", async () => {
  const source = await readFile("components/health/health-record-update-paper.tsx", "utf8");

  assert.match(source, /PAMBAYANG KOLEHIYO NG MAUBAN/);
  assert.match(source, /HEALTH SERVICES/);
  assert.match(source, /HEALTH RECORD UPDATE/);
  assert.match(source, /PAST OR CURRENT MEDICAL CONDITIONS/);
  assert.match(source, /Medical Condition/);
  assert.match(source, /When identified/);
  assert.match(source, /Medications \(If Any\)/);
  assert.match(source, /For Females: Last Menstrual Period/);
  assert.match(source, /Unang araw ng huling regla/);
  assert.match(source, /Student&apos;s Signature/);
  assert.match(source, /PKM Health Services/);
});
