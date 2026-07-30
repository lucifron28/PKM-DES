import assert from "node:assert/strict";
import test from "node:test";
import {
  getDisplayedEnrollmentStatus,
  separateEnrollmentsByTerm
} from "@/lib/enrollment/display-status";
import type { EnrollmentReviewStatus } from "@/types/database";

type TestEnrollment = {
  academic_year: string;
  semester: string;
  status: EnrollmentReviewStatus;
  id?: string;
};

const activeTerm = { academicYear: "2026-2027", semester: "1st Semester" as const, label: "AY 2026-2027, 1st Semester" };

test("current-term approved status maps to ENROLLED", () => {
  assert.equal(getDisplayedEnrollmentStatus("APPROVED"), "ENROLLED");
});

test("current-term pending status maps to PENDING", () => {
  assert.equal(getDisplayedEnrollmentStatus("PENDING"), "PENDING");
});

test("current-term rejected status maps to REJECTED", () => {
  assert.equal(getDisplayedEnrollmentStatus("REJECTED"), "REJECTED");
});

test("null status maps to NOT ENROLLED (no current-term enrollment)", () => {
  assert.equal(getDisplayedEnrollmentStatus(null), "NOT ENROLLED");
});

test("separateEnrollmentsByTerm extracts current-term enrollment from full list", () => {
  const enrollments: TestEnrollment[] = [
    { academic_year: "2026-2027", semester: "1st Semester", status: "PENDING" },
    { academic_year: "2025-2026", semester: "2nd Semester", status: "APPROVED" }
  ];

  const result = separateEnrollmentsByTerm(enrollments, activeTerm);
  assert.equal(result.currentTermEnrollment?.status, "PENDING");
  assert.equal(result.historicalEnrollments.length, 1);
  assert.equal(result.historicalEnrollments[0].status, "APPROVED");
});

test("separateEnrollmentsByTerm returns null currentTermEnrollment when none matches active term", () => {
  const enrollments: TestEnrollment[] = [
    { academic_year: "2025-2026", semester: "2nd Semester", status: "APPROVED" }
  ];

  const result = separateEnrollmentsByTerm(enrollments, activeTerm);
  assert.equal(result.currentTermEnrollment, null);
  assert.equal(result.historicalEnrollments.length, 1);
  assert.equal(getDisplayedEnrollmentStatus(null), "NOT ENROLLED");
});

test("separateEnrollmentsByTerm with null activeTerm returns no current-term enrollment", () => {
  const enrollments: TestEnrollment[] = [
    { academic_year: "2026-2027", semester: "1st Semester", status: "PENDING" }
  ];

  const result = separateEnrollmentsByTerm(enrollments, null);
  assert.equal(result.activeTerm, null);
  assert.equal(result.currentTermEnrollment, null);
});

// Page-level contracts (verified by the page component, not this unit test):
// - activeTermResult.ok === false MUST render a distinct loading error, never NOT ENROLLED.
// - enrollmentsResponse.error MUST render a distinct loading error, never NOT ENROLLED.
// - Neither failure path may render Start Online Enrollment.
// - A successful query with no current-term enrollment displays NOT ENROLLED.

test("separateEnrollmentsByTerm: all enrollments become historical when no active term", () => {
  const enrollments: TestEnrollment[] = [
    { academic_year: "2026-2027", semester: "1st Semester", status: "PENDING" },
    { academic_year: "2025-2026", semester: "1st Semester", status: "APPROVED" }
  ];

  const result = separateEnrollmentsByTerm(enrollments, null);
  assert.equal(result.activeTerm, null);
  assert.equal(result.currentTermEnrollment, null);
  assert.equal(result.historicalEnrollments.length, 2);
});

test("separateEnrollmentsByTerm: null current term + null activeTerm produces NOT ENROLLED via status mapper", () => {
  // When no active term is configured (not a failure, just no term),
  // the helper returns null for currentTermEnrollment.
  // getDisplayedEnrollmentStatus(null) maps to NOT ENROLLED.
  const result = separateEnrollmentsByTerm([], null);
  assert.equal(result.currentTermEnrollment, null);
  const displayedStatus = getDisplayedEnrollmentStatus(null);
  assert.equal(displayedStatus, "NOT ENROLLED");
});

test("multiple historical approved forms remain accessible for selector presentation", () => {
  const approvedHistory: TestEnrollment[] = [
    { academic_year: "2025-2026", semester: "1st Semester", id: "h1", status: "APPROVED" },
    { academic_year: "2025-2026", semester: "2nd Semester", id: "h2", status: "APPROVED" }
  ];

  const historical = separateEnrollmentsByTerm(approvedHistory, activeTerm).historicalEnrollments;
  assert.equal(historical.length, 2);
  assert.equal(historical.every((e) => e.status === "APPROVED"), true);
});
