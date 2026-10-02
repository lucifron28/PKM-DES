import assert from "node:assert/strict";
import test from "node:test";
import { recordStudentEnrollmentSignature } from "./service";

test("student signing without registration policy consent is rejected before database access", async () => {
  const formData = new FormData();
  formData.set("enrollment_id", "enrollment-1");
  formData.set("signature_source", "SAVED");
  formData.set("signature_specimen_id", "");
  formData.set("signature_confirmation", "on");

  const supabase = {
    from() {
      assert.fail("must reject before loading enrollment");
    }
  };
  const result = await recordStudentEnrollmentSignature(supabase as never, "student-profile-1", formData);

  assert.equal(result.success, false);
  assert.match(result.message, /read and accept the registration policy/i);
});

test("stored future policy version rejects signing and ignores a client-supplied version", async () => {
  const enrollment = {
    id: "enrollment-1",
    student_id: "student-1",
    program_id: "program-1",
    year_level: "1st Year",
    academic_year: "2026-2027",
    semester: "1st Semester",
    registration_pledge_version: "pledge-v2",
    status: "PENDING",
    students: { id: "student-1", profile_id: "student-profile-1" }
  };
  const query = {
    select() { return this; },
    eq() { return this; },
    maybeSingle: async () => ({ data: enrollment, error: null })
  };
  const supabase = { from: () => query };
  const formData = new FormData();
  formData.set("enrollment_id", enrollment.id);
  formData.set("registration_policy_consent", "on");
  formData.set("registration_pledge_version", "pledge-v1");
  formData.set("signature_confirmation", "on");
  formData.set("signature_data", "not-a-signature");

  const result = await recordStudentEnrollmentSignature(supabase as never, "student-profile-1", formData);

  assert.equal(result.success, false);
  assert.match(result.message, /policy version is not available/i);
});
