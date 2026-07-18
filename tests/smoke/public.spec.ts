import { test, expect } from '@playwright/test';

test.describe('Public Read-Only Pages', () => {
  test('Home page renders and has security headers', async ({ page }) => {
    const response = await page.goto('/');
    expect(response).toBeTruthy();
    if (response) {
      const headers = response.headers();
      expect(headers['x-robots-tag']).toBe('noindex');
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['x-frame-options']).toBe('DENY');
      expect(headers['referrer-policy']).toBeDefined();
      expect(headers['permissions-policy']).toBeDefined();
    }
    
    // Smoke check content
    await expect(page.getByRole('heading', { name: /Polytechnic Knowledge/i })).toBeVisible();
    await expect(page.locator('text=NEXT_PUBLIC_SUPABASE_URL')).not.toBeVisible();
    await expect(page.locator('text=Error')).not.toBeVisible();
  });

  test('About Us renders', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByRole('heading', { name: /About Us/i })).toBeVisible();
  });

  test('Login renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /Sign in/i })).toBeVisible();
    await expect(page.getByLabel(/Email/i)).toBeVisible();
  });

  test('Create Student Account renders', async ({ page }) => {
    await page.goto('/create-account');
    await expect(page.getByRole('heading', { name: /Claim Account/i }).or(page.getByRole('heading', { name: /Create Account/i }))).toBeVisible();
    await expect(page.getByLabel(/Student ID/i)).toBeVisible();
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
    await expect(page.getByRole('heading', { name: /Sign in/i })).toBeVisible();
  });

  test('Unauthenticated /admin/dashboard redirects to Login', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await page.waitForURL('**/login**');
    await expect(page.getByRole('heading', { name: /Sign in/i })).toBeVisible();
  });

  test('Stub navigation is not visible', async ({ page }) => {
    await page.goto('/');
    // Make sure dev tools/stub navigation for tests doesn't exist on page
    await expect(page.locator('text=Stub Navigation')).not.toBeVisible();
  });
});
