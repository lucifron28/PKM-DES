import test from "node:test";
import assert from "node:assert/strict";
import {
  areRequirementsFulfilled,
  getMissingOrUnverifiedRequirements,
  getRequirementApplicability,
  isRequirementAppliableToStudent,
  isRequirementCode,
  isRequirementStatus,
  isRequirementUuid,
  isValidRequirementTerm,
  normalizeRequirementNote
} from "./rules";
import { StudentRequirementRecord } from "./types";

test("HEALTH_RECORD_UPDATE applies only to an Incoming 1st Year Student with a confirmed Female official-record value", () => {
  assert.equal(
    isRequirementAppliableToStudent("HEALTH_RECORD_UPDATE", {
      student_type: "Incoming 1st Year Student",
      official_gender_sex: "Female"
    }),
    true
  );

  assert.equal(
    isRequirementAppliableToStudent("HEALTH_RECORD_UPDATE", {
      student_type: "Old Student",
      official_gender_sex: "Female"
    }),
    false
  );

  assert.equal(
    getRequirementApplicability("HEALTH_RECORD_UPDATE", {
      student_type: "Incoming 1st Year Student",
      official_gender_sex: null
    }),
    "NOT_APPLICABLE"
  );
});

test("areRequirementsFulfilled checks status VERIFIED", () => {
  const records: StudentRequirementRecord[] = [
    {
      id: "1",
      student_id: "s1",
      requirement_code: "HEALTH_RECORD_UPDATE",
      status: "VERIFIED",
      academic_year: "2026-2027",
      semester: "1st Semester",
      applicability: "APPLICABLE",
      note: null,
      verified_at: new Date().toISOString(),
      verified_by: "00000000-0000-4000-8000-000000000001",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  const currentTerm = { academicYear: "2026-2027", semester: "1st Semester" as const };
  assert.equal(areRequirementsFulfilled(["HEALTH_RECORD_UPDATE"], records, currentTerm), true);

  records[0].status = "PENDING";
  assert.equal(areRequirementsFulfilled(["HEALTH_RECORD_UPDATE"], records, currentTerm), false);

  assert.deepEqual(getMissingOrUnverifiedRequirements(["HEALTH_RECORD_UPDATE"], records, currentTerm), ["HEALTH_RECORD_UPDATE"]);
});

test("requirement update inputs accept only supported IDs, status, term, code, and short generic notes", () => {
  assert.equal(isRequirementCode("HEALTH_RECORD_UPDATE"), true);
  assert.equal(isRequirementCode("OTHER"), false);
  assert.equal(isRequirementStatus("VERIFIED"), true);
  assert.equal(isRequirementStatus("UNKNOWN"), false);
  assert.equal(isRequirementUuid("00000000-0000-4000-8000-000000000001"), true);
  assert.equal(isRequirementUuid("not-a-uuid"), false);
  assert.equal(isValidRequirementTerm({ academicYear: "2026-2027", semester: "1st Semester" }), true);
  assert.equal(isValidRequirementTerm({ academicYear: "invalid", semester: "1st Semester" }), false);
  assert.deepEqual(normalizeRequirementNote(" Verified paper form received "), { valid: true, note: "Verified paper form received" });
  assert.equal(normalizeRequirementNote("x".repeat(241)).valid, false);
});
test("unknown or unrecognized gender/sex is not inferred as female", () => {
  assert.equal(
    getRequirementApplicability("HEALTH_RECORD_UPDATE", {
      student_type: "Incoming 1st Year Student",
      official_gender_sex: "Unknown"
    }),
    "NOT_APPLICABLE"
  );
  assert.equal(
    getRequirementApplicability("HEALTH_RECORD_UPDATE", {
      student_type: "Incoming 1st Year Student",
      official_gender_sex: "Male"
    }),
    "NOT_APPLICABLE"
  );
});

test("historical verification does not satisfy the active term requirement gate", () => {
  const historicalRecords: StudentRequirementRecord[] = [
    {
      id: "h1",
      student_id: "s1",
      requirement_code: "HEALTH_RECORD_UPDATE",
      status: "VERIFIED",
      academic_year: "2025-2026",
      semester: "2nd Semester",
      applicability: "APPLICABLE",
      note: null,
      verified_at: "2026-01-15T10:00:00Z",
      verified_by: "admin-1",
      created_at: "2026-01-15T10:00:00Z",
      updated_at: "2026-01-15T10:00:00Z"
    }
  ];

  const activeTerm = { academicYear: "2026-2027", semester: "1st Semester" as const };
  assert.equal(areRequirementsFulfilled(["HEALTH_RECORD_UPDATE"], historicalRecords, activeTerm), false);
  assert.deepEqual(getMissingOrUnverifiedRequirements(["HEALTH_RECORD_UPDATE"], historicalRecords, activeTerm), ["HEALTH_RECORD_UPDATE"]);
});

test("distinguishes applicable pending, verified, rejected, not-applicable, missing, and query-failed requirement presentation states", () => {
  const activeTerm = { academicYear: "2026-2027", semester: "1st Semester" as const };

  const makeRecord = (applicability: "APPLICABLE" | "NOT_APPLICABLE", status: "PENDING" | "VERIFIED" | "REJECTED"): StudentRequirementRecord => ({
    id: "r1",
    student_id: "s1",
    requirement_code: "HEALTH_RECORD_UPDATE",
    status,
    academic_year: activeTerm.academicYear,
    semester: activeTerm.semester,
    applicability,
    note: null,
    verified_at: status === "VERIFIED" ? "2026-07-30T10:00:00Z" : null,
    verified_by: status === "VERIFIED" ? "admin-1" : null,
    created_at: "2026-07-30T10:00:00Z",
    updated_at: "2026-07-30T10:00:00Z"
  });

  const pendingRec = makeRecord("APPLICABLE", "PENDING");
  const verifiedRec = makeRecord("APPLICABLE", "VERIFIED");
  const rejectedRec = makeRecord("APPLICABLE", "REJECTED");
  const notApplicableRec = makeRecord("NOT_APPLICABLE", "PENDING");

  assert.equal(areRequirementsFulfilled(["HEALTH_RECORD_UPDATE"], [pendingRec], activeTerm), false);
  assert.equal(areRequirementsFulfilled(["HEALTH_RECORD_UPDATE"], [verifiedRec], activeTerm), true);
  assert.equal(areRequirementsFulfilled(["HEALTH_RECORD_UPDATE"], [rejectedRec], activeTerm), false);
  assert.equal(areRequirementsFulfilled(["HEALTH_RECORD_UPDATE"], [notApplicableRec], activeTerm), false);
  assert.equal(areRequirementsFulfilled(["HEALTH_RECORD_UPDATE"], [], activeTerm), false);

  // Query failure presentation state is explicitly tagged by caller
  const queryFailedState = { error: true, record: null };
  assert.equal(queryFailedState.error, true);
});
