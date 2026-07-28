import { test, expect } from '@playwright/test';
// @ts-expect-error - missing declaration file for .mjs utils
import { validateSmokeEnv, formatSmokeEnvironmentError } from '../../scripts/smoke/smoke-env-utils.mjs';
// @ts-expect-error - missing declaration file for .mjs utils
import { checkPreconditions } from '../../scripts/smoke/workflow-preconditions.mjs';
// @ts-expect-error - missing declaration file for .mjs demo script
import * as demoRecords from '../../scripts/demo/demo-records.mjs';
import { maskDisplayName, maskEmail, maskStudentId } from '../../lib/account-claim/masking';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const demoRecordsAny = demoRecords as any;
const { 
  CLAIM_ONLY_DEMO_RECORD,
  DEMO_YEAR_LEVEL,
  DEMO_STUDENT_TYPE,
  DEMO_PROGRAM_NAME,
  resolveDemoTerm
} = demoRecordsAny;

let currentStage = 'environment_validated';

test.beforeAll(() => {
  try {
    validateSmokeEnv(process.env);
    currentStage = 'environment_validated';
    checkPreconditions(process.env);
    currentStage = 'demo_state_verified';
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
  if (!secret) return;
  const bodyText = await page.innerText('body');
  if (bodyText.includes(secret)) {
    throw new Error(`smoke_secret_rendered: ${label}`);
  }
}

test.describe.serial('Demo Workflow Smoke Test', () => {
  const { email, studentIdNumber, firstName, lastName } = CLAIM_ONLY_DEMO_RECORD;
  const newPassword = process.env.SMOKE_NEW_STUDENT_PASSWORD || '';
  const registrarEmail = process.env.SMOKE_REGISTRAR_EMAIL || '';
  const registrarPassword = process.env.SMOKE_REGISTRAR_PASSWORD || '';

  const { academicYear, semester } = resolveDemoTerm(process.env);

  test('Account claim workflow', async ({ page }) => {
    await page.goto('/create-account');
    
    // Stage 1: Find My Record
    await page.getByLabel('Student Type').selectOption({ label: DEMO_STUDENT_TYPE });
    await page.getByLabel('Active Email Address').fill(email);
    await page.getByLabel('Student ID Number').fill(studentIdNumber);
    await page.getByRole('button', { name: 'Find My Record', exact: true }).click();

    // Assert Official record found
    await expect(page.getByText('Official record found')).toBeVisible();

    // Verify masked details
    const expectedMaskedName = maskDisplayName(firstName, lastName);
    const expectedMaskedEmail = maskEmail(email);
    const expectedMaskedId = maskStudentId(studentIdNumber);

    await expect(page.getByText(expectedMaskedName)).toBeVisible();
    await expect(page.getByText(expectedMaskedEmail)).toBeVisible();
    await expect(page.getByText(expectedMaskedId)).toBeVisible();
    await expect(page.getByText(DEMO_PROGRAM_NAME)).toBeVisible();
    await expect(page.getByText(DEMO_YEAR_LEVEL)).toBeVisible();
    await expect(page.getByText(DEMO_STUDENT_TYPE)).toBeVisible();

    currentStage = 'claim_record_found';

    // Stage 2: Create Account
    await page.getByLabel('Password', { exact: true }).fill(newPassword);
    await page.getByLabel('Confirm Password', { exact: true }).fill(newPassword);
    await page.getByRole('button', { name: 'Create Account', exact: true }).click();

    // Assert success message or Go to Login
    await expect(page.getByText('Student Account Created').or(page.getByRole('link', { name: 'Go to Login', exact: true }))).toBeVisible();

    currentStage = 'student_account_created';

    await assertSecretNotRendered(page, newPassword, 'SMOKE_NEW_STUDENT_PASSWORD');
    await assertSecretNotRendered(page, registrarPassword, 'SMOKE_REGISTRAR_PASSWORD');
  });

  test('Student session: submit enrollment', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email Address').fill(email);
    await page.getByLabel('Password').fill(newPassword);
    await page.getByRole('button', { name: 'Login', exact: true }).click();

    await page.waitForURL('**/student/dashboard**');
    await expect(page.getByRole('heading', { name: `Welcome, ${firstName} ${lastName}!`, exact: true }).or(page.getByRole('heading', { name: /Welcome,/ }))).toBeVisible();
    await expect(page.getByText(firstName)).toBeVisible();

    // Check stub links are absent
    await expect(page.getByRole('link', { name: 'Grades', exact: true })).not.toBeVisible();
    await expect(page.getByRole('link', { name: 'Class Schedule', exact: true })).not.toBeVisible();
    await expect(page.getByRole('link', { name: 'Balances', exact: true })).not.toBeVisible();

    currentStage = 'student_logged_in';

    const studentNav = page.getByRole('navigation', { name: 'Student Portal navigation' });

    await studentNav.getByRole('link', { name: 'Subject List', exact: true }).click();
    await page.waitForURL('**/student/subjects**');
    await expect(page.getByRole('heading', { name: 'Subject List', exact: true })).toBeVisible();

    await studentNav.getByRole('link', { name: 'Online Enrollment', exact: true }).click();
    await page.waitForURL('**/student/enrollment**');

    // Assert attributes
    await expect(page.getByText('Program')).toBeVisible();
    await expect(page.getByText(DEMO_PROGRAM_NAME)).toBeVisible();
    await expect(page.getByText('Year Level')).toBeVisible();
    await expect(page.getByText(DEMO_YEAR_LEVEL)).toBeVisible();
    await expect(page.getByText('Student Type')).toBeVisible();
    await expect(page.getByText(DEMO_STUDENT_TYPE)).toBeVisible();
    await expect(page.getByText('Current Academic Year')).toBeVisible();
    await expect(page.getByText(academicYear)).toBeVisible();
    await expect(page.getByText('Current Semester')).toBeVisible();
    await expect(page.getByText(semester)).toBeVisible();
    
    // Check certification
    await page.getByLabel('I certify that the information provided is correct').check();

    // Submit enrollment
    await page.getByRole('button', { name: 'Submit Enrollment', exact: true }).click();

    await page.waitForURL('**/student/enrollment-status**');
    await expect(page.getByRole('heading', { name: 'Enrollment Status Result', exact: true })).toBeVisible();
    await expect(page.getByText('PENDING')).toBeVisible();

    currentStage = 'enrollment_submitted';

    await assertSecretNotRendered(page, newPassword, 'SMOKE_NEW_STUDENT_PASSWORD');

    // Logout
    await page.getByRole('button', { name: 'Log out', exact: true }).click();
    await page.waitForURL('**/login**');
  });

  test('Registrar session: approve enrollment', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email Address').fill(registrarEmail);
    await page.getByLabel('Password').fill(registrarPassword);
    await page.getByRole('button', { name: 'Login', exact: true }).click();

    await page.waitForURL('**/admin/dashboard**');

    currentStage = 'registrar_logged_in';

    const adminNav = page.getByRole('navigation', { name: 'Admin Portal navigation' });

    await adminNav.getByRole('link', { name: 'Pending Enrollments', exact: true }).click();
    await page.waitForURL('**/admin/enrollments**');

    const row = page.getByRole('row', { name: new RegExp(studentIdNumber, 'i') });
    await expect(row).toBeVisible();
    await expect(row.getByText('PENDING')).toBeVisible();

    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Approve this pending enrollment request?');
      await dialog.accept();
    });

    await row.getByRole('button', { name: 'Approve', exact: true }).click();

    await expect(page.getByText('Enrollment request approved successfully')).toBeVisible();
    await expect(row).not.toBeVisible();

    currentStage = 'enrollment_approved';

    await adminNav.getByRole('link', { name: 'Enrollment Reports', exact: true }).click();
    await page.waitForURL('**/admin/reports**');
    await expect(page.getByText(studentIdNumber)).toBeVisible();

    currentStage = 'report_verified';

    await adminNav.getByRole('link', { name: 'Enrollment Masterlist', exact: true }).click();
    await page.waitForURL('**/admin/masterlist**');
    await expect(page.getByText(studentIdNumber)).toBeVisible();

    currentStage = 'masterlist_verified';

    await adminNav.getByRole('link', { name: 'Student Records', exact: true }).click();
    await page.waitForURL('**/admin/students**');
    await expect(page.getByText(studentIdNumber)).toBeVisible();

    currentStage = 'student_record_verified';

    await assertSecretNotRendered(page, registrarPassword, 'SMOKE_REGISTRAR_PASSWORD');

    await page.getByRole('button', { name: 'Log out', exact: true }).click();
    await page.waitForURL('**/login**');
  });

  test('Final student verification', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email Address').fill(email);
    await page.getByLabel('Password').fill(newPassword);
    await page.getByRole('button', { name: 'Login', exact: true }).click();

    await page.waitForURL('**/student/dashboard**');

    await page.getByRole('link', { name: 'Enrollment Status', exact: true }).click();
    await page.waitForURL('**/student/enrollment-status**');

    await expect(page.getByText('APPROVED').or(page.getByText('ENROLLED'))).toBeVisible();

    await page.getByRole('link', { name: 'Print Draft Registration Form', exact: true }).click();
    await page.waitForURL('**/student/cor**');

    // Assert COR Draft details
    await expect(page.getByText('Draft Registration Form')).toBeVisible();
    await expect(page.getByText('Draft - Not Official COR')).toBeVisible();
    await expect(page.getByText('Student Number')).toBeVisible();
    await expect(page.getByText('Student Name')).toBeVisible();
    await expect(page.getByText('Subject Load')).toBeVisible();

    await expect(page.getByText(studentIdNumber)).toBeVisible();
    await expect(page.getByText(firstName)).toBeVisible();

    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByText('Assessment of Tuition and Other School Fees')).toBeVisible();
    await expect(page.getByText('Tuition Fee')).toBeVisible();
    await expect(page.getByText('Other School Fees')).toBeVisible();
    await expect(page.getByText('Scholarship')).toBeVisible();
    await expect(page.getByText('Total Assessment')).toBeVisible();

    // Clearance signature lines group
    const signatureSection = page.locator('[aria-label="Clearance signature lines"]').or(page.getByRole('region', { name: 'Clearance signature lines' }));
    await expect(signatureSection).toBeVisible();
    await expect(signatureSection.getByText('Dean')).toBeVisible();
    await expect(signatureSection.getByText('Librarian')).toBeVisible();
    await expect(signatureSection.getByText('Nurse')).toBeVisible();
    await expect(signatureSection.getByText('Accountant')).toBeVisible();
    await expect(signatureSection.getByText('Registrar')).toBeVisible();

    // Check portal navigation visibility
    const aside = page.locator('aside');
    const header = page.locator('header');

    // Visible in screen media
    await expect(aside.or(header)).toBeVisible();

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

    currentStage = 'registration_form_verified';

    await page.getByRole('button', { name: 'Log out', exact: true }).click();

    currentStage = 'workflow_complete';
  });
});
