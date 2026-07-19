import { test, expect } from '@playwright/test';
// @ts-expect-error - missing declaration file for .mjs utils
import { validateSmokeEnv, formatSmokeEnvironmentError } from '../../scripts/smoke/smoke-env-utils.mjs';
// @ts-expect-error - missing declaration file for .mjs demo script
import * as demoRecords from '../../scripts/demo/demo-records.mjs';
const { 
  CLAIM_ONLY_DEMO_RECORD,
  DEMO_PROGRAM_CODE,
  DEMO_YEAR_LEVEL,
  DEMO_STUDENT_TYPE
// eslint-disable-next-line @typescript-eslint/no-explicit-any
} = demoRecords as any;

let currentStage = 'environment_validated';

test.beforeAll(() => {
  try {
    validateSmokeEnv(process.env);
  } catch (err) {
    throw new Error(`Smoke environment validation failed at stage: ${formatSmokeEnvironmentError(err)}`);
  }
});

test.afterEach(async ({}, testInfo) => {
  if (testInfo.status !== 'passed' && testInfo.status !== 'skipped') {
    console.error(`Smoke workflow failed after stage: ${currentStage}`);
  }
});

async function assertSecretNotRendered(page: import('@playwright/test').Page, secret: string, label: string) {
  const bodyText = await page.innerText('body');
  if (bodyText.includes(secret)) {
    throw new Error(`smoke_secret_rendered: ${label}`);
  }
}

test.describe.serial('Demo Workflow Smoke Test', () => {
  const { email, studentIdNumber, firstName } = CLAIM_ONLY_DEMO_RECORD;
  const newPassword = process.env.SMOKE_NEW_STUDENT_PASSWORD || '';
  const registrarEmail = process.env.SMOKE_REGISTRAR_EMAIL || '';
  const registrarPassword = process.env.SMOKE_REGISTRAR_PASSWORD || '';

  test('Precondition: Environment variables are set', () => {
    currentStage = 'demo_state_verified';
  });

  test('Account claim workflow', async ({ page }) => {
    currentStage = 'claim_record_found';
    await page.goto('/create-account');
    
    // Stage 1: Find My Record
    await page.getByLabel(/Student Type/i).selectOption({ label: DEMO_STUDENT_TYPE });
    await page.getByLabel(/Active Email Address/i).fill(email);
    await page.getByLabel(/Student ID Number/i).fill(studentIdNumber);
    await page.getByRole('button', { name: /Find My Record/i }).click();

    // Assert Official record found
    await expect(page.locator('text=Official record found').first()).toBeVisible();
    await expect(page.locator(`text=${studentIdNumber}`).first()).toBeVisible();
    await expect(page.locator(`text=${firstName}`).first()).toBeVisible();

    // Stage 2: Create Account
    currentStage = 'student_account_created';
    await page.getByLabel(/^Password/i).first().fill(newPassword);
    await page.getByLabel(/Confirm Password/i).fill(newPassword);
    await page.getByRole('button', { name: /Create Account/i }).click();

    // Assert success message or Go to Login
    await expect(page.locator('text=success').or(page.getByRole('link', { name: /Go to Login/i })).first()).toBeVisible();

    await assertSecretNotRendered(page, newPassword, 'SMOKE_NEW_STUDENT_PASSWORD');
    await assertSecretNotRendered(page, registrarPassword, 'SMOKE_REGISTRAR_PASSWORD');
  });

  test('Student session: submit enrollment', async ({ page }) => {
    currentStage = 'student_logged_in';
    await page.goto('/login');
    await page.getByLabel(/Email/i).fill(email);
    await page.getByLabel(/Password/i).fill(newPassword);
    await page.getByRole('button', { name: 'Login', exact: true }).click();

    await page.waitForURL('**/student/dashboard**');
    await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();
    await expect(page.locator(`text=${firstName}`).first()).toBeVisible();

    // Check stub links are absent
    await expect(page.getByRole('link', { name: /Grades/i })).not.toBeVisible();
    await expect(page.getByRole('link', { name: /Class Schedule/i })).not.toBeVisible();
    await expect(page.getByRole('link', { name: /Balances/i })).not.toBeVisible();

    await page.getByRole('link', { name: /Subject List/i }).click();
    await page.waitForURL('**/student/subjects**');
    await expect(page.getByRole('heading', { name: /Subject List/i })).toBeVisible();

    await page.getByRole('link', { name: /Online Enrollment/i }).click();
    await page.waitForURL('**/student/enrollment**');

    // Assert attributes
    await expect(page.locator(`text=${DEMO_PROGRAM_CODE}`).first()).toBeVisible();
    await expect(page.locator(`text=${DEMO_YEAR_LEVEL}`).first()).toBeVisible();
    await expect(page.locator(`text=${DEMO_STUDENT_TYPE}`).first()).toBeVisible();
    await expect(page.locator('text=2026-2027').first()).toBeVisible();
    await expect(page.locator('text=1st Semester').first()).toBeVisible();
    
    // Check certification
    await page.getByLabel(/I certify that the information provided is correct/i).check();

    // Submit enrollment
    currentStage = 'enrollment_submitted';
    await page.getByRole('button', { name: /Submit Enrollment/i }).click();
    
    await page.waitForURL('**/student/enrollment-status**');
    await expect(page.locator('text=Enrollment Status Result').first()).toBeVisible();
    await expect(page.locator('text=PENDING').first()).toBeVisible();

    await assertSecretNotRendered(page, newPassword, 'SMOKE_NEW_STUDENT_PASSWORD');

    // Logout
    await page.getByRole('button', { name: /Log out|Logout/i }).click();
    await page.waitForURL('**/login**');
  });

  test('Registrar session: approve enrollment', async ({ page }) => {
    currentStage = 'registrar_logged_in';
    await page.goto('/login');
    await page.getByLabel(/Email/i).fill(registrarEmail);
    await page.getByLabel(/Password/i).fill(registrarPassword);
    await page.getByRole('button', { name: 'Login', exact: true }).click();

    await page.waitForURL('**/admin/dashboard**');

    await page.getByRole('link', { name: /Pending Enrollments/i }).first().click();
    await page.waitForURL('**/admin/enrollments**');
    
    const row = page.getByRole('row', { name: new RegExp(studentIdNumber, 'i') }).first();
    await expect(row).toBeVisible();
    await expect(row.locator('text=PENDING').first()).toBeVisible();

    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Approve this pending enrollment request?');
      await dialog.accept();
    });

    currentStage = 'enrollment_approved';
    await row.getByRole('button', { name: /Approve/i }).click();
    
    await expect(page.locator('text=Enrollment request approved successfully').first()).toBeVisible();
    await expect(row).not.toBeVisible();

    currentStage = 'report_verified';
    await page.getByRole('link', { name: /Reports/i }).click();
    await page.waitForURL('**/admin/reports**');
    await expect(page.locator(`text=${studentIdNumber}`).first()).toBeVisible();

    currentStage = 'masterlist_verified';
    await page.getByRole('link', { name: /Masterlist/i }).click();
    await page.waitForURL('**/admin/masterlist**');
    await expect(page.locator(`text=${studentIdNumber}`).first()).toBeVisible();

    await page.getByRole('link', { name: /Student Records/i }).or(page.getByRole('link', { name: /Students/i })).first().click();
    await page.waitForURL('**/admin/students**');
    await expect(page.locator(`text=${studentIdNumber}`).first()).toBeVisible();

    await assertSecretNotRendered(page, registrarPassword, 'SMOKE_REGISTRAR_PASSWORD');

    await page.getByRole('button', { name: /Log out|Logout/i }).click();
    await page.waitForURL('**/login**');
  });

  test('Final student verification', async ({ page }) => {
    currentStage = 'registration_form_verified';
    await page.goto('/login');
    await page.getByLabel(/Email/i).fill(email);
    await page.getByLabel(/Password/i).fill(newPassword);
    await page.getByRole('button', { name: 'Login', exact: true }).click();

    await page.waitForURL('**/student/dashboard**');
    
    await page.getByRole('link', { name: /Enrollment Status/i }).click();
    await page.waitForURL('**/student/enrollment-status**');
    
    await expect(page.locator('text=APPROVED').or(page.locator('text=ENROLLED')).first()).toBeVisible();

    await page.getByRole('link', { name: /Print Draft Registration Form/i }).click();
    await page.waitForURL('**/student/cor**');
    
    await expect(page.locator('text=draft').or(page.locator('text=not an official document')).first()).toBeVisible();
    
    await expect(page.locator(`text=${studentIdNumber}`).first()).toBeVisible();
    await expect(page.locator(`text=${firstName}`).first()).toBeVisible();
    
    await expect(page.getByRole('table').first()).toBeVisible();
    await expect(page.locator('text=Assessment').or(page.locator('text=Fees')).first()).toBeVisible();
    await expect(page.locator('text=Signature').first()).toBeVisible();
    
    // Check portal navigation visibility
    const aside = page.locator('aside').first();
    const header = page.locator('header').first();
    
    // Visible in screen media
    await expect(aside.or(header).first()).toBeVisible();

    // Hidden in print media
    await page.emulateMedia({ media: 'print' });
    if (await aside.count() > 0) {
      await expect(aside).toBeHidden();
    }
    if (await header.count() > 0) {
      await expect(header).toBeHidden();
    }

    // Restore screen media
    await page.emulateMedia({ media: 'screen' });
    
    await assertSecretNotRendered(page, newPassword, 'SMOKE_NEW_STUDENT_PASSWORD');

    currentStage = 'workflow_complete';
    await page.getByRole('button', { name: /Log out|Logout/i }).click();
  });
});
