import assert from "node:assert/strict";
import test from "node:test";
import {
  getEnrollmentReviewRedirect,
  normalizeEnrollmentReviewId,
  normalizeEnrollmentReviewIds,
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

test("normalizes a bounded, deduplicated set of enrollment IDs", () => {
  const first = "0fbbf16d-1f18-4d55-92ee-2d94c8c5555f";
  const second = "1fbbf16d-1f18-4d55-92ee-2d94c8c5555f";
  assert.deepEqual(normalizeEnrollmentReviewIds([first, second, first]), [first, second]);
  assert.equal(normalizeEnrollmentReviewIds([]), null);
  assert.equal(normalizeEnrollmentReviewIds([first, "bad-id"]), null);
  assert.equal(normalizeEnrollmentReviewIds([new File([], "id.txt")]), null);
  assert.equal(normalizeEnrollmentReviewIds(Array.from({ length: 101 }, (_, index) =>
    `${String(index + 1).padStart(8, "0")}-1f18-4d55-92ee-2d94c8c5555f`
  )), null);
});

test("handles unverified_requirements and incomplete_clearances outcomes", () => {
  assert.deepEqual(getEnrollmentReviewRedirect("unverified_requirements"), { kind: "error", value: "unverified_requirements" });
  assert.deepEqual(getEnrollmentReviewRedirect("incomplete_clearances"), { kind: "error", value: "incomplete_clearances" });
  assert.deepEqual(getEnrollmentReviewRedirect("completely_unknown_outcome"), { kind: "error", value: "review_failed" });
});
