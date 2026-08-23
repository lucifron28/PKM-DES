import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = "supabase/migrations/20260814000000_official_signer_management.sql";
const healthMigrationPath = "supabase/migrations/20260815000000_digital_health_record_verification.sql";
const healthFormMigrationPath = "supabase/migrations/20260823131029_health_record_update_form.sql";
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

  assert.match(service, /recordOfficialClearanceSignature\(\s*\n?\s*supabase: SupabaseClient,\s*\n?\s*profileId: string,\s*\n?\s*formData: FormData/);
  assert.match(service, /const definition = getClearanceDefinition\(clearanceType\)/);
  assert.doesNotMatch(input, /name=["']official_role["']/);
});

test("Health Record Update writes are Nurse-controlled and signature-aware", async () => {
  const migration = await readFile(healthMigrationPath, "utf8");

  assert.match(migration, /revoke insert, update, delete on table public\.student_requirements from authenticated/i);
  assert.match(migration, /drop function if exists public\.verify_health_requirement_with_signature\(uuid, uuid, text, text, text\)/i);
  assert.match(migration, /p_verification_acknowledged boolean/i);
  assert.match(migration, /acknowledgment_required/i);
  assert.match(migration, /p_note text/i);
  assert.match(migration, /create or replace function public\.reject_health_requirement/i);
  assert.match(migration, /private\.has_official_role_for_program\('NURSE', v_enrollment\.program_id\)/i);
  assert.match(migration, /NURSE_REJECT_HEALTH_REQUIREMENT/i);
  assert.match(migration, /grant execute on function public\.reject_health_requirement\(uuid, text\) to authenticated/i);
  assert.match(migration, /revoke execute on function public\.update_enrollment_requirement_status\(uuid, text, text, text\) from authenticated/i);
  assert.doesNotMatch(migration, /medical_condition|allergy|medication|menstrual|pregnancy|blood_pressure/i);
});

test("submitted Health Record Update details stay behind RLS and authenticated RPCs", async () => {
  const migration = await readFile(healthFormMigrationPath, "utf8");

  assert.match(migration, /alter table public\.health_record_updates enable row level security/i);
  assert.match(migration, /revoke all on table public\.health_record_updates from public, anon, authenticated/i);
  assert.match(migration, /create policy "health_record_updates_select_owner_or_nurse"/i);
  assert.match(migration, /private\.has_official_role_for_program\('NURSE', e\.program_id\)/i);
  assert.match(migration, /create or replace function public\.save_health_record_update/i);
  assert.match(migration, /s\.profile_id = auth\.uid\(\)/i);
  assert.match(migration, /grant execute on function public\.save_health_record_update[\s\S]*to authenticated/i);
  assert.match(migration, /health_record_not_submitted/i);
});
