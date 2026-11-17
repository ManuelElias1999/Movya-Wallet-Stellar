// When the wallet locks itself. Locking closes the wallet (no signing, no
// balances screen) but keeps the session; biometrics or the password reopen it.
export const LOCK_AFTER_BACKGROUND_MS = 30_000;   // app left for more than 30 s
export const LOCK_AFTER_IDLE_MS = 5 * 60_000;     // 5 min without touching the screen

export type LockInput = { state: string; now: number; backgroundAt: number | null; lastActive: number };
// iOS reports "inactive" while the Face ID sheet or the app switcher is shown,
// so a short absence (the biometric prompt itself) never locks the app.
export function lockDecision({ state, now, backgroundAt, lastActive }: LockInput): { lock: boolean; backgroundAt: number | null } {
  if (state === 'background' || state === 'inactive') return { lock: false, backgroundAt: backgroundAt ?? now };
  const away = backgroundAt !== null && now - backgroundAt >= LOCK_AFTER_BACKGROUND_MS;
  const idle = now - lastActive >= LOCK_AFTER_IDLE_MS;
  return { lock: away || idle, backgroundAt: null };
}
