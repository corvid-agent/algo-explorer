import { test, expect } from '@playwright/test';

test.describe('App loading and layout', () => {
  test.beforeEach(async ({ page }) => {
    // Mock all Algorand API calls to prevent network requests
    await page.route('https://mainnet-api.4160.nodely.dev/**', (route) => {
      const url = route.request().url();

      if (url.includes('/v2/status')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ 'last-round': 45000000 }),
        });
      }

      if (url.match(/\/v2\/blocks\/\d+/)) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            block: {
              rnd: 45000000,
              ts: Math.floor(Date.now() / 1000) - 5,
              txns: [{ type: 'pay', txn: { snd: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', amt: 1000000 } }],
              prp: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
              gh: 'wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=',
            },
          }),
        });
      }

      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    await page.route('https://mainnet-idx.4160.nodely.dev/**', (route) => {
      const url = route.request().url();

      if (url.includes('/v2/transactions') && !url.includes('/v2/transactions/')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            transactions: [
              {
                id: 'TXID1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12',
                'tx-type': 'pay',
                sender: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
                'payment-transaction': {
                  amount: 5000000,
                  receiver: 'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
                },
                'round-time': Math.floor(Date.now() / 1000) - 10,
                'confirmed-round': 44999999,
                fee: 1000,
              },
              {
                id: 'TXID_AXFER_567890ABCDEF1234567890ABCDEF1234567890ABCDEF',
                'tx-type': 'axfer',
                sender: 'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
                'asset-transfer-transaction': {
                  amount: 100,
                  receiver: 'EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE',
                  'asset-id': 31566704,
                },
                'round-time': Math.floor(Date.now() / 1000) - 20,
                'confirmed-round': 44999998,
                fee: 1000,
              },
            ],
          }),
        });
      }

      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    await page.goto('/');
  });

  test('has correct page title', async ({ page }) => {
    await expect(page).toHaveTitle('Algo Explorer | Lightweight Algorand Block Explorer');
  });

  test('shows the logo with algoexplorer text', async ({ page }) => {
    const logo = page.locator('.logo');
    await expect(logo).toBeVisible();
    await expect(logo).toContainText('algo');
    await expect(logo).toContainText('explorer');
  });

  test('shows the Mainnet network badge', async ({ page }) => {
    const badge = page.locator('.network-badge');
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('Mainnet');
  });

  test('shows the health banner with live indicator', async ({ page }) => {
    const banner = page.locator('.health-banner');
    await expect(banner).toBeVisible();
    await expect(page.locator('.health-banner .live-dot')).toBeVisible();
  });

  test('displays health banner stats after API loads', async ({ page }) => {
    await expect(page.locator('#health-round')).not.toHaveText('--');
  });

  test('shows the search input with correct placeholder', async ({ page }) => {
    const input = page.locator('#search-input');
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('placeholder', 'Search block, txn ID, address, or ASA ID...');
  });

  test('shows the search button', async ({ page }) => {
    const btn = page.locator('.search-btn');
    await expect(btn).toBeVisible();
    await expect(btn).toContainText('Search');
  });

  test('shows chain stats section with four stat cards', async ({ page }) => {
    const stats = page.locator('.chain-stat');
    await expect(stats).toHaveCount(4);

    // Verify the labels
    await expect(page.locator('.chain-stat-label').nth(0)).toContainText('Latest Block');
    await expect(page.locator('.chain-stat-label').nth(1)).toContainText('TPS');
    await expect(page.locator('.chain-stat-label').nth(2)).toContainText('Block Time');
    await expect(page.locator('.chain-stat-label').nth(3)).toContainText('Total Txns');
  });

  test('shows Latest Blocks panel', async ({ page }) => {
    const panel = page.locator('#blocks-panel');
    await expect(panel).toBeVisible();
    await expect(panel.locator('.panel-title')).toContainText('Latest Blocks');
  });

  test('shows Recent Transactions panel', async ({ page }) => {
    const panel = page.locator('#txns-panel');
    await expect(panel).toBeVisible();
    await expect(panel.locator('.panel-title')).toContainText('Recent Transactions');
  });

  test('shows Transaction Type Distribution chart panel', async ({ page }) => {
    const panel = page.locator('#chart-panel');
    await expect(panel).toBeVisible();
    await expect(panel.locator('.panel-title')).toContainText('Transaction Type Distribution');
  });

  test('shows keyboard shortcuts bar', async ({ page }) => {
    const bar = page.locator('.shortcuts-bar');
    await expect(bar).toBeVisible();
    await expect(bar).toContainText('Search');
    await expect(bar).toContainText('Close');
    await expect(bar).toContainText('Navigate');
    await expect(bar).toContainText('View details');
  });

  test('shows footer with navigation links', async ({ page }) => {
    const footer = page.locator('.footer');
    await expect(footer).toBeVisible();
    await expect(footer).toContainText('corvid-agent');
  });

  test('shows nav links in header', async ({ page }) => {
    const navLinks = page.locator('.header-left .nav-links .nav-link');
    await expect(navLinks).toHaveCount(2);
    await expect(navLinks.nth(0)).toContainText('Explorer');
    await expect(navLinks.nth(1)).toContainText('Txn Charts');
  });

  test('detail overlay is hidden by default', async ({ page }) => {
    const overlay = page.locator('#detail-overlay');
    await expect(overlay).not.toHaveClass(/active/);
    await expect(overlay).toBeHidden();
  });
});
