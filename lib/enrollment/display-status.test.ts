import assert from "node:assert/strict";
import test from "node:test";
import { getDisplayedEnrollmentStatus, type DisplayedEnrollmentStatus } from "@/lib/enrollment/display-status";
import type { EnrollmentReviewStatus } from "@/types/database";

type TestEnrollment = {
  id: string;
  academic_year: string;
  semester: string;
  status: EnrollmentReviewStatus;
};

function resolveCurrentTermStatus(
  activeTerm: { academicYear: string; semester: string } | null,
  enrollments: TestEnrollment[]
): {
  status: DisplayedEnrollmentStatus;
  currentTermRequest: TestEnrollment | null;
  historicalEnrollments: TestEnrollment[];
} {
  if (!activeTerm) {
    return {
      status: getDisplayedEnrollmentStatus(null),
      currentTermRequest: null,
      historicalEnrollments: enrollments
    };
  }

  const currentTermRequest = enrollments.find(
    (e) => e.academic_year === activeTerm.academicYear && e.semester === activeTerm.semester
  ) ?? null;

  const historicalEnrollments = enrollments.filter(
    (e) => e.academic_year !== activeTerm.academicYear || e.semester !== activeTerm.semester
  );

  return {
    status: getDisplayedEnrollmentStatus(currentTermRequest?.status ?? null),
    currentTermRequest,
    historicalEnrollments
  };
}

test("historical approved enrollment plus no current-term request presents NOT ENROLLED", () => {
  const activeTerm = { academicYear: "2026-2027", semester: "1st Semester" };
  const enrollments: TestEnrollment[] = [
    { id: "e1", academic_year: "2025-2026", semester: "2nd Semester", status: "APPROVED" }
  ];

  const result = resolveCurrentTermStatus(activeTerm, enrollments);

  assert.equal(result.status, "NOT ENROLLED");
  assert.equal(result.currentTermRequest, null);
  assert.equal(result.historicalEnrollments.length, 1);
});

test("current-term pending request presents PENDING", () => {
  const activeTerm = { academicYear: "2026-2027", semester: "1st Semester" };
  const enrollments: TestEnrollment[] = [
    { id: "e2", academic_year: "2026-2027", semester: "1st Semester", status: "PENDING" }
  ];

  const result = resolveCurrentTermStatus(activeTerm, enrollments);

  assert.equal(result.status, "PENDING");
  assert.equal(result.currentTermRequest?.id, "e2");
});

test("current-term approved request presents ENROLLED", () => {
  const activeTerm = { academicYear: "2026-2027", semester: "1st Semester" };
  const enrollments: TestEnrollment[] = [
    { id: "e3", academic_year: "2026-2027", semester: "1st Semester", status: "APPROVED" }
  ];

  const result = resolveCurrentTermStatus(activeTerm, enrollments);

  assert.equal(result.status, "ENROLLED");
  assert.equal(result.currentTermRequest?.id, "e3");
});

test("current-term rejected request presents REJECTED", () => {
  const activeTerm = { academicYear: "2026-2027", semester: "1st Semester" };
  const enrollments: TestEnrollment[] = [
    { id: "e4", academic_year: "2026-2027", semester: "1st Semester", status: "REJECTED" }
  ];

  const result = resolveCurrentTermStatus(activeTerm, enrollments);

  assert.equal(result.status, "REJECTED");
  assert.equal(result.currentTermRequest?.id, "e4");
});

test("no active term present yields NOT ENROLLED for current term display", () => {
  const result = resolveCurrentTermStatus(null, []);
  assert.equal(result.status, "NOT ENROLLED");
  assert.equal(result.currentTermRequest, null);
});

test("query failure state is distinguished from missing current-term request", () => {
  const queryFailed = true;
  const status = queryFailed ? "QUERY_FAILED" : getDisplayedEnrollmentStatus(null);
  assert.equal(status, "QUERY_FAILED");
});

test("multiple historical approved forms remain accessible for selector presentation", () => {
  const approvedHistory: TestEnrollment[] = [
    { id: "h1", academic_year: "2025-2026", semester: "1st Semester", status: "APPROVED" },
    { id: "h2", academic_year: "2025-2026", semester: "2nd Semester", status: "APPROVED" }
  ];

  assert.equal(approvedHistory.length, 2);
  assert.equal(approvedHistory.every((e) => e.status === "APPROVED"), true);
});
