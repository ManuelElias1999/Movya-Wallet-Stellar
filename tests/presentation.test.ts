import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { Keypair } from '@stellar/stellar-sdk/base';
import { displayName, formatAssetBalance, formatCompactXlmBalance, formatEnteredAmount, formatReceivedAmount, formatXlmBalance, paymentDescription, tabForPath } from '../src/services/presentation';

test('XLM balance formatting works without Intl and BigInt localization in Expo Go', () => {
  const savedIntl = globalThis.Intl;
  const savedBigIntFormat = BigInt.prototype.toLocaleString;
  try {
    Object.defineProperty(globalThis, 'Intl', { configurable: true, writable: true, value: undefined });
    BigInt.prototype.toLocaleString = () => { throw new Error('BigInt locale formatting unavailable'); };
    const balance = [{ assetCode: 'XLM', balance: '922337203685.4775807' }];
    assert.equal(formatXlmBalance(balance, 'es-BO'), '922.337.203.685,4775807 XLM');
    assert.equal(formatXlmBalance(balance, 'en-US'), '922,337,203,685.4775807 XLM');
    assert.equal(formatXlmBalance([{ assetCode: 'XLM', balance: '0001234.1200000' }], 'en-US'), '1,234.12 XLM');
    assert.equal(formatXlmBalance([{ assetCode: 'XLM', balance: '0.0000001' }], 'es-BO'), '0,0000001 XLM');
    assert.equal(formatXlmBalance([{ assetCode: 'XLM', balance: '0.0000000' }]), '0 XLM');
    assert.equal(formatXlmBalance([{ assetCode: 'XLM', balance: 'NaN' }]), '0 XLM');
    assert.equal(formatXlmBalance(), '0 XLM');
  } finally {
    Object.defineProperty(globalThis, 'Intl', { configurable: true, writable: true, value: savedIntl });
    BigInt.prototype.toLocaleString = savedBigIntFormat;
  }
});

test('entered amounts drop unnecessary zeroes while received amounts round to two decimals', () => {
  assert.equal(formatEnteredAmount('1.0000000'), '1');
  assert.equal(formatEnteredAmount('50.0000000'), '50');
  assert.equal(formatEnteredAmount('2.5000000'), '2.5');
  assert.equal(formatReceivedAmount('44.0277060'), '44.03');
  assert.equal(formatReceivedAmount('1.0000000'), '1.00');
  assert.equal(formatReceivedAmount('0.0050000'), '0.01');
});

test('cards and portfolio round to at most two decimals without changing the detailed balance', () => {
  assert.equal(formatAssetBalance('1234.1260000', 'es-BO'), '1.234,13');
  assert.equal(formatAssetBalance('1234.1000000', 'en-US'), '1,234.1');
  assert.equal(formatAssetBalance('50.0000000', 'es-BO'), '50');
  assert.equal(formatAssetBalance('0.0050000', 'es-BO'), '0,01');
  assert.equal(formatAssetBalance('1234.1234567', 'es-BO', 7), '1.234,1234567');
  assert.equal(formatCompactXlmBalance([{ assetCode: 'XLM', balance: '1234.1260000' }], 'es-BO'), '1.234,13 XLM');
});

test('history identifies saved contacts by full address in both directions and leaves strangers unnamed', () => {
  const aya = Keypair.random().publicKey(); const unknown = Keypair.random().publicKey();
  const contacts = [{ name: 'Aya', address: aya }, { name: 'Sin dirección', address: undefined }];
  assert.equal(paymentDescription(false, aya, contacts).title, 'Enviaste dinero a Aya');
  assert.equal(paymentDescription(true, aya, contacts).title, 'Recibiste dinero de Aya');
  assert.equal(paymentDescription(false, unknown, contacts).title, 'Enviaste dinero a');
  assert.equal(paymentDescription(true, unknown, contacts).title, 'Recibiste dinero de');
  assert.equal(paymentDescription(false, aya, [{ name: 'Andrea', address: aya }]).title, 'Enviaste dinero a Andrea');
});

test('the shared footer selects the current main section regardless of navigation history', () => {
  assert.equal(tabForPath('/'), 'home');
  assert.equal(tabForPath('/(tabs)'), 'home');
  assert.equal(tabForPath('/activity'), 'activity');
  assert.equal(tabForPath('/contacts/'), 'contacts');
  assert.equal(tabForPath('/invest?source=footer'), 'invest');
  assert.equal(tabForPath('/'), 'home');
});

test('the shared footer is absent from transaction, security and full-screen chat routes', () => {
  for (const path of ['/send', '/receive', '/swap', '/portfolio', '/settings', '/security', '/wallet-backup', '/movya']) {
    assert.equal(tabForPath(path), undefined);
  }
});

test('the greeting uses the user name and the balance uses the native XLM entry', () => {
  assert.equal(displayName({ display_name: '  Aya López  ' }), 'Aya López');
  assert.equal(displayName({ display_name: '' }), 'Usuario');
  assert.equal(displayName(), 'Usuario');
  assert.equal(formatXlmBalance([{ assetCode: 'USDC', balance: '5000' }, { assetCode: 'XLM', balance: '123.4567890' }]), '123,456789 XLM');
  assert.equal(formatXlmBalance(), '0 XLM');
  assert.equal(formatXlmBalance([{ assetCode: 'XLM', balance: 'NaN' }]), '0 XLM');
  assert.equal(formatXlmBalance([{ assetCode: 'XLM', balance: '922337203685.4775807' }]), '922.337.203.685,4775807 XLM');
});
