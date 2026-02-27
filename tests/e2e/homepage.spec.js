import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');

    // Check title
    await expect(page).toHaveTitle(/Tysk Vg1/);

    // Check main heading
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/Wir sprechen Deutsch/i);
  });

  test('should display lesson cards', async ({ page }) => {
    await page.goto('/');

    // Check that lesson cards are visible
    const lessonCard = page.locator('.leksjon-link').first();
    await expect(lessonCard).toBeVisible();
  });

  test('should navigate to a lesson', async ({ page }) => {
    await page.goto('/');

    // Click on first lesson (1.1)
    await page.click('text=Leksjon 1.1');

    // Wait for navigation
    await page.waitForLoadState('networkidle');

    // Check URL changed
    expect(page.url()).toContain('leksjon-1-1.html');

    // Check lesson title
    await expect(page.locator('h1, h2').first()).toContainText(/Hallo/i);
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');

    // Check that content is still visible
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();

    // Check that lesson cards adapt to mobile
    const lessonLink = page.locator('.leksjon-link').first();
    await expect(lessonLink).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('should have skip link', async ({ page }) => {
    await page.goto('/');

    // Tab to skip link
    await page.keyboard.press('Tab');

    // Check skip link is focused
    const skipLink = page.locator('.skip-link');
    await expect(skipLink).toBeFocused();
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');

    // Check h1 exists
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();

    // Check there's only one h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);
  });

  test('should have alt text on images', async ({ page }) => {
    await page.goto('/leksjon-1-1.html');

    const images = page.locator('img');
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      expect(alt).toBeTruthy();
    }
  });
});
