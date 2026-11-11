import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { sanitizeSwapAmountInput } from '../src/services/swapPresentation';

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
