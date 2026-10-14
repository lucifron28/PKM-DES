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
    units: 3,
    day: "Monday",
    time: "8:00 AM–10:00 AM",
    room: "Room 101"
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
  assert.deepEqual(copies.map((copy) => copy.getAttribute("data-copy-recipient")), [
    "student",
    "dean",
    "registrar",
    "accountant"
  ]);
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
    const subjectCells = copy.querySelectorAll(".registration-print-table tbody tr:first-child td");
    assert.deepEqual([...subjectCells].map((cell) => cell.textContent), [
      "GE 101",
      "Communication",
      "8:00 AM–10:00 AM",
      "Monday",
      "Room 101",
      "3"
    ]);
    const librarian = copy.querySelector(".registration-print-signature-librarian");
    assert.ok(librarian);
    assert.equal(librarian.querySelector('img[alt="Librarian electronic signature"]')?.getAttribute("src"), "/test-librarian-signature.png");
    assert.equal(librarian.querySelector(".registration-print-signature-name")?.textContent, "Test Librarian");
    assert.ok(librarian.querySelector(".registration-print-signature-meta")?.classList.contains("print-hidden"));
    const librarianParts = [...librarian.children];
    assert.ok(librarianParts.indexOf(librarian.querySelector(".registration-print-signature-name")!) < librarianParts.indexOf(librarian.querySelector(".registration-print-signature-line")!));
    assert.ok(librarianParts.indexOf(librarian.querySelector(".registration-print-signature-line")!) < librarianParts.indexOf(librarian.querySelector(".registration-print-signature-label")!));
    assert.equal(copy.querySelector(".registration-print-signature-accountant .registration-print-signature-label")?.textContent, "ACTING MUNICIPAL ACCOUNTANT");
    const accountantName = copy.querySelector(".registration-print-signature-accountant .registration-print-signature-name");
    assert.equal(accountantName?.textContent, "\u00a0");
    assert.ok(accountantName?.classList.contains("registration-print-signature-name-spacer"));
    assert.equal(copy.querySelector(".registration-print-signature-nurse .registration-print-signature-label")?.textContent, "NURSE");
    assert.equal(copy.querySelector(".registration-print-privacy-signature .registration-print-signature-label")?.textContent, "Signature over printed name of the student");
  }

  assert.doesNotMatch(policyMarkup, /registration-print-watermark|pkm-registration-watermark\.png/);
  assert.doesNotMatch(
    [...copies].map((copy) => copy.textContent ?? "").join(" "),
    /\bENROLLED\b/i
  );
  assert.doesNotMatch(policyMarkup, /<img\b/);
});

test("registration renderer keeps null schedule snapshots as TBA", () => {
  const missingSchedule = {
    ...enrollment,
    enrollment_subjects: enrollment.enrollment_subjects?.map((row) => ({
      ...row,
      day: null,
      time: null,
      room: null
    }))
  };
  const markup = renderToStaticMarkup(React.createElement(RegistrationForm, {
    enrollment: missingSchedule,
    registrationPledgeVersion: REGISTRATION_POLICY_VERSION
  }));
  const document = new JSDOM(markup).window.document;
  const cells = document.querySelectorAll(".registration-print-table tbody tr:first-child td");

  assert.deepEqual([...cells].slice(2, 5).map((cell) => cell.textContent), [
    "TBA",
    "TBA",
    "TBA"
  ]);
});

test("registration renderer prints configured assessment and partial-payment values without inventing missing fees", () => {
  const assessedEnrollment = {
    ...enrollment,
    financial_summary: {
      fee_items: [
        { fee_code: "MISC_ADMISSION_FEE", fee_name: "Admission Fee", amount: 500 },
        { fee_code: "TUITION", fee_name: "Tuition Fee", amount: 18000 },
        { fee_code: "NSTP_CWTS", fee_name: "NSTP Fee (CWTS)", amount: 1500 },
        { fee_code: "SCHOLARSHIP", fee_name: "Scholarship", amount: 2000 }
      ],
      assessment_version: "QA-SYNTHETIC-1",
      assessed_amount: 20000,
      paid_amount: 5000,
      balance_due: 15000,
      currency_code: "PHP",
      payment_status: "PARTIAL",
      payment_receipts: [
        { payment_id: "payment-6", amount: 1000, paid_at: "2026-10-13T16:30:00.000Z", reference: "OR-006" },
        { payment_id: "payment-1", amount: 500, paid_at: "2026-10-08T01:00:00.000Z", reference: "OR-001" },
        { payment_id: "payment-5", amount: 1100, paid_at: "2026-10-12T01:00:00.000Z", reference: "OR-005" },
        { payment_id: "payment-2", amount: 750, paid_at: "2026-10-09T01:00:00.000Z", reference: "OR-002" },
        { payment_id: "payment-4", amount: 650, paid_at: "2026-10-11T01:00:00.000Z", reference: "OR-004" },
        { payment_id: "payment-3", amount: 1000, paid_at: "2026-10-10T01:00:00.000Z", reference: "OR-003" }
      ]
    }
  } as unknown as PrintableEnrollment;
  const markup = renderToStaticMarkup(React.createElement(RegistrationForm, { enrollment: assessedEnrollment }));
  const document = new JSDOM(markup).window.document;
  const copy = document.querySelector(".registration-print");
  assert.ok(copy);

  const feeRows = [...copy.querySelectorAll(".registration-print-fee-table tbody tr")];
  assert.equal(feeRows[0].querySelector("td")?.textContent, "PHP 500.00");
  assert.equal(feeRows[1].querySelector("td")?.textContent, "Not configured");
  assert.equal(copy.querySelector(".registration-print-fee-table tfoot th:last-child")?.textContent, "Not configured");

  const feeLines = [...copy.querySelectorAll(".registration-print-tuition .registration-print-fee-line")];
  assert.deepEqual(feeLines.map((line) => [...line.querySelectorAll("span")].map((part) => part.textContent?.trim()).join(" ")), [
    "TUITION FEE: PHP 18,000.00",
    "NSTP FEE (CWTS): PHP 1,500.00",
    "TOTAL TOSF: PHP 20,000.00"
  ]);
  assert.match(copy.querySelector(".registration-print-scholarship-line")?.textContent ?? "", /PHP 2,000\.00/);
  assert.deepEqual(
    [...copy.querySelectorAll(".registration-print-finance-summary span")].map((item) => item.textContent),
    [
      "STATUS: PARTIAL",
      "PAID: PHP 5,000.00 | BALANCE DUE: PHP 15,000.00"
    ]
  );
  assert.equal(copy.querySelector(".registration-print-finance-summary")?.getAttribute("data-assessment-version"), "QA-SYNTHETIC-1");
  const receiptRows = [...copy.querySelectorAll(".registration-print-payment-table tbody tr")];
  assert.equal(receiptRows.length, 4);
  assert.deepEqual(receiptRows.map((row) => [...row.querySelectorAll("td")].map((cell) => cell.textContent)), [
    ["Oct 10, 2026", "OR-003", "PHP 1,000.00"],
    ["Oct 11, 2026", "OR-004", "PHP 650.00"],
    ["Oct 12, 2026", "OR-005", "PHP 1,100.00"],
    ["Oct 14, 2026", "OR-006", "PHP 1,000.00"]
  ]);
  assert.match(copy.querySelector(".registration-print-receipt-overflow")?.textContent ?? "", /2 earlier receipts are not shown/);
  assert.match(copy.querySelector(".registration-print-receipt-overflow")?.textContent ?? "", /paid total includes all receipts/);
});

test("registration renderer leaves absent financial summary amounts unconfigured", () => {
  const markup = renderToStaticMarkup(React.createElement(RegistrationForm, { enrollment }));
  const document = new JSDOM(markup).window.document;
  const copy = document.querySelector(".registration-print");
  assert.ok(copy);

  assert.ok([...copy.querySelectorAll(".registration-print-fee-table tbody td")].every((cell) => cell.textContent === "Not configured"));
  assert.equal(copy.querySelector(".registration-print-fee-table tfoot th:last-child")?.textContent, "Not configured");
  assert.ok([...copy.querySelectorAll(".registration-print-tuition .registration-print-fee-line span:last-child")].every((value) => value.textContent === "Not configured"));
  assert.ok([...copy.querySelectorAll(".registration-print-finance-summary span")].every((value) => value.textContent?.endsWith("Not configured")));
  assert.equal(copy.querySelectorAll(".registration-print-payment-table tbody tr").length, 4);
  assert.ok([...copy.querySelectorAll(".registration-print-payment-table tbody td")].every((cell) => cell.textContent === ""));
  assert.equal(copy.querySelector(".registration-print-receipt-overflow"), null);
});

test("registration renderer prints recorded Registrar approval without inventing a signature", () => {
  const approvedEnrollment = {
    ...enrollment,
    registrar_approval: {
      name: "Shaira Mae E. Pajares",
      approved_at: "2026-10-02T00:00:00.000Z"
    }
  } as unknown as PrintableEnrollment;
  const markup = renderToStaticMarkup(React.createElement(RegistrationForm, { enrollment: approvedEnrollment }));
  const document = new JSDOM(markup).window.document;
  const registrar = document.querySelector(".registration-print-signature-registrar");
  assert.ok(registrar);
  assert.equal(registrar.querySelector(".registration-print-signature-line")?.textContent, "");
  assert.equal(registrar.querySelector(".registration-print-signature-image img"), null);
  assert.equal(registrar.querySelector(".registration-print-signature-name")?.textContent, "Shaira Mae E. Pajares");
  assert.equal(registrar.querySelector(".registration-print-signature-meta span")?.textContent, "Approved — Oct 2, 2026, 8:00 AM");
  assert.ok(registrar.querySelector(".registration-print-signature-meta")?.classList.contains("print-hidden"));
  const registrarParts = [...registrar.children];
  assert.ok(registrarParts.indexOf(registrar.querySelector(".registration-print-signature-name")!) < registrarParts.indexOf(registrar.querySelector(".registration-print-signature-line")!));
  assert.ok(registrarParts.indexOf(registrar.querySelector(".registration-print-signature-line")!) < registrarParts.indexOf(registrar.querySelector(".registration-print-signature-label")!));
  assert.match(registrar.querySelector(".registration-print-signature-label")?.textContent ?? "", /^Registrar$/);

  const noRecordedApproval = renderToStaticMarkup(React.createElement(RegistrationForm, { enrollment }));
  const emptyRegistrar = new JSDOM(noRecordedApproval).window.document.querySelector(".registration-print-signature-registrar");
  assert.ok(emptyRegistrar);
  assert.equal(emptyRegistrar.querySelector(".registration-print-signature-line")?.textContent, "");
  assert.equal(emptyRegistrar.querySelector(".registration-print-signature-name")?.textContent, "\u00a0");
  assert.ok(emptyRegistrar.querySelector(".registration-print-signature-name")?.classList.contains("registration-print-signature-name-spacer"));
  assert.equal(emptyRegistrar.querySelector(".registration-print-signature-meta"), null);
  assert.equal(emptyRegistrar.querySelector(".registration-print-signature-image img"), null);
});

test("registration and approval dates use Manila time across UTC date boundaries", () => {
  const originalTimezone = process.env.TZ;
  try {
    for (const timezone of ["UTC", "America/Los_Angeles"]) {
      process.env.TZ = timezone;
      const boundaryEnrollment = {
        ...enrollment,
        submitted_at: "2026-10-13T16:30:00.000Z",
        registrar_approval: {
          name: "Shaira Mae E. Pajares",
          approved_at: "2026-10-13T16:30:00.000Z"
        }
      } as unknown as PrintableEnrollment;
      const document = new JSDOM(renderToStaticMarkup(React.createElement(RegistrationForm, {
        enrollment: boundaryEnrollment
      }))).window.document;

      assert.equal(
        document.querySelector(".registration-print-details-secondary .registration-print-field-value")?.textContent,
        "October 14, 2026"
      );
      assert.equal(
        document.querySelector(".registration-print-signature-registrar .registration-print-signature-meta span:last-child")?.textContent,
        "Approved — Oct 14, 2026, 12:30 AM"
      );
    }
  } finally {
    if (originalTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimezone;
  }
});
