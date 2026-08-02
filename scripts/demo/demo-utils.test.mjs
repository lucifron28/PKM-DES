import assert from "node:assert/strict";
import test from "node:test";
import { ACCOUNT_DEMO_RECORDS, CLAIM_ONLY_DEMO_RECORD } from "./demo-records.mjs";
import { validateDemoStudentOwnership, validateExactOfferingSnapshotSet, validateExactSubjectSet } from "./demo-utils.mjs";

const pendingRecord = ACCOUNT_DEMO_RECORDS.find((record) => record.key === "pending");

function createIdentity(record = pendingRecord) {
  const profile = { id: "auth-demo-user", email: record.email };
  return {
    student: {
      id: "student-demo-row",
      profile_id: profile.id,
      student_id_number: record.studentIdNumber
    },
    profile,
    authUser: { id: profile.id, email: record.email },
    expectedRecord: record
  };
}

test("accepts an exact account-backed demo email and Student ID pair", () => {
  assert.equal(validateDemoStudentOwnership(createIdentity()), true);
});

test("rejects a reserved Student ID linked to a non-demo profile", () => {
  const identity = createIdentity();
  identity.profile = { ...identity.profile, email: "institutional.user@example.org" };
  identity.authUser = { ...identity.authUser, email: identity.profile.email };

  assert.throws(() => validateDemoStudentOwnership(identity), /non-demo or mismatched/i);
});

test("rejects a claim-only Student ID with a student row", () => {
  const identity = createIdentity(CLAIM_ONLY_DEMO_RECORD);

  assert.throws(() => validateDemoStudentOwnership(identity), /claim-only demo Student ID/i);
});

test("rejects a demo email linked to the wrong Student ID", () => {
  const identity = createIdentity();
  identity.student = { ...identity.student, student_id_number: "99-99999" };

  assert.throws(() => validateDemoStudentOwnership(identity), /non-demo or mismatched/i);
});

test("accepts the exact configured subject set", () => {
  assert.equal(validateExactSubjectSet(["subject-1", "subject-2"], ["subject-2", "subject-1"]), 2);
});

test("rejects a same-size but incorrect subject set", () => {
  assert.throws(
    () => validateExactSubjectSet(["subject-1", "subject-2"], ["subject-1", "subject-3"]),
    /do not exactly match/i
  );
});

test("accepts exact offering attachment snapshots", () => {
  const offerings = [{ id: "offering-1", course_code: "GE-1", course_description: "Self", units: 3 }];
  const attachments = [{
    subject_id: null,
    course_offering_id: "offering-1",
    course_code: "GE-1",
    course_description: "Self",
    units: 3
  }];

  assert.equal(validateExactOfferingSnapshotSet(offerings, attachments), 1);
});

test("rejects an offering attachment with an incorrect snapshot", () => {
  const offerings = [{ id: "offering-1", course_code: "GE-1", course_description: "Self", units: 3 }];
  const attachments = [{
    subject_id: null,
    course_offering_id: "offering-1",
    course_code: "GE-1",
    course_description: "Changed",
    units: 3
  }];

  assert.throws(() => validateExactOfferingSnapshotSet(offerings, attachments), /snapshots do not exactly match/i);
});
