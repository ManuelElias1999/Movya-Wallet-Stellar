const STELLAR_AMOUNT_PATTERN = /^\d+(?:\.\d{1,7})?$/;
const STELLAR_PUBLIC_KEY_PATTERN = /^G[A-Z2-7]{55}$/;

export function sanitizeTransferAmountInput(value: string) {
  const normalized = value.replace(/,/g, '.').replace(/[^\d.]/g, '');
  const dot = normalized.indexOf('.');
  const wholeInput = dot === -1 ? normalized : normalized.slice(0, dot);
  const fractionInput = dot === -1 ? '' : normalized.slice(dot + 1).replace(/\./g, '');
  const whole = wholeInput.replace(/^0+(?=\d)/, '') || (dot >= 0 ? '0' : '');
  const fraction = fractionInput.slice(0, 7);
  return dot >= 0 ? `${whole}.${fraction}` : whole;
}

export function sanitizeStellarAddressInput(value: string) {
  return value.replace(/\s/g, '').toUpperCase();
}

export function isPositiveTransferAmount(value: string) {
  if (!STELLAR_AMOUNT_PATTERN.test(value)) return false;
  return value.replace('.', '').split('').some((digit) => digit !== '0');
}

export function looksLikeStellarPublicKey(value: string) {
  return STELLAR_PUBLIC_KEY_PATTERN.test(sanitizeStellarAddressInput(value));
}

export function shortenStellarAddress(value: string) {
  const address = sanitizeStellarAddressInput(value);
  if (address.length <= 18) return address;
  return `${address.slice(0, 8)}…${address.slice(-8)}`;
}

export function paymentReviewSecondsRemaining(expiresAt: number, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!Number.isFinite(expiresAt) || !Number.isFinite(nowSeconds)) return 0;
  return Math.max(0, Math.ceil(expiresAt - nowSeconds));
}
