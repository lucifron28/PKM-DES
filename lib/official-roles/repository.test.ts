import assert from "node:assert/strict";
import test from "node:test";
import { hasActiveOfficialRoleForProgram } from "./repository";

const assignments = [
  {
    id: "global-nurse",
    profile_id: "admin-1",
    official_role: "NURSE" as const,
    program_id: null,
    active: true,
    created_at: "2026-08-13T00:00:00.000Z",
    updated_at: "2026-08-13T00:00:00.000Z"
  },
  {
    id: "program-chair-a",
    profile_id: "admin-1",
    official_role: "PROGRAM_CHAIR" as const,
    program_id: "program-a",
    active: true,
    created_at: "2026-08-13T00:00:00.000Z",
    updated_at: "2026-08-13T00:00:00.000Z"
  }
];

test("official assignments honor global and program-scoped authority", () => {
  assert.equal(hasActiveOfficialRoleForProgram(assignments, "NURSE", "program-b"), true);
  assert.equal(hasActiveOfficialRoleForProgram(assignments, "PROGRAM_CHAIR", "program-a"), true);
  assert.equal(hasActiveOfficialRoleForProgram(assignments, "PROGRAM_CHAIR", "program-b"), false);
});
