import { chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const BASE_URL = 'http://localhost:3000';
const ARTIFACTS_DIR = 'C:\\Users\\Ron\\.gemini\\antigravity\\brain\\f2e54dd4-9deb-4d9b-800b-0d20467c68b0';
const PASSWORD = 'Demo1234!';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function drawSignatureOnCanvas(page) {
  const canvas = page.locator('canvas');
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas bounding box not found');

  const startX = box.x + box.width * 0.25;
  const startY = box.y + box.height * 0.5;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + box.width * 0.15, startY - box.height * 0.25, { steps: 5 });
  await page.mouse.move(startX + box.width * 0.3, startY + box.height * 0.2, { steps: 5 });
  await page.mouse.move(startX + box.width * 0.5, startY - box.height * 0.1, { steps: 5 });
  await page.mouse.up();
  await sleep(800);
}

async function performLogin(page, email, expectedUrlPart = null) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('#email', email);
  await page.fill('#password', PASSWORD);
  await page.click('button[type="submit"]');
  if (expectedUrlPart) {
    await page.waitForURL(`**${expectedUrlPart}*`, { timeout: 15000 });
  } else {
    await sleep(2000);
  }
}

async function performLogout(page) {
  const studentLogout = page.locator('form[action*="logout"] button, button:has-text("Sign Out"), button:has-text("Logout")');
  if (await studentLogout.count() > 0) {
    await studentLogout.first().click();
    await page.waitForURL('**/login', { timeout: 10000 });
    await sleep(1000);
    return;
  }
  await page.goto(`${BASE_URL}/admin/account`);
  await sleep(800);
  const adminLogout = page.locator('button:has-text("Sign Out"), button:has-text("Logout")');
  if (await adminLogout.count() > 0) {
    await adminLogout.first().click();
    await page.waitForURL('**/login', { timeout: 10000 });
    await sleep(1000);
  }
}

export async function runSegment1(browser) {
  console.log('=== RECORDING SEGMENT 1: Public Entry & Student Submission ===');
  const tempDir = path.join(ARTIFACTS_DIR, 'temp_rec_1');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: tempDir, size: { width: 1280, height: 800 } }
  });
  const page = await context.newPage();

  // 1. Landing page
  console.log('1. Landing page');
  await page.goto(BASE_URL);
  await sleep(2000);

  // 2. About page
  console.log('2. About page');
  await page.locator('a[href="/about"]').first().click();
  await page.waitForURL('**/about');
  await sleep(2000);

  // 3. Create Account entry point
  console.log('3. Create Account');
  await page.goto(`${BASE_URL}/create-account`);
  await sleep(2000);

  // 4. Student Login
  console.log('4. Student Login');
  await performLogin(page, 'pkm.demo.student@example.com', '/student/dashboard');
  await sleep(2500);

  // 5. Subject List
  console.log('5. Subject List');
  await page.locator('a[href="/student/subjects"]').first().click();
  await page.waitForURL('**/student/subjects');
  await sleep(2500);

  // 6. Online Enrollment
  console.log('6. Online Enrollment');
  await page.locator('a[href="/student/enrollment"]').first().click();
  await page.waitForURL('**/student/enrollment');
  await sleep(2000);
  await page.locator('input[name="certified"]').check();
  await sleep(1000);
  await page.locator('button[type="submit"]:has-text("Submit Enrollment")').click();
  await page.waitForURL('**/student/enrollment-status', { timeout: 15000 });
  await sleep(3000);

  // 7. Student Logout
  console.log('7. Student Logout');
  await performLogout(page);

  await context.close();
  const videoFile = fs.readdirSync(tempDir)[0];
  const targetVideo = path.join(ARTIFACTS_DIR, 'pkm_des_segment_1_public_student.webm');
  if (videoFile) {
    fs.renameSync(path.join(tempDir, videoFile), targetVideo);
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log('Saved Segment 1 Video to:', targetVideo);
  }
}

export async function runSegment2(browser) {
  console.log('=== RECORDING SEGMENT 2: Official Staff Clearances & Health Verification ===');
  const tempDir = path.join(ARTIFACTS_DIR, 'temp_rec_2');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: tempDir, size: { width: 1280, height: 800 } }
  });
  const page = await context.newPage();

  // 1. Librarian Clearance
  console.log('Signing Librarian Clearance...');
  await performLogin(page, 'pkm.demo.librarian@example.com', '/admin/clearances/library');
  await sleep(1500);
  await page.locator('a:has-text("Review & E-Sign"), a:has-text("Review")').first().click();
  await sleep(1500);
  await drawSignatureOnCanvas(page);
  await page.locator('input[name="signature_confirmation"]').check();
  await sleep(600);
  await page.locator('button[type="submit"]:has-text("Apply E-Signature")').click();
  await sleep(2500);
  await performLogout(page);

  // 2. Nurse Health Verification & Clearance
  console.log('Signing Nurse Health Record Verification & Clearance...');
  await performLogin(page, 'pkm.demo.nurse@example.com', '/admin/clearances/health');
  await sleep(1500);
  await page.locator('a:has-text("Review & E-Sign"), a:has-text("Review")').first().click();
  await sleep(1500);
  await drawSignatureOnCanvas(page);
  await page.locator('input[name="verification_acknowledged"]').check();
  await page.locator('input[name="signature_confirmation"]').check();
  await sleep(600);
  await page.locator('button[type="submit"]:has-text("Verify & Apply E-Signature")').click();
  await sleep(2500);
  await performLogout(page);

  // 3. Program Chair Clearance
  console.log('Signing Program Chair Clearance...');
  await performLogin(page, 'pkm.demo.programchair@example.com', '/admin/clearances/program');
  await sleep(1500);
  await page.locator('a:has-text("Review & E-Sign"), a:has-text("Review")').first().click();
  await sleep(1500);
  await drawSignatureOnCanvas(page);
  await page.locator('input[name="signature_confirmation"]').check();
  await sleep(600);
  await page.locator('button[type="submit"]:has-text("Apply E-Signature")').click();
  await sleep(2500);
  await performLogout(page);

  // 4. Accountant Clearance
  console.log('Signing Accountant Clearance...');
  await performLogin(page, 'pkm.demo.accountant@example.com', '/admin/clearances/accounting');
  await sleep(1500);
  await page.locator('a:has-text("Review & E-Sign"), a:has-text("Review")').first().click();
  await sleep(1500);
  await drawSignatureOnCanvas(page);
  await page.locator('input[name="signature_confirmation"]').check();
  await sleep(600);
  await page.locator('button[type="submit"]:has-text("Apply E-Signature")').click();
  await sleep(2500);
  await performLogout(page);

  // 5. Dean Clearance
  console.log('Signing Dean Clearance...');
  await performLogin(page, 'pkm.demo.dean@example.com', '/admin/clearances/dean');
  await sleep(1500);
  await page.locator('a:has-text("Review & E-Sign"), a:has-text("Review")').first().click();
  await sleep(1500);
  await drawSignatureOnCanvas(page);
  await page.locator('input[name="signature_confirmation"]').check();
  await sleep(600);
  await page.locator('button[type="submit"]:has-text("Apply E-Signature")').click();
  await sleep(2500);
  await performLogout(page);

  await context.close();
  const videoFile = fs.readdirSync(tempDir)[0];
  const targetVideo = path.join(ARTIFACTS_DIR, 'pkm_des_segment_2_staff_clearances.webm');
  if (videoFile) {
    fs.renameSync(path.join(tempDir, videoFile), targetVideo);
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log('Saved Segment 2 Video to:', targetVideo);
  }
}

export async function runSegment3(browser) {
  console.log('=== RECORDING SEGMENT 3: Registrar Review & Administration Suite ===');
  const tempDir = path.join(ARTIFACTS_DIR, 'temp_rec_3');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: tempDir, size: { width: 1280, height: 800 } }
  });
  const page = await context.newPage();

  // 1. Registrar login & Dashboard
  console.log('1. Registrar Dashboard');
  await performLogin(page, 'pkmregistrarofficial@gmail.com', '/admin/dashboard');
  await sleep(2500);

  // 2. Pending Enrollments Review & Approval
  console.log('2. Pending Enrollments Review & Approval');
  await page.locator('a[href="/admin/enrollments"]').first().click();
  await page.waitForURL('**/admin/enrollments');
  await sleep(2000);
  await page.locator('button:has-text("Review request")').first().click();
  await sleep(2000);
  await page.locator('button[type="submit"]:has-text("Confirm Approval")').click();
  await sleep(3500);

  // 3. Masterlist with filter
  console.log('3. Masterlist');
  await page.locator('a[href="/admin/masterlist"]').first().click();
  await page.waitForURL('**/admin/masterlist');
  await sleep(2000);
  const programSelect = page.locator('select[name="program"]');
  if (await programSelect.count() > 0) {
    await programSelect.selectOption({ label: 'Bachelor of Science in Accounting Information Systems' });
    await sleep(1000);
    await page.locator('button[type="submit"]:has-text("Apply Filters")').click();
    await sleep(2000);
  }

  // 4. Reports
  console.log('4. Reports');
  await page.locator('a[href="/admin/reports"]').first().click();
  await page.waitForURL('**/admin/reports');
  await sleep(2500);

  // 5. Official Student Records
  console.log('5. Student Records');
  await page.locator('a[href="/admin/students"]').first().click();
  await page.waitForURL('**/admin/students');
  await sleep(2000);

  // 6. Official Signers Management
  console.log('6. Official Signers');
  await page.locator('a[href="/admin/official-signers"]').first().click();
  await page.waitForURL('**/admin/official-signers');
  await sleep(2500);

  // 7. Logout
  console.log('7. Registrar Logout');
  await performLogout(page);

  await context.close();
  const videoFile = fs.readdirSync(tempDir)[0];
  const targetVideo = path.join(ARTIFACTS_DIR, 'pkm_des_segment_3_registrar_suite.webm');
  if (videoFile) {
    fs.renameSync(path.join(tempDir, videoFile), targetVideo);
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log('Saved Segment 3 Video to:', targetVideo);
  }
}

export async function runSegment4(browser) {
  console.log('=== RECORDING SEGMENT 4: Student Enrolled Result & Registration Form ===');
  const tempDir = path.join(ARTIFACTS_DIR, 'temp_rec_4');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: tempDir, size: { width: 1280, height: 800 } }
  });
  const page = await context.newPage();

  // 1. Student login
  console.log('1. Student Login');
  await performLogin(page, 'pkm.demo.student@example.com', '/student/dashboard');
  await sleep(2000);

  // 2. Enrollment Status (ENROLLED)
  console.log('2. Enrollment Status');
  await page.goto(`${BASE_URL}/student/enrollment-status`);
  await sleep(3000);

  // 3. Draft Registration Form (COR)
  console.log('3. Registration Form (COR)');
  await page.goto(`${BASE_URL}/student/cor`);
  await sleep(3500);

  // 4. Student Account
  console.log('4. Student Account');
  await page.locator('a[href="/student/account"]').first().click();
  await page.waitForURL('**/student/account');
  await sleep(2000);

  // 5. Final Logout
  console.log('5. Final Logout');
  await performLogout(page);

  await context.close();
  const videoFile = fs.readdirSync(tempDir)[0];
  const targetVideo = path.join(ARTIFACTS_DIR, 'pkm_des_segment_4_student_enrolled_cor.webm');
  if (videoFile) {
    fs.renameSync(path.join(tempDir, videoFile), targetVideo);
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log('Saved Segment 4 Video to:', targetVideo);
  }
}

async function main() {
  console.log('Launching Playwright Chromium for Screen Recordings...');
  const browser = await chromium.launch({ headless: true });

  try {
    await runSegment1(browser);
    await runSegment2(browser);
    await runSegment3(browser);
    await runSegment4(browser);
    console.log('\nALL 4 DEMO RECORDING SEGMENTS COMPLETED SUCCESSFULLY!');
  } finally {
    await browser.close();
  }
}

if (process.argv[1]?.endsWith('record-demo-walkthrough.mjs')) {
  main().catch((err) => {
    console.error('Fatal recording error:', err);
    process.exit(1);
  });
}
