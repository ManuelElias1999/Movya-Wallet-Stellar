import { env } from '@/config/env';

import type {
  StellarAccountSnapshot,
  StellarAssetBalance,
  StellarPayment,
} from './types';

type HorizonBalance = {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  balance: string;
};

type HorizonAccount = {
  account_id: string;
  sequence: string;
  balances: HorizonBalance[];
};

type HorizonPayment = {
  id: string;
  type: string;
  from: string;
  to: string;
  amount: string;
  asset_type: string;
  asset_code?: string;
  created_at: string;
};

type HorizonCollection<T> = {
  _embedded: { records: T[] };
};

const request = async <T>(path: string): Promise<T> => {
  const response = await fetch(`${env.horizonUrl}${path}`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Horizon request failed (${response.status}).`);
  }

  return response.json() as Promise<T>;
};

const normalizeBalance = (item: HorizonBalance): StellarAssetBalance => ({
  assetCode: item.asset_type === 'native' ? 'XLM' : item.asset_code ?? 'UNKNOWN',
  assetIssuer: item.asset_issuer,
  balance: item.balance,
});

export const getAccountSnapshot = async (
  publicKey: string,
): Promise<StellarAccountSnapshot> => {
  const account = await request<HorizonAccount>(
    `/accounts/${encodeURIComponent(publicKey)}`,
  );

  return {
    publicKey: account.account_id,
    sequence: account.sequence,
    balances: account.balances.map(normalizeBalance),
  };
};

export const getRecentPayments = async (
  publicKey: string,
  limit = 10,
): Promise<StellarPayment[]> => {
  const result = await request<HorizonCollection<HorizonPayment>>(
    `/accounts/${encodeURIComponent(publicKey)}/payments?order=desc&limit=${limit}`,
  );

  return result._embedded.records
    .filter((record) => record.type === 'payment')
    .map((record) => ({
      id: record.id,
      from: record.from,
      to: record.to,
      amount: record.amount,
      assetCode: record.asset_type === 'native' ? 'XLM' : record.asset_code ?? 'ASSET',
      createdAt: record.created_at,
    }));
};
