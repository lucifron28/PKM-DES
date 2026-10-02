import assert from "node:assert/strict";
import test from "node:test";
import { REGISTRATION_POLICY_VERSION } from "../registration-form/policy";
import { computeEnrollmentDocumentHash } from "./fingerprint";
import { loadEnrollmentSignaturePresentation } from "./presentation";

const enrollment = {
  id: "00000000-0000-4000-8000-000000000001",
  academic_year: "2026-2027",
  semester: "1st Semester",
  program_id: "00000000-0000-4000-8000-000000000002",
  year_level: "1st Year",
  enrollment_subjects: [{ course_code: "A-101", course_description: "Alpha", units: 3 }]
};

function mockSupabase(documentHash: string) {
  const signature = {
    id: "00000000-0000-4000-8000-000000000003",
    enrollment_id: enrollment.id,
    student_id: "00000000-0000-4000-8000-000000000004",
    signer_profile_id: "00000000-0000-4000-8000-000000000005",
    signer_role: "STUDENT",
    clearance_type: "STUDENT_ENROLLMENT_SIGNATURE",
    document_type: "ENROLLMENT_REGISTRATION",
    signer_name_snapshot: "Ana Dela Cruz",
    signature_storage_path: `${enrollment.id}/STUDENT/signature.png`,
    document_hash: documentHash,
    signed_at: "2026-08-14T10:00:00.000Z"
  };
  const results = {
    enrollment_signatures: { data: [signature], error: null },
    enrollment_clearances: { data: [{ clearance_type: "STUDENT_ENROLLMENT_SIGNATURE", status: "SIGNED" }], error: null }
  };

  function query(result: unknown) {
    return {
      select() { return this; },
      eq() { return this; },
      order() { return this; },
      then(resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) {
        return Promise.resolve(result).then(resolve, reject);
      }
    };
  }

  return {
    from(table: keyof typeof results) {
      return query(results[table]);
    }
  };
}

test("legacy Student signature remains current for the front while pledge back requires a known version", async () => {
  const legacyHash = computeEnrollmentDocumentHash(
    enrollment,
    "STUDENT",
    "STUDENT_ENROLLMENT_SIGNATURE",
    "ENROLLMENT_REGISTRATION"
  );
  const legacyResult = await loadEnrollmentSignaturePresentation(
    mockSupabase(legacyHash) as never,
    { ...enrollment, registration_pledge_version: null }
  );
  assert.equal(legacyResult.signatures[0]?.is_current, true);

  const unknownEnrollment = { ...enrollment, registration_pledge_version: "pledge-v2" };
  const unknownHash = computeEnrollmentDocumentHash(
    unknownEnrollment,
    "STUDENT",
    "STUDENT_ENROLLMENT_SIGNATURE",
    "ENROLLMENT_REGISTRATION"
  );
  const unknownResult = await loadEnrollmentSignaturePresentation(
    mockSupabase(unknownHash) as never,
    unknownEnrollment
  );
  assert.equal(unknownResult.signatures[0]?.is_current, false);

  const currentEnrollment = { ...enrollment, registration_pledge_version: REGISTRATION_POLICY_VERSION };
  const currentHash = computeEnrollmentDocumentHash(
    currentEnrollment,
    "STUDENT",
    "STUDENT_ENROLLMENT_SIGNATURE",
    "ENROLLMENT_REGISTRATION"
  );
  const currentResult = await loadEnrollmentSignaturePresentation(
    mockSupabase(currentHash) as never,
    currentEnrollment
  );
  assert.equal(currentResult.signatures[0]?.is_current, true);
});
