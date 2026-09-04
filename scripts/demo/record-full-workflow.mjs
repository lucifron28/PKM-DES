import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const BASE_URL = process.env.DEMO_BASE_URL ?? "https://pkm-des.vercel.app";
const PASSWORD = process.env.DEMO_PASSWORD ?? "Demo1234!";
const VIEWPORT = { width: 1440, height: 900 };
const OUTPUT_DIR = path.join(process.cwd(), "artifacts", "qa", "full-workflow");
const VIDEO_TEMP_DIR = path.join(OUTPUT_DIR, "video-temp");
const VIDEO_PATH = path.join(OUTPUT_DIR, "pkm-des-full-workflow-desktop.webm");

const ACCOUNTS = {
  student: { email: "pkm.demo.student@example.com", route: "/student/dashboard" },
  registrar: { email: "pkmregistrarofficial@gmail.com", route: "/admin/enrollments" },
  librarian: { email: "pkm.demo.librarian@example.com", route: "/admin/clearances/library", slug: "library", label: "Librarian" },
  nurse: { email: "pkm.demo.nurse@example.com", route: "/admin/clearances/health", slug: "health", label: "School Nurse" },
  programChair: { email: "pkm.demo.programchair@example.com", route: "/admin/clearances/program", slug: "program", label: "Program Chair" },
  accountant: { email: "pkm.demo.accountant@example.com", route: "/admin/clearances/accounting", slug: "accounting", label: "Accountant" },
  dean: { email: "pkm.demo.dean@example.com", route: "/admin/clearances/dean", slug: "dean", label: "Dean" }
};

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.rmSync(VIDEO_TEMP_DIR, { recursive: true, force: true });
fs.mkdirSync(VIDEO_TEMP_DIR, { recursive: true });

const screenshots = [];
let enrollmentId = null;

function urlFor(route) {
  return new URL(route, BASE_URL).toString();
}

async function pause(page, milliseconds = 700) {
  await page.waitForTimeout(milliseconds);
}

async function caption(page, message) {
  await page.evaluate((text) => {
    document.querySelector("[data-full-demo-caption]")?.remove();
    const banner = document.createElement("div");
    banner.dataset.fullDemoCaption = "true";
    banner.textContent = text;
    Object.assign(banner.style, {
      position: "fixed",
      zIndex: "2147483647",
      top: "18px",
      left: "50%",
      transform: "translateX(-50%)",
      maxWidth: "calc(100vw - 48px)",
      padding: "10px 18px",
      borderRadius: "999px",
      background: "rgba(15, 23, 42, 0.95)",
      color: "white",
      font: "600 16px/1.4 Arial, sans-serif",
      textAlign: "center",
      boxShadow: "0 8px 30px rgba(15, 23, 42, 0.24)",
      pointerEvents: "none"
    });
    document.body.appendChild(banner);
  }, message);
  await pause(page, 1_000);
}

async function saveScreenshot(page, name, fullPage = false) {
  await page.screenshot({ path: path.join(OUTPUT_DIR, name), fullPage });
  screenshots.push(name);
}

async function waitForPage(page) {
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await pause(page, 800);
}

async function login(page, account) {
  await page.goto(urlFor("/login"), { waitUntil: "domcontentloaded" });
  await waitForPage(page);
  await page.locator("#email").fill(account.email);
  await page.locator("#password").fill(PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL((url) => url.pathname.startsWith("/student/") || url.pathname.startsWith("/admin/"), { timeout: 20_000 });
  if (account.route && new URL(page.url()).pathname !== account.route) {
    await page.goto(urlFor(account.route), { waitUntil: "domcontentloaded" });
  }
  await waitForPage(page);
}

async function logout(page) {
  const button = page.locator('button:has-text("Log out"), a:has-text("Log out"), button:has-text("Sign Out"), button:has-text("Logout")').first();
  await button.waitFor({ state: "visible", timeout: 12_000 });
  await button.click();
  await page.waitForURL((url) => url.pathname === "/login" || url.pathname === "/", { timeout: 15_000 });
  await pause(page, 500);
}

async function drawSignature(page, variation = 0) {
  const canvas = page.locator('canvas[aria-label*="Draw"]').first();
  await canvas.waitFor({ state: "visible", timeout: 15_000 });
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Signature pad was not visible.");

  const patterns = [
    [[0.12, 0.64], [0.20, 0.38], [0.28, 0.70], [0.37, 0.30], [0.46, 0.66], [0.56, 0.40], [0.65, 0.72], [0.76, 0.36], [0.86, 0.62]],
    [[0.12, 0.52], [0.20, 0.74], [0.30, 0.34], [0.40, 0.60], [0.50, 0.28], [0.60, 0.74], [0.70, 0.42], [0.84, 0.62]],
    [[0.12, 0.72], [0.22, 0.34], [0.30, 0.62], [0.40, 0.42], [0.50, 0.72], [0.61, 0.32], [0.73, 0.66], [0.86, 0.42]]
  ];
  const points = patterns[variation % patterns.length];
  await page.mouse.move(box.x + box.width * points[0][0], box.y + box.height * points[0][1]);
  await page.mouse.down();
  for (const [x, y] of points.slice(1)) {
    await page.mouse.move(box.x + box.width * x, box.y + box.height * y, { steps: 4 });
  }
  await page.mouse.up();
  await pause(page, 600);
  return canvas;
}

async function submitStudentHealthForm(page) {
  await page.locator('input[name="medical_condition_1"]').fill("None reported");
  await page.locator('input[name="allergy"]').fill("None reported");
  await page.locator('input[name="last_menstrual_period"]').fill("2026-08-01");
  await page.locator('input[name="others"]').fill("Demo health information for presentation");
  await caption(page, "Student completes the Health Record Update, including the female-only last-period field.");
  await saveScreenshot(page, "03-student-health-record-form-desktop.png");
  await page.getByRole("button", { name: "Save Health Record Update" }).click();
  await page.getByText("Health Record Update saved and sent to PKM Health Services.", { exact: true }).waitFor({ state: "visible", timeout: 15_000 }).catch(() => {});
  await pause(page, 1_200);
}

async function signOfficialClearance(page, account, captionText, variation, nurse = false) {
  await login(page, account);
  await caption(page, captionText);
  const reviewLink = page.locator(`a[href^="/admin/clearances/${account.slug}/"]`).filter({ hasText: /Review|Open/i }).first();
  await reviewLink.waitFor({ state: "visible", timeout: 15_000 });
  await reviewLink.click();
  await page.waitForURL((url) => url.pathname.startsWith(`/admin/clearances/${account.slug}/`), { timeout: 15_000 });
  await waitForPage(page);

  if (nurse) {
    await page.locator('input[name="verification_acknowledged"]').check();
  }
  await drawSignature(page, variation);
  await page.locator('input[name="signature_confirmation"]').check();
  await caption(page, `${account.label} applies an authenticated electronic signature to this clearance.`);
  const buttonName = nurse ? "Verify & Apply E-Signature" : /Apply E-Signature/;
  await page.getByRole("button", { name: buttonName }).click();
  const signedStatus = page.locator(`[aria-label="${account.label} signature status"]`);
  await signedStatus.waitFor({ state: "visible", timeout: 25_000 });
  await signedStatus.scrollIntoViewIfNeeded();
  await pause(page, 500);
  await saveScreenshot(page, `${account.slug}-signed-desktop.png`);
  await logout(page);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: VIDEO_TEMP_DIR, size: VIEWPORT }
  });
  const page = await context.newPage();
  const video = page.video();

  try {
    await login(page, ACCOUNTS.student);
    await caption(page, "Student logs in and starts the online enrollment request.");
    await saveScreenshot(page, "01-student-dashboard-desktop.png");

    await page.goto(urlFor("/student/enrollment"), { waitUntil: "domcontentloaded" });
    await waitForPage(page);
    await caption(page, "Student reviews the active term and the attached standard subject load.");
    await saveScreenshot(page, "02-student-enrollment-form-desktop.png");
    await page.locator('input[name="certified"]').check();
    await page.getByRole("button", { name: /Submit Enrollment/ }).click();
    await page.waitForURL((url) => url.pathname === "/student/enrollment-status", { timeout: 20_000 });
    await waitForPage(page);

    const healthLink = page.locator('a[href^="/student/enrollments/"][href$="/health-record"]').first();
    await healthLink.waitFor({ state: "visible", timeout: 15_000 });
    const healthHref = await healthLink.getAttribute("href");
    enrollmentId = healthHref?.split("/")[3] ?? null;
    if (!enrollmentId) throw new Error("Could not determine the submitted enrollment ID.");
    await caption(page, "The request is submitted and waiting for the staff workflow.");
    await saveScreenshot(page, "04-student-enrollment-pending-desktop.png");

    await healthLink.click();
    await page.waitForURL((url) => url.pathname.endsWith("/health-record"), { timeout: 15_000 });
    await waitForPage(page);
    await submitStudentHealthForm(page);

    await page.goto(urlFor("/student/enrollment-status"), { waitUntil: "domcontentloaded" });
    await waitForPage(page);
    await caption(page, "Student signs the enrollment request before staff review.");
    await drawSignature(page, 0);
    await page.locator('input[name="signature_confirmation"]').check();
    await page.getByRole("button", { name: /Apply E-Signature/ }).click();
    await page.locator('[aria-label="Student signature status"]').waitFor({ state: "visible", timeout: 25_000 });
    await pause(page, 500);
    await saveScreenshot(page, "05-student-enrollment-signed-desktop.png");
    await logout(page);

    await login(page, ACCOUNTS.registrar);
    await caption(page, "Registrar reviews the submitted request; approval waits for all required clearances.");
    await page.getByRole("button", { name: "Review request" }).first().click();
    await page.getByRole("dialog").waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
    await saveScreenshot(page, "06-registrar-review-waiting-for-clearances-desktop.png");
    await page.keyboard.press("Escape");
    await logout(page);

    await signOfficialClearance(page, ACCOUNTS.librarian, "Librarian reviews the enrollment and signs the Library Clearance.", 1);
    await signOfficialClearance(page, ACCOUNTS.nurse, "School Nurse reviews the submitted Health Record Update.", 2, true);
    await signOfficialClearance(page, ACCOUNTS.programChair, "Program Chair reviews the attached subject load and signs the Program Clearance.", 0);
    await signOfficialClearance(page, ACCOUNTS.accountant, "Accountant reviews the enrollment record and signs the Accounting Clearance.", 1);
    await signOfficialClearance(page, ACCOUNTS.dean, "Dean reviews the enrollment record and signs the Dean Clearance.", 2);

    await login(page, ACCOUNTS.registrar);
    await caption(page, "Registrar returns after every required official signature is complete.");
    await page.getByRole("button", { name: "Review request" }).first().click();
    await page.getByText("Review enrollment request", { exact: true }).waitFor({ state: "visible", timeout: 25_000 });
    const approveButton = page.locator('button:has-text("Confirm Approval")').first();
    await approveButton.waitFor({ state: "visible", timeout: 25_000 });
    if (await approveButton.isDisabled()) throw new Error("Registrar approval remained disabled after all clearances.");
    await saveScreenshot(page, "12-registrar-approval-ready-desktop.png");
    await approveButton.click();
    await page.waitForURL((url) => url.pathname === "/admin/enrollments" && url.searchParams.get("success") === "approved", { timeout: 20_000 });
    await waitForPage(page);
    await caption(page, "Registrar approves the enrollment after the complete signature chain is present.");
    await saveScreenshot(page, "13-registrar-approved-desktop.png");

    await page.goto(urlFor(`/admin/enrollments/${enrollmentId}/registration`), { waitUntil: "domcontentloaded" });
    await waitForPage(page);
    const printableForm = page.locator("section.registration-print").first();
    await printableForm.waitFor({ state: "visible", timeout: 20_000 });
    const signatureBlock = printableForm.locator(".registration-print-approval-signatures");
    await signatureBlock.waitFor({ state: "visible", timeout: 10_000 });
    await caption(page, "The printable Registration Form now displays the accepted signatures from Student, Librarian, School Nurse, Program Chair, Accountant, and Dean.");
    await signatureBlock.evaluate((element) => {
      const top = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, Math.max(0, top - 420));
    });
    await pause(page, 500);
    await saveScreenshot(page, "14-printable-form-all-signatures-focused-desktop.png");
    await saveScreenshot(page, "15-printable-form-all-signatures-full-desktop.png", true);

    const manifest = {
      baseUrl: BASE_URL,
      viewport: VIEWPORT,
      enrollmentId,
      rolesRecorded: ["Student", "Registrar", "Librarian", "School Nurse", "Program Chair", "Accountant", "Dean"],
      screenshots,
      video: path.basename(VIDEO_PATH)
    };
    await fs.promises.writeFile(path.join(OUTPUT_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(JSON.stringify(manifest, null, 2));
  } finally {
    await context.close();
    if (video) await video.saveAs(VIDEO_PATH);
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
