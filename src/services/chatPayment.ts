import type { PaymentReceipt, PaymentReview } from './stellar/payments';
import { SubmissionUnknownError } from './stellar/payments';

export type ChatPaymentRequest = { amount: string; token: string; recipient: string };
export type RecipientChoice = { id: string; name: string; handle: string };
type Resolution = { destination: string; name: string } | { choices: RecipientChoice[] };
export type ChatPaymentState = {
  phase: 'idle' | 'preparing' | 'choosing' | 'review' | 'submitting' | 'unknown' | 'success' | 'error';
  request?: ChatPaymentRequest; review?: PaymentReview; recipient?: string;
  choices?: RecipientChoice[]; receipt?: PaymentReceipt; error?: string;
};

// The chat and its buttons use the same state machine: only an explicit
// confirmation can submit, and an uncertain broadcast can only be checked.
export function createChatPaymentFlow(deps: {
  source(): string | null;
  resolve(request: ChatPaymentRequest, contactId?: string): Promise<Resolution>;
  prepare(input: { source: string; destination: string; amount: string; asset: 'XLM' | 'USDC' }): Promise<PaymentReview>;
  submit(review: PaymentReview): Promise<PaymentReceipt>;
  check(hash: string): Promise<PaymentReceipt | null>;
  refresh(): Promise<void>;
}) {
  let state: ChatPaymentState = { phase: 'idle' };
  let revision = 0;
  const listeners = new Set<() => void>();
  const publish = (next: ChatPaymentState) => { state = next; listeners.forEach(fn => fn()); };
  const busy = () => ['preparing', 'submitting', 'unknown'].includes(state.phase);
  const fail = (error: unknown) => error instanceof Error ? error.message : 'No se pudo preparar el envío.';
  const flow = {
    get: () => state,
    subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    clear() { if (busy()) return false; revision++; publish({ phase: 'idle' }); return true; },
    async start(request: ChatPaymentRequest, contactId?: string) {
      if (busy()) return;
      const current = ++revision;
      const source = deps.source();
      publish({ phase: 'preparing', request });
      try {
        if (!source) throw new Error('Abre tu wallet antes de preparar un envío.');
        if (request.token !== 'XLM' && request.token !== 'USDC') throw new Error('Por ahora las transferencias de Testnet admiten USDC y XLM.');
        const recipient = await deps.resolve(request, contactId);
        if (current !== revision) return;
        if (source !== deps.source()) throw new Error('La sesión cambió. Revisa el envío nuevamente.');
        if ('choices' in recipient) { publish({ phase: 'choosing', request, choices: recipient.choices }); return; }
        const review = await deps.prepare({ source, destination: recipient.destination, amount: request.amount, asset: request.token });
        if (current !== revision) return;
        if (source !== deps.source()) throw new Error('La sesión cambió. Revisa el envío nuevamente.');
        publish({ phase: 'review', request, review, recipient: recipient.name });
      } catch (error) { if (current === revision) publish({ phase: 'error', request, error: fail(error) }); }
    },
    cancel() {
      if (state.phase !== 'review' && state.phase !== 'choosing') return false;
      revision++; publish({ phase: 'idle' }); return true;
    },
    async confirm() {
      if (state.phase !== 'review' || !state.review) return;
      const pending = state;
      const review = state.review;
      if (review.source !== deps.source()) { publish({ phase: 'error', error: 'La sesión cambió. Revisa el envío nuevamente.' }); return; }
      publish({ ...pending, phase: 'submitting', error: undefined });
      try {
        const receipt = await deps.submit(review);
        publish({ ...pending, phase: 'success', receipt });
        // A balance refresh failure cannot turn a confirmed transfer into a retry.
        void deps.refresh().catch(() => undefined);
      } catch (error) {
        publish({ ...pending, phase: error instanceof SubmissionUnknownError ? 'unknown' : 'error', error: fail(error) });
      }
    },
    async verify() {
      if (state.phase !== 'unknown' || !state.review) return;
      const pending = state;
      publish({ ...pending, phase: 'submitting', error: undefined });
      try {
        const receipt = await deps.check(pending.review!.hash);
        if (receipt) {
          publish({ ...pending, phase: 'success', receipt, error: undefined });
          void deps.refresh().catch(() => undefined);
        } else publish({ ...pending, error: 'La transacción todavía no aparece. Espera unos segundos y verifica otra vez.' });
      } catch (error) { publish({ ...pending, error: fail(error) }); }
    },
  };
  return flow;
}

export function matchChatContacts<T extends RecipientChoice & { email?: string; address?: string }>(contacts: T[], recipient: string): T[] {
  const normalize = (value: string) => value.trim().toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const target = normalize(recipient);
  return contacts.filter(c => normalize(c.name) === target || c.email?.toLowerCase() === recipient.trim().toLowerCase() || c.address === recipient.trim());
}
