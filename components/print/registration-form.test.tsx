import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { REGISTRATION_POLICY_VERSION } from "@/lib/registration-form/policy";
import { RegistrationForm, type PrintableEnrollment } from "./registration-form";

Object.assign(globalThis, { React });

const enrollment = {
  id: "enrollment-id",
  student_id: "student-id",
  program_id: "program-id",
  year_level: "1st Year",
  academic_year: "2026-2027",
  semester: "1st Semester",
  status: "APPROVED",
  submitted_at: "2026-10-02T00:00:00.000Z",
  reviewed_at: null,
  reviewed_by: null,
  remarks: null,
  students: {
    id: "student-id",
    profile_id: "profile-id",
    student_id_number: "2026-0001",
    program_id: "program-id",
    year_level: "1st Year",
    student_type: "Incoming 1st Year Student",
    enrollment_status: "ENROLLED",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    profiles: { first_name: "Test", last_name: "Student" },
    official_student_records: { address: "Mauban, Quezon", gender_sex: null }
  },
  programs: { id: "program-id", name: "Bachelor of Information Technology", code: "BSIT" },
  enrollment_subjects: [],
  enrollment_clearances: [],
  enrollment_signatures: []
} as unknown as PrintableEnrollment;

test("registration renderer includes a front-only seal watermark without an enrollment stamp", () => {
  const markup = renderToStaticMarkup(React.createElement(RegistrationForm, {
    enrollment,
    registrationPledgeVersion: REGISTRATION_POLICY_VERSION
  }));
  const frontStart = markup.indexOf('class="registration-print print-page');
  const policyStart = markup.indexOf('class="registration-policy-print print-page');
  const frontMarkup = markup.slice(frontStart, policyStart);
  const policyMarkup = markup.slice(policyStart);

  assert.ok(frontStart >= 0);
  assert.ok(policyStart > frontStart);
  assert.equal((markup.match(/class="registration-print print-page/g) ?? []).length, 1);
  assert.equal((markup.match(/class="registration-policy-print print-page/g) ?? []).length, 1);
  assert.match(frontMarkup, /data-testid="registration-print-watermark"/);
  assert.match(frontMarkup, /src="\/brand\/pkm-registration-watermark\.png"/);
  assert.doesNotMatch(policyMarkup, /registration-print-watermark|pkm-registration-watermark\.png/);
  assert.doesNotMatch(markup, /registration-print-enrolled-stamp|ENROLLED WATERMARK|ENROLLED OVERLAY/i);
  assert.match(markup, /Pledge not yet signed\./);
  assert.doesNotMatch(policyMarkup, /<img\b/);
});
