import path from "node:path";
import { chromium } from "@playwright/test";
import { DEMO_ACCOUNTS, DEMO_SHARED_PASSWORD } from "../../scripts/demo/demo-preparation-fixtures.mjs";

const mode = process.argv[2] ?? process.env.QA_CAPTURE_MODE ?? "before";
const baseUrl = process.argv[3] ?? process.env.QA_BASE_URL ?? "https://pkm-des.vercel.app";
const accountKey = process.argv[4] ?? "registrar";
const enrollmentId = process.env.QA_ENROLLMENT_ID ?? "f571eb8e-8a27-4723-9bbc-f556e171f9b8";
const artifactsDir = path.resolve("artifacts/registration-print");
const account = DEMO_ACCOUNTS.find((candidate) => candidate.key === accountKey);

if (!account) {
  throw new Error(`Demo account fixture is unavailable: ${accountKey}`);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.on("console", (message) => console.log(`[browser:${message.type()}] ${message.text()}`));
page.on("pageerror", (error) => console.log(`[browser:pageerror] ${error.message}`));
page.on("requestfailed", (request) => console.log(`[browser:requestfailed] ${request.url()} ${request.failure()?.errorText ?? ""}`));

try {
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
  const emailInput = page.locator("#email");
  const passwordInput = page.locator("#password");
  await emailInput.waitFor({ state: "visible", timeout: 20_000 });
  await emailInput.fill(account.email);
  await passwordInput.fill(DEMO_SHARED_PASSWORD);
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await page.waitForURL(account.role === "student" ? /\/student\// : /\/admin\//, { timeout: 20_000 });

  const registrationUrl = account.role === "student"
    ? `${baseUrl}/student/cor`
    : `${baseUrl}/admin/enrollments/${enrollmentId}/registration`;
  await page.goto(registrationUrl, {
    waitUntil: "domcontentloaded"
  });
  console.log(JSON.stringify({
    currentUrl: page.url(),
    title: await page.title(),
    bodyText: (await page.locator("body").innerText()).slice(0, 3000)
  }));
  await page.locator("section.registration-print").waitFor({ state: "visible", timeout: 10_000 });
  await page.waitForLoadState("networkidle");
  await page.locator("section.registration-print img").evaluateAll(async (images) => {
    await Promise.all(images.map(async (image) => {
      if (!image.complete) {
        await new Promise((resolve) => {
          image.addEventListener("load", resolve, { once: true });
          image.addEventListener("error", resolve, { once: true });
        });
      }
    }));
  });
  if (mode === "after") {
    await page.screenshot({
      path: path.join(artifactsDir, "after-screen-desktop.png"),
      fullPage: true
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: path.join(artifactsDir, "after-screen-mobile.png"),
      fullPage: true
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  await page.emulateMedia({ media: "print" });

  await page.locator("section.registration-print").screenshot({
    path: path.join(artifactsDir, `${mode}-full-page.png`)
  });
  await page.locator(".registration-print-assessment-grid").screenshot({
    path: path.join(artifactsDir, `${mode}-signatures.png`)
  });

  if (mode === "after") {
    await page.locator(".registration-print-subjects").screenshot({
      path: path.join(artifactsDir, "after-subject-table.png")
    });
    await page.locator(".registration-print-bottom").screenshot({
      path: path.join(artifactsDir, "after-privacy.png")
    });
  }

  const pdfPath = mode === "after"
    ? path.resolve("output/pdf/registration-form-letter-qa.pdf")
    : path.resolve("tmp/pdfs/registration-form-before.pdf");
  await page.pdf({
    path: pdfPath,
    format: "Letter",
    printBackground: true,
    preferCSSPageSize: true,
    scale: 1
  });

  const metrics = await page.locator("section.registration-print").evaluate((element) => {
    const style = getComputedStyle(element);
    const stampCount = element.querySelectorAll(".registration-print-enrolled-stamp").length;
    const assessment = element.querySelector(".registration-print-assessment-grid");
    const accounting = element.querySelector(".registration-print-accounting-signatures");
    const approvals = element.querySelector(".registration-print-approval-signatures");
    const privacy = element.querySelector(".registration-print-privacy");
    const subjects = element.querySelector(".registration-print-table");

    return {
      width: element.getBoundingClientRect().width,
      height: element.getBoundingClientRect().height,
      fontSize: style.fontSize,
      stampCount,
      assessmentHeight: assessment?.getBoundingClientRect().height ?? null,
      accountingHeight: accounting?.getBoundingClientRect().height ?? null,
      approvalHeight: approvals?.getBoundingClientRect().height ?? null,
      privacyTop: privacy?.getBoundingClientRect().top ?? null,
      subjectTableHeight: subjects?.getBoundingClientRect().height ?? null
    };
  });

  console.log(JSON.stringify({ mode, baseUrl, pdfPath, metrics }));
} finally {
  await context.close();
  await browser.close();
}
