import { MOVYA_SWAP_FEE_BPS, MOVYA_TREASURY } from './swaps';
import { formatUnits, horizonRequest, units, USDC_ISSUER, validateAddress, type PaymentAsset, type PaymentRecord } from './payments';

type PathPaymentRecord = PaymentRecord & {
  type: 'path_payment_strict_send';
  source_amount: string;
  source_asset_type: string;
  source_asset_code?: string;
  source_asset_issuer?: string;
};

export type TransferActivity = { kind: 'transfer'; payment: PaymentRecord };
export type SwapActivity = {
  kind: 'swap'; id: string; transactionHash: string; createdAt: string;
  fromAsset: PaymentAsset; toAsset: PaymentAsset; sourceAmount: string; destinationAmount: string;
};
export type StellarActivity = TransferActivity | SwapActivity;
export type ActivityPeriod = 'today' | '7d' | '30d' | 'all';

function activityDate(activity: StellarActivity) {
  return new Date(activity.kind === 'swap' ? activity.createdAt : activity.payment.created_at).getTime();
}

export function filterActivityByPeriod(activities: StellarActivity[], period: ActivityPeriod, now = Date.now()) {
  if (period === 'all') return activities;
  const current = new Date(now);
  let since: number;
  if (period === 'today') {
    current.setHours(0, 0, 0, 0);
    since = current.getTime();
  } else {
    since = now - (period === '7d' ? 7 : 30) * 24 * 60 * 60 * 1_000;
  }
  return activities.filter((activity) => activityDate(activity) >= since && activityDate(activity) <= now);
}

function supportedAsset(type: string, code?: string, issuer?: string): PaymentAsset | null {
  if (type === 'native') return 'XLM';
  return code === 'USDC' && issuer === USDC_ISSUER ? 'USDC' : null;
}

function feeForSwap(records: PaymentRecord[], swap: PathPaymentRecord, publicKey: string, fromAsset: PaymentAsset) {
  return records.find(record => record.transaction_hash === swap.transaction_hash && record.type === 'payment'
    && record.from === publicKey && record.to === MOVYA_TREASURY
    && supportedAsset(record.asset_type, record.asset_code, record.asset_issuer) === fromAsset);
}

export async function getActivityHistory(publicKey: string): Promise<StellarActivity[]> {
  validateAddress(publicKey);
  const result = await horizonRequest<{ _embedded: { records: PaymentRecord[] } }>(`/accounts/${publicKey}/payments?order=desc&limit=40`);
  const records = result._embedded.records.filter(record => record.transaction_successful);
  const swaps = new Map<string, SwapActivity>();
  const consumedFees = new Set<string>();

  for (const record of records) {
    if (record.type !== 'path_payment_strict_send') continue;
    const swap = record as PathPaymentRecord;
    const fromAsset = supportedAsset(swap.source_asset_type, swap.source_asset_code, swap.source_asset_issuer);
    const toAsset = supportedAsset(swap.asset_type, swap.asset_code, swap.asset_issuer);
    if (!fromAsset || !toAsset || fromAsset === toAsset || swap.from !== publicKey || swap.to !== publicKey) continue;
    let source = units(swap.source_amount);
    const fee = feeForSwap(records, swap, publicKey, fromAsset);
    if (fee) {
      const feeAmount = units(fee.amount);
      const gross = source + feeAmount;
      if (gross * BigInt(MOVYA_SWAP_FEE_BPS) / 10_000n === feeAmount) {
        source = gross;
        consumedFees.add(fee.id);
      }
    }
    swaps.set(record.id, { kind: 'swap', id: record.id, transactionHash: record.transaction_hash, createdAt: record.created_at,
      fromAsset, toAsset, sourceAmount: formatUnits(source), destinationAmount: record.amount });
  }

  return records.flatMap<StellarActivity>(record => {
    const swap = swaps.get(record.id);
    if (swap) return [swap];
    if (record.type === 'payment' && !consumedFees.has(record.id)) return [{ kind: 'transfer', payment: record }];
    return [];
  });
}
