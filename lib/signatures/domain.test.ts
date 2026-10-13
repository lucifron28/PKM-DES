import assert from "node:assert/strict";
import test from "node:test";
import { getEnrollmentClearanceOverallStatus, getEnrollmentClearanceOverview, isValidOfficialRoleClearance } from "./clearances";
import { computeEnrollmentDocumentHash, computeHealthRecordDocumentHash } from "./fingerprint";
import { REGISTRATION_POLICY_VERSION } from "../registration-form/policy";

const enrollment = {
  id: "00000000-0000-4000-8000-000000000001",
  academic_year: "2026-2027",
  semester: "1st Semester",
  program_id: "00000000-0000-4000-8000-000000000002",
  year_level: "1st Year",
  enrollment_subjects: [
    { id: "b", course_code: "B-101", course_description: "Beta", units: 3 },
    { id: "a", course_code: "A-101", course_description: "Alpha", units: 3 }
  ]
};

test("role and clearance mappings fail closed", () => {
  assert.equal(isValidOfficialRoleClearance("LIBRARIAN", "LIBRARY_CLEARANCE"), true);
  assert.equal(isValidOfficialRoleClearance("NURSE", "ACCOUNTING_CLEARANCE"), false);
  assert.equal(isValidOfficialRoleClearance("ACCOUNTANT", "DEAN_CLEARANCE"), false);
  assert.equal(isValidOfficialRoleClearance("DEAN", "PROGRAM_CLEARANCE"), false);
  assert.equal(isValidOfficialRoleClearance("PROGRAM_CHAIR", "LIBRARY_CLEARANCE"), false);
  assert.equal(isValidOfficialRoleClearance("REGISTRAR", "DEAN_CLEARANCE"), false);
});

test("health clearance is always required and missing signatures prevent completion", () => {
  const notApplicableSpecialForm = getEnrollmentClearanceOverview("NOT_APPLICABLE", {});
  assert.equal(notApplicableSpecialForm.find((item) => item.clearanceType === "HEALTH_CLEARANCE")?.status, "PENDING");
  assert.equal(notApplicableSpecialForm.find((item) => item.clearanceType === "HEALTH_CLEARANCE")?.required, true);
  assert.equal(getEnrollmentClearanceOverallStatus(notApplicableSpecialForm), "INCOMPLETE");

  const pendingSpecialForm = getEnrollmentClearanceOverview("APPLICABLE", {});
  assert.equal(pendingSpecialForm.find((item) => item.clearanceType === "HEALTH_CLEARANCE")?.status, "PENDING");
  assert.equal(pendingSpecialForm.find((item) => item.clearanceType === "HEALTH_CLEARANCE")?.required, true);
  assert.equal(getEnrollmentClearanceOverallStatus(pendingSpecialForm), "INCOMPLETE");

  const unavailable = getEnrollmentClearanceOverview(null, {});
  assert.equal(unavailable.find((item) => item.clearanceType === "HEALTH_CLEARANCE")?.status, "PENDING");
  assert.equal(getEnrollmentClearanceOverallStatus(unavailable), "INCOMPLETE");
});

test("one invalidated current document blocks overall completion", () => {
  const evidence = Object.fromEntries(
    [
      "STUDENT_ENROLLMENT_SIGNATURE",
      "LIBRARY_CLEARANCE",
      "HEALTH_CLEARANCE",
      "PROGRAM_CLEARANCE",
      "ACCOUNTING_CLEARANCE",
      "DEAN_CLEARANCE"
    ].map((clearanceType) => [clearanceType, { exists: true, isCurrent: true }])
  );
  evidence.PROGRAM_CLEARANCE = { exists: true, isCurrent: false };
  const overview = getEnrollmentClearanceOverview("APPLICABLE", evidence);
  assert.equal(getEnrollmentClearanceOverallStatus(overview), "BLOCKED");
});

test("enrollment and health fingerprints are deterministic and context-bound", () => {
  const studentHash = computeEnrollmentDocumentHash(
    enrollment,
    "STUDENT",
    "STUDENT_ENROLLMENT_SIGNATURE",
    "ENROLLMENT_REGISTRATION"
  );
  const studentHashReordered = computeEnrollmentDocumentHash(
    { ...enrollment, enrollment_subjects: [...enrollment.enrollment_subjects].reverse() },
    "STUDENT",
    "STUDENT_ENROLLMENT_SIGNATURE",
    "ENROLLMENT_REGISTRATION"
  );
  assert.equal(studentHash, studentHashReordered);
  assert.notEqual(
    studentHash,
    computeEnrollmentDocumentHash(enrollment, "LIBRARIAN", "LIBRARY_CLEARANCE", "ENROLLMENT_CLEARANCE")
  );

  const healthHash = computeHealthRecordDocumentHash({
    enrollmentId: enrollment.id,
    studentId: "00000000-0000-4000-8000-000000000003",
    academicYear: enrollment.academic_year,
    semester: enrollment.semester,
    applicability: "APPLICABLE",
    status: "VERIFIED"
  });
  assert.notEqual(
    healthHash,
    computeHealthRecordDocumentHash({
      enrollmentId: enrollment.id,
      studentId: "00000000-0000-4000-8000-000000000003",
      academicYear: enrollment.academic_year,
      semester: enrollment.semester,
      applicability: "APPLICABLE",
      status: "PENDING"
    })
  );
});

test("pledge versions change only the Student registration fingerprint", () => {
  const legacyHash = computeEnrollmentDocumentHash(
    enrollment,
    "STUDENT",
    "STUDENT_ENROLLMENT_SIGNATURE",
    "ENROLLMENT_REGISTRATION"
  );
  assert.equal(legacyHash, "32a05c7c422028bb91aea7fa8917212b0b616f4c38101c3f8b631427bfedb4ce");
  assert.equal(
    computeEnrollmentDocumentHash(
      { ...enrollment, registration_pledge_version: null },
      "STUDENT",
      "STUDENT_ENROLLMENT_SIGNATURE",
      "ENROLLMENT_REGISTRATION"
    ),
    legacyHash
  );

  const versionedEnrollment = { ...enrollment, registration_pledge_version: REGISTRATION_POLICY_VERSION };
  const versionedStudentHash = computeEnrollmentDocumentHash(
    versionedEnrollment,
    "STUDENT",
    "STUDENT_ENROLLMENT_SIGNATURE",
    "ENROLLMENT_REGISTRATION"
  );
  assert.notEqual(versionedStudentHash, legacyHash);
  assert.notEqual(
    computeEnrollmentDocumentHash(
      { ...versionedEnrollment, registration_pledge_version: "pledge-v2" },
      "STUDENT",
      "STUDENT_ENROLLMENT_SIGNATURE",
      "ENROLLMENT_REGISTRATION"
    ),
    versionedStudentHash
  );

  const officialHash = computeEnrollmentDocumentHash(
    enrollment,
    "LIBRARIAN",
    "LIBRARY_CLEARANCE",
    "ENROLLMENT_CLEARANCE"
  );
  assert.equal(
    computeEnrollmentDocumentHash(
      versionedEnrollment,
      "LIBRARIAN",
      "LIBRARY_CLEARANCE",
      "ENROLLMENT_CLEARANCE"
    ),
    officialHash
  );
});
