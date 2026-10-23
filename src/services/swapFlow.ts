import { SubmissionUnknownError, type PaymentReceipt } from './stellar/payments';
import type { SwapInput, SwapReceipt, SwapReview } from './stellar/swaps';

export type SwapState = { phase: 'idle' | 'quoting' | 'review' | 'submitting' | 'unknown' | 'success' | 'error'; input?: SwapInput; review?: SwapReview; receipt?: SwapReceipt; error?: string };
export const swapBlocked = (state: SwapState) => state.phase === 'submitting' || state.phase === 'unknown';
export function createSwapFlow(deps: {
  source(): string | null; prepare(input: SwapInput): Promise<SwapReview>; submit(review: SwapReview): Promise<SwapReceipt>;
  check(hash: string): Promise<PaymentReceipt | null>; refresh(): Promise<void>;
}) {
  let state: SwapState = { phase: 'idle' };
  let revision = 0;
  const listeners = new Set<() => void>();
  const publish = (next: SwapState) => { state = next; listeners.forEach(fn => fn()); };
  const errorText = (error: unknown) => error instanceof Error ? error.message : 'No se pudo preparar el cambio.';
  const highFee = (current: SwapState) => current.phase === 'error' && /comisi[oó]n de red.*demasiado alta/i.test(current.error ?? '');
  const sameInput = (left?: SwapInput, right?: SwapInput) => Boolean(left && right && left.source === right.source && left.amount === right.amount && left.from === right.from && left.to === right.to);
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
    async requote(delayMs = 1_200, maxAttempts = 3) {
      const input = state.input;
      if (!input || swapBlocked(state)) return;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await flow.start(input);
        if (!highFee(state) || !sameInput(state.input, input) || attempt === maxAttempts - 1) return;
        await new Promise(resolve => setTimeout(resolve, delayMs));
        if (!highFee(state) || !sameInput(state.input, input)) return;
      }
    },
    async confirm() {
      if (state.phase !== 'review' || !state.review) return;
      const pending = state;
      const review = state.review;
      if (review.source !== deps.source()) { publish({ phase: 'error', input: pending.input, error: 'La sesión cambió. Solicita otra cotización.' }); return; }
      publish({ ...pending, phase: 'submitting', error: undefined });
      try {
        const receipt = await deps.submit(review);
        publish({ ...pending, phase: 'success', receipt });
        void deps.refresh().catch(() => undefined);
      } catch (error) {
        if (error instanceof SubmissionUnknownError) publish({ ...pending, phase: 'unknown', error: errorText(error) });
        else publish({ phase: 'error', input: pending.input, error: errorText(error) });
      }
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
