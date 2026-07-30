import test from "node:test";
import assert from "node:assert/strict";
import { isEligibleStudentSetupProfile } from "./rules";
import { getSafeNextDestination } from "@/lib/auth/safe-next-destination";

test("only a student profile in SETUP status can complete account setup", () => {
  assert.equal(isEligibleStudentSetupProfile({ role: "student", account_status: "SETUP" }), true);
  assert.equal(isEligibleStudentSetupProfile({ role: "student", account_status: "ACTIVE" }), false);
  assert.equal(isEligibleStudentSetupProfile({ role: "admin", account_status: "SETUP" }), false);
  assert.equal(isEligibleStudentSetupProfile(null), false);
});

test("safe next destination resolves role-appropriate dashboard fallback for active profiles", () => {
  assert.equal(getSafeNextDestination("/student/dashboard", "student"), "/student/dashboard");
  assert.equal(getSafeNextDestination("/admin/dashboard", "admin"), "/admin/dashboard");
  assert.equal(getSafeNextDestination("/admin/students", "student"), "/student/dashboard");
  assert.equal(getSafeNextDestination("/student/cor", "admin"), "/admin/dashboard");
});
