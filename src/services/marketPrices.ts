export type MarketPrices = {
  XLM: number;
  USDC: number;
  xlmChange24h: number | null;
  usdcChange24h: number | null;
  updatedAt: number;
  stale: boolean;
};

type Balance = { assetCode: string; balance: string };
type PricePayload = {
  stellar?: { usd?: number; usd_24h_change?: number; last_updated_at?: number };
  'usd-coin'?: { usd?: number; usd_24h_change?: number; last_updated_at?: number };
};

const PRICE_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=stellar%2Cusd-coin&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true';
const CACHE_TTL_MS = 60_000;
let cachedPrices: MarketPrices | null = null;
let pendingRequest: Promise<MarketPrices> | null = null;

function validPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function optionalNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

async function requestPrices(fetcher: typeof fetch, now: number): Promise<MarketPrices> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7_000);
  try {
    const response = await fetcher(PRICE_URL, { headers: { Accept: 'application/json' }, signal: controller.signal });
    if (!response.ok) throw new Error(`Price provider returned ${response.status}.`);
    const payload = await response.json() as PricePayload;
    const xlm = payload.stellar?.usd;
    const usdc = payload['usd-coin']?.usd;
    if (!validPrice(xlm) || !validPrice(usdc)) throw new Error('Price provider returned an invalid quote.');
    const providerTime = Math.max(payload.stellar?.last_updated_at ?? 0, payload['usd-coin']?.last_updated_at ?? 0) * 1_000;
    return {
      XLM: xlm,
      USDC: usdc,
      xlmChange24h: optionalNumber(payload.stellar?.usd_24h_change),
      usdcChange24h: optionalNumber(payload['usd-coin']?.usd_24h_change),
      updatedAt: providerTime || now,
      stale: false,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getMarketPrices(options: { force?: boolean; fetcher?: typeof fetch; now?: number } = {}) {
  const now = options.now ?? Date.now();
  if (!options.force && cachedPrices && now - cachedPrices.updatedAt < CACHE_TTL_MS) return { ...cachedPrices, stale: false };
  if (!options.force && pendingRequest) return pendingRequest;

  const fetcher = options.fetcher ?? globalThis.fetch;
  const request = requestPrices(fetcher, now)
    .then((prices) => {
      cachedPrices = prices;
      return prices;
    })
    .catch((error) => {
      if (cachedPrices) return { ...cachedPrices, stale: true };
      throw error;
    })
    .finally(() => {
      if (pendingRequest === request) pendingRequest = null;
    });
  pendingRequest = request;
  return request;
}

export function portfolioUsdTotal(balances: Balance[] | undefined, prices: Pick<MarketPrices, 'XLM' | 'USDC'> | null) {
  if (!balances || !prices) return null;
  let total = 0;
  for (const item of balances) {
    const unitPrice = item.assetCode === 'XLM' ? prices.XLM : item.assetCode === 'USDC' ? prices.USDC : null;
    if (unitPrice === null) continue;
    const balance = Number(item.balance);
    if (Number.isFinite(balance) && balance >= 0) total += balance * unitPrice;
  }
  return total;
}

export function assetUsdValue(assetCode: string, balance: string, prices: Pick<MarketPrices, 'XLM' | 'USDC'> | null) {
  if (!prices) return null;
  const unitPrice = assetCode === 'XLM' ? prices.XLM : assetCode === 'USDC' ? prices.USDC : null;
  const numericBalance = Number(balance);
  return unitPrice === null || !Number.isFinite(numericBalance) ? null : numericBalance * unitPrice;
}

export function formatUsd(value: number | null, locale = 'es-BO') {
  if (value === null || !Number.isFinite(value)) return '—';
  const roundedCents = Math.round((value + Number.EPSILON) * 100);
  const whole = Math.floor(roundedCents / 100);
  const cents = String(roundedCents % 100).padStart(2, '0');
  const english = /^en(?:-|$)/i.test(locale);
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, english ? ',' : '.');
  return `$${grouped}${english ? '.' : ','}${cents}`;
}

export function formatUnitPrice(value: number | null, locale = 'es-BO') {
  if (value === null || !Number.isFinite(value)) return 'Sin cotización';
  const digits = value < 0.01 ? 6 : value < 1 ? 4 : 2;
  const fixed = value.toFixed(digits);
  return `$${/^en(?:-|$)/i.test(locale) ? fixed : fixed.replace('.', ',')}`;
}

export function formatMarketChange(value: number | null) {
  if (value === null) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export function resetMarketPriceCacheForTests() {
  cachedPrices = null;
  pendingRequest = null;
}
