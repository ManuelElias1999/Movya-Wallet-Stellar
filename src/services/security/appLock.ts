export const LOCK_AFTER_BACKGROUND_MS = 5 * 60_000; // app left for more than 5 min
export const LOCK_AFTER_IDLE_MS = 5 * 60_000; // app visible but untouched

export type LockInput = { state: string; now: number; backgroundAt: number | null };
// iOS also reports "inactive" while a Face ID sheet is visible. Only a real
// background transition starts the five-minute timer.
export function lockDecision({ state, now, backgroundAt }: LockInput): { expire: boolean; backgroundAt: number | null } {
  if (state === 'background') return { expire: false, backgroundAt: backgroundAt ?? now };
  if (state === 'inactive') return { expire: false, backgroundAt };
  const away = backgroundAt !== null && now - backgroundAt >= LOCK_AFTER_BACKGROUND_MS;
  return { expire: away, backgroundAt: null };
}

export const idleLockDue = (now: number, lastActive: number) => now - lastActive >= LOCK_AFTER_IDLE_MS;
