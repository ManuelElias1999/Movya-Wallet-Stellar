// Movya PIN: a complementary unlock for the app, never the key that encrypts
// the wallet. Signing still requires biometrics (or the password on devices
// without them). Attempts are limited with growing waits, and after 10 wrong
// PINs it is erased and the password is required. On a compromised phone an
// attacker could reset local counters; that is why the PIN alone never opens
// the key.
export type PinState = { hash: string; salt: string; failures: number; lockedUntil: number };
export type PinDeps = {
  read: () => Promise<PinState | null>; write: (state: PinState) => Promise<void>; remove: () => Promise<void>;
  now: () => number; derive: (pin: string, salt: string) => Promise<string>; randomSalt: () => string;
};
export const PIN_LENGTH = 6;
export const MAX_PIN_FAILURES = 10;
// Wait after the Nth consecutive failure (index = failures).
const WAITS = [0, 0, 0, 0, 0, 30_000, 60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000];

export class PinLockedError extends Error {
  readonly waitMs: number;
  constructor(waitMs: number) { super(`Demasiados intentos. Espera ${Math.ceil(waitMs / 60_000)} min o usa tu contraseña.`); this.name = 'PinLockedError'; this.waitMs = waitMs; }
}
export class PinWipedError extends Error {
  constructor() { super('Se borró tu PIN por demasiados intentos. Ingresa con tu contraseña.'); this.name = 'PinWipedError'; }
}
export function assertPinFormat(pin: string) {
  if (!new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin)) throw new Error('El PIN debe tener 6 números.');
  if (/^(\d)\1+$/.test(pin) || '0123456789'.includes(pin) || '9876543210'.includes(pin)) throw new Error('Elige un PIN menos predecible.');
}
const sameHex = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

export function createPinLock(deps: PinDeps) {
  return {
    async isSet() { return Boolean(await deps.read()); },
    async set(pin: string) {
      assertPinFormat(pin);
      const salt = deps.randomSalt();
      await deps.write({ hash: await deps.derive(pin, salt), salt, failures: 0, lockedUntil: 0 });
    },
    remove: deps.remove,
    // true when correct; false with attempts left; throws while locked or once erased.
    async verify(pin: string): Promise<{ ok: true } | { ok: false; remaining: number }> {
      const state = await deps.read();
      if (!state) throw new PinWipedError();
      const now = deps.now();
      if (now < state.lockedUntil) throw new PinLockedError(state.lockedUntil - now);
      if (sameHex(await deps.derive(pin, state.salt), state.hash)) {
        if (state.failures) await deps.write({ ...state, failures: 0, lockedUntil: 0 });
        return { ok: true };
      }
      const failures = state.failures + 1;
      if (failures >= MAX_PIN_FAILURES) { await deps.remove(); throw new PinWipedError(); }
      await deps.write({ ...state, failures, lockedUntil: now + (WAITS[failures] ?? WAITS[WAITS.length - 1]) });
      return { ok: false, remaining: MAX_PIN_FAILURES - failures };
    },
  };
}
