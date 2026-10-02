import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { Keypair } from '@stellar/stellar-sdk/base';
import { displayName, formatXlmBalance, paymentDescription, tabForPath } from '../src/services/presentation';

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
  assert.equal(tabForPath('/settings?source=security'), 'account');
  assert.equal(tabForPath('/'), 'home');
});

test('the shared footer is absent from transaction, security and full-screen chat routes', () => {
  for (const path of ['/send', '/receive', '/swap', '/portfolio', '/security', '/wallet-backup', '/movya']) {
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
