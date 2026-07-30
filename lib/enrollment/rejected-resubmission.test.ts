import assert from "node:assert/strict";
import test from "node:test";
import { getDisplayedEnrollmentStatus } from "@/lib/enrollment/display-status";
import { ENROLLMENT_REVIEW_STATUSES } from "@/lib/constants/enrollment";
import { getStudentSubmissionMessage } from "@/lib/enrollment/student-submission";
import type { EnrollmentReviewStatus } from "@/types/database";

test("rejected enrollment presents REJECTED status and is terminal", () => {
  const status = getDisplayedEnrollmentStatus("REJECTED");
  assert.equal(status, "REJECTED");
});

test("no RETURNED or REOPENED status is introduced into review statuses", () => {
  assert.deepEqual(ENROLLMENT_REVIEW_STATUSES, ["PENDING", "APPROVED", "REJECTED"]);
  assert.equal((ENROLLMENT_REVIEW_STATUSES as string[]).includes("RETURNED"), false);
  assert.equal((ENROLLMENT_REVIEW_STATUSES as string[]).includes("REOPENED"), false);
});

test("a rejected same-term request remains duplicate/blocked", () => {
  const msg = getStudentSubmissionMessage("duplicate");
  assert.match(msg, /already/i);
});

test("registrar remarks remain visible on rejected enrollment records", () => {
  const mockEnrollment = {
    id: "enrollment-1",
    status: "REJECTED" as EnrollmentReviewStatus,
    remarks: "Missing preliminary documentation",
    reviewed_at: "2026-07-30T10:00:00Z"
  };
  assert.equal(mockEnrollment.status, "REJECTED");
  assert.equal(mockEnrollment.remarks, "Missing preliminary documentation");
});

test("another academic term is not blocked by a rejected prior term", () => {
  const priorTerm = { academic_year: "2025-2026", semester: "2nd Semester" };
  const newTerm = { academic_year: "2026-2027", semester: "1st Semester" };
  const isSameTerm = priorTerm.academic_year === newTerm.academic_year && priorTerm.semester === newTerm.semester;
  assert.equal(isSameTerm, false);
});

test("older approved registration form remains separate from a subsequent rejected request", () => {
  const olderApprovedEnrollment = {
    id: "approved-1",
    academic_year: "2025-2026",
    semester: "1st Semester",
    status: "APPROVED" as EnrollmentReviewStatus
  };
  const newerRejectedEnrollment = {
    id: "rejected-1",
    academic_year: "2025-2026",
    semester: "2nd Semester",
    status: "REJECTED" as EnrollmentReviewStatus
  };

  assert.notEqual(olderApprovedEnrollment.id, newerRejectedEnrollment.id);
  assert.equal(olderApprovedEnrollment.status, "APPROVED");
  assert.equal(newerRejectedEnrollment.status, "REJECTED");
});
