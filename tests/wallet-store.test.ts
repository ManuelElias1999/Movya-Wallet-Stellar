import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createWalletStore, type KeyValue } from '../src/services/backend/walletStore';

// Stand-in for Keypair: the "public key" of secret S... is G + rest.
const signerOf = (secret: string) => { if (!secret.startsWith('S')) throw new Error('bad secret'); return 'G' + secret.slice(1); };
const SECRET = 'S' + 'A'.repeat(55), OTHER = 'S' + 'B'.repeat(55);

function kv(protect = true) {
  const items = new Map<string, { value: string; protectedItem: boolean }>();
  const prompts: string[] = [];
  const store: KeyValue = {
    get: async (key, protectedItem) => {
      const item = items.get(key);
      if (!item) return null;
      if (item.protectedItem !== protectedItem) throw new Error('option mismatch');
      if (item.protectedItem) prompts.push(key);
      return item.value;
    },
    set: async (key, value, protectedItem) => { items.set(key, { value, protectedItem }); },
    remove: async key => { items.delete(key); },
    canProtect: () => protect,
  };
  return { store, items, prompts };
}

test('metadata is readable without a prompt and never contains the key', async () => {
  const { store, items, prompts } = kv();
  const wallets = createWalletStore(store, signerOf);
  await wallets.write({ secret: SECRET, mnemonic: 'words', oualiAddress: '' }, 'u1');
  const meta = await wallets.readMeta('u1');
  assert.equal(meta?.signerPublicKey, signerOf(SECRET));
  assert.equal(meta?.accountId, signerOf(SECRET));
  assert.equal(meta?.protection, 'biometric');
  assert.equal(meta?.hasMnemonic, true);
  assert.deepEqual(prompts, []);
  const metaRaw = items.get('movya.testnet.wallet.user.u1')!;
  assert.equal(metaRaw.protectedItem, false);
  assert.ok(!metaRaw.value.includes(SECRET) && !metaRaw.value.includes('words'));
  assert.equal(items.get('movya.testnet.wallet.user.u1.secret')!.protectedItem, true);
});

test('reading the key requires the biometric prompt', async () => {
  const { store, prompts } = kv();
  const wallets = createWalletStore(store, signerOf);
  await wallets.write({ secret: SECRET, oualiAddress: '', backupAcknowledged: true }, 'u1');
  const full = await wallets.readFull('u1');
  assert.equal(full?.secret, SECRET);
  assert.equal(full?.backupAcknowledged, true);
  assert.deepEqual(prompts, ['movya.testnet.wallet.user.u1.secret']);
});

test('a legacy record with the key in plain metadata is migrated behind biometrics', async () => {
  const { store, items } = kv();
  items.set('movya.testnet.wallet.user.u1', { value: JSON.stringify({ secret: SECRET, mnemonic: 'words', oualiAddress: 'GOUALI', backupAcknowledged: true, backupFingerprint: 'f' }), protectedItem: false });
  const wallets = createWalletStore(store, signerOf);
  const meta = await wallets.readMeta('u1');
  assert.deepEqual(meta, { accountId: signerOf(SECRET), signerPublicKey: signerOf(SECRET), oualiAddress: 'GOUALI', hasMnemonic: true, protection: 'biometric', backupAcknowledged: true, backupFingerprint: 'f' });
  assert.ok(!items.get('movya.testnet.wallet.user.u1')!.value.includes(SECRET));
  assert.equal((await wallets.readFull('u1'))?.mnemonic, 'words');
});

test('devices without biometrics store an unprotected key and say so', async () => {
  const { store, prompts } = kv(false);
  const wallets = createWalletStore(store, signerOf);
  assert.equal((await wallets.write({ secret: SECRET, oualiAddress: '' }, 'u1')).protection, 'none');
  await wallets.readFull('u1');
  assert.deepEqual(prompts, []);
});

test('a swapped secret item is rejected instead of signing with the wrong key', async () => {
  const { store, items } = kv();
  const wallets = createWalletStore(store, signerOf);
  await wallets.write({ secret: SECRET, oualiAddress: '' }, 'u1');
  items.set('movya.testnet.wallet.user.u1.secret', { value: JSON.stringify({ secret: OTHER }), protectedItem: true });
  await assert.rejects(wallets.readFull('u1'), /no corresponde/);
});

test('a rotated signer keeps the original account id; metadata updates never touch the key', async () => {
  const { store, prompts } = kv();
  const wallets = createWalletStore(store, signerOf);
  await wallets.write({ secret: OTHER, accountId: signerOf(SECRET), oualiAddress: '' }, 'u1');
  assert.equal((await wallets.readMeta('u1'))?.accountId, signerOf(SECRET));
  await wallets.updateMeta({ backupAcknowledged: true }, 'u1');
  assert.equal((await wallets.readMeta('u1'))?.backupAcknowledged, true);
  assert.deepEqual(prompts, []);
  await wallets.remove('u1');
  assert.equal(await wallets.readMeta('u1'), null);
});

test('quick biometric unlock can be disabled without deleting the protected signing key', async () => {
  const { store, items, prompts } = kv();
  const wallets = createWalletStore(store, signerOf);
  await wallets.write({ secret: SECRET, oualiAddress: '' }, 'u1');
  const meta = await wallets.updateMeta({ quickUnlockEnabled: false }, 'u1');
  assert.equal(meta.quickUnlockEnabled, false);
  assert.equal(meta.protection, 'biometric');
  assert.equal(items.has('movya.testnet.wallet.user.u1.secret'), true);
  assert.deepEqual(prompts, []);
});

test('view-only mode removes the signing key but preserves public wallet metadata', async () => {
  const { store, items, prompts } = kv();
  const wallets = createWalletStore(store, signerOf);
  await wallets.write({ secret: SECRET, mnemonic: 'words', oualiAddress: 'GOUALI', backupAcknowledged: true }, 'u1');
  const meta = await wallets.disableSigning('u1');
  assert.deepEqual(meta, {
    accountId: signerOf(SECRET), signerPublicKey: signerOf(SECRET), oualiAddress: 'GOUALI',
    hasMnemonic: true, protection: 'none', backupAcknowledged: true,
  });
  assert.equal(items.has('movya.testnet.wallet.user.u1.secret'), false);
  assert.equal((await wallets.readMeta('u1'))?.accountId, signerOf(SECRET));
  assert.equal(await wallets.readFull('u1'), null);
  assert.deepEqual(prompts, []);
});

test('password login replaces a protected key without reading it first', async () => {
  const { store, prompts } = kv();
  const wallets = createWalletStore(store, signerOf);
  await wallets.write({ secret: SECRET, oualiAddress: 'old' }, 'u1');
  await wallets.replaceAfterPassword({ secret: SECRET, oualiAddress: 'new', backupAcknowledged: true }, 'u1');
  assert.deepEqual(prompts, []);
  assert.equal((await wallets.readMeta('u1'))?.oualiAddress, 'new');
  assert.equal((await wallets.readMeta('u1'))?.backupAcknowledged, true);
});
