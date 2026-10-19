import { useRef, useState, useSyncExternalStore } from 'react';
import { useTestnetWallet } from './TestnetWalletContext';
import { checkSubmission } from '@/services/stellar/payments';
import { prepareSwap, submitSwap } from '@/services/stellar/swaps';
import { createSwapFlow } from '@/services/swapFlow';

export function useSwapFlow() {
  const wallet = useTestnetWallet();
  const latest = useRef(wallet);
  latest.current = wallet;
  const [flow] = useState(() => createSwapFlow({
    source: () => latest.current.publicKey,
    prepare: prepareSwap,
    submit: review => submitSwap(review, latest.current.sign, latest.current.signerPublicKey ?? undefined),
    check: checkSubmission,
    refresh: () => latest.current.refresh(),
  }));
  const state = useSyncExternalStore(flow.subscribe, flow.get, flow.get);
  return { flow, state };
}
