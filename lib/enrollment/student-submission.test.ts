import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateStandardLoadEligibility,
  getStudentSubmissionMessage,
  isCurrentEnrollmentTerm,
  shouldRedirectAfterStudentSubmission,
  type StudentEnrollmentFormInput,
  type TrustedStudentEnrollmentContext
} from "@/lib/enrollment/student-submission";
import { PROGRAM } from "@/lib/constants/pkm";
import type { StudentType } from "@/types/database";

function context(overrides: Partial<TrustedStudentEnrollmentContext> = {}): TrustedStudentEnrollmentContext {
  return {
    studentIdNumber: "26-00001",
    programId: "program-id",
    programCode: PROGRAM.code,
    yearLevel: "1st Year",
    studentType: "Incoming 1st Year Student",
    matchingSubjectCount: 8,
    ...overrides
  };
}

for (const studentType of [
  "Incoming 1st Year Student",
  "Old Student",
  "Continuing Student",
  "Regular Student"
] as StudentType[]) {
  test(`${studentType} is eligible for a standard load`, () => {
    assert.equal(evaluateStandardLoadEligibility(context({ studentType })), "eligible");
  });
}

test("Transferee requires Registrar-managed loading", () => {
  assert.equal(evaluateStandardLoadEligibility(context({ studentType: "Transferee" })), "registrar_managed_load");
});

test("Irregular Student requires Registrar-managed loading", () => {
  assert.equal(evaluateStandardLoadEligibility(context({ studentType: "Irregular Student" })), "registrar_managed_load");
});

test("non-BSAIS program is unsupported", () => {
  assert.equal(evaluateStandardLoadEligibility(context({ programCode: "BSMA" })), "unsupported_program");
});

test("missing Student ID is rejected", () => {
  assert.equal(evaluateStandardLoadEligibility(context({ studentIdNumber: "  " })), "missing_student_id");
});

test("invalid stored year level is rejected", () => {
  assert.equal(evaluateStandardLoadEligibility(context({ yearLevel: "5th Year" })), "invalid_student_record");
});

test("an empty matching subject set is rejected", () => {
  assert.equal(evaluateStandardLoadEligibility(context({ matchingSubjectCount: 0 })), "no_configured_subjects");
});

const activeTermFixture = { academicYear: "2026-2027", semester: "1st Semester" as const };

test("the configured term is accepted", () => {
  assert.equal(isCurrentEnrollmentTerm(activeTermFixture, activeTermFixture), true);
});

test("a wrong academic year is rejected", () => {
  assert.equal(
    isCurrentEnrollmentTerm({ academicYear: "2025-2026", semester: "1st Semester" }, activeTermFixture),
    false
  );
});

test("a wrong semester is rejected", () => {
  assert.equal(
    isCurrentEnrollmentTerm({ academicYear: "2026-2027", semester: "2nd Semester" }, activeTermFixture),
    false
  );
});

test("duplicate outcome maps to the safe duplicate message", () => {
  assert.equal(
    getStudentSubmissionMessage("duplicate"),
    "You already have an enrollment request for this academic year and semester."
  );
});

test("Registrar-managed outcome maps to the Registrar notice", () => {
  assert.match(getStudentSubmissionMessage("registrar_managed_load"), /Registrar review and assignment/);
});

test("unsupported-program outcome maps to the program notice", () => {
  assert.match(getStudentSubmissionMessage("unsupported_program"), /not yet configured for your program/);
});

test("closed-term outcome maps to the safe term notice", () => {
  assert.equal(
    getStudentSubmissionMessage("term_not_open"),
    "Online enrollment is not available for the configured academic term. Please contact the Registrar."
  );
});

test("unexpected database outcome maps to a generic failure", () => {
  assert.equal(
    getStudentSubmissionMessage("submission_failed"),
    "Enrollment request could not be completed. Please try again."
  );
});

test("only a successful outcome permits redirect", () => {
  assert.equal(shouldRedirectAfterStudentSubmission("submitted"), true);
  assert.equal(shouldRedirectAfterStudentSubmission("submission_failed"), false);
});

test("the browser submission input contains certification only", () => {
  const input: StudentEnrollmentFormInput = { certified: true };
  assert.deepEqual(Object.keys(input), ["certified"]);
});

test("eligibility uses the stored student year level", () => {
  assert.equal(evaluateStandardLoadEligibility(context({ yearLevel: "2nd Year" })), "eligible");
});
