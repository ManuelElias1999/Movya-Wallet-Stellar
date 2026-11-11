const STELLAR_DECIMALS = 7;

export function sanitizeSwapAmountInput(value: string) {
  const normalized = value.replace(/,/g, '.').replace(/[^\d.]/g, '');
  const dot = normalized.indexOf('.');
  const wholeInput = dot === -1 ? normalized : normalized.slice(0, dot);
  const fractionInput = dot === -1 ? '' : normalized.slice(dot + 1).replace(/\./g, '');
  const whole = wholeInput.replace(/^0+(?=\d)/, '') || (dot >= 0 ? '0' : '');
  const fraction = fractionInput.slice(0, STELLAR_DECIMALS);
  return dot >= 0 ? `${whole}.${fraction}` : whole;
}
