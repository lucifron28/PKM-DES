import { chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const BASE_URL = 'https://pkm-des.vercel.app';
const ARTIFACTS_DIR = 'C:\\Users\\Ron\\.gemini\\antigravity\\brain\\f2e54dd4-9deb-4d9b-800b-0d20467c68b0';
const DOCS_RECORDINGS_DIR = 'c:\\Users\\Ron\\Documents\\projects\\clients\\PKM-DES\\docs\\recordings';
const VIDEOS_TEMP_DIR = path.join(ARTIFACTS_DIR, 'playwright_esign_temp');
const PASSWORD = 'Demo1234!';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function showCaption(page, text) {
  try {
    await page.evaluate((captionText) => {
      let banner = document.getElementById('demo-caption-banner');
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'demo-caption-banner';
        banner.style.position = 'fixed';
        banner.style.bottom = '28px';
        banner.style.left = '50%';
        banner.style.transform = 'translateX(-50%)';
        banner.style.backgroundColor = 'rgba(15, 23, 42, 0.94)';
        banner.style.color = '#ffffff';
        banner.style.padding = '14px 32px';
        banner.style.borderRadius = '9999px';
        banner.style.fontSize = '17px';
        banner.style.fontWeight = '600';
        banner.style.letterSpacing = '0.02em';
        banner.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4)';
        banner.style.zIndex = '999999';
        banner.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
        banner.style.pointerEvents = 'none';
        banner.style.border = '1.5px solid rgba(255, 255, 255, 0.2)';
        document.body.appendChild(banner);
      }
      banner.innerText = captionText;
      banner.style.opacity = '1';
    }, text);
  } catch (e) {}
  await sleep(800);
}

async function humanType(locator, text) {
  await locator.fill('');
  await locator.pressSequentially(text, { delay: 45 });
  await sleep(300);
}

async function smoothScroll(page, deltaY, steps = 10) {
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, deltaY / steps);
    await sleep(70);
  }
}

// Draw letter shapes for role signatures on canvas
async function drawWordOnCanvas(page, word) {
  const canvas = page.locator('canvas');
  await canvas.scrollIntoViewIfNeeded();
  await sleep(600);
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas bounding box not found');

  const paddingX = box.width * 0.1;
  const paddingY = box.height * 0.2;
  const usableWidth = box.width * 0.8;
  const usableHeight = box.height * 0.6;
  const letterWidth = usableWidth / word.length;

  for (let i = 0; i < word.length; i++) {
    const letter = word[i].toUpperCase();
    const lx = box.x + paddingX + i * letterWidth;
    const ly = box.y + paddingY;
    const lw = letterWidth * 0.85;
    const lh = usableHeight;

    const stroke = async (points) => {
      if (!points.length) return;
      await page.mouse.move(lx + points[0][0] * lw, ly + points[0][1] * lh);
      await page.mouse.down();
      for (let p = 1; p < points.length; p++) {
        await page.mouse.move(lx + points[p][0] * lw, ly + points[p][1] * lh, { steps: 4 });
      }
      await page.mouse.up();
      await sleep(60);
    };

    if (letter === 'L') {
      await stroke([[0.2, 0.1], [0.2, 0.9], [0.8, 0.9]]);
    } else if (letter === 'I') {
      await stroke([[0.5, 0.1], [0.5, 0.9]]);
      await stroke([[0.2, 0.1], [0.8, 0.1]]);
      await stroke([[0.2, 0.9], [0.8, 0.9]]);
    } else if (letter === 'B') {
      await stroke([[0.2, 0.1], [0.2, 0.9]]);
      await stroke([[0.2, 0.1], [0.7, 0.3], [0.2, 0.5], [0.8, 0.7], [0.2, 0.9]]);
    } else if (letter === 'R') {
      await stroke([[0.2, 0.1], [0.2, 0.9]]);
      await stroke([[0.2, 0.1], [0.7, 0.3], [0.2, 0.5], [0.8, 0.9]]);
    } else if (letter === 'A') {
      await stroke([[0.2, 0.9], [0.5, 0.1], [0.8, 0.9]]);
      await stroke([[0.3, 0.6], [0.7, 0.6]]);
    } else if (letter === 'Y') {
      await stroke([[0.2, 0.1], [0.5, 0.5], [0.8, 0.1]]);
      await stroke([[0.5, 0.5], [0.5, 0.9]]);
    } else if (letter === 'N') {
      await stroke([[0.2, 0.9], [0.2, 0.1], [0.8, 0.9], [0.8, 0.1]]);
    } else if (letter === 'U') {
      await stroke([[0.2, 0.1], [0.2, 0.8], [0.5, 0.9], [0.8, 0.8], [0.8, 0.1]]);
    } else if (letter === 'S') {
      await stroke([[0.8, 0.2], [0.3, 0.1], [0.2, 0.4], [0.8, 0.6], [0.7, 0.9], [0.2, 0.8]]);
    } else if (letter === 'E') {
      await stroke([[0.8, 0.1], [0.2, 0.1], [0.2, 0.9], [0.8, 0.9]]);
      await stroke([[0.2, 0.5], [0.7, 0.5]]);
    } else if (letter === 'C') {
      await stroke([[0.8, 0.2], [0.3, 0.1], [0.2, 0.5], [0.3, 0.9], [0.8, 0.8]]);
    } else if (letter === 'H') {
      await stroke([[0.2, 0.1], [0.2, 0.9]]);
      await stroke([[0.8, 0.1], [0.8, 0.9]]);
      await stroke([[0.2, 0.5], [0.8, 0.5]]);
    } else if (letter === 'T') {
      await stroke([[0.1, 0.1], [0.9, 0.1]]);
      await stroke([[0.5, 0.1], [0.5, 0.9]]);
    } else if (letter === 'D') {
      await stroke([[0.2, 0.1], [0.2, 0.9]]);
      await stroke([[0.2, 0.1], [0.8, 0.5], [0.2, 0.9]]);
    } else {
      await stroke([[0.1, 0.5], [0.5, 0.2], [0.8, 0.8]]);
    }
  }
  await sleep(1500);
}

async function deliberateLogin(page, email) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  await sleep(1800);
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
    await sleep(2000);
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
    await sleep(2000);
  }
}

async function runCompleteESignatureWorkflow() {
  console.log('\n================================================================');
  console.log('STARTING COMPLETE PKM-DES E-SIGNATURE DEMONSTRATION RECORDING');
  console.log('Website: https://pkm-des.vercel.app/login');
  console.log('Viewport: 1440x900 (Desktop)');
  console.log('================================================================\n');

  if (!fs.existsSync(VIDEOS_TEMP_DIR)) fs.mkdirSync(VIDEOS_TEMP_DIR, { recursive: true });
  if (!fs.existsSync(DOCS_RECORDINGS_DIR)) fs.mkdirSync(DOCS_RECORDINGS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: VIDEOS_TEMP_DIR, size: { width: 1440, height: 900 } }
  });
  const page = await context.newPage();

  try {
    // -------------------------------------------------------------
    // 1-5. LOGIN & STUDENT SUBMISSION
    // -------------------------------------------------------------
    console.log('Step 1-3: Open Login & Student Login (Maria Demo Student)');
    await page.goto(`${BASE_URL}/login`);
    await sleep(2500);
    await showCaption(page, 'Student submits the enrollment.');
    await deliberateLogin(page, 'pkm.demo.student@example.com');
    await page.waitForURL('**/student/dashboard', { timeout: 15000 });
    await sleep(3500);

    // Show Student Dashboard
    console.log('Step 3: Show Student enrollment information');
    await smoothScroll(page, 200);
    await sleep(2500);
    await smoothScroll(page, -200);
    await sleep(2000);

    // Show Subject List
    console.log('Step 3b: View Subject List');
    await page.locator('a[href="/student/subjects"]').first().click();
    await page.waitForURL('**/student/subjects');
    await sleep(3000);

    // Submit Online Enrollment
    console.log('Step 4: Submit Online Enrollment');
    await page.locator('a[href="/student/enrollment"]').first().click();
    await page.waitForURL('**/student/enrollment');
    await sleep(3000);
    await smoothScroll(page, 400);
    await sleep(1500);

    const certCheckbox = page.locator('input[name="certified"]');
    if (await certCheckbox.count() > 0) {
      await certCheckbox.check();
      await sleep(1200);
      const submitEnrollBtn = page.locator('button[type="submit"]:has-text("Submit Enrollment")');
      await submitEnrollBtn.hover();
      await sleep(1500);
      await submitEnrollBtn.click();
      await page.waitForURL('**/student/enrollment-status', { timeout: 15000 });
    } else {
      await page.goto(`${BASE_URL}/student/enrollment-status`);
    }

    // Step 5: Show that request is waiting for staff review (PENDING)
    console.log('Step 5: Enrollment Status = PENDING');
    await page.waitForURL('**/student/enrollment-status', { timeout: 15000 });
    await sleep(4000);

    // SCREENSHOT 1: Student enrollment waiting for staff review
    const screenshot1Path = path.join(ARTIFACTS_DIR, '01_student_enrollment_pending_review.png');
    const docsScreenshot1 = path.join(DOCS_RECORDINGS_DIR, '01_student_enrollment_pending_review.png');
    await page.screenshot({ path: screenshot1Path, fullPage: false });
    fs.copyFileSync(screenshot1Path, docsScreenshot1);
    console.log('Captured Screenshot 1:', screenshot1Path);

    await sleep(3000);

    // Step 6: Student Logout
    console.log('Step 6: Student Logout');
    await deliberateLogout(page);

    // -------------------------------------------------------------
    // 7-9. LIBRARIAN CLEARANCE (LIBRARY)
    // -------------------------------------------------------------
    console.log('Step 7-9: Librarian Login & Signature (LIBRARY)');
    await showCaption(page, 'Each staff member reviews the same record.');
    await deliberateLogin(page, 'pkm.demo.librarian@example.com');
    await page.waitForURL('**/admin/clearances/library*', { timeout: 15000 });
    await sleep(3000);

    await page.locator('a:has-text("Review & E-Sign"), a:has-text("Review")').first().click();
    await page.waitForURL('**/admin/clearances/library/*', { timeout: 15000 });
    await sleep(3000);

    await showCaption(page, 'Each staff member signs only their own section.');
    await smoothScroll(page, 350);
    await sleep(1500);
    await drawWordOnCanvas(page, 'LIBRARY');

    await page.locator('input[name="signature_confirmation"]').check();
    await sleep(1200);
    await page.locator('button[type="submit"]:has-text("Apply E-Signature")').click();
    await sleep(4000);

    await deliberateLogout(page);

    // -------------------------------------------------------------
    // 10-12. SCHOOL NURSE CLEARANCE (NURSE)
    // -------------------------------------------------------------
    console.log('Step 10-12: Nurse Login & Health Record Verification (NURSE)');
    await showCaption(page, 'The system records the signer and date.');
    await deliberateLogin(page, 'pkm.demo.nurse@example.com');
    await page.waitForURL('**/admin/clearances/health*', { timeout: 15000 });
    await sleep(3000);

    await page.locator('a:has-text("Review & E-Sign"), a:has-text("Review")').first().click();
    await page.waitForURL('**/admin/clearances/health/*', { timeout: 15000 });
    await sleep(3500);

    await smoothScroll(page, 350);
    await sleep(1500);
    await page.locator('input[name="verification_acknowledged"]').check();
    await sleep(1200);

    await drawWordOnCanvas(page, 'NURSE');
    await page.locator('input[name="signature_confirmation"]').check();
    await sleep(1200);
    await page.locator('button[type="submit"]:has-text("Verify & Apply E-Signature")').click();
    await sleep(5000);

    await deliberateLogout(page);

    // -------------------------------------------------------------
    // 13-15. PROGRAM CHAIR CLEARANCE (CHAIR)
    // -------------------------------------------------------------
    console.log('Step 13-15: Program Chair Login & Signature (CHAIR)');
    await showCaption(page, 'Each staff member signs only their own section.');
    await deliberateLogin(page, 'pkm.demo.programchair@example.com');
    await page.waitForURL('**/admin/clearances/program*', { timeout: 15000 });
    await sleep(3000);

    await page.locator('a:has-text("Review & E-Sign"), a:has-text("Review")').first().click();
    await page.waitForURL('**/admin/clearances/program/*', { timeout: 15000 });
    await sleep(3000);

    await smoothScroll(page, 350);
    await sleep(1500);
    await drawWordOnCanvas(page, 'CHAIR');

    await page.locator('input[name="signature_confirmation"]').check();
    await sleep(1200);
    await page.locator('button[type="submit"]:has-text("Apply E-Signature")').click();
    await sleep(4000);

    await deliberateLogout(page);

    // -------------------------------------------------------------
    // 16-18. ACCOUNTANT CLEARANCE (ACCT)
    // -------------------------------------------------------------
    console.log('Step 16-18: Accountant Login & Signature (ACCT)');
    await deliberateLogin(page, 'pkm.demo.accountant@example.com');
    await page.waitForURL('**/admin/clearances/accounting*', { timeout: 15000 });
    await sleep(3000);

    await page.locator('a:has-text("Review & E-Sign"), a:has-text("Review")').first().click();
    await page.waitForURL('**/admin/clearances/accounting/*', { timeout: 15000 });
    await sleep(3000);

    await smoothScroll(page, 350);
    await sleep(1500);
    await drawWordOnCanvas(page, 'ACCT');

    await page.locator('input[name="signature_confirmation"]').check();
    await sleep(1200);
    await page.locator('button[type="submit"]:has-text("Apply E-Signature")').click();
    await sleep(4000);

    await deliberateLogout(page);

    // -------------------------------------------------------------
    // 19-21. DEAN CLEARANCE (DEAN)
    // -------------------------------------------------------------
    console.log('Step 19-21: Dean Login & Signature (DEAN)');
    await deliberateLogin(page, 'pkm.demo.dean@example.com');
    await page.waitForURL('**/admin/clearances/dean*', { timeout: 15000 });
    await sleep(3000);

    await page.locator('a:has-text("Review & E-Sign"), a:has-text("Review")').first().click();
    await page.waitForURL('**/admin/clearances/dean/*', { timeout: 15000 });
    await sleep(3000);

    await smoothScroll(page, 350);
    await sleep(1500);
    await drawWordOnCanvas(page, 'DEAN');

    await page.locator('input[name="signature_confirmation"]').check();
    await sleep(1200);
    await page.locator('button[type="submit"]:has-text("Apply E-Signature")').click();
    await sleep(5000);

    await deliberateLogout(page);

    // -------------------------------------------------------------
    // 22-29. REGISTRAR / ADMIN APPROVAL & PRINTABLE FORM
    // -------------------------------------------------------------
    console.log('Step 22-24: Registrar Login & Clearance Summary Review');
    await showCaption(page, 'The printable form automatically displays every accepted signature.');
    await deliberateLogin(page, 'pkmregistrarofficial@gmail.com');
    await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
    await sleep(3500);

    await page.locator('a[href="/admin/enrollments"]').first().click();
    await page.waitForURL('**/admin/enrollments');
    await sleep(3500);

    // Open review modal to show all completed staff clearance signatures
    await page.locator('button:has-text("Review request")').first().click();
    await sleep(3500);

    // SCREENSHOT 2: Clearance summary showing all completed staff signatures
    const screenshot2Path = path.join(ARTIFACTS_DIR, '02_clearance_summary_all_staff_signatures.png');
    const docsScreenshot2 = path.join(DOCS_RECORDINGS_DIR, '02_clearance_summary_all_staff_signatures.png');
    await page.screenshot({ path: screenshot2Path, fullPage: false });
    fs.copyFileSync(screenshot2Path, docsScreenshot2);
    console.log('Captured Screenshot 2:', screenshot2Path);

    // Confirm Approval
    console.log('Step 24b: Registrar Approves Enrollment');
    await page.locator('button[type="submit"]:has-text("Confirm Approval")').click();
    await sleep(5000);

    // Open the printable Registration Form for Maria Demo Student
    console.log('Step 23-28: Open Printable Registration Form');
    const viewPrintFormLink = page.locator('a:has-text("View/Print Form")').first();
    if (await viewPrintFormLink.count() > 0) {
      await viewPrintFormLink.click();
    } else {
      await page.goto(`${BASE_URL}/admin/enrollments`);
      await page.locator('a:has-text("View/Print Form")').first().click();
    }
    await page.waitForLoadState('networkidle');
    await sleep(4000);

    // Scroll to the bottom showing all 5 signature blocks
    console.log('Step 25-28: Scroll to bottom signature boxes & details');
    await smoothScroll(page, 400);
    await sleep(3000);
    await smoothScroll(page, 500);
    await sleep(4000);

    await showCaption(page, 'The form is complete after the student also signs.');
    await sleep(4000);

    // SCREENSHOT 3: Printable form showing all staff signatures
    const screenshot3Path = path.join(ARTIFACTS_DIR, '03_printable_registration_form_all_signatures.png');
    const docsScreenshot3 = path.join(DOCS_RECORDINGS_DIR, '03_printable_registration_form_all_signatures.png');
    await page.screenshot({ path: screenshot3Path, fullPage: false });
    fs.copyFileSync(screenshot3Path, docsScreenshot3);
    console.log('Captured Screenshot 3:', screenshot3Path);

    // Step 29: End with the printable form visible on the desktop screen
    await sleep(6000);

    console.log('\nWorkflow recording completed successfully!');
  } catch (err) {
    console.error('Recording execution error:', err);
    throw err;
  } finally {
    const video = page.video();
    await context.close();
    const targetVideo1 = path.join(ARTIFACTS_DIR, 'pkm_des_full_esignature_workflow.mp4');
    const targetVideo2 = path.join(DOCS_RECORDINGS_DIR, 'pkm_des_full_esignature_workflow.mp4');
    if (video) {
      await video.saveAs(targetVideo1);
      fs.copyFileSync(targetVideo1, targetVideo2);
      console.log('Saved Full E-Signature Workflow Video to:');
      console.log(' ->', targetVideo1);
      console.log(' ->', targetVideo2);
    }
    await browser.close();
  }
}

runCompleteESignatureWorkflow().catch((err) => {
  console.error('Fatal recording error:', err);
  process.exit(1);
});
