import { SubmissionUnknownError, type PaymentReceipt } from './stellar/payments';
import type { SwapInput, SwapReview } from './stellar/swaps';

export type SwapState = { phase: 'idle' | 'quoting' | 'review' | 'submitting' | 'unknown' | 'success' | 'error'; input?: SwapInput; review?: SwapReview; receipt?: PaymentReceipt; error?: string };
export const swapBlocked = (state: SwapState) => state.phase === 'submitting' || state.phase === 'unknown';
export function createSwapFlow(deps: {
  source(): string | null; prepare(input: SwapInput): Promise<SwapReview>; submit(review: SwapReview): Promise<PaymentReceipt>;
  check(hash: string): Promise<PaymentReceipt | null>; refresh(): Promise<void>;
}) {
  let state: SwapState = { phase: 'idle' };
  let revision = 0;
  const listeners = new Set<() => void>();
  const publish = (next: SwapState) => { state = next; listeners.forEach(fn => fn()); };
  const errorText = (error: unknown) => error instanceof Error ? error.message : 'No se pudo preparar el cambio.';
  const flow = {
    get: () => state,
    subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    clear() { if (swapBlocked(state)) return false; revision++; publish({ phase: 'idle' }); return true; },
    async start(input: SwapInput) {
      if (swapBlocked(state)) return;
      const current = ++revision;
      publish({ phase: 'quoting', input });
      try {
        if (!deps.source() || input.source !== deps.source()) throw new Error('Abre tu wallet antes de preparar un cambio.');
        const review = await deps.prepare(input);
        if (current !== revision) return;
        if (input.source !== deps.source()) throw new Error('La sesión cambió. Solicita otra cotización.');
        publish({ phase: 'review', input, review });
      } catch (error) { if (current === revision) publish({ phase: 'error', input, error: errorText(error) }); }
    },
    async confirm() {
      if (state.phase !== 'review' || !state.review) return;
      const pending = state;
      const review = state.review;
      if (review.source !== deps.source()) { publish({ ...pending, phase: 'error', error: 'La sesión cambió. Solicita otra cotización.' }); return; }
      publish({ ...pending, phase: 'submitting', error: undefined });
      try {
        const receipt = await deps.submit(review);
        publish({ ...pending, phase: 'success', receipt });
        void deps.refresh().catch(() => undefined);
      } catch (error) { publish({ ...pending, phase: error instanceof SubmissionUnknownError ? 'unknown' : 'error', error: errorText(error) }); }
    },
    async verify() {
      if (state.phase !== 'unknown' || !state.review) return;
      const pending = state;
      publish({ ...pending, phase: 'submitting', error: undefined });
      try {
        const receipt = await deps.check(pending.review!.hash);
        if (receipt) { publish({ ...pending, phase: 'success', receipt, error: undefined }); void deps.refresh().catch(() => undefined); }
        else publish({ ...pending, error: 'La transacción todavía no aparece. Espera unos segundos y verifica otra vez.' });
      } catch (error) { publish({ ...pending, error: errorText(error) }); }
    },
  };
  return flow;
}
