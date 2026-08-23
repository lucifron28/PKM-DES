import assert from "node:assert/strict";
import test from "node:test";
import { getRequirementApplicability, isRequirementAppliableToStudent } from "@/lib/requirements/rules";
import { getHealthVerificationViewState } from "@/lib/health-records/presentation";
import { getEnrollmentClearanceOverview, getEnrollmentClearanceOverallStatus } from "@/lib/signatures/clearances";

test("getRequirementApplicability canonical rule: Transferee and Incoming 1st Year Female require special form", () => {
  // Incoming 1st Year + Female
  assert.equal(
    getRequirementApplicability("HEALTH_RECORD_UPDATE", {
      student_type: "Incoming 1st Year Student",
      official_gender_sex: "Female"
    }),
    "APPLICABLE"
  );
  assert.equal(
    isRequirementAppliableToStudent("HEALTH_RECORD_UPDATE", {
      student_type: "Incoming 1st Year Student",
      official_gender_sex: "female"
    }),
    true
  );

  // Transferee Female
  assert.equal(
    getRequirementApplicability("HEALTH_RECORD_UPDATE", {
      student_type: "Transferee",
      official_gender_sex: "Female"
    }),
    "APPLICABLE"
  );
  assert.equal(
    isRequirementAppliableToStudent("HEALTH_RECORD_UPDATE", {
      student_type: "Transferee",
      official_gender_sex: "female"
    }),
    true
  );

  // Transferee Male (Sex does not disable Transferee special form)
  assert.equal(
    getRequirementApplicability("HEALTH_RECORD_UPDATE", {
      student_type: "Transferee",
      official_gender_sex: "Male"
    }),
    "APPLICABLE"
  );
  assert.equal(
    isRequirementAppliableToStudent("HEALTH_RECORD_UPDATE", {
      student_type: "Transferee",
      official_gender_sex: "male"
    }),
    true
  );

  // Transferee with null gender
  assert.equal(
    getRequirementApplicability("HEALTH_RECORD_UPDATE", {
      student_type: "Transferee",
      official_gender_sex: null
    }),
    "APPLICABLE"
  );
});

test("getRequirementApplicability: Year Level 1st Year alone does not control special form", () => {
  // Old Student + Female (1st Year)
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
  // Irregular Student + Female
  assert.equal(
    getRequirementApplicability("HEALTH_RECORD_UPDATE", {
      student_type: "Irregular Student",
      official_gender_sex: "Female"
    }),
    "NOT_APPLICABLE"
  );
});

test("getRequirementApplicability: Incoming 1st Year Male or Unknown Gender does not require special form", () => {
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

test("getHealthVerificationViewState presentation handles all special form transitions cleanly", () => {
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

test("getEnrollmentClearanceOverview: Health Clearance is always required for all students", () => {
  // Pending health clearance
  const pendingOverview = getEnrollmentClearanceOverview("NOT_APPLICABLE", {});
  const healthItemPending = pendingOverview.find((item) => item.clearanceType === "HEALTH_CLEARANCE");
  assert.equal(healthItemPending?.status, "PENDING");
  assert.equal(healthItemPending?.required, true);

  // When Health Clearance is signed, it shows SIGNED
  const signedOverview = getEnrollmentClearanceOverview("NOT_APPLICABLE", {
    HEALTH_CLEARANCE: { exists: true, isCurrent: true, signerName: "Florence Nurse", signedAt: "2026-08-22T00:00:00Z" }
  });
  const healthItemSigned = signedOverview.find((item) => item.clearanceType === "HEALTH_CLEARANCE");
  assert.equal(healthItemSigned?.status, "SIGNED");

  // Overall status is INCOMPLETE if Health Clearance is missing
  const withoutHealth = getEnrollmentClearanceOverview("NOT_APPLICABLE", {
    STUDENT_ENROLLMENT_SIGNATURE: { exists: true, isCurrent: true },
    LIBRARY_CLEARANCE: { exists: true, isCurrent: true },
    PROGRAM_CLEARANCE: { exists: true, isCurrent: true },
    ACCOUNTING_CLEARANCE: { exists: true, isCurrent: true },
    DEAN_CLEARANCE: { exists: true, isCurrent: true }
  });
  assert.equal(getEnrollmentClearanceOverallStatus(withoutHealth), "INCOMPLETE");

  // Overall status is COMPLETE only when ALL clearances including Health are signed
  const allSigned = getEnrollmentClearanceOverview("NOT_APPLICABLE", {
    STUDENT_ENROLLMENT_SIGNATURE: { exists: true, isCurrent: true },
    LIBRARY_CLEARANCE: { exists: true, isCurrent: true },
    HEALTH_CLEARANCE: { exists: true, isCurrent: true },
    PROGRAM_CLEARANCE: { exists: true, isCurrent: true },
    ACCOUNTING_CLEARANCE: { exists: true, isCurrent: true },
    DEAN_CLEARANCE: { exists: true, isCurrent: true }
  });
  assert.equal(getEnrollmentClearanceOverallStatus(allSigned), "COMPLETE");
});
