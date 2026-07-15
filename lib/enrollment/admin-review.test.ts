import assert from "node:assert/strict";
import test from "node:test";
import {
  getEnrollmentReviewRedirect,
  normalizeEnrollmentReviewId,
  normalizeRejectionRemarks
} from "./admin-review";

test("maps known review outcomes and fails closed for unknown outcomes", () => {
  assert.deepEqual(getEnrollmentReviewRedirect("approved"), { kind: "success", value: "approved" });
  assert.deepEqual(getEnrollmentReviewRedirect("already_reviewed"), { kind: "error", value: "already_reviewed" });
  assert.deepEqual(getEnrollmentReviewRedirect("unexpected_database_result"), { kind: "error", value: "review_failed" });
});

test("normalizes remarks and rejects malformed enrollment IDs", () => {
  assert.equal(normalizeRejectionRemarks("  Missing document details  "), "Missing document details");
  assert.equal(normalizeRejectionRemarks("   "), null);
  assert.equal(normalizeEnrollmentReviewId("not-an-id"), null);
  assert.equal(normalizeEnrollmentReviewId("0fbbf16d-1f18-4d55-92ee-2d94c8c5555f"), "0fbbf16d-1f18-4d55-92ee-2d94c8c5555f");
});
