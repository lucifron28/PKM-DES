import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = "supabase/migrations/20260814000000_official_signer_management.sql";
const signatureServicePath = "lib/signatures/service.ts";
const signatureInputPath = "components/signatures/e-signature-input.tsx";

test("assignment mutation is exposed only through the authenticated RPC", async () => {
  const migration = await readFile(migrationPath, "utf8");

  assert.match(migration, /revoke all on table public\.official_role_assignments from public, anon, authenticated/i);
  assert.match(migration, /create or replace function public\.set_official_role_assignment/i);
  assert.match(migration, /not private\.is_admin\(\)/i);
  assert.match(migration, /p_profile_id = auth\.uid\(\)/i);
  assert.match(migration, /self_assignment_forbidden/i);
  assert.match(migration, /ASSIGN_OFFICIAL_SIGNING_ROLE/i);
  assert.match(migration, /REVOKE_OFFICIAL_SIGNING_ROLE/i);
  assert.match(migration, /grant execute on function public\.set_official_role_assignment[\s\S]*to authenticated/i);
});

test("official signing derives role from clearance instead of a browser role field", async () => {
  const [service, input] = await Promise.all([
    readFile(signatureServicePath, "utf8"),
    readFile(signatureInputPath, "utf8")
  ]);

  assert.match(service, /recordOfficialClearanceSignature\(\s*\n?\s*supabase: SupabaseClient,\s*\n?\s*formData: FormData/);
  assert.match(service, /const definition = getClearanceDefinition\(clearanceType\)/);
  assert.doesNotMatch(input, /name=["']official_role["']/);
});
