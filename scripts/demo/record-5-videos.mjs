import { chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const BASE_URL = 'http://localhost:3000';
const ARTIFACTS_DIR = 'C:\\Users\\Ron\\.gemini\\antigravity\\brain\\f2e54dd4-9deb-4d9b-800b-0d20467c68b0';
const VIDEOS_TEMP_DIR = path.join(ARTIFACTS_DIR, 'playwright_temp_videos');
const PASSWORD = 'Demo1234!';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function humanType(locator, text) {
  await locator.fill('');
  await locator.pressSequentially(text, { delay: 50 });
  await sleep(400);
}

async function smoothScroll(page, deltaY, steps = 8) {
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, deltaY / steps);
    await sleep(80);
  }
}

async function drawFictionalSignature(page) {
  const canvas = page.locator('canvas');
  await canvas.scrollIntoViewIfNeeded();
  await sleep(800);
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas bounding box not found');

  const startX = box.x + box.width * 0.22;
  const startY = box.y + box.height * 0.55;

  await page.mouse.move(startX, startY);
  await sleep(300);
  await page.mouse.down();
  await page.mouse.move(startX + box.width * 0.15, startY - box.height * 0.25, { steps: 8 });
  await page.mouse.move(startX + box.width * 0.28, startY + box.height * 0.2, { steps: 8 });
  await page.mouse.move(startX + box.width * 0.42, startY - box.height * 0.18, { steps: 8 });
  await page.mouse.move(startX + box.width * 0.58, startY + box.height * 0.05, { steps: 8 });
  await page.mouse.up();
  await sleep(2000);
}

async function deliberateLogin(page, email) {
  await page.goto(`${BASE_URL}/login`);
  await sleep(2000);
  await humanType(page.locator('#email'), email);
  await page.locator('#password').fill(PASSWORD);
  await sleep(1000);
  const submitBtn = page.locator('button[type="submit"]');
  await submitBtn.hover();
  await sleep(1000);
  await submitBtn.click();
  await sleep(3000);
}

async function deliberateLogout(page) {
  const studentLogout = page.locator('form[action*="logout"] button, button:has-text("Sign Out"), button:has-text("Logout")');
  if (await studentLogout.count() > 0) {
    await studentLogout.first().hover();
    await sleep(1000);
    await studentLogout.first().click();
    await page.waitForURL('**/login', { timeout: 15000 });
    await sleep(2500);
    return;
  }
  await page.goto(`${BASE_URL}/admin/account`);
  await sleep(1500);
  const adminLogout = page.locator('button:has-text("Sign Out"), button:has-text("Logout")');
  if (await adminLogout.count() > 0) {
    await adminLogout.first().hover();
    await sleep(1000);
    await adminLogout.first().click();
    await page.waitForURL('**/login', { timeout: 15000 });
    await sleep(2500);
  }
}

// ==========================================
// VIDEO 1: STUDENT ENROLLMENT WORKFLOW
// ==========================================
export async function recordVideo1(browser) {
  console.log('\n>>> RECORDING VIDEO 1: Student Enrollment Workflow <<<');
  if (!fs.existsSync(VIDEOS_TEMP_DIR)) fs.mkdirSync(VIDEOS_TEMP_DIR, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: VIDEOS_TEMP_DIR, size: { width: 1280, height: 800 } }
  });
  const page = await context.newPage();

  // Step 1: Start on Landing page
  console.log('Video 1 - Step 1: Landing page');
  await page.goto(BASE_URL);
  await sleep(3500);

  // Step 2: Open Login
  console.log('Video 1 - Step 2: Navigate to Login');
  const loginLink = page.locator('a[href="/login"]').first();
  await loginLink.hover();
  await sleep(1200);
  await loginLink.click();
  await page.waitForURL('**/login');
  await sleep(2500);

  // Step 3: Student Login
  console.log('Video 1 - Step 3: Student Login');
  await humanType(page.locator('#email'), 'pkm.demo.student@example.com');
  await page.locator('#password').fill(PASSWORD);
  await sleep(1200);
  const submitBtn = page.locator('button[type="submit"]');
  await submitBtn.hover();
  await sleep(1200);
  await submitBtn.click();
  await page.waitForURL('**/student/dashboard', { timeout: 15000 });
  await sleep(3500);

  // Step 4: Show Student Dashboard
  console.log('Video 1 - Step 4: Student Dashboard Details');
  await smoothScroll(page, 250);
  await sleep(2000);
  await smoothScroll(page, -250);
  await sleep(3500);

  // Step 5: Open Subject List
  console.log('Video 1 - Step 5: Subject List');
  const subjectsLink = page.locator('a[href="/student/subjects"]').first();
  await subjectsLink.hover();
  await sleep(1000);
  await subjectsLink.click();
  await page.waitForURL('**/student/subjects');
  await sleep(2500);
  await smoothScroll(page, 350);
  await sleep(3000);
  await smoothScroll(page, -350);
  await sleep(2500);

  // Step 6: Open Online Enrollment
  console.log('Video 1 - Step 6: Online Enrollment');
  const enrollmentLink = page.locator('a[href="/student/enrollment"]').first();
  await enrollmentLink.hover();
  await sleep(1000);
  await enrollmentLink.click();
  await page.waitForURL('**/student/enrollment');
  await sleep(3500);

  // Step 7: Certification & Submission
  console.log('Video 1 - Step 7: Certification & Submit');
  await smoothScroll(page, 450);
  await sleep(1500);
  const certCheckbox = page.locator('input[name="certified"]');
  await certCheckbox.hover();
  await sleep(1000);
  await certCheckbox.check();
  await sleep(1500);

  const submitEnrollBtn = page.locator('button[type="submit"]:has-text("Submit Enrollment")');
  await submitEnrollBtn.hover();
  await sleep(2000);
  await submitEnrollBtn.click();

  // Step 8 & 9: Successful submission & Pending status
  console.log('Video 1 - Step 8 & 9: Pending Status Result');
  await page.waitForURL('**/student/enrollment-status', { timeout: 15000 });
  await sleep(4500);
  await smoothScroll(page, 200);
  await sleep(4500);

  // Step 10: End Video 1
  console.log('Video 1 - Step 10: Complete');
  const video = page.video();
  await context.close();

  const targetVideo = path.join(ARTIFACTS_DIR, '01_PKM-DES_Student_Enrollment.mp4');
  if (video) {
    await video.saveAs(targetVideo);
    console.log('Saved Video 1 to:', targetVideo);
  }
}

// ==========================================
// VIDEO 2: LIBRARIAN AND NURSE CLEARANCE
// ==========================================
export async function recordVideo2(browser) {
  console.log('\n>>> RECORDING VIDEO 2: Librarian & Nurse Clearance <<<');
  if (!fs.existsSync(VIDEOS_TEMP_DIR)) fs.mkdirSync(VIDEOS_TEMP_DIR, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: VIDEOS_TEMP_DIR, size: { width: 1280, height: 800 } }
  });
  const page = await context.newPage();

  // PART A — LIBRARIAN
  console.log('Video 2 - Part A: Librarian Login');
  await deliberateLogin(page, 'pkm.demo.librarian@example.com');
  await page.waitForURL('**/admin/clearances/library*', { timeout: 15000 });
  await sleep(3500);

  console.log('Video 2 - Part A: Library Clearance Review');
  const libReviewBtn = page.locator('a:has-text("Review & E-Sign"), a:has-text("Review")').first();
  await libReviewBtn.hover();
  await sleep(1200);
  await libReviewBtn.click();
  await page.waitForURL('**/admin/clearances/library/*', { timeout: 15000 });
  await sleep(2500);

  console.log('Video 2 - Part A: Librarian E-Signature');
  await smoothScroll(page, 350);
  await sleep(2000);
  await drawFictionalSignature(page);

  const libConfirm = page.locator('input[name="signature_confirmation"]');
  await libConfirm.hover();
  await sleep(1000);
  await libConfirm.check();
  await sleep(1500);

  const libSignBtn = page.locator('button[type="submit"]:has-text("Apply E-Signature")');
  await libSignBtn.hover();
  await sleep(2000);
  await libSignBtn.click();
  await sleep(4500);

  console.log('Video 2 - Part A: Librarian Logout');
  await deliberateLogout(page);

  // PART B — NURSE
  console.log('Video 2 - Part B: Nurse Login');
  await deliberateLogin(page, 'pkm.demo.nurse@example.com');
  await page.waitForURL('**/admin/clearances/health*', { timeout: 15000 });
  await sleep(3500);

  console.log('Video 2 - Part B: Health Record Form Review');
  const nurseReviewBtn = page.locator('a:has-text("Review & E-Sign"), a:has-text("Review")').first();
  await nurseReviewBtn.hover();
  await sleep(1200);
  await nurseReviewBtn.click();
  await page.waitForURL('**/admin/clearances/health/*', { timeout: 15000 });
  await sleep(3500);

  console.log('Video 2 - Part B: Verification Acknowledgment & E-Signature');
  await smoothScroll(page, 350);
  await sleep(1500);

  const nurseAck = page.locator('input[name="verification_acknowledged"]');
  await nurseAck.hover();
  await sleep(1000);
  await nurseAck.check();
  await sleep(1500);

  await drawFictionalSignature(page);

  const nurseConfirm = page.locator('input[name="signature_confirmation"]');
  await nurseConfirm.hover();
  await sleep(1000);
  await nurseConfirm.check();
  await sleep(1500);

  const nurseSignBtn = page.locator('button[type="submit"]:has-text("Verify & Apply E-Signature")');
  await nurseSignBtn.hover();
  await sleep(2000);
  await nurseSignBtn.click();
  await sleep(5500);

  console.log('Video 2 - Step 18: Complete');
  const video = page.video();
  await context.close();

  const targetVideo = path.join(ARTIFACTS_DIR, '02_PKM-DES_Library_Health_Clearance.mp4');
  if (video) {
    await video.saveAs(targetVideo);
    console.log('Saved Video 2 to:', targetVideo);
  }
}

// ==========================================
// VIDEO 3: PROGRAM CHAIR, ACCOUNTANT, AND DEAN
// ==========================================
export async function recordVideo3(browser) {
  console.log('\n>>> RECORDING VIDEO 3: Official Clearances (Chair, Accountant, Dean) <<<');
  if (!fs.existsSync(VIDEOS_TEMP_DIR)) fs.mkdirSync(VIDEOS_TEMP_DIR, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: VIDEOS_TEMP_DIR, size: { width: 1280, height: 800 } }
  });
  const page = await context.newPage();

  // PART A — PROGRAM CHAIR
  console.log('Video 3 - Part A: Program Chair Login');
  await deliberateLogin(page, 'pkm.demo.programchair@example.com');
  await page.waitForURL('**/admin/clearances/program*', { timeout: 15000 });
  await sleep(3500);

  console.log('Video 3 - Part A: Review & Sign Program Clearance');
  const pcReviewBtn = page.locator('a:has-text("Review & E-Sign"), a:has-text("Review")').first();
  await pcReviewBtn.hover();
  await sleep(1200);
  await pcReviewBtn.click();
  await page.waitForURL('**/admin/clearances/program/*', { timeout: 15000 });
  await sleep(3000);

  await smoothScroll(page, 350);
  await sleep(1500);
  await drawFictionalSignature(page);

  const pcConfirm = page.locator('input[name="signature_confirmation"]');
  await pcConfirm.hover();
  await sleep(1000);
  await pcConfirm.check();
  await sleep(1500);

  const pcSignBtn = page.locator('button[type="submit"]:has-text("Apply E-Signature")');
  await pcSignBtn.hover();
  await sleep(2000);
  await pcSignBtn.click();
  await sleep(4500);

  await deliberateLogout(page);

  // PART B — ACCOUNTANT
  console.log('Video 3 - Part B: Accountant Login');
  await deliberateLogin(page, 'pkm.demo.accountant@example.com');
  await page.waitForURL('**/admin/clearances/accounting*', { timeout: 15000 });
  await sleep(3500);

  console.log('Video 3 - Part B: Review & Sign Accounting Clearance');
  const acctReviewBtn = page.locator('a:has-text("Review & E-Sign"), a:has-text("Review")').first();
  await acctReviewBtn.hover();
  await sleep(1200);
  await acctReviewBtn.click();
  await page.waitForURL('**/admin/clearances/accounting/*', { timeout: 15000 });
  await sleep(3000);

  await smoothScroll(page, 350);
  await sleep(1500);
  await drawFictionalSignature(page);

  const acctConfirm = page.locator('input[name="signature_confirmation"]');
  await acctConfirm.hover();
  await sleep(1000);
  await acctConfirm.check();
  await sleep(1500);

  const acctSignBtn = page.locator('button[type="submit"]:has-text("Apply E-Signature")');
  await acctSignBtn.hover();
  await sleep(2000);
  await acctSignBtn.click();
  await sleep(4500);

  await deliberateLogout(page);

  // PART C — DEAN
  console.log('Video 3 - Part C: Dean Login');
  await deliberateLogin(page, 'pkm.demo.dean@example.com');
  await page.waitForURL('**/admin/clearances/dean*', { timeout: 15000 });
  await sleep(3500);

  console.log('Video 3 - Part C: Review & Sign Dean Clearance');
  const deanReviewBtn = page.locator('a:has-text("Review & E-Sign"), a:has-text("Review")').first();
  await deanReviewBtn.hover();
  await sleep(1200);
  await deanReviewBtn.click();
  await page.waitForURL('**/admin/clearances/dean/*', { timeout: 15000 });
  await sleep(3000);

  await smoothScroll(page, 350);
  await sleep(1500);
  await drawFictionalSignature(page);

  const deanConfirm = page.locator('input[name="signature_confirmation"]');
  await deanConfirm.hover();
  await sleep(1000);
  await deanConfirm.check();
  await sleep(1500);

  const deanSignBtn = page.locator('button[type="submit"]:has-text("Apply E-Signature")');
  await deanSignBtn.hover();
  await sleep(2000);
  await deanSignBtn.click();

  // Show completed clearance status for at least 6 seconds
  console.log('Video 3 - Part C: Completed clearances visible (6s pause)');
  await sleep(6500);

  console.log('Video 3 - Complete');
  const video = page.video();
  await context.close();

  const targetVideo = path.join(ARTIFACTS_DIR, '03_PKM-DES_Official_Clearances.mp4');
  if (video) {
    await video.saveAs(targetVideo);
    console.log('Saved Video 3 to:', targetVideo);
  }
}

// ==========================================
// VIDEO 4: REGISTRAR REVIEW AND APPROVAL
// ==========================================
export async function recordVideo4(browser) {
  console.log('\n>>> RECORDING VIDEO 4: Registrar Review & Administration Suite <<<');
  if (!fs.existsSync(VIDEOS_TEMP_DIR)) fs.mkdirSync(VIDEOS_TEMP_DIR, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: VIDEOS_TEMP_DIR, size: { width: 1280, height: 800 } }
  });
  const page = await context.newPage();

  // Step 1 & 2: Registrar Login & Dashboard
  console.log('Video 4 - Step 1 & 2: Registrar Dashboard');
  await deliberateLogin(page, 'pkmregistrarofficial@gmail.com');
  await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
  await sleep(4500);

  // Step 3: Pending Enrollments
  console.log('Video 4 - Step 3: Pending Enrollments');
  const pendingLink = page.locator('a[href="/admin/enrollments"]').first();
  await pendingLink.hover();
  await sleep(1200);
  await pendingLink.click();
  await page.waitForURL('**/admin/enrollments');
  await sleep(3500);

  // Step 4 & 5: Review enrollment & show clearance statuses
  console.log('Video 4 - Step 4 & 5: Review Modal & Completed Clearances');
  const reviewReqBtn = page.locator('button:has-text("Review request")').first();
  await reviewReqBtn.hover();
  await sleep(1200);
  await reviewReqBtn.click();
  await sleep(3500);

  // Step 6 & 7: Approve enrollment
  console.log('Video 4 - Step 6 & 7: Confirm Approval');
  const approveBtn = page.locator('button[type="submit"]:has-text("Confirm Approval")');
  await approveBtn.hover();
  await sleep(2000);
  await approveBtn.click();
  await sleep(5500);

  // Step 8: Masterlist
  console.log('Video 4 - Step 8: Masterlist & Filter');
  const masterlistLink = page.locator('a[href="/admin/masterlist"]').first();
  await masterlistLink.hover();
  await sleep(1200);
  await masterlistLink.click();
  await page.waitForURL('**/admin/masterlist');
  await sleep(3500);

  const progSelect = page.locator('select[name="program"]');
  if (await progSelect.count() > 0) {
    await progSelect.selectOption({ label: 'Bachelor of Science in Accounting Information Systems' });
    await sleep(1200);
    const filterBtn = page.locator('button[type="submit"]:has-text("Apply Filters")');
    await filterBtn.hover();
    await sleep(1000);
    await filterBtn.click();
    await sleep(3500);
  }

  // Step 9: Reports
  console.log('Video 4 - Step 9: Reports');
  const reportsLink = page.locator('a[href="/admin/reports"]').first();
  await reportsLink.hover();
  await sleep(1200);
  await reportsLink.click();
  await page.waitForURL('**/admin/reports');
  await sleep(3500);

  // Step 10: Official Student Records
  console.log('Video 4 - Step 10: Official Student Records');
  const studentsLink = page.locator('a[href="/admin/students"]').first();
  await studentsLink.hover();
  await sleep(1200);
  await studentsLink.click();
  await page.waitForURL('**/admin/students');
  await sleep(2500);

  const searchInput = page.locator('input[name="q"], input[name="search"], input[type="search"]').first();
  if (await searchInput.count() > 0) {
    await humanType(searchInput, '26-DEMO-001');
    await sleep(1000);
    const searchBtn = page.locator('button[type="submit"]:has-text("Search"), button[type="submit"]:has-text("Apply")');
    if (await searchBtn.count() > 0) await searchBtn.click();
    await sleep(3000);
  }

  // Step 11: Official Signers
  console.log('Video 4 - Step 11: Official Signers');
  const signersLink = page.locator('a[href="/admin/official-signers"]').first();
  await signersLink.hover();
  await sleep(1200);
  await signersLink.click();
  await page.waitForURL('**/admin/official-signers');
  await sleep(5500);

  console.log('Video 4 - Complete');
  const video = page.video();
  await context.close();

  const targetVideo = path.join(ARTIFACTS_DIR, '04_PKM-DES_Registrar_Approval.mp4');
  if (video) {
    await video.saveAs(targetVideo);
    console.log('Saved Video 4 to:', targetVideo);
  }
}

// ==========================================
// VIDEO 5: FINAL STUDENT RESULT AND REGISTRATION FORM
// ==========================================
export async function recordVideo5(browser) {
  console.log('\n>>> RECORDING VIDEO 5: Final Student Result & Registration Form (COR) <<<');
  if (!fs.existsSync(VIDEOS_TEMP_DIR)) fs.mkdirSync(VIDEOS_TEMP_DIR, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: VIDEOS_TEMP_DIR, size: { width: 1280, height: 800 } }
  });
  const page = await context.newPage();

  // Step 1 & 2: Student Login & Dashboard
  console.log('Video 5 - Step 1 & 2: Student Login & Updated Dashboard');
  await deliberateLogin(page, 'pkm.demo.student@example.com');
  await page.waitForURL('**/student/dashboard', { timeout: 15000 });
  await sleep(3500);

  // Step 3: Enrollment Status
  console.log('Video 5 - Step 3: Approved / Enrolled Status');
  const statusLink = page.locator('a[href="/student/enrollment-status"]').first();
  if (await statusLink.count() > 0) {
    await statusLink.hover();
    await sleep(1000);
    await statusLink.click();
  } else {
    await page.goto(`${BASE_URL}/student/enrollment-status`);
  }
  await page.waitForURL('**/student/enrollment-status');
  await sleep(5500);

  // Step 4 & 5: Registration Form (COR)
  console.log('Video 5 - Step 4 & 5: Registration Form (COR)');
  const corLink = page.locator('a[href="/student/cor"]').first();
  if (await corLink.count() > 0) {
    await corLink.hover();
    await sleep(1000);
    await corLink.click();
  } else {
    await page.goto(`${BASE_URL}/student/cor`);
  }
  await page.waitForURL('**/student/cor');
  await sleep(4000);

  // Scroll through Student details, Subjects, and Signature blocks
  await smoothScroll(page, 300);
  await sleep(3500);
  await smoothScroll(page, 450);
  await sleep(5500);

  // Step 6: Print Preview button
  console.log('Video 5 - Step 6: Print preview button hover');
  const printBtn = page.locator('button:has-text("Print Registration Form"), button:has-text("Print Form"), button:has-text("Print")').first();
  if (await printBtn.count() > 0) {
    await printBtn.hover();
    await sleep(2000);
  }

  // Step 7: Logout
  console.log('Video 5 - Step 7: Final Logout');
  await deliberateLogout(page);
  await sleep(4000);

  console.log('Video 5 - Complete');
  const video = page.video();
  await context.close();

  const targetVideo = path.join(ARTIFACTS_DIR, '05_PKM-DES_Final_Student_Result.mp4');
  if (video) {
    await video.saveAs(targetVideo);
    console.log('Saved Video 5 to:', targetVideo);
  }
}

async function main() {
  console.log('Launching Playwright Chromium for Presentation-Ready 5-Video Demonstration...');
  const browser = await chromium.launch({ headless: true });

  try {
    await recordVideo1(browser);
    await recordVideo2(browser);
    await recordVideo3(browser);
    await recordVideo4(browser);
    await recordVideo5(browser);
    console.log('\n======================================================');
    console.log('ALL 5 FUNCTIONAL DEMONSTRATION VIDEOS RECORDED SUCCESSFULLY!');
    console.log('======================================================');
  } finally {
    await browser.close();
  }
}

if (process.argv[1]?.endsWith('record-5-videos.mjs')) {
  main().catch((err) => {
    console.error('Fatal recording error:', err);
    process.exit(1);
  });
}
