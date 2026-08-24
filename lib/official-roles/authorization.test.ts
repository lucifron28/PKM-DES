import assert from "node:assert/strict";
import test from "node:test";
import { canSignClearance } from "./repository";
import {
  clearanceTypeForOfficialRole,
  isOfficialSignerRole,
  requiredOfficialRoleForClearance
} from "./roles";

const assignment = (officialRole: "LIBRARIAN" | "NURSE" | "PROGRAM_CHAIR" | "ACCOUNTANT" | "DEAN", active = true) => ({
  id: `${officialRole}-assignment`,
  profile_id: "admin-1",
  official_role: officialRole,
  program_id: null,
  active,
  created_at: "2026-08-14T00:00:00.000Z",
  updated_at: "2026-08-14T00:00:00.000Z"
});

test("clearance authorization uses one authoritative official-role mapping", () => {
  assert.equal(requiredOfficialRoleForClearance("LIBRARY_CLEARANCE"), "LIBRARIAN");
  assert.equal(requiredOfficialRoleForClearance("HEALTH_CLEARANCE"), "NURSE");
  assert.equal(requiredOfficialRoleForClearance("PROGRAM_CLEARANCE"), "PROGRAM_CHAIR");
  assert.equal(requiredOfficialRoleForClearance("ACCOUNTING_CLEARANCE"), "ACCOUNTANT");
  assert.equal(requiredOfficialRoleForClearance("DEAN_CLEARANCE"), "DEAN");
  assert.equal(requiredOfficialRoleForClearance("STUDENT_ENROLLMENT_SIGNATURE"), null);
  assert.equal(requiredOfficialRoleForClearance("REGISTRAR_CLEARANCE"), null);
  assert.equal(isOfficialSignerRole("REGISTRAR"), false);
  assert.equal(clearanceTypeForOfficialRole("PROGRAM_CHAIR"), "PROGRAM_CLEARANCE");
  assert.equal(clearanceTypeForOfficialRole("DEAN"), "DEAN_CLEARANCE");
});

test("admin assignment is required and revoked assignments cannot sign", () => {
  const assignments = [assignment("NURSE"), assignment("LIBRARIAN", false)];

  assert.equal(canSignClearance(assignments, "HEALTH_CLEARANCE", "program-a"), true);
  assert.equal(canSignClearance(assignments, "LIBRARY_CLEARANCE", "program-a"), false);
  assert.equal(canSignClearance(assignments, "DEAN_CLEARANCE", "program-a"), false);
});

test("standard demo role assignments reject every cross-role clearance", () => {
  const clearanceForRole = {
    LIBRARIAN: "LIBRARY_CLEARANCE",
    NURSE: "HEALTH_CLEARANCE",
    PROGRAM_CHAIR: "PROGRAM_CLEARANCE",
    ACCOUNTANT: "ACCOUNTING_CLEARANCE",
    DEAN: "DEAN_CLEARANCE"
  } as const;
  const allClearances = Object.values(clearanceForRole);
  const forbiddenClearances = {
    LIBRARIAN: ["HEALTH_CLEARANCE", "PROGRAM_CLEARANCE", "ACCOUNTING_CLEARANCE", "DEAN_CLEARANCE"],
    NURSE: ["LIBRARY_CLEARANCE", "PROGRAM_CLEARANCE", "ACCOUNTING_CLEARANCE", "DEAN_CLEARANCE"],
    PROGRAM_CHAIR: ["LIBRARY_CLEARANCE", "HEALTH_CLEARANCE", "ACCOUNTING_CLEARANCE", "DEAN_CLEARANCE"],
    ACCOUNTANT: ["LIBRARY_CLEARANCE", "HEALTH_CLEARANCE", "PROGRAM_CLEARANCE", "DEAN_CLEARANCE"],
    DEAN: ["LIBRARY_CLEARANCE", "HEALTH_CLEARANCE", "PROGRAM_CLEARANCE", "ACCOUNTING_CLEARANCE"]
  } as const;

  for (const [role, clearance] of Object.entries(clearanceForRole)) {
    const roleAssignments = [assignment(role as keyof typeof clearanceForRole)];
    assert.equal(canSignClearance(roleAssignments, clearance, "program-a"), true);
    for (const forbidden of forbiddenClearances[role as keyof typeof forbiddenClearances]) {
      assert.equal(canSignClearance(roleAssignments, forbidden, "program-a"), false);
    }
  }

  for (const clearance of allClearances) {
    assert.equal(canSignClearance([], clearance, "program-a"), false);
  }
});

test("one admin may hold multiple roles, but each clearance remains separate", () => {
  const assignments = [assignment("PROGRAM_CHAIR"), assignment("DEAN")];

  assert.equal(canSignClearance(assignments, "PROGRAM_CLEARANCE", "program-a"), true);
  assert.equal(canSignClearance(assignments, "DEAN_CLEARANCE", "program-a"), true);
  assert.notEqual(
    clearanceTypeForOfficialRole("PROGRAM_CHAIR"),
    clearanceTypeForOfficialRole("DEAN")
  );
});
