// Prevents an accidental second identical payment (a double tap, a retry
// after a slow network, or the chat repeating a command). The first one may
// still be in flight; Stellar itself would accept the second.
export const DUPLICATE_WINDOW_MS = 2 * 60_000;
type Attempt = { at: number; hash: string };
const recent = new Map<string, Attempt>();
const keyOf = (payment: { source: string; destination: string; amount: string; asset: string }) =>
  `${payment.source}|${payment.destination}|${payment.amount}|${payment.asset}`;

export function assertNotDuplicate(payment: { source: string; destination: string; amount: string; asset: string; hash: string }, now = Date.now()) {
  const previous = recent.get(keyOf(payment));
  if (previous && previous.hash !== payment.hash && now - previous.at < DUPLICATE_WINDOW_MS) {
    throw new Error('Ya enviaste exactamente este monto a esta dirección hace menos de 2 minutos. Revisa tu actividad antes de repetirlo.');
  }
}
export function recordPayment(payment: { source: string; destination: string; amount: string; asset: string; hash: string }, now = Date.now()) {
  recent.set(keyOf(payment), { at: now, hash: payment.hash });
  for (const [key, value] of recent) if (now - value.at >= DUPLICATE_WINDOW_MS) recent.delete(key);
}
