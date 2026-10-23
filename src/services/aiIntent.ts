export type AiIntentKind = 'send' | 'swap' | 'balance' | 'receive' | 'contact' | 'help' | 'unknown';
export type AiHistoryMessage = { role: 'user' | 'assistant'; content: string };
export type AiIntent = {
  kind: AiIntentKind;
  amount: string | null;
  token: 'XLM' | 'USDC' | null;
  from: 'XLM' | 'USDC' | null;
  to: 'XLM' | 'USDC' | null;
  recipient: string | null;
  reply: string | null;
};

const nonTransactionalKinds = new Set<AiIntentKind>(['balance', 'receive', 'contact', 'help', 'unknown']);

function cleanString(value: unknown, maximum: number) {
  if (value === null) return null;
  if (typeof value !== 'string') throw new Error('La respuesta de la IA no es válida.');
  const clean = value.trim();
  if (!clean || clean.length > maximum) throw new Error('La respuesta de la IA no es válida.');
  return clean;
}

function cleanAsset(value: unknown) {
  if (value === null) return null;
  if (value !== 'XLM' && value !== 'USDC') throw new Error('La IA devolvió un activo no permitido.');
  return value;
}

function cleanAmount(value: unknown) {
  const amount = cleanString(value, 32);
  if (amount === null || !/^(?:0|[1-9]\d*)(?:\.\d{1,7})?$/.test(amount) || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    throw new Error('La IA devolvió un monto no válido.');
  }
  return amount;
}

function normalized(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
}

export function parseAiIntent(value: unknown, sourceText: string): AiIntent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('La respuesta de la IA no es válida.');
  const candidate = value as Record<string, unknown>;
  const kind = candidate.kind;
  if (typeof kind !== 'string' || !['send', 'swap', 'balance', 'receive', 'contact', 'help', 'unknown'].includes(kind)) {
    throw new Error('La respuesta de la IA no es válida.');
  }

  const reply = candidate.reply === null ? null : cleanString(candidate.reply, 400);
  if (kind === 'send') {
    const recipient = cleanString(candidate.recipient, 160);
    const token = cleanAsset(candidate.token);
    if (!recipient || !normalized(sourceText).includes(normalized(recipient))) {
      throw new Error('La IA intentó completar un destinatario que no escribiste.');
    }
    if (!token) throw new Error('La IA devolvió un activo no permitido.');
    return { kind, amount: cleanAmount(candidate.amount), token, from: null, to: null, recipient, reply };
  }
  if (kind === 'swap') {
    const from = cleanAsset(candidate.from);
    const to = cleanAsset(candidate.to);
    if (!from || !to || from === to) throw new Error('La IA devolvió un cambio no válido.');
    return { kind, amount: cleanAmount(candidate.amount), token: null, from, to, recipient: null, reply };
  }
  if (!nonTransactionalKinds.has(kind as AiIntentKind)) throw new Error('La respuesta de la IA no es válida.');
  return { kind: kind as AiIntentKind, amount: null, token: null, from: null, to: null, recipient: null, reply };
}

export function sanitizeAiHistory(history: AiHistoryMessage[]) {
  return history.slice(-8).flatMap((message) => {
    if ((message.role !== 'user' && message.role !== 'assistant') || typeof message.content !== 'string') return [];
    const content = message.content.trim().slice(0, 500);
    return content ? [{ role: message.role, content }] : [];
  });
}
