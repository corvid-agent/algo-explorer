import { test, expect } from '@playwright/test';

test.describe('Explorer', () => {
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

  test('should show blocks list', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#blocks-list')).toBeAttached();
  });

  test('should show transactions list', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#txns-list')).toBeAttached();
  });

  test('should show chart area', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#chart-area')).toBeAttached();
  });

  test('should have search functionality', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.locator('#search-input');
    await searchInput.fill('50000000');
    await searchInput.press('Enter');
  });
});
