import assert from "node:assert/strict";
import test from "node:test";
import { recordStudentEnrollmentSignature } from "./service";

test("a saved-signature request without an available specimen cannot sign", async () => {
  const formData = new FormData();
  formData.set("enrollment_id", "enrollment-1");
  formData.set("signature_source", "SAVED");
  formData.set("signature_specimen_id", "");
  formData.set("signature_confirmation", "on");

  const result = await recordStudentEnrollmentSignature({} as never, "student-profile-1", formData);

  assert.equal(result.success, false);
  assert.match(result.message, /saved signature is no longer available/i);
});
