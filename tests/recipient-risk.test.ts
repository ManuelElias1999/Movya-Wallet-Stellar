import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { assessRecipient, groupAddress, looksAlike } from '../src/services/security/recipientRisk';

const AYA = 'GAYA' + 'K'.repeat(48) + 'WXYZ';
const POISON_START = 'GAYA' + 'Q'.repeat(48) + 'ABCD';
const POISON_END = 'GBBB' + 'Q'.repeat(48) + 'WXYZ';
const OTHER = 'G' + 'M'.repeat(55);
const known = [{ address: AYA, label: 'Aya' }];

test('a known recipient with a normal amount needs no extra step', () => {
  assert.deepEqual(assessRecipient({ destination: AYA, known, amount: '10', asset: 'USDC', balance: '100' }), { isNew: false, large: false, needsExtraConfirmation: false });
});

test('look-alike addresses (same start or same end) are flagged with the real contact', () => {
  for (const poison of [POISON_START, POISON_END]) {
    const risk = assessRecipient({ destination: poison, known, amount: '1', asset: 'XLM' });
    assert.equal(risk.lookalike?.label, 'Aya'); assert.equal(risk.needsExtraConfirmation, true);
  }
  assert.equal(looksAlike(AYA, AYA), false);
});

test('large payments to new recipients need an extra confirmation; small ones only a badge', () => {
  assert.equal(assessRecipient({ destination: OTHER, known, amount: '5', asset: 'XLM', balance: '1000' }).needsExtraConfirmation, false);
  assert.equal(assessRecipient({ destination: OTHER, known, amount: '5', asset: 'XLM', balance: '1000' }).isNew, true);
  assert.equal(assessRecipient({ destination: OTHER, known, amount: '100', asset: 'XLM' }).needsExtraConfirmation, true);
  assert.equal(assessRecipient({ destination: OTHER, known, amount: '50', asset: 'USDC' }).needsExtraConfirmation, true);
  assert.equal(assessRecipient({ destination: OTHER, known, amount: '30', asset: 'USDC', balance: '40' }).needsExtraConfirmation, true);
});

test('addresses are grouped for comparison', () => {
  assert.equal(groupAddress('GABCDEFGH'), 'GABC DEFG H');
});
