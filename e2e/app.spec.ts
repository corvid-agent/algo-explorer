import { test, expect } from '@playwright/test';

test.describe('App', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/mainnet-api.algonode.cloud/**', route =>
      route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ 'last-round': 50000000, 'time-since-last-round': 3000000000 }),
      })
    );
    await page.route('**/mainnet-idx.algonode.cloud/**', route =>
      route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ transactions: [], 'current-round': 50000000 }),
      })
    );
  });

  test('should load page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Algo Explorer/i);
  });

  test('should show search input', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#search-input')).toBeVisible();
  });

  test('should show chain stats', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.chain-stats')).toBeVisible();
  });

  test('should show health banner', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.health-banner')).toBeVisible();
  });
});
