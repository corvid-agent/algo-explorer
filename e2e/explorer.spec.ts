import { test, expect } from '@playwright/test';

const MOCK_BLOCK_ROUND = 45000000;
const MOCK_TIMESTAMP = Math.floor(Date.now() / 1000) - 5;

function mockAlgorandAPIs(page: import('@playwright/test').Page) {
  return Promise.all([
    page.route('https://mainnet-api.4160.nodely.dev/**', (route) => {
      const url = route.request().url();

      if (url.includes('/v2/status')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ 'last-round': MOCK_BLOCK_ROUND }),
        });
      }

      if (url.match(/\/v2\/blocks\/\d+/)) {
        const roundMatch = url.match(/\/v2\/blocks\/(\d+)/);
        const round = roundMatch ? parseInt(roundMatch[1]) : MOCK_BLOCK_ROUND;
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            block: {
              rnd: round,
              ts: MOCK_TIMESTAMP,
              txns: [
                { type: 'pay', txn: { snd: 'SENDER1AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', amt: 2000000 } },
                { type: 'axfer', txn: { snd: 'SENDER2BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB', aamt: 500 } },
                { type: 'appl', txn: { snd: 'SENDER3CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC', apid: 12345 } },
              ],
              prp: 'PROPOSERDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
              gh: 'wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=',
            },
          }),
        });
      }

      if (url.match(/\/v2\/accounts\//)) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            amount: 50000000,
            'min-balance': 100000,
            assets: [{ 'asset-id': 31566704, amount: 1000 }],
            'apps-local-state': [],
            'created-apps': [],
            status: 'Online',
          }),
        });
      }

      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }),

    page.route('https://mainnet-idx.4160.nodely.dev/**', (route) => {
      const url = route.request().url();

      if (url.includes('/v2/transactions/') && !url.includes('limit=')) {
        // Single transaction lookup
        const txId = url.split('/v2/transactions/')[1]?.split('?')[0];
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            transaction: {
              id: txId,
              'tx-type': 'pay',
              sender: 'SENDERXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
              'payment-transaction': {
                amount: 5000000,
                receiver: 'RECEIVERXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
              },
              'confirmed-round': 44999999,
              'round-time': MOCK_TIMESTAMP,
              fee: 1000,
            },
          }),
        });
      }

      if (url.includes('/v2/transactions')) {
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
                'round-time': MOCK_TIMESTAMP,
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
                'round-time': MOCK_TIMESTAMP - 15,
                'confirmed-round': 44999998,
                fee: 1000,
              },
              {
                id: 'TXID_APPL_567890ABCDEF1234567890ABCDEF1234567890ABCDEF',
                'tx-type': 'appl',
                sender: 'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
                'application-transaction': {
                  'application-id': 67890,
                  'on-completion': 'noop',
                },
                'round-time': MOCK_TIMESTAMP - 30,
                'confirmed-round': 44999997,
                fee: 1000,
              },
            ],
          }),
        });
      }

      if (url.includes('/v2/assets/')) {
        const assetIdMatch = url.match(/\/v2\/assets\/(\d+)/);
        const assetId = assetIdMatch ? parseInt(assetIdMatch[1]) : 0;
        if (assetId === 31566704) {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              asset: {
                index: 31566704,
                params: {
                  name: 'USDC',
                  'unit-name': 'USDC',
                  total: 10000000000000000,
                  decimals: 6,
                  creator: 'CREATORXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
                  'default-frozen': false,
                },
              },
            }),
          });
        }
        return route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'asset not found' }),
        });
      }

      if (url.includes('/v2/accounts/') && url.includes('/transactions')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ transactions: [] }),
        });
      }

      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }),
  ]);
}

test.describe('Block explorer functionality', () => {
  test.beforeEach(async ({ page }) => {
    await mockAlgorandAPIs(page);
    await page.goto('/');
  });

  test('renders block rows after data loads', async ({ page }) => {
    const blockRows = page.locator('#blocks-list .block-row');
    await expect(blockRows.first()).toBeVisible({ timeout: 5000 });

    // Each block row should show a block number
    await expect(blockRows.first().locator('.block-number')).toBeVisible();
    await expect(blockRows.first().locator('.block-txns')).toContainText('txns');
  });

  test('renders transaction rows after data loads', async ({ page }) => {
    const txnRows = page.locator('#txns-list .txn-row');
    await expect(txnRows.first()).toBeVisible({ timeout: 5000 });

    // Each txn row should have a hash and type badge
    await expect(txnRows.first().locator('.txn-hash')).toBeVisible();
    await expect(txnRows.first().locator('.txn-type')).toBeVisible();
  });

  test('renders the donut chart after transactions load', async ({ page }) => {
    const chartArea = page.locator('#chart-area');
    await expect(chartArea.locator('.chart-container')).toBeVisible({ timeout: 5000 });
    await expect(chartArea.locator('.chart-svg')).toBeVisible();
    await expect(chartArea.locator('.chart-legend')).toBeVisible();
  });

  test('updates latest block stat after loading', async ({ page }) => {
    const latestRound = page.locator('#latest-round');
    // Wait until it is no longer the placeholder
    await expect(latestRound).not.toHaveText('--', { timeout: 5000 });
  });
});

test.describe('Search functionality', () => {
  test.beforeEach(async ({ page }) => {
    await mockAlgorandAPIs(page);
    await page.goto('/');
  });

  test('search for a block number opens the block detail overlay', async ({ page }) => {
    const input = page.locator('#search-input');
    await input.fill('45000000');
    await page.locator('.search-btn').click();

    const overlay = page.locator('#detail-overlay');
    await expect(overlay).toHaveClass(/active/, { timeout: 5000 });

    const panel = page.locator('#detail-panel');
    await expect(panel.locator('.detail-title')).toContainText('Block');
  });

  test('search for a transaction ID opens the transaction detail overlay', async ({ page }) => {
    const txId = 'TXID1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12';
    const input = page.locator('#search-input');
    await input.fill(txId);
    await page.locator('.search-btn').click();

    const overlay = page.locator('#detail-overlay');
    await expect(overlay).toHaveClass(/active/, { timeout: 5000 });

    const panel = page.locator('#detail-panel');
    await expect(panel.locator('.detail-title')).toContainText('Transaction');
  });

  test('search by pressing Enter key works', async ({ page }) => {
    const input = page.locator('#search-input');
    await input.fill('45000000');
    await input.press('Enter');

    const overlay = page.locator('#detail-overlay');
    await expect(overlay).toHaveClass(/active/, { timeout: 5000 });
  });

  test('empty search does not open overlay', async ({ page }) => {
    await page.locator('.search-btn').click();
    const overlay = page.locator('#detail-overlay');
    await expect(overlay).not.toHaveClass(/active/);
  });
});

test.describe('Block detail overlay', () => {
  test.beforeEach(async ({ page }) => {
    await mockAlgorandAPIs(page);
    await page.goto('/');
  });

  test('clicking a block row opens block detail', async ({ page }) => {
    const blockRow = page.locator('#blocks-list .block-row').first();
    await blockRow.waitFor({ state: 'visible', timeout: 5000 });
    await blockRow.click();

    const overlay = page.locator('#detail-overlay');
    await expect(overlay).toHaveClass(/active/, { timeout: 5000 });

    const panel = page.locator('#detail-panel');
    await expect(panel.locator('.detail-title')).toContainText('Block');
    // Block details should show Round, Timestamp, Transactions, Proposer
    await expect(panel.locator('.detail-key').first()).toBeVisible();
  });

  test('block detail shows transaction list section', async ({ page }) => {
    const blockRow = page.locator('#blocks-list .block-row').first();
    await blockRow.waitFor({ state: 'visible', timeout: 5000 });
    await blockRow.click();

    const panel = page.locator('#detail-panel');
    await expect(panel.locator('.detail-section')).toContainText('Transactions', { timeout: 5000 });
  });

  test('closing detail overlay via close button', async ({ page }) => {
    const blockRow = page.locator('#blocks-list .block-row').first();
    await blockRow.waitFor({ state: 'visible', timeout: 5000 });
    await blockRow.click();

    const overlay = page.locator('#detail-overlay');
    await expect(overlay).toHaveClass(/active/, { timeout: 5000 });

    await page.locator('.detail-close').click();
    await expect(overlay).not.toHaveClass(/active/);
  });

  test('closing detail overlay via Escape key', async ({ page }) => {
    const blockRow = page.locator('#blocks-list .block-row').first();
    await blockRow.waitFor({ state: 'visible', timeout: 5000 });
    await blockRow.click();

    const overlay = page.locator('#detail-overlay');
    await expect(overlay).toHaveClass(/active/, { timeout: 5000 });

    await page.keyboard.press('Escape');
    await expect(overlay).not.toHaveClass(/active/);
  });
});

test.describe('Transaction detail overlay', () => {
  test.beforeEach(async ({ page }) => {
    await mockAlgorandAPIs(page);
    await page.goto('/');
  });

  test('clicking a transaction row opens transaction detail', async ({ page }) => {
    const txnRow = page.locator('#txns-list .txn-row').first();
    await txnRow.waitFor({ state: 'visible', timeout: 5000 });
    await txnRow.click();

    const overlay = page.locator('#detail-overlay');
    await expect(overlay).toHaveClass(/active/, { timeout: 5000 });

    const panel = page.locator('#detail-panel');
    await expect(panel.locator('.detail-title')).toContainText('Transaction');
  });

  test('transaction detail shows key fields', async ({ page }) => {
    const txnRow = page.locator('#txns-list .txn-row').first();
    await txnRow.waitFor({ state: 'visible', timeout: 5000 });
    await txnRow.click();

    const panel = page.locator('#detail-panel');
    await expect(panel.locator('.detail-title')).toContainText('Transaction', { timeout: 5000 });

    // Verify expected detail keys are present
    const keys = panel.locator('.detail-key');
    const keyTexts = await keys.allTextContents();
    expect(keyTexts).toContain('ID');
    expect(keyTexts).toContain('Type');
    expect(keyTexts).toContain('Sender');
    expect(keyTexts).toContain('Fee');
  });
});

test.describe('Keyboard navigation', () => {
  test.beforeEach(async ({ page }) => {
    await mockAlgorandAPIs(page);
    await page.goto('/');
    // Wait for data to load
    await page.locator('#blocks-list .block-row').first().waitFor({ state: 'visible', timeout: 5000 });
  });

  test('pressing / focuses the search input', async ({ page }) => {
    await page.keyboard.press('/');
    await expect(page.locator('#search-input')).toBeFocused();
  });

  test('pressing Escape blurs the search input', async ({ page }) => {
    await page.locator('#search-input').focus();
    await expect(page.locator('#search-input')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('#search-input')).not.toBeFocused();
  });

  test('arrow down highlights block rows', async ({ page }) => {
    await page.keyboard.press('ArrowDown');
    const firstBlock = page.locator('#blocks-list .block-row').first();
    await expect(firstBlock).toHaveClass(/focused/);
  });

  test('arrow down then Enter opens block detail', async ({ page }) => {
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    const overlay = page.locator('#detail-overlay');
    await expect(overlay).toHaveClass(/active/, { timeout: 5000 });
  });
});

test.describe('Navigation tabs', () => {
  test.beforeEach(async ({ page }) => {
    await mockAlgorandAPIs(page);
    await page.goto('/');
  });

  test('Txn Charts nav link switches view', async ({ page }) => {
    const txnChartsLink = page.locator('.header-left .nav-links .nav-link').nth(1);
    await txnChartsLink.click();

    // Blocks panel should be hidden, dashboard should appear
    await expect(page.locator('#blocks-panel')).toBeHidden();
    await expect(page.locator('#txns-panel')).toBeHidden();
    await expect(page.locator('#dashboard-panel')).toBeVisible();
  });

  test('Explorer nav link returns to main view', async ({ page }) => {
    // Switch to dashboard first
    const txnChartsLink = page.locator('.header-left .nav-links .nav-link').nth(1);
    await txnChartsLink.click();
    await expect(page.locator('#blocks-panel')).toBeHidden();

    // Switch back
    const explorerLink = page.locator('.header-left .nav-links .nav-link').nth(0);
    await explorerLink.click();
    await expect(page.locator('#blocks-panel')).toBeVisible();
    await expect(page.locator('#txns-panel')).toBeVisible();
  });
});
