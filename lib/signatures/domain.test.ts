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

test("financial revisions change only Accounting hashes and preserve unset legacy hashes", () => {
  const hash = (version?: number | null) => computeEnrollmentDocumentHash(
    { ...enrollment, financial_document_version: version }, "ACCOUNTANT", "ACCOUNTING_CLEARANCE", "ENROLLMENT_CLEARANCE"
  );
  assert.equal(hash(), hash(null));
  assert.notEqual(hash(), hash(1));
  assert.notEqual(hash(1), hash(2));
  assert.equal(
    computeEnrollmentDocumentHash(enrollment, "STUDENT", "STUDENT_ENROLLMENT_SIGNATURE", "ENROLLMENT_REGISTRATION"),
    computeEnrollmentDocumentHash({ ...enrollment, financial_document_version: 2 }, "STUDENT", "STUDENT_ENROLLMENT_SIGNATURE", "ENROLLMENT_REGISTRATION")
  );
});

test("medical revisions bind both Nurse document types and leave other roles unchanged", () => {
  const nurseHash = (version?: number | null) => computeEnrollmentDocumentHash(
    { ...enrollment, medical_document_version: version }, "NURSE", "HEALTH_CLEARANCE", "ENROLLMENT_CLEARANCE"
  );
  assert.equal(nurseHash(), nurseHash(null));
  assert.notEqual(nurseHash(), nurseHash(1));
  assert.notEqual(nurseHash(1), nurseHash(2));
  const health = { enrollmentId: enrollment.id, studentId: "student", academicYear: enrollment.academic_year,
    semester: enrollment.semester, applicability: "APPLICABLE" as const, status: "VERIFIED" as const };
  assert.equal(computeHealthRecordDocumentHash(health), computeHealthRecordDocumentHash({ ...health, medical_document_version: null }));
  assert.notEqual(computeHealthRecordDocumentHash({ ...health, medical_document_version: 1 }), computeHealthRecordDocumentHash({ ...health, medical_document_version: 2 }));
  assert.equal(computeEnrollmentDocumentHash(enrollment, "ACCOUNTANT", "ACCOUNTING_CLEARANCE", "ENROLLMENT_CLEARANCE"),
    computeEnrollmentDocumentHash({ ...enrollment, medical_document_version: 2 }, "ACCOUNTANT", "ACCOUNTING_CLEARANCE", "ENROLLMENT_CLEARANCE"));
});

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

test("optional schedules are hash-bound without changing legacy no-schedule hashes", () => {
  const legacyHash = computeEnrollmentDocumentHash(
    enrollment,
    "STUDENT",
    "STUDENT_ENROLLMENT_SIGNATURE",
    "ENROLLMENT_REGISTRATION"
  );
  const scheduledEnrollment = {
    ...enrollment,
    registration_pledge_version: REGISTRATION_POLICY_VERSION,
    enrollment_subjects: [
      { ...enrollment.enrollment_subjects[0], day: " MWF ", time: "8:00 AM", room: " 101 " },
      { ...enrollment.enrollment_subjects[1], day: null, time: null, room: null }
    ]
  };
  const scheduledHash = computeEnrollmentDocumentHash(
    scheduledEnrollment,
    "STUDENT",
    "STUDENT_ENROLLMENT_SIGNATURE",
    "ENROLLMENT_REGISTRATION"
  );
  const reorderedHash = computeEnrollmentDocumentHash(
    {
      ...scheduledEnrollment,
      enrollment_subjects: [...scheduledEnrollment.enrollment_subjects].reverse()
    },
    "STUDENT",
    "STUDENT_ENROLLMENT_SIGNATURE",
    "ENROLLMENT_REGISTRATION"
  );
  assert.equal(legacyHash, "32a05c7c422028bb91aea7fa8917212b0b616f4c38101c3f8b631427bfedb4ce");
  assert.equal(scheduledHash, reorderedHash);
  assert.notEqual(scheduledHash, legacyHash);
  assert.notEqual(
    scheduledHash,
    computeEnrollmentDocumentHash(
      {
        ...scheduledEnrollment,
        enrollment_subjects: [
          { ...scheduledEnrollment.enrollment_subjects[0], room: "102" },
          scheduledEnrollment.enrollment_subjects[1]
        ]
      },
      "STUDENT",
      "STUDENT_ENROLLMENT_SIGNATURE",
      "ENROLLMENT_REGISTRATION"
    )
  );
  assert.notEqual(
    scheduledHash,
    computeEnrollmentDocumentHash(
      {
        ...scheduledEnrollment,
        enrollment_subjects: [
          { ...scheduledEnrollment.enrollment_subjects[0], day: "TTh" },
          scheduledEnrollment.enrollment_subjects[1]
        ]
      },
      "STUDENT",
      "STUDENT_ENROLLMENT_SIGNATURE",
      "ENROLLMENT_REGISTRATION"
    )
  );
});
