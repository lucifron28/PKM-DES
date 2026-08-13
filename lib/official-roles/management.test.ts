import assert from "node:assert/strict";
import test from "node:test";
import { canManageOfficialAssignment, canReceiveActiveOfficialAssignment } from "./management";

const activeAdmin = {
  id: "admin-2",
  role: "admin" as const,
  account_status: "ACTIVE" as const
};

test("assignment management cannot target the actor or a student", () => {
  assert.equal(canManageOfficialAssignment("admin-1", activeAdmin), true);
  assert.equal(canManageOfficialAssignment("admin-2", activeAdmin), false);
  assert.equal(
    canManageOfficialAssignment("admin-1", { ...activeAdmin, id: "student-1", role: "student" }),
    false
  );
});

test("only active admin accounts can receive an active assignment", () => {
  assert.equal(canReceiveActiveOfficialAssignment(activeAdmin), true);
  assert.equal(canReceiveActiveOfficialAssignment({ ...activeAdmin, account_status: "PENDING" }), false);
  assert.equal(canReceiveActiveOfficialAssignment({ ...activeAdmin, role: "student" }), false);
});
