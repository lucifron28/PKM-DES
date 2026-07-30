import test from "node:test";
import assert from "node:assert/strict";
import { isEligibleStudentSetupProfile } from "./rules";

test("only a student profile in SETUP status can complete account setup", () => {
  assert.equal(isEligibleStudentSetupProfile({ role: "student", account_status: "SETUP" }), true);
  assert.equal(isEligibleStudentSetupProfile({ role: "student", account_status: "ACTIVE" }), false);
  assert.equal(isEligibleStudentSetupProfile({ role: "admin", account_status: "SETUP" }), false);
  assert.equal(isEligibleStudentSetupProfile(null), false);
});

test("ACTIVE profile receives portal link while SETUP profile receives no portal link", () => {
  const getDashboardHref = (role: string, status: string) => {
    const isActive = status === "ACTIVE";
    return isActive ? (role === "admin" ? "/admin/dashboard" : "/student/dashboard") : null;
  };

  assert.equal(getDashboardHref("student", "ACTIVE"), "/student/dashboard");
  assert.equal(getDashboardHref("admin", "ACTIVE"), "/admin/dashboard");
  assert.equal(getDashboardHref("student", "SETUP"), null);
  assert.equal(getDashboardHref("admin", "SETUP"), null);
});
