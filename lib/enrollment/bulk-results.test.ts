import assert from "node:assert/strict";
import test from "node:test";
import {
  getBulkFailureCode,
  getBulkResultsError,
  getBulkRpcFailureCode,
  summarizeSkippedResults,
  validateBulkEnrollmentResults
} from "./bulk-results";

const firstId = "0fbbf16d-1f18-4d55-92ee-2d94c8c5555f";
const secondId = "1fbbf16d-1f18-4d55-92ee-2d94c8c5555f";

test("validates returned enrollment IDs before allowing side effects", () => {
  assert.deepEqual(validateBulkEnrollmentResults([
    { enrollment_id: firstId, outcome: "pulled_out" },
    { enrollment_id: secondId, outcome: "already_pulled_out" }
  ], [firstId, secondId]), [
    { enrollment_id: firstId, outcome: "pulled_out" },
    { enrollment_id: secondId, outcome: "already_pulled_out" }
  ]);
  assert.equal(validateBulkEnrollmentResults([], [firstId]), null);
  assert.equal(validateBulkEnrollmentResults([{ enrollment_id: secondId, outcome: "pulled_out" }], [firstId]), null);
  assert.equal(validateBulkEnrollmentResults([
    { enrollment_id: firstId, outcome: "pulled_out" },
    { enrollment_id: firstId, outcome: "pulled_out" }
  ], [firstId, secondId]), null);
  assert.equal(validateBulkEnrollmentResults([
    { enrollment_id: firstId, outcome: "pulled_out" },
    { enrollment_id: "2fbbf16d-1f18-4d55-92ee-2d94c8c5555f", outcome: "pulled_out" }
  ], [firstId, secondId]), null);
});

test("keeps authorization outcomes actionable and rejects empty RPC results", () => {
  assert.equal(getBulkResultsError([]), "no_results");
  assert.equal(getBulkResultsError(null), "no_results");
  assert.equal(getBulkResultsError({ outcome: "pulled_out" }), "invalid_rpc_results");
  assert.equal(validateBulkEnrollmentResults([
    { enrollment_id: null, outcome: "unauthorized" }
  ], [firstId, secondId])?.[0].outcome, "unauthorized");
  assert.equal(getBulkFailureCode([{ enrollment_id: firstId, outcome: "not_found" }]), "not_found");
  assert.equal(getBulkRpcFailureCode({ code: "42501" }, "pull_out_failed"), "unauthorized");
  assert.equal(getBulkRpcFailureCode({ code: "P0002" }, "pull_out_failed"), "not_found");
  assert.equal(getBulkRpcFailureCode({ code: "XX000" }, "pull_out_failed"), "pull_out_failed");
});

test("summarizes partial outcomes with counts and useful reasons", () => {
  assert.equal(summarizeSkippedResults([
    { enrollment_id: firstId, outcome: "pulled_out" },
    { enrollment_id: secondId, outcome: "already_pulled_out" },
    { enrollment_id: "2fbbf16d-1f18-4d55-92ee-2d94c8c5555f", outcome: "not_found" }
  ], "pulled_out"), "1 already marked PULL OUT; 1 not found");
});
