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
