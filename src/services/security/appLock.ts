// When the wallet locks itself. Locking closes the wallet (no signing, no
// balances screen) but keeps the session; biometrics or the password reopen it.
export const LOCK_AFTER_BACKGROUND_MS = 5 * 60_000; // app left for more than 5 min

export type LockInput = { state: string; now: number; backgroundAt: number | null };
// iOS also reports "inactive" while a Face ID sheet is visible. Only a real
// background transition starts the five-minute timer.
export function lockDecision({ state, now, backgroundAt }: LockInput): { lock: boolean; backgroundAt: number | null } {
  if (state === 'background') return { lock: false, backgroundAt: backgroundAt ?? now };
  if (state === 'inactive') return { lock: false, backgroundAt };
  const away = backgroundAt !== null && now - backgroundAt >= LOCK_AFTER_BACKGROUND_MS;
  return { lock: away, backgroundAt: null };
}
