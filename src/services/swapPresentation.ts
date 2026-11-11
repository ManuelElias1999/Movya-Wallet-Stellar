const STELLAR_DECIMALS = 7;
const STROOPS_PER_UNIT = 10n ** BigInt(STELLAR_DECIMALS);

export function sanitizeSwapAmountInput(value: string) {
  const normalized = value.replace(/,/g, '.').replace(/[^\d.]/g, '');
  const dot = normalized.indexOf('.');
  const wholeInput = dot === -1 ? normalized : normalized.slice(0, dot);
  const fractionInput = dot === -1 ? '' : normalized.slice(dot + 1).replace(/\./g, '');
  const whole = wholeInput.replace(/^0+(?=\d)/, '') || (dot >= 0 ? '0' : '');
  const fraction = fractionInput.slice(0, STELLAR_DECIMALS);
  return dot >= 0 ? `${whole}.${fraction}` : whole;
}

function parseStellarAmount(value: string) {
  if (!/^\d+(?:\.\d{0,7})?$/.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * STROOPS_PER_UNIT + BigInt(fraction.padEnd(STELLAR_DECIMALS, '0'));
}

function formatStellarAmount(stroops: bigint) {
  const whole = stroops / STROOPS_PER_UNIT;
  const fraction = (stroops % STROOPS_PER_UNIT).toString().padStart(STELLAR_DECIMALS, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export function swapAmountForPercentage(spendable: string, percentage: number) {
  const stroops = parseStellarAmount(spendable);
  if (stroops === null || !Number.isInteger(percentage) || percentage < 0 || percentage > 100) return '';
  return formatStellarAmount(stroops * BigInt(percentage) / 100n);
}
