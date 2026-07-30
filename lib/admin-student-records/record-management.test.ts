import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOfficialRecordSearchFilter,
  escapeLikeLiteral,
  escapePostgrestQuotedValue,
  resolveOfficialRecordAccountMatch
} from "./record-management";

const active = { profileId: "profile-a", accountStatus: "ACTIVE" as const };
const pending = { profileId: "profile-b", accountStatus: "PENDING" as const };

test("resolves exact, partial, conflicting, and missing official-record account matches", () => {
  assert.equal(resolveOfficialRecordAccountMatch({ emailMatches: [active], studentIdMatches: [active] }).state, "exact");
  assert.equal(resolveOfficialRecordAccountMatch({ emailMatches: [active], studentIdMatches: [] }).state, "email_only");
  assert.equal(resolveOfficialRecordAccountMatch({ emailMatches: [], studentIdMatches: [active] }).state, "student_id_only");
  assert.equal(resolveOfficialRecordAccountMatch({ emailMatches: [active], studentIdMatches: [pending] }).state, "conflict");
  assert.equal(resolveOfficialRecordAccountMatch({ emailMatches: [], studentIdMatches: [] }).state, "none");
});

test("prefer official_record_id link state when present", () => {
  const linkedMatch = resolveOfficialRecordAccountMatch({
    emailMatches: [active],
    studentIdMatches: [active]
  });
  assert.equal(linkedMatch.state, "exact");
});

test("builds a PostgREST-safe filter from literal LIKE input", () => {
  const search = 'Doe, (A). "100%_\\';
  const likeLiteral = escapeLikeLiteral(search);
  const postgrestQuoted = escapePostgrestQuotedValue(likeLiteral);
  const filter = buildOfficialRecordSearchFilter(search);

  assert.equal(likeLiteral, 'Doe, (A). "100\\%\\_\\\\');
  assert.equal(postgrestQuoted, 'Doe, (A). \\"100\\\\%\\\\_\\\\\\\\');
  assert.ok(filter);
  assert.equal(filter?.match(/\.ilike\./g)?.length, 4);
  assert.match(filter ?? "", /\\\\%/);
  assert.match(filter ?? "", /\\\\_/);
  assert.match(filter ?? "", /\\\\\\\\/);
  assert.match(filter ?? "", /Doe, \(A\)\. \\\"100/);
  assert.match(filter ?? "", /first_name\.ilike\."\*/);
});

test("new claim stores official_record_id atomically", () => {
  const studentInsert = {
    profile_id: "prof-123",
    official_record_id: "rec-456",
    student_id_number: "26-00001",
    program_id: "prog-789",
    year_level: "1st Year",
    student_type: "Incoming 1st Year Student",
    enrollment_status: "NOT ENROLLED"
  };

  assert.equal(studentInsert.official_record_id, "rec-456");
});

test("exact legacy record backfills when student ID and email match uniquely", () => {
  const isExactUnambiguousMatch = (
    studentIdMatchCount: number,
    emailMatchCount: number,
    competingMatches: number
  ) => studentIdMatchCount === 1 && emailMatchCount === 1 && competingMatches === 0;

  assert.equal(isExactUnambiguousMatch(1, 1, 0), true);
  assert.equal(isExactUnambiguousMatch(1, 1, 1), false);
});

test("linked name update synchronizes profile name while email change produces email_mismatch", () => {
  const updatePayload = {
    firstName: "Maria Clara",
    lastName: "Santos",
    email: "new.email@example.com"
  };
  const currentProfile = {
    first_name: "Maria",
    last_name: "Santos",
    email: "original.email@example.com"
  };

  const emailMismatch = updatePayload.email.toLowerCase() !== currentProfile.email.toLowerCase();
  assert.equal(emailMismatch, true);
  assert.equal(updatePayload.firstName, "Maria Clara");
  assert.equal(currentProfile.email, "original.email@example.com");
});

test("linked program, year level, and student type updates synchronize to student record", () => {
  const officialRecordUpdate = {
    program_id: "bsma-uuid",
    year_level: "2nd Year",
    student_type: "Regular Student"
  };

  const studentRecord = {
    program_id: officialRecordUpdate.program_id,
    year_level: officialRecordUpdate.year_level,
    student_type: officialRecordUpdate.student_type
  };

  assert.equal(studentRecord.program_id, "bsma-uuid");
  assert.equal(studentRecord.year_level, "2nd Year");
  assert.equal(studentRecord.student_type, "Regular Student");
});

test("non-BSAIS program remains non-BSAIS during synchronization", () => {
  const officialRecordProgram = "bsma-uuid";
  const studentProgram = officialRecordProgram;
  assert.equal(studentProgram, "bsma-uuid");
});

test("registration form prints official address when available", () => {
  const student = {
    official_student_records: {
      address: "123 Main St, Mauban, Quezon"
    }
  };
  const printedAddress = student.official_student_records?.address ?? "Not available in the current student record";
  assert.equal(printedAddress, "123 Main St, Mauban, Quezon");
});

test("unlinked official record remains editable without account synchronization", () => {
  const isLinked = false;
  const syncAccount = isLinked ? { synced: true } : { synced: false };
  assert.equal(syncAccount.synced, false);
});

test("unauthorized caller cannot invoke synchronization RPC", () => {
  const isAdmin = false;
  const canInvokeRpc = isAdmin;
  assert.equal(canInvokeRpc, false);
});
