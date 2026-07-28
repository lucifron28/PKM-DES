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
    await page.getByLabel(/Student Type/i).selectOption({ label: DEMO_STUDENT_TYPE });
    await page.getByLabel(/Active Email Address/i).fill(email);
    await page.getByLabel(/Student ID Number/i).fill(studentIdNumber);
    await page.getByRole('button', { name: /Find My Record/i }).click();

    // Assert Official record found
    await expect(page.locator('text=Official record found').first()).toBeVisible();

    // Verify masked details
    const expectedMaskedName = maskDisplayName(firstName, lastName);
    const expectedMaskedEmail = maskEmail(email);
    const expectedMaskedId = maskStudentId(studentIdNumber);

    await expect(page.locator(`text=${expectedMaskedName}`).first()).toBeVisible();
    await expect(page.locator(`text=${expectedMaskedEmail}`).first()).toBeVisible();
    await expect(page.locator(`text=${expectedMaskedId}`).first()).toBeVisible();
    await expect(page.locator(`text=${DEMO_PROGRAM_NAME}`).first()).toBeVisible();
    await expect(page.locator(`text=${DEMO_YEAR_LEVEL}`).first()).toBeVisible();
    await expect(page.locator(`text=${DEMO_STUDENT_TYPE}`).first()).toBeVisible();

    currentStage = 'claim_record_found';

    // Stage 2: Create Account
    await page.getByLabel(/^Password/i).first().fill(newPassword);
    await page.getByLabel(/Confirm Password/i).fill(newPassword);
    await page.getByRole('button', { name: /Create Account/i }).click();

    // Assert success message or Go to Login
    await expect(page.locator('text=success').or(page.getByRole('link', { name: /Go to Login/i })).first()).toBeVisible();

    currentStage = 'student_account_created';

    await assertSecretNotRendered(page, newPassword, 'SMOKE_NEW_STUDENT_PASSWORD');
    await assertSecretNotRendered(page, registrarPassword, 'SMOKE_REGISTRAR_PASSWORD');
  });

  test('Student session: submit enrollment', async ({ page }) => {
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

    currentStage = 'student_logged_in';

    await page.getByRole('link', { name: /Subject List/i }).click();
    await page.waitForURL('**/student/subjects**');
    await expect(page.getByRole('heading', { name: /Subject List/i })).toBeVisible();

    await page.getByRole('link', { name: /Online Enrollment/i }).click();
    await page.waitForURL('**/student/enrollment**');

    // Assert attributes
    await expect(page.locator('text=Program').first()).toBeVisible();
    await expect(page.locator(`text=${DEMO_PROGRAM_NAME}`).first()).toBeVisible();
    await expect(page.locator('text=Year Level').first()).toBeVisible();
    await expect(page.locator(`text=${DEMO_YEAR_LEVEL}`).first()).toBeVisible();
    await expect(page.locator('text=Student Type').first()).toBeVisible();
    await expect(page.locator(`text=${DEMO_STUDENT_TYPE}`).first()).toBeVisible();
    await expect(page.locator('text=Current Academic Year').first()).toBeVisible();
    await expect(page.locator(`text=${academicYear}`).first()).toBeVisible();
    await expect(page.locator('text=Current Semester').first()).toBeVisible();
    await expect(page.locator(`text=${semester}`).first()).toBeVisible();

    // Check certification
    await page.getByLabel(/I certify that the information provided is correct/i).check();

    // Submit enrollment
    await page.getByRole('button', { name: /Submit Enrollment/i }).click();

    await page.waitForURL('**/student/enrollment-status**');
    await expect(page.locator('text=Enrollment Status Result').first()).toBeVisible();
    await expect(page.locator('text=PENDING').first()).toBeVisible();

    currentStage = 'enrollment_submitted';

    await assertSecretNotRendered(page, newPassword, 'SMOKE_NEW_STUDENT_PASSWORD');

    // Logout
    await page.getByRole('button', { name: /Log out|Logout/i }).click();
    await page.waitForURL('**/login**');
  });

  test('Registrar session: approve enrollment', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/Email/i).fill(registrarEmail);
    await page.getByLabel(/Password/i).fill(registrarPassword);
    await page.getByRole('button', { name: 'Login', exact: true }).click();

    await page.waitForURL('**/admin/dashboard**');

    currentStage = 'registrar_logged_in';

    await page.getByRole('link', { name: /Pending Enrollments/i }).first().click();
    await page.waitForURL('**/admin/enrollments**');

    const row = page.getByRole('row', { name: new RegExp(studentIdNumber, 'i') }).first();
    await expect(row).toBeVisible();
    await expect(row.locator('text=PENDING').first()).toBeVisible();

    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Approve this pending enrollment request?');
      await dialog.accept();
    });

    await row.getByRole('button', { name: /Approve/i }).click();

    await expect(page.locator('text=Enrollment request approved successfully').first()).toBeVisible();
    await expect(row).not.toBeVisible();

    currentStage = 'enrollment_approved';

    await page.getByRole('link', { name: /Reports/i }).click();
    await page.waitForURL('**/admin/reports**');
    await expect(page.locator(`text=${studentIdNumber}`).first()).toBeVisible();

    currentStage = 'report_verified';

    await page.getByRole('link', { name: /Masterlist/i }).click();
    await page.waitForURL('**/admin/masterlist**');
    await expect(page.locator(`text=${studentIdNumber}`).first()).toBeVisible();

    currentStage = 'masterlist_verified';

    await page.getByRole('link', { name: /Student Records/i }).or(page.getByRole('link', { name: /Students/i })).first().click();
    await page.waitForURL('**/admin/students**');
    await expect(page.locator(`text=${studentIdNumber}`).first()).toBeVisible();

    currentStage = 'student_record_verified';

    await assertSecretNotRendered(page, registrarPassword, 'SMOKE_REGISTRAR_PASSWORD');

    await page.getByRole('button', { name: /Log out|Logout/i }).click();
    await page.waitForURL('**/login**');
  });

  test('Final student verification', async ({ page }) => {
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

    // Assert COR Draft details
    await expect(page.locator('text=Draft Registration Form').first()).toBeVisible();
    await expect(page.locator('text=Draft - Not Official COR').first()).toBeVisible();
    await expect(page.locator('text=Student Number').first()).toBeVisible();
    await expect(page.locator('text=Student Name').first()).toBeVisible();
    await expect(page.locator('text=Subject Load').first()).toBeVisible();

    await expect(page.locator(`text=${studentIdNumber}`).first()).toBeVisible();
    await expect(page.locator(`text=${firstName}`).first()).toBeVisible();

    await expect(page.getByRole('table').first()).toBeVisible();
    await expect(page.locator('text=Assessment of Tuition and Other School Fees').first()).toBeVisible();
    await expect(page.locator('text=Tuition Fee').first()).toBeVisible();
    await expect(page.locator('text=Other School Fees').first()).toBeVisible();
    await expect(page.locator('text=Scholarship').first()).toBeVisible();
    await expect(page.locator('text=Total Assessment').first()).toBeVisible();

    // Clearance signature lines group
    const signatureSection = page.locator('[aria-label="Clearance signature lines"]').or(page.getByRole('region', { name: 'Clearance signature lines' })).first();
    await expect(signatureSection).toBeVisible();
    await expect(signatureSection.locator('text=Dean')).toBeVisible();
    await expect(signatureSection.locator('text=Librarian')).toBeVisible();
    await expect(signatureSection.locator('text=Nurse')).toBeVisible();
    await expect(signatureSection.locator('text=Accountant')).toBeVisible();
    await expect(signatureSection.locator('text=Registrar')).toBeVisible();

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

    currentStage = 'registration_form_verified';

    await page.getByRole('button', { name: /Log out|Logout/i }).click();

    currentStage = 'workflow_complete';
  });
});
