import assert from "node:assert/strict";
import test from "node:test";
import { buildOfficialRecordSearchFilter, resolveOfficialRecordAccountMatch } from "./record-management";

const active = { profileId: "profile-a", accountStatus: "ACTIVE" as const };
const pending = { profileId: "profile-b", accountStatus: "PENDING" as const };

test("resolves exact, partial, conflicting, and missing official-record account matches", () => {
  assert.equal(resolveOfficialRecordAccountMatch({ emailMatches: [active], studentIdMatches: [active] }).state, "exact");
  assert.equal(resolveOfficialRecordAccountMatch({ emailMatches: [active], studentIdMatches: [] }).state, "email_only");
  assert.equal(resolveOfficialRecordAccountMatch({ emailMatches: [], studentIdMatches: [active] }).state, "student_id_only");
  assert.equal(resolveOfficialRecordAccountMatch({ emailMatches: [active], studentIdMatches: [pending] }).state, "conflict");
  assert.equal(resolveOfficialRecordAccountMatch({ emailMatches: [], studentIdMatches: [] }).state, "none");
});

test("quotes reserved search characters and keeps wildcard characters literal", () => {
  const filter = buildOfficialRecordSearchFilter('Doe, (A) "100%_\\');

  assert.ok(filter);
  assert.equal(filter?.match(/\.ilike\./g)?.length, 4);
  assert.match(filter ?? "", /\\%/);
  assert.match(filter ?? "", /\\_/);
  assert.match(filter ?? "", /\\\\/);
  assert.match(filter ?? "", /first_name\.ilike\."\*/);
});
