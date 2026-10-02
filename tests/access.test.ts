import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createTimedFetch, withAccessDeadline } from '../src/services/backend/accessOperation';
import { recoverWallet } from '../src/services/backend/walletRecovery';

test('a stalled backup read times out, and its late result cannot create or store another wallet', async () => {
  const controller = new AbortController();
  let release!: (value: null) => void;
  const pending = new Promise<null>(resolve => { release = resolve; });
  let writes = 0; let registrations = 0;
  const storage = {
    getBackup: () => pending,
    register: async () => { registrations++; throw new Error('Must not register'); },
    readLocal: async () => null,
    writeLocal: async () => { writes++; },
  };
  let recovery: Promise<string> | undefined;
  await assert.rejects(withAccessDeadline(signal => {
    recovery = recoverWallet(storage, 'owner', 'test-password-long-enough', false, { signal });
    return recovery;
  }, controller, 15), /tardó demasiado/);
  assert.equal(controller.signal.aborted, true);
  release(null);
  await assert.rejects(recovery!, /tardó demasiado/);
  assert.equal(registrations, 0); assert.equal(writes, 0);
});

test('cancelling an access operation interrupts its pending HTTP request', async () => {
  const controller = new AbortController();
  const fetcher: typeof fetch = async (_input, init) => new Promise<Response>((_, reject) => {
    init!.signal!.addEventListener('abort', () => reject(init!.signal!.reason), { once: true });
  });
  const bounded = createTimedFetch(fetcher, () => controller.signal);
  const pending = withAccessDeadline(() => bounded('https://example.invalid'), controller);
  controller.abort(new Error('Access cancelled'));
  await assert.rejects(pending, /Access cancelled/);
});

test('Supabase requests have their own timeout and preserve an existing abort signal', async () => {
  const fetcher: typeof fetch = async (_input, init) => new Promise<Response>((_, reject) => {
    if (init!.signal!.aborted) reject(init!.signal!.reason);
    else init!.signal!.addEventListener('abort', () => reject(init!.signal!.reason), { once: true });
  });
  await assert.rejects(createTimedFetch(fetcher, undefined, 15)('https://example.invalid'), /no respondió/);
  const controller = new AbortController(); controller.abort(new Error('Original cancellation'));
  await assert.rejects(createTimedFetch(fetcher)('https://example.invalid', { signal: controller.signal }), /Original cancellation/);
});
