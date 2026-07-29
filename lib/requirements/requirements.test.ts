import test from "node:test";
import assert from "node:assert/strict";
import { isRequirementAppliableToStudent, areRequirementsFulfilled, getMissingOrUnverifiedRequirements } from "./rules";
import { StudentRequirementRecord } from "./types";

test("isRequirementAppliableToStudent for HEALTH_RECORD_UPDATE", () => {
  assert.equal(
    isRequirementAppliableToStudent("HEALTH_RECORD_UPDATE", {
      student_type: "Incoming 1st Year Student",
      year_level: "1st Year",
      sex: "Female"
    }),
    true
  );

  assert.equal(
    isRequirementAppliableToStudent("HEALTH_RECORD_UPDATE", {
      student_type: "Old Student",
      year_level: "2nd Year",
      sex: "Female"
    }),
    false
  );
});

test("areRequirementsFulfilled checks status VERIFIED", () => {
  const records: StudentRequirementRecord[] = [
    {
      id: "1",
      student_id: "s1",
      requirement_code: "HEALTH_RECORD_UPDATE",
      status: "VERIFIED",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  assert.equal(areRequirementsFulfilled(["HEALTH_RECORD_UPDATE"], records), true);

  records[0].status = "PENDING";
  assert.equal(areRequirementsFulfilled(["HEALTH_RECORD_UPDATE"], records), false);

  assert.deepEqual(getMissingOrUnverifiedRequirements(["HEALTH_RECORD_UPDATE"], records), ["HEALTH_RECORD_UPDATE"]);
});
