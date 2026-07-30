import assert from "node:assert/strict";
import test from "node:test";
import { getDisplayedEnrollmentStatus } from "@/lib/enrollment/display-status";

test("rejected enrollment presents REJECTED status until resubmitted", () => {
  const status = getDisplayedEnrollmentStatus("REJECTED", "NOT ENROLLED");
  assert.equal(status, "REJECTED");
});

test("resubmitted enrollment transitions status from REJECTED back to PENDING", () => {
  const resubmittedStatus = getDisplayedEnrollmentStatus("PENDING", "NOT ENROLLED");
  assert.equal(resubmittedStatus, "PENDING");
});
