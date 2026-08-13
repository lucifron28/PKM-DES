import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("official workspace routes enforce server-side capability checks", async () => {
  const [queuePage, reviewPage, registrarPage, actionFile] = await Promise.all([
    readFile("app/admin/clearances/[clearance]/page.tsx", "utf8"),
    readFile("app/admin/clearances/[clearance]/[enrollmentId]/page.tsx", "utf8"),
    readFile("app/admin/enrollments/page.tsx", "utf8"),
    readFile("app/admin/enrollments/signature-actions.ts", "utf8")
  ]);

  assert.match(queuePage, /requireOfficialSignerRole/);
  assert.match(queuePage, /loadOfficialClearanceQueue\(supabase, workspace\.role, assignments\)/);
  assert.match(reviewPage, /requireOfficialSignerRole/);
  assert.match(reviewPage, /hasActiveOfficialRoleForProgram/);
  assert.match(registrarPage, /requireRegistrarAdmin/);
  assert.match(actionFile, /requireOfficialSignerRole/);
});
