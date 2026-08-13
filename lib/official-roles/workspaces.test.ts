import assert from "node:assert/strict";
import test from "node:test";
import {
  getAdminLandingDestination,
  getOfficialWorkspace,
  getOfficialWorkspaceNavigation,
  getOfficialWorkspaceBySlug
} from "./roles";

function assignment(official_role: "LIBRARIAN" | "NURSE" | "PROGRAM_CHAIR" | "ACCOUNTANT" | "DEAN", active = true, program_id: string | null = null) {
  return { official_role, active, program_id };
}

test("each official role has one focused clearance workspace", () => {
  assert.equal(getOfficialWorkspace("LIBRARIAN").slug, "library");
  assert.equal(getOfficialWorkspace("NURSE").slug, "health");
  assert.equal(getOfficialWorkspace("PROGRAM_CHAIR").slug, "program");
  assert.equal(getOfficialWorkspace("ACCOUNTANT").slug, "accounting");
  assert.equal(getOfficialWorkspace("DEAN").slug, "dean");
  assert.equal(getOfficialWorkspaceBySlug("health")?.role, "NURSE");
  assert.equal(getOfficialWorkspaceBySlug("registrar"), null);
});

test("single-role staff navigation exposes only its assigned workspace", () => {
  const navigation = getOfficialWorkspaceNavigation([assignment("LIBRARIAN")]);
  assert.deepEqual(navigation.map((item) => item.href), [
    "/admin/dashboard",
    "/admin/clearances/library",
    "/admin/account"
  ]);
});

test("multi-role navigation includes each active capability without Registrar tools", () => {
  const navigation = getOfficialWorkspaceNavigation([
    assignment("PROGRAM_CHAIR"),
    assignment("DEAN"),
    assignment("ACCOUNTANT", false)
  ]);
  assert.deepEqual(navigation.map((item) => item.href), [
    "/admin/dashboard",
    "/admin/clearances/program",
    "/admin/clearances/dean",
    "/admin/account"
  ]);
});

test("admin login landing follows the focused workspace only for one active role", () => {
  assert.equal(getAdminLandingDestination([]), "/admin/dashboard");
  assert.equal(getAdminLandingDestination([assignment("NURSE")]), "/admin/clearances/health");
  assert.equal(getAdminLandingDestination([assignment("NURSE"), assignment("DEAN")]), "/admin/dashboard");
});
