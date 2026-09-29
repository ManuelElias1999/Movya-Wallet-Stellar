import { useCallback, useEffect, useState } from 'react';

import { env } from '@/config/env';
import { getAccountSnapshot } from '@/services/stellar/horizon';
import type { StellarAccountSnapshot } from '@/services/stellar/types';

type AccountState = {
  data: StellarAccountSnapshot | null;
  loading: boolean;
  error: string | null;
};

export function useStellarAccount() {
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

  return { ...state, refresh, isDemo: !env.demoAccount };
}
