import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isPositiveTransferAmount,
  looksLikeStellarPublicKey,
  sanitizeStellarAddressInput,
  sanitizeTransferAmountInput,
} from '../src/services/transferPresentation';

test('manual transfer amounts accept comma decimals and never exceed Stellar precision', () => {
  assert.equal(sanitizeTransferAmountInput('00012,345678912'), '12.3456789');
  assert.equal(sanitizeTransferAmountInput('1.2.3 XLM'), '1.23');
  assert.equal(sanitizeTransferAmountInput('abc'), '');
});

test('manual transfers only become ready with a positive complete amount', () => {
  assert.equal(isPositiveTransferAmount('0'), false);
  assert.equal(isPositiveTransferAmount('0.0000000'), false);
  assert.equal(isPositiveTransferAmount('1.'), false);
  assert.equal(isPositiveTransferAmount('0.0000001'), true);
  assert.equal(isPositiveTransferAmount('25.5'), true);
});

test('pasted Stellar addresses are normalized without accepting incomplete keys', () => {
  const address = `G${'A'.repeat(55)}`;
  assert.equal(sanitizeStellarAddressInput(`  ${address.toLowerCase()}\n`), address);
  assert.equal(looksLikeStellarPublicKey(address), true);
  assert.equal(looksLikeStellarPublicKey(`${address.slice(0, -1)}0`), false);
  assert.equal(looksLikeStellarPublicKey('GABC'), false);
});
