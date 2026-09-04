import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const BASE_URL = process.env.DEMO_BASE_URL ?? "https://pkm-des.vercel.app";
const NURSE_EMAIL = process.env.DEMO_NURSE_EMAIL ?? "pkm.demo.nurse@example.com";
const REGISTRAR_EMAIL = process.env.DEMO_REGISTRAR_EMAIL ?? "pkmregistrarofficial@gmail.com";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "Demo1234!";
const ENROLLMENT_ID = "44444444-4444-4444-8444-444444444444";
const VIEWPORT = { width: 1440, height: 900 };

const root = process.cwd();
const outputDir = path.join(root, "artifacts", "qa", "nurse-workflow");
const tempVideoDir = path.join(outputDir, "video-temp");
const videoPath = path.join(outputDir, "nurse-workflow-desktop.webm");

fs.mkdirSync(outputDir, { recursive: true });
fs.rmSync(tempVideoDir, { recursive: true, force: true });
fs.mkdirSync(tempVideoDir, { recursive: true });

function absoluteUrl(relativePath) {
  return new URL(relativePath, BASE_URL).toString();
}

async function waitForPage(page) {
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await page.waitForTimeout(700);
}

async function caption(page, message) {
  await page.evaluate((text) => {
    document.querySelector("[data-demo-caption]")?.remove();
    const element = document.createElement("div");
    element.dataset.demoCaption = "true";
    element.textContent = text;
    Object.assign(element.style, {
      position: "fixed",
      zIndex: "2147483647",
      top: "18px",
      left: "50%",
      transform: "translateX(-50%)",
      maxWidth: "calc(100vw - 48px)",
      padding: "10px 18px",
      borderRadius: "999px",
      background: "rgba(15, 23, 42, 0.94)",
      color: "white",
      font: "600 16px/1.4 Arial, sans-serif",
      textAlign: "center",
      boxShadow: "0 8px 30px rgba(15, 23, 42, 0.24)",
      pointerEvents: "none"
    });
    document.body.appendChild(element);
  }, message);
  await page.waitForTimeout(950);
}

async function saveViewport(page, fileName) {
  await page.screenshot({ path: path.join(outputDir, fileName), fullPage: false });
}

async function login(page, email, expectedPath) {
  await page.goto(absoluteUrl("/login"), { waitUntil: "domcontentloaded" });
  await waitForPage(page);
  await page.locator('input[type="email"], #email').first().fill(email);
  await page.locator('input[type="password"], #password').first().fill(DEMO_PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL((url) => url.pathname.includes(expectedPath), { timeout: 20_000 });
  await waitForPage(page);
}

async function logout(page) {
  const control = page.locator('button:has-text("Log out"), a:has-text("Log out")').first();
  await control.waitFor({ state: "visible", timeout: 10_000 });
  await control.click();
  await page.waitForURL((url) => url.pathname === "/login" || url.pathname === "/", { timeout: 15_000 });
  await waitForPage(page);
}

async function drawSignature(page, canvas) {
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("The Nurse signature pad is not visible.");

  const points = [
    [0.12, 0.62], [0.18, 0.42], [0.23, 0.70], [0.30, 0.34], [0.36, 0.68],
    [0.42, 0.48], [0.50, 0.70], [0.58, 0.36], [0.66, 0.62], [0.74, 0.46],
    [0.84, 0.66]
  ];
  await page.mouse.move(box.x + box.width * points[0][0], box.y + box.height * points[0][1]);
  await page.mouse.down();
  for (const [x, y] of points.slice(1)) {
    await page.mouse.move(box.x + box.width * x, box.y + box.height * y, { steps: 3 });
  }
  await page.mouse.up();
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: tempVideoDir, size: VIEWPORT }
  });
  const page = await context.newPage();
  const video = page.video();
  const manifest = {
    baseUrl: BASE_URL,
    viewport: VIEWPORT,
    enrollmentId: ENROLLMENT_ID,
    screenshots: [],
    signed: false,
    printableSignatureVisible: false
  };

  try {
    await caption(page, "Nurse signs in to the official staff portal.");
    await login(page, NURSE_EMAIL, "/admin/clearances/health");
    await caption(page, "The Nurse sees only the Health Clearance work queue.");
    await saveViewport(page, "01-nurse-health-queue-desktop.png");
    manifest.screenshots.push("01-nurse-health-queue-desktop.png");

    const reviewLink = page.locator(`a[href="/admin/clearances/health/${ENROLLMENT_ID}"]`).first();
    await reviewLink.waitFor({ state: "visible", timeout: 15_000 });
    await caption(page, "The Nurse opens the incoming first-year female student's Health Record Update.");
    await reviewLink.click();
    await page.waitForURL((url) => url.pathname.endsWith(`/admin/clearances/health/${ENROLLMENT_ID}`), { timeout: 15_000 });
    await waitForPage(page);

    await page.evaluate(() => window.scrollTo(0, 0));
    await caption(page, "The submitted form shows medical conditions, allergies, last menstrual period, and other notes.");
    await saveViewport(page, "02-health-record-form-desktop.png");
    manifest.screenshots.push("02-health-record-form-desktop.png");

    const canvas = page.locator('canvas[aria-label="Draw School Nurse signature"]');
    await canvas.waitFor({ state: "visible", timeout: 15_000 });
    await page.locator('input[name="verification_acknowledged"]').check();
    await caption(page, "The Nurse confirms the review and draws an electronic signature.");
    await drawSignature(page, canvas);
    await page.locator('input[name="signature_confirmation"]').check();
    await saveViewport(page, "03-nurse-signature-drawn-desktop.png");
    manifest.screenshots.push("03-nurse-signature-drawn-desktop.png");

    await page.getByRole("button", { name: "Verify & Apply E-Signature" }).click();
    const signedState = page.locator('[aria-label="School Nurse signature status"]');
    await signedState.waitFor({ state: "visible", timeout: 25_000 });
    await signedState.scrollIntoViewIfNeeded();
    await caption(page, "The Health Clearance is now signed and bound to this enrollment.");
    await saveViewport(page, "04-nurse-signed-state-desktop.png");
    manifest.screenshots.push("04-nurse-signed-state-desktop.png");
    manifest.signed = true;

    await logout(page);
    await caption(page, "Registrar opens the printable registration form to verify the Nurse signature appears there.");
    await login(page, REGISTRAR_EMAIL, "/admin/dashboard");
    await page.goto(absoluteUrl(`/admin/enrollments/${ENROLLMENT_ID}/registration`), { waitUntil: "domcontentloaded" });
    await waitForPage(page);
    const printableForm = page.locator("section.registration-print").first();
    await printableForm.waitFor({ state: "visible", timeout: 20_000 });
    const nurseText = printableForm.locator(".registration-print-approval-signatures").getByText("School Nurse", { exact: true });
    await nurseText.waitFor({ state: "visible", timeout: 10_000 });
    await nurseText.scrollIntoViewIfNeeded();
    await caption(page, "The printable form displays the accepted School Nurse signature.");
    await saveViewport(page, "05-printable-form-nurse-signature-desktop.png");
    manifest.screenshots.push("05-printable-form-nurse-signature-desktop.png");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.screenshot({ path: path.join(outputDir, "06-printable-form-full-desktop.png"), fullPage: true });
    manifest.screenshots.push("06-printable-form-full-desktop.png");
    manifest.printableSignatureVisible = true;

    await fs.promises.writeFile(path.join(outputDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(JSON.stringify({ ...manifest, video: videoPath }, null, 2));
  } finally {
    await page.close();
    if (video) await video.saveAs(videoPath);
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
