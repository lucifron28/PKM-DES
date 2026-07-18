import { test, expect } from '@playwright/test';
// @ts-expect-error - missing declaration file for .mjs demo script
import { 
  CLAIM_ONLY_DEMO_RECORD,
  DEMO_PROGRAM_CODE,
  DEMO_YEAR_LEVEL,
  DEMO_STUDENT_TYPE
} from '../../scripts/demo/demo-records.mjs';

test.describe.serial('Demo Workflow Smoke Test', () => {
  const { email, studentIdNumber, firstName } = CLAIM_ONLY_DEMO_RECORD;
  const newPassword = process.env.SMOKE_NEW_STUDENT_PASSWORD || '';
  const registrarEmail = process.env.SMOKE_REGISTRAR_EMAIL || '';
  const registrarPassword = process.env.SMOKE_REGISTRAR_PASSWORD || '';

  test('Precondition: Environment variables are set', () => {
    expect(newPassword).not.toBe('');
    expect(registrarEmail).not.toBe('');
    expect(registrarPassword).not.toBe('');
  });

  test('Account claim', async ({ page }) => {
    await page.goto('/create-account');
    
    // Fill the claim form
    await page.getByLabel(/Email/i).fill(email);
    await page.getByLabel(/Student ID/i).fill(studentIdNumber);
    await page.getByLabel(/Student Type/i).selectOption({ label: DEMO_STUDENT_TYPE });
    
    // Fill passwords
    const passwordInputs = await page.getByLabel(/Password/i).all();
    // Assuming the first is password, second is confirm password
    await passwordInputs[0].fill(newPassword);
    
    // If there is an explicit Confirm Password label
    const confirmInput = page.getByLabel(/Confirm Password/i);
    if (await confirmInput.isVisible()) {
       await confirmInput.fill(newPassword);
    } else if (passwordInputs.length > 1) {
       await passwordInputs[1].fill(newPassword);
    }

    // Submit
    await page.getByRole('button', { name: /Claim Account/i }).click();

    // Verify success or redirect to dashboard/login
    await page.waitForURL(/student|login/);
    
    // Confirm no password appears in output (inherent in standard testing)
    await expect(page.locator(`text=${newPassword}`)).not.toBeVisible();
  });

  test('Student session: submit enrollment', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/Email/i).fill(email);
    await page.getByLabel(/Password/i).fill(newPassword);
    await page.getByRole('button', { name: /Sign in/i }).click();

    await page.waitForURL('**/student/dashboard**');
    await expect(page.getByRole('heading', { name: /Student Dashboard/i })).toBeVisible();
    await expect(page.locator(`text=${firstName}`)).toBeVisible();

    await page.getByRole('link', { name: /Subjects/i }).click();
    await page.waitForURL('**/student/subjects**');
    await expect(page.getByRole('heading', { name: /Subject List/i })).toBeVisible();
    await expect(page.locator(`text=${DEMO_YEAR_LEVEL}`)).toBeVisible();

    await page.getByRole('link', { name: /Online Enrollment/i }).click();
    await page.waitForURL('**/student/enrollment**');

    // Confirm program and year level are read-only text or disabled inputs
    await expect(page.locator(`text=${DEMO_PROGRAM_CODE}`).first()).toBeVisible();
    await expect(page.locator(`text=${DEMO_YEAR_LEVEL}`).first()).toBeVisible();
    
    // Submit enrollment
    await page.getByRole('button', { name: /Submit Enrollment/i }).click();
    
    // Usually redirects to enrollment-status or dashboard with PENDING
    await page.waitForURL('**/student/enrollment-status**');
    await expect(page.locator('text=PENDING')).toBeVisible();

    // Logout
    await page.getByRole('button', { name: /Sign out/i }).click();
    await page.waitForURL('**/login**');

    // Confirm protected route redirects
    await page.goto('/student/dashboard');
    await page.waitForURL('**/login**');
  });

  test('Registrar session: approve enrollment', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/Email/i).fill(registrarEmail);
    await page.getByLabel(/Password/i).fill(registrarPassword);
    await page.getByRole('button', { name: /Sign in/i }).click();

    await page.waitForURL('**/admin/dashboard**');
    await expect(page.getByRole('heading', { name: /Admin Dashboard/i })).toBeVisible();

    await page.getByRole('link', { name: /Pending Enrollments/i }).first().click();
    await page.waitForURL('**/admin/enrollments**');
    
    // Wait for table to load and find the student
    await expect(page.locator(`text=${studentIdNumber}`).first()).toBeVisible();

    // Open the request (using link or button in the row)
    const reviewLink = page.getByRole('link', { name: /Review/i }).filter({ hasText: 'Review' }).first();
    await reviewLink.click();

    // Inside review page
    await expect(page.getByRole('heading', { name: /Enrollment Request/i })).toBeVisible();
    await page.getByRole('button', { name: /Approve/i }).click();
    
    // Confirm request displays APPROVED
    await expect(page.locator('text=APPROVED').first()).toBeVisible();

    // Open Enrollment Reports
    await page.getByRole('link', { name: /Reports/i }).click();
    await page.waitForURL('**/admin/reports**');
    await expect(page.locator(`text=${studentIdNumber}`).first()).toBeVisible();

    // Open Masterlist
    await page.getByRole('link', { name: /Masterlist/i }).click();
    await page.waitForURL('**/admin/masterlist**');
    await expect(page.locator(`text=${studentIdNumber}`).first()).toBeVisible();

    // Open Student Records
    await page.getByRole('link', { name: /Students/i }).click();
    await page.waitForURL('**/admin/students**');
    await expect(page.locator(`text=${studentIdNumber}`).first()).toBeVisible();

    // Logout
    await page.getByRole('button', { name: /Sign out/i }).click();
    await page.waitForURL('**/login**');

    // Confirm protected admin route redirects
    await page.goto('/admin/dashboard');
    await page.waitForURL('**/login**');
  });

  test('Final student verification', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/Email/i).fill(email);
    await page.getByLabel(/Password/i).fill(newPassword);
    await page.getByRole('button', { name: /Sign in/i }).click();

    await page.waitForURL('**/student/dashboard**');
    
    // Navigate to status or dashboard to check enrollment status
    await page.getByRole('link', { name: /Enrollment Status/i }).click();
    await page.waitForURL('**/student/enrollment-status**');
    
    // Check for approved or enrolled wording
    await expect(page.locator('text=APPROVED').or(page.locator('text=ENROLLED')).first()).toBeVisible();

    // Open registration-form route (often COR)
    await page.getByRole('link', { name: /Registration Form/i }).or(page.getByRole('link', { name: /COR/i })).click();
    
    // Confirm draft disclaimer
    await expect(page.locator('text=draft').or(page.locator('text=not an official document'))).toBeVisible();
    
    // Identity fields
    await expect(page.locator(`text=${studentIdNumber}`)).toBeVisible();
    await expect(page.locator(`text=${firstName}`)).toBeVisible();
    
    // Subjects table (should see units or subjects)
    await expect(page.getByRole('table')).toBeVisible();

    // Fee placeholders
    await expect(page.locator('text=Assessment').or(page.locator('text=Fees')).first()).toBeVisible();

    // Signature labels
    await expect(page.locator('text=Signature')).toBeVisible();
    
    // Portal navigation marked print-hidden
    const nav = page.locator('nav').first();
    await expect(nav).toHaveClass(/print-hidden/);

    await page.getByRole('button', { name: /Sign out/i }).click();
  });
});
