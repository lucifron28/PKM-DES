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
  const canonicalFullName = `${firstName} ${lastName}`;

  const { academicYear, semester } = resolveDemoTerm(process.env);

  test('Account claim workflow', async ({ page }) => {
    await page.goto('/create-account');

    // Stage 1: Find My Record
    await page.getByLabel('Student Type', { exact: true }).selectOption({ label: DEMO_STUDENT_TYPE });
    await page.getByLabel('Active Email Address', { exact: true }).fill(email);
    await page.getByLabel('Student ID Number', { exact: true }).fill(studentIdNumber);
    await page.getByRole('button', { name: 'Find My Record', exact: true }).click();

    // Assert Official record found
    await expect(page.getByText('Official record found', { exact: true })).toBeVisible();

    // Verify masked details inside the found record card
    const expectedMaskedName = maskDisplayName(firstName, lastName);
    const expectedMaskedEmail = maskEmail(email);
    const expectedMaskedId = maskStudentId(studentIdNumber);

    const recordCard = page.locator('form').filter({ has: page.getByText('Official record found') });
    await expect(recordCard.getByText(expectedMaskedName, { exact: true })).toBeVisible();
    await expect(recordCard.getByText(expectedMaskedEmail, { exact: true })).toBeVisible();
    await expect(recordCard.getByText(expectedMaskedId, { exact: true })).toBeVisible();
    await expect(recordCard.getByText(DEMO_PROGRAM_NAME, { exact: true })).toBeVisible();
    await expect(recordCard.getByText(DEMO_YEAR_LEVEL, { exact: true })).toBeVisible();
    await expect(recordCard.getByText(DEMO_STUDENT_TYPE, { exact: true })).toBeVisible();

    currentStage = 'claim_record_found';

    // Stage 2: Create Account
    await page.getByLabel('Password', { exact: true }).fill(newPassword);
    await page.getByLabel('Confirm Password', { exact: true }).fill(newPassword);
    await page.getByRole('button', { name: 'Create Account', exact: true }).click();

    // Assert success message or Go to Login link
    await expect(
      page.getByText('Student Account Created', { exact: true })
        .or(page.getByRole('link', { name: 'Go to Login', exact: true }))
    ).toBeVisible();

    currentStage = 'student_account_created';

    await assertSecretNotRendered(page, newPassword, 'SMOKE_NEW_STUDENT_PASSWORD');
    await assertSecretNotRendered(page, registrarPassword, 'SMOKE_REGISTRAR_PASSWORD');
  });

  test('Student session: submit enrollment', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email Address', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(newPassword);
    await page.getByRole('button', { name: 'Login', exact: true }).click();

    await page.waitForURL('**/student/dashboard**');
    await expect(page.getByRole('heading', { name: `Welcome, ${canonicalFullName}!`, exact: true })).toBeVisible();

    const studentNav = page.getByRole('navigation', { name: 'Student Portal navigation' });

    // Check stub links are absent in navigation
    await expect(studentNav.getByRole('link', { name: 'Grades', exact: true })).not.toBeVisible();
    await expect(studentNav.getByRole('link', { name: 'Class Schedule', exact: true })).not.toBeVisible();
    await expect(studentNav.getByRole('link', { name: 'Balances', exact: true })).not.toBeVisible();

    currentStage = 'student_logged_in';

    await studentNav.getByRole('link', { name: 'Subject List', exact: true }).click();
    await page.waitForURL('**/student/subjects**');
    await expect(page.getByRole('heading', { name: 'Subject List', level: 1, exact: true })).toBeVisible();

    await studentNav.getByRole('link', { name: 'Online Enrollment', exact: true }).click();
    await page.waitForURL('**/student/enrollment**');

    // Scope enrollment details to enrollment form definition list
    const enrollmentDetails = page.locator('form dl');
    await expect(enrollmentDetails.getByText('Program', { exact: true })).toBeVisible();
    await expect(enrollmentDetails.getByText(DEMO_PROGRAM_NAME, { exact: true })).toBeVisible();
    await expect(enrollmentDetails.getByText('Year Level', { exact: true })).toBeVisible();
    await expect(enrollmentDetails.getByText(DEMO_YEAR_LEVEL, { exact: true })).toBeVisible();
    await expect(enrollmentDetails.getByText('Student Type', { exact: true })).toBeVisible();
    await expect(enrollmentDetails.getByText(DEMO_STUDENT_TYPE, { exact: true })).toBeVisible();
    await expect(enrollmentDetails.getByText('Current Academic Year', { exact: true })).toBeVisible();
    await expect(enrollmentDetails.getByText(academicYear, { exact: true })).toBeVisible();
    await expect(enrollmentDetails.getByText('Current Semester', { exact: true })).toBeVisible();
    await expect(enrollmentDetails.getByText(semester, { exact: true })).toBeVisible();

    // Check certification
    await page.getByLabel('I certify that the information provided is correct.', { exact: true }).check();

    // Submit enrollment
    await page.getByRole('button', { name: 'Submit Enrollment', exact: true }).click();

    await page.waitForURL('**/student/enrollment-status**');
    await expect(page.getByRole('heading', { name: 'Enrollment Status Result', level: 2, exact: true })).toBeVisible();
    await expect(page.getByText('PENDING', { exact: true })).toBeVisible();

    currentStage = 'enrollment_submitted';

    await assertSecretNotRendered(page, newPassword, 'SMOKE_NEW_STUDENT_PASSWORD');

    // Logout
    await page.getByRole('button', { name: 'Log out', exact: true }).click();
    await page.waitForURL('**/login**');
  });

  test('Registrar session: approve enrollment', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email Address', { exact: true }).fill(registrarEmail);
    await page.getByLabel('Password', { exact: true }).fill(registrarPassword);
    await page.getByRole('button', { name: 'Login', exact: true }).click();

    await page.waitForURL('**/admin/dashboard**');

    currentStage = 'registrar_logged_in';

    const adminNav = page.getByRole('navigation', { name: 'Admin Portal navigation' });

    await adminNav.getByRole('link', { name: 'Pending Enrollments', exact: true }).click();
    await page.waitForURL('**/admin/enrollments**');

    const row = page.getByRole('row', { name: new RegExp(studentIdNumber, 'i') });
    await expect(row).toBeVisible();
    await expect(row.getByText('PENDING', { exact: true })).toBeVisible();

    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Approve this pending enrollment request?');
      await dialog.accept();
    });

    await row.getByRole('button', { name: 'Approve', exact: true }).click();

    await expect(page.getByText('Enrollment request approved successfully', { exact: true })).toBeVisible();
    await expect(row).not.toBeVisible();

    currentStage = 'enrollment_approved';

    await adminNav.getByRole('link', { name: 'Enrollment Reports', exact: true }).click();
    await page.waitForURL('**/admin/reports**');
    const reportsTable = page.getByRole('table');
    await expect(reportsTable.getByText(studentIdNumber, { exact: true })).toBeVisible();

    currentStage = 'report_verified';

    await adminNav.getByRole('link', { name: 'Enrollment Masterlist', exact: true }).click();
    await page.waitForURL('**/admin/masterlist**');
    const masterlistTable = page.getByRole('table');
    await expect(masterlistTable.getByText(studentIdNumber, { exact: true })).toBeVisible();

    currentStage = 'masterlist_verified';

    await adminNav.getByRole('link', { name: 'Student Records', exact: true }).click();
    await page.waitForURL('**/admin/students**');
    const studentsTable = page.getByRole('table');
    await expect(studentsTable.getByText(studentIdNumber, { exact: true })).toBeVisible();

    currentStage = 'student_record_verified';

    await assertSecretNotRendered(page, registrarPassword, 'SMOKE_REGISTRAR_PASSWORD');

    await page.getByRole('button', { name: 'Log out', exact: true }).click();
    await page.waitForURL('**/login**');
  });

  test('Final student verification', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email Address', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(newPassword);
    await page.getByRole('button', { name: 'Login', exact: true }).click();

    await page.waitForURL('**/student/dashboard**');

    await page.getByRole('link', { name: 'Enrollment Status', exact: true }).click();
    await page.waitForURL('**/student/enrollment-status**');

    // Assert exact ENROLLED status
    await expect(page.getByText('ENROLLED', { exact: true })).toBeVisible();

    await page.getByRole('link', { name: 'Print Draft Registration Form', exact: true }).click();
    await page.waitForURL('**/student/cor**');

    const printedForm = page.locator('section.registration-print');
    await expect(printedForm).toBeVisible();

    // Assert COR Draft details inside printed form section
    await expect(printedForm.getByText('Student Number', { exact: true })).toBeVisible();
    await expect(printedForm.getByText(studentIdNumber, { exact: true })).toBeVisible();
    await expect(printedForm.getByText('Student Name', { exact: true })).toBeVisible();
    await expect(printedForm.getByText(canonicalFullName, { exact: true })).toBeVisible();
    await expect(printedForm.getByText('Subject Load', { exact: true })).toBeVisible();

    await expect(printedForm.getByRole('table')).toBeVisible();
    await expect(printedForm.getByText('Assessment of Tuition and Other School Fees', { exact: true })).toBeVisible();
    await expect(printedForm.getByText('Tuition Fee', { exact: true })).toBeVisible();
    await expect(printedForm.getByText('Other School Fees', { exact: true })).toBeVisible();
    await expect(printedForm.getByText('Scholarship', { exact: true })).toBeVisible();
    await expect(printedForm.getByText('Total Assessment', { exact: true })).toBeVisible();

    // Single semantic locator for Clearance signature lines region
    const signatureSection = page.getByRole('region', { name: 'Clearance signature lines' });
    await expect(signatureSection).toBeVisible();
    await expect(signatureSection.getByText('Dean', { exact: true })).toBeVisible();
    await expect(signatureSection.getByText('Librarian', { exact: true })).toBeVisible();
    await expect(signatureSection.getByText('Nurse', { exact: true })).toBeVisible();
    await expect(signatureSection.getByText('Accountant', { exact: true })).toBeVisible();
    await expect(signatureSection.getByText('Registrar', { exact: true })).toBeVisible();

    // Media checks with targeted elements
    const sidebar = page.getByRole('complementary', { name: 'Student Portal sidebar' });
    const portalHeader = page.getByRole('banner').filter({ has: page.getByRole('heading', { name: 'Registration Form', level: 1 }) });

    // Visible in screen media
    await expect(sidebar).toBeVisible();
    await expect(portalHeader).toBeVisible();
    await expect(printedForm).toBeVisible();

    // Hidden in print media
    await page.emulateMedia({ media: 'print' });
    await expect(sidebar).toBeHidden();
    await expect(portalHeader).toBeHidden();
    await expect(printedForm).toBeVisible();

    // Restore screen media
    await page.emulateMedia({ media: 'screen' });

    await assertSecretNotRendered(page, newPassword, 'SMOKE_NEW_STUDENT_PASSWORD');

    currentStage = 'registration_form_verified';

    await page.getByRole('button', { name: 'Log out', exact: true }).click();

    currentStage = 'workflow_complete';
  });
});
