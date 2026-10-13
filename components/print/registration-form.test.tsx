import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
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
  enrollment_subjects: [{
    id: "enrollment-subject-id",
    subject_id: "subject-id",
    course_offering_id: null,
    course_code: "GE 101",
    course_description: "Communication",
    units: 3
  }],
  enrollment_clearances: [],
  enrollment_signatures: [{
    id: "signature-id",
    enrollment_id: "enrollment-id",
    student_id: "student-id",
    signer_profile_id: "librarian-profile-id",
    signer_role: "LIBRARIAN",
    clearance_type: "LIBRARY_CLEARANCE",
    document_type: "ENROLLMENT_CLEARANCE",
    signer_name_snapshot: "Test Librarian",
    signature_storage_path: "signatures/librarian.png",
    document_hash: "test-hash",
    signed_at: "2026-10-02T00:00:00.000Z",
    signed_url: "/test-librarian-signature.png",
    is_current: true
  }]
} as unknown as PrintableEnrollment;

test("registration renderer prints four identical recipient copies and one policy page", () => {
  const markup = renderToStaticMarkup(React.createElement(RegistrationForm, {
    enrollment,
    registrationPledgeVersion: REGISTRATION_POLICY_VERSION
  }));
  const document = new JSDOM(markup).window.document;
  const copies = [...document.querySelectorAll("section.registration-print")];
  const policyStart = markup.indexOf('class="registration-policy-print print-page');
  const policyMarkup = markup.slice(policyStart);

  assert.deepEqual(copies.map((copy) => copy.querySelector(".registration-print-copy-label")?.textContent), [
    "STUDENT'S COPY",
    "DEAN'S COPY",
    "REGISTRAR'S COPY",
    "ACCOUNTANT'S COPY"
  ]);
  assert.equal(copies.length, 4);
  assert.ok(policyStart > markup.lastIndexOf("registration-print-copy-label"));
  assert.equal((markup.match(/class="registration-policy-print print-page/g) ?? []).length, 1);
  assert.equal(new Set([...document.querySelectorAll("[id]")].map((element) => element.id)).size, document.querySelectorAll("[id]").length);

  const normalizeCopy = (copy: Element) => {
    const normalized = copy.cloneNode(true) as Element;
    normalized.removeAttribute("data-copy-recipient");
    normalized.querySelector(".registration-print-copy-label")!.textContent = "COPY LABEL";
    normalized.querySelectorAll("[id], [aria-labelledby]").forEach((element) => {
      if (element.hasAttribute("id")) {
        element.setAttribute("id", element.getAttribute("id")!.replace(/-(student|dean|registrar|accountant)$/, "-recipient"));
      }
      if (element.hasAttribute("aria-labelledby")) {
        element.setAttribute("aria-labelledby", element.getAttribute("aria-labelledby")!.replace(/-(student|dean|registrar|accountant)\b/g, "-recipient"));
      }
    });
    return normalized.innerHTML;
  };

  const canonicalCopy = normalizeCopy(copies[0]);
  for (const [index, copy] of copies.entries()) {
    assert.equal(normalizeCopy(copy), canonicalCopy, `copy ${index + 1} differs beyond its recipient label`);
    assert.equal(copy.querySelectorAll(".registration-print-watermark").length, 1);
    assert.equal(copy.querySelector(".registration-print-watermark img")?.getAttribute("src"), "/brand/pkm-registration-watermark.png");
    assert.equal(copy.querySelector(".registration-print-field-value")?.textContent, "2026-0001");
    assert.equal(copy.querySelector(".registration-print-table tbody tr td")?.textContent, "GE 101");
    assert.equal(copy.querySelector('img[alt="Librarian electronic signature"]')?.getAttribute("src"), "/test-librarian-signature.png");
    assert.equal(copy.querySelector(".registration-print-signature-meta span")?.textContent, "Test Librarian");
  }

  assert.doesNotMatch(policyMarkup, /registration-print-watermark|pkm-registration-watermark\.png/);
  assert.doesNotMatch(markup, /registration-print-enrolled-stamp|ENROLLED WATERMARK|ENROLLED OVERLAY/i);
  assert.doesNotMatch(policyMarkup, /<img\b/);
});
