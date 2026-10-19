import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { assertPinFormat, createPinLock, MAX_PIN_FAILURES, PinLockedError, PinWipedError, type PinState } from '../src/services/security/pinLock';

function setup() {
  let state: PinState | null = null; let now = 1_000_000;
  const lock = createPinLock({
    read: async () => state, write: async next => { state = next; }, remove: async () => { state = null; },
    now: () => now, derive: async (pin, salt) => `${salt}:${pin}`.split('').map(c => c.charCodeAt(0).toString(16)).join(''), randomSalt: () => 'salt',
  });
  return { lock, advance: (ms: number) => { now += ms; }, state: () => state };
}

test('rejects predictable PINs', () => {
  for (const pin of ['111111', '123456', '987654', '12345', 'abcdef']) assert.throws(() => assertPinFormat(pin), undefined, pin);
  assertPinFormat('284719');
});

test('correct PIN unlocks and resets the failure count', async () => {
  const { lock, state } = setup();
  await lock.set('284719');
  assert.ok(!JSON.stringify(state()).includes('284719'));
  assert.deepEqual(await lock.verify('000001'), { ok: false, remaining: MAX_PIN_FAILURES - 1 });
  assert.deepEqual(await lock.verify('284719'), { ok: true });
  assert.equal(state()?.failures, 0);
});

test('waits grow after five failures and the PIN is erased after ten', async () => {
  const { lock, advance, state } = setup();
  await lock.set('284719');
  for (let i = 0; i < 4; i++) assert.equal((await lock.verify('000001')).ok, false);
  assert.equal((await lock.verify('000001')).ok, false); // 5th → 30 s wait
  await assert.rejects(lock.verify('284719'), PinLockedError);
  advance(30_000);
  for (let i = 6; i < MAX_PIN_FAILURES; i++) { assert.equal((await lock.verify('000001')).ok, false); advance(60 * 60_000); }
  await assert.rejects(lock.verify('000001'), PinWipedError);
  assert.equal(state(), null);
  await assert.rejects(lock.verify('284719'), PinWipedError);
});
