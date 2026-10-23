import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { assetUsdValue, formatMarketChange, formatUnitPrice, formatUsd, getMarketPrices, portfolioUsdTotal, resetMarketPriceCacheForTests } from '../src/services/marketPrices';

afterEach(() => resetMarketPriceCacheForTests());

test('market prices load XLM and USDC quotes and reuse the one-minute cache', async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => {
    calls += 1;
    return Response.json({ stellar: { usd: 0.25, usd_24h_change: 2.125 }, 'usd-coin': { usd: 0.9998, usd_24h_change: -0.02 } });
  };
  const first = await getMarketPrices({ fetcher, now: 1_000 });
  const second = await getMarketPrices({ fetcher, now: 30_000 });
  assert.equal(first.XLM, 0.25);
  assert.equal(first.USDC, 0.9998);
  assert.equal(second.XLM, 0.25);
  assert.equal(calls, 1);
});

test('market prices return the last valid quote as stale when a refresh fails', async () => {
  const success: typeof fetch = async () => Response.json({ stellar: { usd: 0.2 }, 'usd-coin': { usd: 1 } });
  await getMarketPrices({ fetcher: success, now: 1_000 });
  const failure: typeof fetch = async () => { throw new Error('offline'); };
  const fallback = await getMarketPrices({ fetcher: failure, force: true, now: 90_000 });
  assert.equal(fallback.XLM, 0.2);
  assert.equal(fallback.stale, true);
});

test('USD totals combine supported wallet assets and presentation rounds to cents', () => {
  const prices = { XLM: 0.25, USDC: 1 };
  const balances = [
    { assetCode: 'XLM', balance: '10.0000000' },
    { assetCode: 'USDC', balance: '20.0050000' },
    { assetCode: 'UNKNOWN', balance: '999.0000000' },
  ];
  assert.equal(portfolioUsdTotal(balances, prices), 22.505);
  assert.equal(assetUsdValue('XLM', '10.0000000', prices), 2.5);
  assert.equal(formatUsd(22.505, 'es-BO'), '$22,51');
  assert.equal(formatUsd(1234.5, 'en-US'), '$1,234.50');
  assert.equal(formatUnitPrice(0.123456, 'es-BO'), '$0,1235');
  assert.equal(formatMarketChange(2.125), '+2.13%');
  assert.equal(formatMarketChange(-0.02), '-0.02%');
});
