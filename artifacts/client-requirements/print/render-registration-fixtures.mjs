import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import React from "react";
import { chromium } from "@playwright/test";
import autoprefixer from "autoprefixer";
import postcss from "postcss";
import sharp from "sharp";
import tailwindcss from "tailwindcss";
import { renderToStaticMarkup } from "react-dom/server";
import { RegistrationForm } from "../../../components/print/registration-form.tsx";
import { REGISTRATION_POLICY_VERSION } from "../../../lib/registration-form/policy.ts";
import tailwindConfig from "../../../tailwind.config.ts";

Object.assign(globalThis, { React });

const root = process.cwd();
const outputDirectory = path.join(root, "artifacts/client-requirements/print");
const publicDirectory = path.join(root, "public");
const cssPath = path.join(root, "app/globals.css");
const resolvedTailwindConfig = tailwindConfig.default ?? tailwindConfig;
const comparisonOnly = process.argv.includes("--matched-css-comparison");
const comparisonBase = "34f5b418aef4f98ddacd22b8fd93c69011918682";
async function compileGlobalsCss(source) {
  return (await postcss([tailwindcss(resolvedTailwindConfig), autoprefixer()])
    .process(source, { from: cssPath })).css;
}

const globalsCss = await compileGlobalsCss(await readFile(cssPath, "utf8"));
const baseGlobalsCss = comparisonOnly
  ? await compileGlobalsCss(execFileSync("git", ["show", `${comparisonBase}:app/globals.css`], { cwd: root, encoding: "utf8" }))
  : null;
if (!globalsCss.includes(".sr-only")) {
  throw new Error("Tailwind CSS did not compile the accessibility utilities");
}

const oldQaPage = path.join(root, "artifacts/registration-watermark/phase1a-current-page-1-20261009.png");
const oldQaPolicyPage = path.join(root, "artifacts/registration-watermark/phase1a-current-page-2-20261009.png");
async function signatureCrop(imagePath, region) {
  const image = await sharp(imagePath).extract(region).png().toBuffer();
  return "data:image/png;base64," + image.toString("base64");
}

const qaSignatureImages = {
  accountant: await signatureCrop(oldQaPage, { left: 525, top: 1018, width: 125, height: 32 }),
  librarian: await signatureCrop(oldQaPage, { left: 965, top: 1016, width: 130, height: 33 }),
  nurse: await signatureCrop(oldQaPage, { left: 965, top: 1129, width: 130, height: 35 }),
  dean: await signatureCrop(oldQaPage, { left: 525, top: 1232, width: 125, height: 35 }),
  programChair: await signatureCrop(oldQaPage, { left: 965, top: 1230, width: 130, height: 36 }),
  student: await signatureCrop(oldQaPolicyPage, { left: 530, top: 1128, width: 190, height: 54 })
};

const signedAt = "2026-10-09T09:30:00.000Z";
const currentApprovalAt = "2026-10-13T16:30:00.000Z";
const historicalSignatureFixtures = [
  { clearance_type: "ACCOUNTING_CLEARANCE", signer_name_snapshot: "QA ACCOUNTING OFFICE", signed_url: qaSignatureImages.accountant },
  { clearance_type: "LIBRARY_CLEARANCE", signer_name_snapshot: "QA LIBRARY OFFICE", signed_url: qaSignatureImages.librarian },
  { clearance_type: "HEALTH_CLEARANCE", signer_name_snapshot: "QA HEALTH OFFICE", signed_url: qaSignatureImages.nurse },
  { clearance_type: "DEAN_CLEARANCE", signer_name_snapshot: "QA DEAN'S OFFICE", signed_url: qaSignatureImages.dean },
  { clearance_type: "PROGRAM_CLEARANCE", signer_name_snapshot: "QA PROGRAM OFFICE", signed_url: qaSignatureImages.programChair },
  { clearance_type: "STUDENT_ENROLLMENT_SIGNATURE", signer_name_snapshot: "QA STUDENT QA FIXTURE", signed_url: qaSignatureImages.student }
].map((signature) => ({
  ...signature,
  signed_at: signedAt,
  is_current: true
}));

function syntheticSignatureImage(role) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="80" viewBox="0 0 480 80">
    <path d="M8 46 C25 18 25 68 42 39 S59 20 66 48 C73 62 85 31 93 44 S111 59 121 28 C126 13 133 55 142 44 S155 36 164 48 C171 57 177 25 185 38 S198 61 207 36 C213 19 220 60 232 44 S249 32 259 47 C270 61 282 24 291 40 S302 52 311 34 C320 18 326 55 338 43" fill="none" stroke="#111827" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="475" y="73" text-anchor="end" font-family="Arial, sans-serif" font-size="19" font-weight="700" fill="#c00000">QA SYNTHETIC - ${role}</text>
  </svg>`;
  return "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
}

const currentOfficialSignatureFixtures = [
  { clearance_type: "ACCOUNTING_CLEARANCE", signer_name_snapshot: "Atty. Romela D. Devera", signed_url: syntheticSignatureImage("ACCOUNTANT") },
  { clearance_type: "LIBRARY_CLEARANCE", signer_name_snapshot: "Mary May P. Lanceta", signed_url: syntheticSignatureImage("LIBRARIAN") },
  { clearance_type: "HEALTH_CLEARANCE", signer_name_snapshot: "Danella Joyce P. Urgelles, RN", signed_url: syntheticSignatureImage("NURSE") },
  { clearance_type: "DEAN_CLEARANCE", signer_name_snapshot: "Justiniano L. Santos, CPA, MBA", signed_url: syntheticSignatureImage("DEAN") },
  { clearance_type: "PROGRAM_CLEARANCE", signer_name_snapshot: "Ronel E. Caagbay, CPA, MBA", signed_url: syntheticSignatureImage("PROGRAM CHAIR") },
  { clearance_type: "STUDENT_ENROLLMENT_SIGNATURE", signer_name_snapshot: "QA LONG-NAME FIXTURE STUDENT", signed_url: syntheticSignatureImage("STUDENT PLEDGE") }
].map((signature) => ({
  ...signature,
  signed_at: signedAt,
  is_current: true
}));

const scheduleFixtures = [
  { day: "M/W/F", time: "7:30 AM - 9:00 AM", room: "Computer Laboratory 204" },
  { day: "T/TH", time: "10:00 AM - 12:00 PM", room: "Science Laboratory 2" },
  { day: "W", time: null, room: null }
];

const currentFinancialSummary = {
  fee_items: [
    { fee_code: "MISC_ADMISSION_FEE", fee_name: "Admission Fee", amount: 500 },
    { fee_code: "MISC_ATHLETIC_FEE", fee_name: "Athletic Fee", amount: 100 },
    { fee_code: "MISC_COMPUTER_FEE", fee_name: "Computer Fee", amount: 300 },
    { fee_code: "MISC_CULTURAL_FEE", fee_name: "Cultural Fee", amount: 150 },
    { fee_code: "MISC_DEVELOPMENT_FEE", fee_name: "Development Fee", amount: 250 },
    { fee_code: "MISC_ENTRANCE_FEE", fee_name: "Entrance Fee", amount: 200 },
    { fee_code: "MISC_GUIDANCE_FEE", fee_name: "Guidance Fee", amount: 100 },
    { fee_code: "MISC_HANDBOOK_FEE", fee_name: "Handbook Fee", amount: 75 },
    { fee_code: "MISC_LABORATORY_FEE", fee_name: "Laboratory Fee", amount: 400 },
    { fee_code: "MISC_LIBRARY_FEE", fee_name: "Library Fee", amount: 100 },
    { fee_code: "MISC_MEDICAL_AND_DENTAL_FEE", fee_name: "Medical and Dental Fee", amount: 125 },
    { fee_code: "MISC_REGISTRATION_FEE", fee_name: "Registration Fee", amount: 100 },
    { fee_code: "MISC_SCHOOL_ID_FEE", fee_name: "School ID Fee", amount: 50 },
    { fee_code: "TUITION", fee_name: "Tuition Fee", amount: 18000 },
    { fee_code: "NSTP_CWTS", fee_name: "NSTP Fee (CWTS)", amount: 1500 },
    { fee_code: "SCHOLARSHIP", fee_name: "Scholarship", amount: 2000 }
  ],
  assessment_version: "QA-SYNTHETIC-2026-01",
  assessed_amount: 19950,
  paid_amount: 5000,
  balance_due: 14950,
  currency_code: "PHP",
  payment_status: "PARTIAL",
  payment_receipts: [
    { payment_id: "qa-payment-001", amount: 500, paid_at: "2026-10-08T01:00:00.000Z", reference: "OR-2026-001" },
    { payment_id: "qa-payment-002", amount: 750, paid_at: "2026-10-09T01:00:00.000Z", reference: "OR-2026-002" },
    { payment_id: "qa-payment-003", amount: 1000, paid_at: "2026-10-10T01:00:00.000Z", reference: "OR-2026-003" },
    { payment_id: "qa-payment-004", amount: 650, paid_at: "2026-10-11T01:00:00.000Z", reference: "OR-2026-004" },
    { payment_id: "qa-payment-005", amount: 1100, paid_at: "2026-10-12T01:00:00.000Z", reference: "OR-2026-005" },
    { payment_id: "qa-payment-006", amount: 1000, paid_at: "2026-10-13T16:30:00.000Z", reference: "OR-2026-006" }
  ]
};

function makeEnrollment(caseName) {
  const isCurrent = caseName === "current";
  const studentNumber = isCurrent ? "QA-CURRENT-001" : "QA-HISTORY-001";
  return {
    id: "enrollment-" + caseName,
    student_id: "student-id",
    program_id: "program-id",
    year_level: "1st Year",
    academic_year: "2026-2027",
    semester: "1st Semester",
    status: "APPROVED",
    submitted_at: signedAt,
    reviewed_at: isCurrent ? currentApprovalAt : null,
    reviewed_by: isCurrent ? "qa-registrar-reviewer-profile" : null,
    remarks: null,
    students: {
      id: "student-id",
      profile_id: "profile-id",
      student_id_number: studentNumber,
      program_id: "program-id",
      year_level: "1st Year",
      student_type: "Incoming 1st Year Student",
      enrollment_status: "NOT ENROLLED",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      profiles: isCurrent
        ? { first_name: "Alexandria Maximiliana Christina", last_name: "QA Print Fixture" }
        : { first_name: "QA", last_name: "Fixture" },
      official_student_records: { address: "Mauban, Quezon", gender_sex: null }
    },
    programs: {
      id: "program-id",
      name: isCurrent
        ? "Bachelor of Science in Information Technology - Long Program Name Fixture"
        : "Bachelor of Information Technology",
      code: "BSIT"
    },
    enrollment_subjects: Array.from({ length: 9 }, (_, index) => ({
      id: "enrollment-subject-" + (index + 1),
      subject_id: null,
      course_offering_id: null,
      course_code: "QA-" + String(101 + index),
      course_description: "Quality Assurance Subject Snapshot " + (index + 1),
      units: 3,
      ...(isCurrent ? scheduleFixtures[index] ?? { day: null, time: null, room: null } : { day: null, time: null, room: null })
    })),
    enrollment_clearances: [],
    enrollment_signatures: isCurrent ? currentOfficialSignatureFixtures : historicalSignatureFixtures,
    financial_summary: isCurrent ? currentFinancialSummary : null,
    registrar_approval: isCurrent
      ? { name: "Shaira Mae E. Pajares", approved_at: currentApprovalAt }
      : null
  };
}

function renderCase(caseName, stylesheet = globalsCss) {
  const currentPolicyCoverage = caseName === "current";
  const markup = renderToStaticMarkup(React.createElement(RegistrationForm, {
    enrollment: makeEnrollment(caseName),
    studentPledgeCovered: currentPolicyCoverage,
    registrationPledgeVersion: currentPolicyCoverage ? REGISTRATION_POLICY_VERSION : null
  }));
  const markupWithLocalImages = markup
    .replace(/\s+srcSet="[^"]*"/g, "")
    .replace(/src="\/_next\/image\?url=%2Fbrand%2Fpkm-logo\.png[^"]*"/g, 'src="/brand/pkm-logo.png"')
    .replace(/src="\/_next\/image\?url=%2Fbrand%2Fmauban-logo\.png[^"]*"/g, 'src="/brand/mauban-logo.png"');

  if (/src="\/_next\/image/.test(markupWithLocalImages)) {
    throw new Error("A Next image URL was not mapped to a local public asset path");
  }

  return "<!doctype html><html><head><meta charset=\"utf-8\">" +
    "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
    "<base href=\"http://registration-fixture.local/\">" +
    "<style>" + stylesheet + "</style></head><body>" + markupWithLocalImages + "</body></html>";
}

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const metrics = {};
const renderTargets = comparisonOnly
  ? [
      {
        caseName: "matched-before",
        fixtureName: "current",
        stylesheet: baseGlobalsCss,
        pdfFileName: "matched-before-base-css-current-receipts-fixture-20261014-v2.pdf"
      },
      {
        caseName: "matched-after",
        fixtureName: "current",
        stylesheet: globalsCss,
        pdfFileName: "matched-after-current-css-current-receipts-fixture-20261014-v2.pdf"
      }
    ]
  : [
      {
        caseName: "current",
        fixtureName: "current",
        stylesheet: globalsCss,
        pdfFileName: "registration-current-official-names-finance-receipts-registrar-synthetic-word-aligned-final.pdf"
      },
      {
        caseName: "historical",
        fixtureName: "historical",
        stylesheet: globalsCss,
        pdfFileName: "registration-historical-original-signatures-unsigned-pledge-word-aligned-final.pdf"
      }
    ];

try {
  for (const { caseName, fixtureName, stylesheet, pdfFileName } of renderTargets) {
    const page = await browser.newPage({ viewport: { width: 816, height: 1056 }, deviceScaleFactor: 1 });
    await page.route("http://registration-fixture.local/brand/**", async (route) => {
      const requestUrl = new URL(route.request().url());
      const relativeAsset = requestUrl.pathname.replace(/^\/+/, "");
      const assetPath = path.resolve(publicDirectory, relativeAsset);
      if (!assetPath.startsWith(publicDirectory + path.sep)) {
        await route.fulfill({ status: 403, body: "Forbidden" });
        return;
      }
      try {
        await route.fulfill({ status: 200, contentType: "image/png", body: await readFile(assetPath) });
      } catch {
        await route.fulfill({ status: 404, body: "Not found" });
      }
    });
    await page.setContent(renderCase(fixtureName, stylesheet), { waitUntil: "load" });
    await page.evaluate(async () => Promise.all([...document.images].map((image) => image.decode().catch(() => undefined))));

    const screenLabels = await page.locator(".registration-print-copy-label").evaluateAll((labels) => labels.map((label) => ({
      text: label.textContent?.trim(),
      color: getComputedStyle(label).color,
      borderColor: getComputedStyle(label).borderTopColor
    })));
    const screenReceiptOverflow = await page.locator(".registration-print-receipt-overflow").first().evaluate((note) => ({
      text: note.textContent?.trim() ?? "",
      display: getComputedStyle(note).display
    })).catch(() => null);

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.setViewportSize({ width: 816, height: 1056 });
    await page.emulateMedia({ media: "print" });
    const printLabels = await page.locator(".registration-print-copy-label").evaluateAll((labels) => labels.map((label) => ({
      text: label.textContent?.trim(),
      color: getComputedStyle(label).color,
      borderColor: getComputedStyle(label).borderTopColor
    })));
    const layout = await page.evaluate(() => {
      const copies = [...document.querySelectorAll("section.registration-print")];
      const policy = document.querySelector("section.registration-policy-print");
      const firstHeading = document.querySelector(".registration-print-details h2");
      return {
        viewportScrollY: window.scrollY,
        copies: copies.map((section) => {
          const watermark = section.querySelector(".registration-print-watermark img");
          const box = (selector) => {
            const element = section.querySelector(selector);
            if (!element) return null;
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return {
              top: Math.round(rect.top * 100) / 100,
              bottom: Math.round(rect.bottom * 100) / 100,
              height: Math.round(rect.height * 100) / 100,
              display: style.display,
              position: style.position
            };
          };
          return {
            recipient: section.getAttribute("data-copy-recipient"),
            left: Math.round(section.getBoundingClientRect().left * 100) / 100,
            top: Math.round(section.getBoundingClientRect().top * 100) / 100,
            width: section.getBoundingClientRect().width,
            height: section.getBoundingClientRect().height,
            scrollHeight: section.scrollHeight,
            pageName: getComputedStyle(section).page,
            contentBoxes: {
              header: box(".registration-print-header"),
              details: box(".registration-print-details"),
              subjects: box(".registration-print-subjects"),
              table: box(".registration-print-table"),
              assessment: box(".registration-print-assessment"),
              signatures: box(".registration-print-signatures"),
              bottom: box(".registration-print-bottom"),
              copyLabel: box(".registration-print-copy-label")
            },
            labelColor: getComputedStyle(section.querySelector(".registration-print-copy-label")).color,
            watermarkCount: section.querySelectorAll(".registration-print-watermark img").length,
            watermarkOpacity: watermark ? getComputedStyle(watermark).opacity : null,
            watermarkLoaded: Boolean(watermark?.naturalWidth),
            signatureImageCount: section.querySelectorAll(".registration-print-signature-image img").length
          };
        }),
        studentCopySignatureImages: document.querySelectorAll(".registration-print-privacy-signature .registration-print-signature-image img").length,
        policyPages: document.querySelectorAll("section.registration-policy-print").length,
        policySignatureImages: document.querySelectorAll(".registration-policy-signature-image img").length,
        syntheticSignatureImages: document.querySelectorAll('.registration-print-signature-image img[src^="data:image/svg+xml;base64,"]').length + document.querySelectorAll('.registration-policy-signature-image img[src^="data:image/svg+xml;base64,"]').length,
        policyHeight: policy?.getBoundingClientRect().height ?? null,
        policyPageName: policy ? getComputedStyle(policy).page : null,
        fixtureFields: (() => {
          const firstCopy = document.querySelector('.registration-print[data-copy-recipient="student"]');
          const fieldValues = [...(firstCopy?.querySelectorAll(".registration-print-field-value") ?? [])].map((field) => field.textContent?.trim() ?? "");
          const rows = [...(firstCopy?.querySelectorAll(".registration-print-table tbody tr") ?? [])];
          return {
            details: fieldValues,
            scheduleRows: rows.slice(0, 4).map((row) => [...row.querySelectorAll("td")].slice(2, 5).map((cell) => cell.textContent?.trim() ?? "")),
            scheduleFallbackCellCount: rows.flatMap((row) => [...row.querySelectorAll("td")].slice(2, 5)).filter((cell) => cell.textContent?.trim() === "TBA").length
          };
        })(),
        financeFields: (() => {
          const firstCopy = document.querySelector('.registration-print[data-copy-recipient="student"]');
          return {
            miscellaneousAmounts: [...(firstCopy?.querySelectorAll(".registration-print-fee-table tbody td") ?? [])].map((cell) => cell.textContent?.trim() ?? ""),
            miscellaneousTotal: firstCopy?.querySelector(".registration-print-fee-table tfoot th:last-child")?.textContent?.trim() ?? "",
            feeLines: [...(firstCopy?.querySelectorAll(".registration-print-tuition .registration-print-fee-line") ?? [])].map((line) => [...line.querySelectorAll("span")].map((part) => part.textContent?.trim()).join(" ")),
            scholarship: firstCopy?.querySelector(".registration-print-scholarship-line")?.textContent?.trim() ?? "",
            paymentSummary: [...(firstCopy?.querySelectorAll(".registration-print-finance-summary span") ?? [])].map((item) => item.textContent?.trim() ?? ""),
            ledgerRows: firstCopy?.querySelectorAll(".registration-print-payment-table tbody tr").length ?? 0,
            receiptRows: [...(firstCopy?.querySelectorAll(".registration-print-payment-table tbody tr") ?? [])].map((row) => [...row.querySelectorAll("td")].map((cell) => cell.textContent?.trim() ?? "")),
            receiptOverflowNote: firstCopy?.querySelector(".registration-print-receipt-overflow")?.textContent?.trim() ?? null,
            receiptOverflowDisplayInPrint: firstCopy?.querySelector(".registration-print-receipt-overflow")
              ? getComputedStyle(firstCopy.querySelector(".registration-print-receipt-overflow")).display
              : null
          };
        })(),
        staffSignatureGeometry: (() => {
          const firstCopy = document.querySelector('.registration-print[data-copy-recipient="student"]');
          return [...(firstCopy?.querySelectorAll(".registration-print-signatures > .registration-print-signature") ?? [])].map((block) => {
            const rect = (selector) => {
              const element = block.querySelector(selector);
              if (!element) return null;
              const bounds = element.getBoundingClientRect();
              return {
                left: Math.round(bounds.left * 100) / 100,
                top: Math.round(bounds.top * 100) / 100,
                width: Math.round(bounds.width * 100) / 100,
                height: Math.round(bounds.height * 100) / 100
              };
            };
            const date = block.querySelector(".registration-print-signature-meta");
            return {
              slot: [...block.classList].find((className) => className.startsWith("registration-print-signature-") && className !== "registration-print-signature-image"),
              name: block.querySelector(".registration-print-signature-name")?.textContent?.trim() ?? null,
              role: block.querySelector(".registration-print-signature-label")?.textContent?.trim() ?? null,
              image: rect(".registration-print-signature-image"),
              nameBox: rect(".registration-print-signature-name"),
              line: rect(".registration-print-signature-line"),
              roleBox: rect(".registration-print-signature-label"),
              dateDisplayInPrint: date ? getComputedStyle(date).display : null
            };
          });
        })(),
        registrarApproval: (() => {
          const firstCopy = document.querySelector('.registration-print[data-copy-recipient="student"]');
          const block = firstCopy?.querySelector(".registration-print-signature-registrar");
          return {
            label: block?.querySelector(".registration-print-signature-label")?.textContent?.trim() ?? null,
            reviewer: block?.querySelector(".registration-print-signature-name")?.textContent?.trim() ?? null,
            approvedAt: block?.querySelector(".registration-print-signature-meta span")?.textContent?.trim() ?? null,
            signatureImageCount: block?.querySelectorAll(".registration-print-signature-image img").length ?? 0,
            lineCount: block?.querySelectorAll(".registration-print-signature-line").length ?? 0
          };
        })(),
        srOnlyHeadingPosition: firstHeading ? getComputedStyle(firstHeading).position : null,
        pageSizeSupported: CSS.supports("page", "registration-form")
      };
    });

    const expectedPolicySignatures = fixtureName === "current" ? 1 : 0;
    if (layout.copies.length !== 4 || layout.policyPages !== 1 || layout.policySignatureImages !== expectedPolicySignatures) {
      throw new Error("Unexpected copy, policy, or pledge-signature state for " + caseName + ": " + JSON.stringify(layout));
    }
    if (layout.studentCopySignatureImages !== 4 || layout.srOnlyHeadingPosition !== "absolute") {
      throw new Error("The fixture is missing a copied Student signature or compiled sr-only utility: " + JSON.stringify(layout));
    }
    const bodyText = (await page.locator("body").textContent())?.toLocaleLowerCase() ?? "";
    const expectedStaffNames = fixtureName === "current"
      ? currentOfficialSignatureFixtures.slice(0, 5).map((signature) => signature.signer_name_snapshot)
      : historicalSignatureFixtures.slice(0, 5).map((signature) => signature.signer_name_snapshot);
    if (!expectedStaffNames.every((name) => bodyText.includes(name.toLocaleLowerCase()))) {
      throw new Error("A fixture signer name is missing from the rendered form: " + JSON.stringify(expectedStaffNames));
    }
    if (fixtureName === "current" && (!layout.fixtureFields.details.some((value) => value.includes("Alexandria Maximiliana Christina")) || !layout.fixtureFields.details.some((value) => value.includes("Long Program Name Fixture")) || !layout.fixtureFields.scheduleRows[0].every(Boolean) || !layout.fixtureFields.scheduleFallbackCellCount)) {
      throw new Error("Current fixture is missing long-name, long-program, encoded schedule, or TBA fallback coverage: " + JSON.stringify(layout.fixtureFields));
    }
    if (fixtureName === "current" && layout.syntheticSignatureImages !== 25) {
      throw new Error("Current fixture signatures must all be synthetic and visibly marked: " + layout.syntheticSignatureImages);
    }
    if (fixtureName === "current" && (
      layout.financeFields.miscellaneousTotal !== "PHP 2,450.00" ||
      !layout.financeFields.feeLines.includes("TOTAL TOSF: PHP 19,950.00") ||
      !layout.financeFields.paymentSummary.includes("STATUS: PARTIAL") ||
      !layout.financeFields.paymentSummary.some((line) => line.includes("PAID: PHP 5,000.00 | BALANCE DUE: PHP 14,950.00")) ||
      layout.financeFields.ledgerRows !== 4
    )) {
      throw new Error("Current fixture is missing its configured partial-payment assessment or preserved receipt ledger rows: " + JSON.stringify(layout.financeFields));
    }
    if (fixtureName === "current" && (
      layout.financeFields.receiptRows.length !== 4 ||
      layout.financeFields.receiptRows[0][1] !== "OR-2026-003" ||
      layout.financeFields.receiptRows[3][0] !== "Oct 14, 2026" ||
      !layout.financeFields.receiptOverflowNote?.includes("2 earlier receipts are not shown") ||
      !screenReceiptOverflow?.text.includes("2 earlier receipts are not shown") ||
      screenReceiptOverflow.display === "none" ||
      layout.financeFields.receiptOverflowDisplayInPrint !== "none"
    )) {
      throw new Error("Current fixture is missing the newest four receipt records or omitted-receipt notice: " + JSON.stringify(layout.financeFields));
    }
    if (fixtureName === "current" && (
      layout.registrarApproval.label !== "Registrar" ||
      layout.registrarApproval.reviewer !== "Shaira Mae E. Pajares" ||
      !layout.registrarApproval.approvedAt?.startsWith("Approved") ||
      layout.registrarApproval.signatureImageCount !== 0 ||
      layout.registrarApproval.lineCount !== 1
    )) {
      throw new Error("Current approved fixture is missing reviewer metadata or has invented Registrar ink: " + JSON.stringify(layout.registrarApproval));
    }

    const pdfPath = path.join(outputDirectory, pdfFileName);
    await page.pdf({ path: pdfPath, format: "Letter", printBackground: true, preferCSSPageSize: true, scale: 1 });
    for (const recipient of ["student", "dean", "registrar", "accountant"]) {
      const locator = page.locator(".registration-print[data-copy-recipient=\"" + recipient + "\"] .registration-print-copy-label");
      if (!(await locator.textContent())) throw new Error("Missing " + recipient + " copy label in " + caseName + " fixture");
    }
    metrics[caseName] = {
      caseType: fixtureName === "current"
        ? "APPROVED QA fixture with reference-verified names, synthetic e-signatures, Registrar metadata, and synthetic receipts"
        : "historical QA fixture; original QA signature snapshots and names retained without current policy coverage",
      signatureSource: fixtureName === "current"
        ? "Synthetic e-signature SVGs and payment receipts are QA fixtures; Registrar name/date are reviewer metadata only, with no Registrar signature image"
        : "Unmodified QA snapshots cropped from artifacts/registration-watermark/phase1a-current-page-{1,2}-20261009.png",
      cssSource: comparisonOnly
        ? caseName === "matched-before"
          ? `${comparisonBase}:app/globals.css (compiled with the same Tailwind config and current fixture markup)`
          : "workspace app/globals.css (compiled with the same Tailwind config and current fixture markup)"
        : "workspace app/globals.css",
      screenLabels,
      screenReceiptOverflow,
      printLabels,
      ...layout,
      pdfPath
    };
    await page.close();
  }
} finally {
  await browser.close();
}

const metricsPath = path.join(outputDirectory, comparisonOnly
  ? "registration-matched-css-comparison.json"
  : "registration-print-word-aligned-final-metrics.json");
await writeFile(metricsPath, JSON.stringify({ cssCompiledWithTailwind: true, matchedFixtureInput: comparisonOnly, ...metrics }, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ metricsPath, ...metrics }, null, 2));
