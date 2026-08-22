import assert from "node:assert/strict";
import test from "node:test";
import { getRequirementApplicability, isRequirementAppliableToStudent } from "@/lib/requirements/rules";
import { getHealthVerificationViewState } from "@/lib/health-records/presentation";
import { getEnrollmentClearanceOverview, getEnrollmentClearanceOverallStatus } from "@/lib/signatures/clearances";

test("getRequirementApplicability canonical rule: Incoming 1st Year Student + Female is APPLICABLE", () => {
  const result = getRequirementApplicability("HEALTH_RECORD_UPDATE", {
    student_type: "Incoming 1st Year Student",
    official_gender_sex: "Female"
  });
  assert.equal(result, "APPLICABLE");
  assert.equal(
    isRequirementAppliableToStudent("HEALTH_RECORD_UPDATE", {
      student_type: "Incoming 1st Year Student",
      official_gender_sex: "female"
    }),
    true
  );
  assert.equal(
    isRequirementAppliableToStudent("HEALTH_RECORD_UPDATE", {
      student_type: "Incoming 1st Year Student",
      official_gender_sex: "  FEMALE  "
    }),
    true
  );
});

test("getRequirementApplicability: Year Level 1st Year alone does not control applicability", () => {
  // Old Student + Female
  assert.equal(
    getRequirementApplicability("HEALTH_RECORD_UPDATE", {
      student_type: "Old Student",
      official_gender_sex: "Female"
    }),
    "NOT_APPLICABLE"
  );
  // Continuing Student + Female
  assert.equal(
    getRequirementApplicability("HEALTH_RECORD_UPDATE", {
      student_type: "Continuing Student",
      official_gender_sex: "Female"
    }),
    "NOT_APPLICABLE"
  );
  // Regular Student + Female
  assert.equal(
    getRequirementApplicability("HEALTH_RECORD_UPDATE", {
      student_type: "Regular Student",
      official_gender_sex: "Female"
    }),
    "NOT_APPLICABLE"
  );
  // Transferee + Female
  assert.equal(
    getRequirementApplicability("HEALTH_RECORD_UPDATE", {
      student_type: "Transferee",
      official_gender_sex: "Female"
    }),
    "NOT_APPLICABLE"
  );
  // Irregular Student + Female
  assert.equal(
    getRequirementApplicability("HEALTH_RECORD_UPDATE", {
      student_type: "Irregular Student",
      official_gender_sex: "Female"
    }),
    "NOT_APPLICABLE"
  );
});

test("getRequirementApplicability: Incoming 1st Year Male or Unknown Gender is NOT_APPLICABLE", () => {
  assert.equal(
    getRequirementApplicability("HEALTH_RECORD_UPDATE", {
      student_type: "Incoming 1st Year Student",
      official_gender_sex: "Male"
    }),
    "NOT_APPLICABLE"
  );
  assert.equal(
    getRequirementApplicability("HEALTH_RECORD_UPDATE", {
      student_type: "Incoming 1st Year Student",
      official_gender_sex: null
    }),
    "NOT_APPLICABLE"
  );
  assert.equal(
    getRequirementApplicability("HEALTH_RECORD_UPDATE", {
      student_type: "Incoming 1st Year Student",
      official_gender_sex: ""
    }),
    "NOT_APPLICABLE"
  );
  assert.equal(
    getRequirementApplicability("HEALTH_RECORD_UPDATE", {
      student_type: "Incoming 1st Year Student",
      official_gender_sex: "Prefer not to say"
    }),
    "NOT_APPLICABLE"
  );
});

test("getHealthVerificationViewState presentation handles all transitions cleanly", () => {
  assert.equal(
    getHealthVerificationViewState({
      applicability: "NOT_APPLICABLE",
      status: "PENDING",
      nurseSignatureIsCurrent: false
    }),
    "NOT_APPLICABLE"
  );

  assert.equal(
    getHealthVerificationViewState({
      applicability: "APPLICABLE",
      status: "PENDING",
      nurseSignatureIsCurrent: false
    }),
    "PENDING"
  );

  assert.equal(
    getHealthVerificationViewState({
      applicability: "APPLICABLE",
      status: "VERIFIED",
      nurseSignatureIsCurrent: true
    }),
    "VERIFIED"
  );

  assert.equal(
    getHealthVerificationViewState({
      applicability: "APPLICABLE",
      status: "VERIFIED",
      nurseSignatureIsCurrent: false
    }),
    "LEGACY_VERIFICATION"
  );

  assert.equal(
    getHealthVerificationViewState({
      applicability: "APPLICABLE",
      status: "REJECTED",
      nurseSignatureIsCurrent: false
    }),
    "REJECTED"
  );
});

test("getEnrollmentClearanceOverview accurately computes health clearance status", () => {
  // Not applicable health
  const notAppOverview = getEnrollmentClearanceOverview("NOT_APPLICABLE", {});
  const healthItemNotApp = notAppOverview.find((item) => item.clearanceType === "HEALTH_CLEARANCE");
  assert.equal(healthItemNotApp?.status, "NOT_APPLICABLE");

  // Applicable pending health
  const appOverview = getEnrollmentClearanceOverview("APPLICABLE", {});
  const healthItemApp = appOverview.find((item) => item.clearanceType === "HEALTH_CLEARANCE");
  assert.equal(healthItemApp?.status, "PENDING");

  // Overall status when all other clearances are signed and health is NOT_APPLICABLE
  const allSignedExceptNotAppHealth = getEnrollmentClearanceOverview("NOT_APPLICABLE", {
    STUDENT_ENROLLMENT_SIGNATURE: { exists: true, isCurrent: true },
    LIBRARY_CLEARANCE: { exists: true, isCurrent: true },
    PROGRAM_CLEARANCE: { exists: true, isCurrent: true },
    ACCOUNTING_CLEARANCE: { exists: true, isCurrent: true },
    DEAN_CLEARANCE: { exists: true, isCurrent: true }
  });
  assert.equal(getEnrollmentClearanceOverallStatus(allSignedExceptNotAppHealth), "COMPLETE");
});
