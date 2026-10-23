import { useCallback, useEffect, useRef, useState } from 'react';

import { getMarketPrices, type MarketPrices } from '@/services/marketPrices';

type MarketPriceState = {
  data: MarketPrices | null;
  loading: boolean;
  error: string | null;
};

export function useMarketPrices() {
  const mounted = useRef(true);
  const [state, setState] = useState<MarketPriceState>({ data: null, loading: true, error: null });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async (force = false) => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const data = await getMarketPrices({ force });
      if (mounted.current) setState({ data, loading: false, error: null });
    } catch {
      if (mounted.current) setState((current) => ({ ...current, loading: false, error: 'No pudimos actualizar el precio de mercado.' }));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...state, refresh };
}
