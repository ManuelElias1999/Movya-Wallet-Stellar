import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { formatSwapRate, quoteSecondsRemaining, sanitizeSwapAmountInput, swapAmountForPercentage } from '../src/services/swapPresentation';

test('manual swap amounts accept locale decimals and stay within Stellar precision', () => {
  assert.equal(sanitizeSwapAmountInput('1,25'), '1.25');
  assert.equal(sanitizeSwapAmountInput('.5'), '0.5');
  assert.equal(sanitizeSwapAmountInput('00012.3400000'), '12.3400000');
  assert.equal(sanitizeSwapAmountInput('1.23456789'), '1.2345678');
});

test('manual swap amounts remove accidental characters and duplicate separators', () => {
  assert.equal(sanitizeSwapAmountInput('USDC 12.3'), '12.3');
  assert.equal(sanitizeSwapAmountInput('1..2'), '1.2');
  assert.equal(sanitizeSwapAmountInput(''), '');
  assert.equal(sanitizeSwapAmountInput('000'), '0');
});

test('manual swap balance shortcuts use exact Stellar decimal arithmetic', () => {
  assert.equal(swapAmountForPercentage('96.4999600', 25), '24.12499');
  assert.equal(swapAmountForPercentage('96.4999600', 50), '48.24998');
  assert.equal(swapAmountForPercentage('96.4999600', 75), '72.37497');
  assert.equal(swapAmountForPercentage('96.4999600', 100), '96.49996');
  assert.equal(swapAmountForPercentage('0.0000001', 50), '0');
});

test('manual swap balance shortcuts reject malformed values and percentages', () => {
  assert.equal(swapAmountForPercentage('NaN', 50), '');
  assert.equal(swapAmountForPercentage('1.00000001', 50), '');
  assert.equal(swapAmountForPercentage('1', 101), '');
  assert.equal(swapAmountForPercentage('1', 12.5), '');
});

test('manual swap quotes show an exact rate without floating-point rounding', () => {
  assert.equal(formatSwapRate({ swapAmount: '49.7500000', estimated: '10.0728394', from: 'XLM', to: 'USDC' }), '1 XLM ≈ 0.2024691 USDC');
  assert.equal(formatSwapRate({ swapAmount: '0', estimated: '10', from: 'XLM', to: 'USDC' }), '');
  assert.equal(formatSwapRate({ swapAmount: 'invalid', estimated: '10', from: 'XLM', to: 'USDC' }), '');
});

test('manual swap quote countdown never becomes negative', () => {
  assert.equal(quoteSecondsRemaining(160, 100), 60);
  assert.equal(quoteSecondsRemaining(100, 100), 0);
  assert.equal(quoteSecondsRemaining(90, 100), 0);
});
