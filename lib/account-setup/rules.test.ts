import test from "node:test";
import assert from "node:assert/strict";
import { isEligibleStudentSetupProfile } from "./rules";

test("only a student profile in SETUP status can complete account setup", () => {
  assert.equal(isEligibleStudentSetupProfile({ role: "student", account_status: "SETUP" }), true);
  assert.equal(isEligibleStudentSetupProfile({ role: "student", account_status: "ACTIVE" }), false);
  assert.equal(isEligibleStudentSetupProfile({ role: "admin", account_status: "SETUP" }), false);
  assert.equal(isEligibleStudentSetupProfile(null), false);
});
