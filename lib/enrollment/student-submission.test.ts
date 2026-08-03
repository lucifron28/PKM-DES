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
import type { StudentType } from "@/types/database";

function context(overrides: Partial<TrustedStudentEnrollmentContext> = {}): TrustedStudentEnrollmentContext {
  return {
    studentIdNumber: "26-00001",
    programId: "program-id",
    yearLevel: "1st Year",
    studentType: "Incoming 1st Year Student",
    standardLoadAvailability: "configured_complete",
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

test("missing Student ID is rejected", () => {
  assert.equal(evaluateStandardLoadEligibility(context({ studentIdNumber: "  " })), "missing_student_id");
});

test("invalid stored year level is rejected", () => {
  assert.equal(evaluateStandardLoadEligibility(context({ yearLevel: "5th Year" })), "invalid_student_record");
});

test("a missing standard load is rejected", () => {
  assert.equal(evaluateStandardLoadEligibility(context({ standardLoadAvailability: "not_configured" })), "no_configured_load");
});

test("an incomplete standard load is rejected", () => {
  assert.equal(evaluateStandardLoadEligibility(context({ standardLoadAvailability: "incomplete" })), "incomplete_configured_load");
});

for (const programCode of ["BSAIS", "BSMA", "BEED", "ENGLISH", "FILIPINO", "MATH", "SS", "CRIM", "ACP", "FSM"]) {
  test(`${programCode} can use a complete configured standard load`, () => {
    assert.equal(evaluateStandardLoadEligibility(context({ programId: `${programCode}-program` })), "eligible");
  });
}

const activeTermFixture = { academicYear: "2025-2026", semester: "2nd Semester" as const };

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

test("missing-load outcome maps to the configuration notice", () => {
  assert.match(getStudentSubmissionMessage("no_configured_load"), /complete standard load/);
  assert.equal(
    getStudentSubmissionMessage("no_configured_load"),
    "The supplied course list does not contain a complete standard load for your program and year level. Please contact the Registrar."
  );
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
