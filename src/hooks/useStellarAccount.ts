import { useCallback, useEffect, useState } from 'react';

import { env } from '@/config/env';
import { useTestnetWallet } from '@/context/TestnetWalletContext';
import { getAccountSnapshot } from '@/services/stellar/horizon';
import type { StellarAccountSnapshot } from '@/services/stellar/types';

type AccountState = {
  data: StellarAccountSnapshot | null;
  loading: boolean;
  error: string | null;
};

export function useStellarAccount() {
  const wallet = useTestnetWallet();
  const [state, setState] = useState<AccountState>({
    data: null,
    loading: Boolean(env.demoAccount),
    error: null,
  });

  const refresh = useCallback(async () => {
    if (!env.demoAccount) return;

    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const data = await getAccountSnapshot(env.demoAccount);
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Could not load the account.',
      });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (wallet.publicKey) return {
    data: wallet.account ? { publicKey: wallet.publicKey, sequence: wallet.account.sequence, balances: wallet.account.balances.map((balance) => ({ assetCode: balance.asset_type === 'native' ? 'XLM' : balance.asset_code ?? 'ASSET', assetIssuer: balance.asset_issuer, balance: balance.balance })) } : null,
    loading: wallet.loading, error: wallet.error, refresh: wallet.refresh, isDemo: false,
  };
  return { ...state, refresh, isDemo: !env.demoAccount };
}
