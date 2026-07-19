import { test, expect } from '@playwright/test';

test.describe('Public Read-Only Pages', () => {
  test('Home page renders and has security headers', async ({ page }) => {
    const response = await page.goto('/');
    expect(response).toBeTruthy();
    if (response) {
      const headers = response.headers();
      const robotsTag = headers['x-robots-tag'] || '';
      expect(robotsTag).toContain('noindex');
      expect(robotsTag).toContain('nofollow');
      expect(robotsTag).toContain('noarchive');
      
      expect(headers['x-content-type-options']).toBeDefined();
      expect(headers['x-frame-options']).toBeDefined();
      expect(headers['referrer-policy']).toBeDefined();
      expect(headers['permissions-policy']).toBeDefined();
    }
    
    // Smoke check content
    await expect(page.getByRole('heading', { name: /Welcome to Pambayang Kolehiyo ng Mauban!/i })).toBeVisible();
    
    // Check for exposed secrets or generic framework errors
    const bodyText = await page.innerText('body');
    if (bodyText.includes('NEXT_PUBLIC_SUPABASE_URL')) {
      throw new Error('smoke_secret_rendered: NEXT_PUBLIC_SUPABASE_URL');
    }
    
    // Check for specific application errors instead of generic 'Error' text
    await expect(page.locator('text=Application error')).not.toBeVisible();
    await expect(page.locator('text=configuration could not be loaded')).not.toBeVisible();
  });

  test('About page renders', async ({ page }) => {
    await page.goto('/about');
    await expect(page.locator('text=Pambayang Kolehiyo ng Mauban').first()).toBeVisible();
    await expect(page.locator('text=Vision').first()).toBeVisible();
    await expect(page.locator('text=Mission').first()).toBeVisible();
    await expect(page.locator('text=Goals').first()).toBeVisible();
  });

  test('Login renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Login', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Login', exact: true })).toBeVisible();
  });

  test('Create Student Account renders', async ({ page }) => {
    await page.goto('/create-account');
    await expect(page.getByRole('heading', { name: 'Create Student Account', exact: true })).toBeVisible();
    await expect(page.getByLabel(/Student Type/i)).toBeVisible();
    await expect(page.getByLabel(/Active Email Address/i)).toBeVisible();
    await expect(page.getByLabel(/Student ID Number/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Find My Record/i })).toBeVisible();
  });

  test('robots.txt disallows crawling', async ({ page }) => {
    const response = await page.goto('/robots.txt');
    expect(response).toBeTruthy();
    if (response) {
      const text = await response.text();
      expect(text).toContain('User-agent: *');
      expect(text).toContain('Disallow: /');
    }
  });

  test('Unauthenticated /student/dashboard redirects to Login', async ({ page }) => {
    await page.goto('/student/dashboard');
    await page.waitForURL('**/login**');
    await expect(page.getByRole('heading', { name: 'Login', exact: true })).toBeVisible();
  });

  test('Unauthenticated /admin/dashboard redirects to Login', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await page.waitForURL('**/login**');
    await expect(page.getByRole('heading', { name: 'Login', exact: true })).toBeVisible();
  });
});
