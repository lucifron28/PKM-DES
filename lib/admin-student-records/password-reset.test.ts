import assert from "node:assert/strict";
import test from "node:test";
import {
  isExactActiveStudentAccount,
  validateStudentPasswordResetInput
} from "./password-reset";

test("accepts a confirmed temporary password", () => {
  assert.deepEqual(validateStudentPasswordResetInput({ password: "NewPass123!", confirmPassword: "NewPass123!" }), {});
});

test("rejects missing, short, and mismatched temporary passwords", () => {
  assert.equal(validateStudentPasswordResetInput({ password: "", confirmPassword: "" }).success, undefined);
  assert.match(validateStudentPasswordResetInput({ password: "short", confirmPassword: "short" }).message ?? "", /at least 8/);
  assert.match(validateStudentPasswordResetInput({ password: "NewPass123!", confirmPassword: "OtherPass123!" }).message ?? "", /do not match/);
});

test("requires an exact active student account before reset", () => {
  const input = {
    officialEmail: "student@example.com",
    officialStudentId: "99-90002",
    accountEmail: "STUDENT@example.com",
    accountStudentId: "99-90002",
    accountRole: "student",
    accountStatus: "ACTIVE"
  };

  assert.equal(isExactActiveStudentAccount(input), true);
  assert.equal(isExactActiveStudentAccount({ ...input, accountStudentId: "99-90003" }), false);
  assert.equal(isExactActiveStudentAccount({ ...input, accountStatus: "PENDING" }), false);
});
