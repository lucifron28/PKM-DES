import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = process.env.DEMO_BASE_URL ?? "https://pkm-des.vercel.app";
const registrarEmail = process.env.DEMO_REGISTRAR_EMAIL ?? "pkmregistrarofficial@gmail.com";
const password = process.env.DEMO_PASSWORD ?? "Demo1234!";
const enrollmentId = "44444444-4444-4444-8444-444444444444";
const outputDir = path.join(process.cwd(), "artifacts", "qa", "nurse-workflow");
fs.mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

try {
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
  await page.locator("#email").fill(registrarEmail);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await page.waitForURL((url) => url.pathname.includes("/admin/"), { timeout: 20_000 });
  await page.goto(`${baseUrl}/admin/enrollments/${enrollmentId}/registration`, { waitUntil: "domcontentloaded" });
  const printableForm = page.locator("section.registration-print").first();
  await printableForm.waitFor({ state: "visible", timeout: 20_000 });
  const nurseBlock = printableForm.locator(".registration-print-approval-signatures").getByText("School Nurse", { exact: true });
  await nurseBlock.waitFor({ state: "visible", timeout: 10_000 });
  const targetScrollTop = await nurseBlock.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return Math.max(0, rect.top + window.scrollY - 420);
  });
  await page.evaluate((scrollTop) => window.scrollTo(0, scrollTop), targetScrollTop);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outputDir, "07-printable-form-nurse-signature-focused-desktop.png"), fullPage: false });
  await page.screenshot({ path: path.join(outputDir, "08-printable-form-full-page-desktop.png"), fullPage: true });
  console.log(JSON.stringify({
    viewport: { width: 1440, height: 900 },
    focusedScreenshot: "07-printable-form-nurse-signature-focused-desktop.png",
    fullPageScreenshot: "08-printable-form-full-page-desktop.png",
    nurseSignatureText: await nurseBlock.innerText()
  }, null, 2));
} finally {
  await context.close();
  await browser.close();
}
