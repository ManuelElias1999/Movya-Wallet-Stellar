export type AiIntentKind = 'send' | 'swap' | 'swap_then_send' | 'balance' | 'receive' | 'activity' | 'contact' | 'help' | 'unknown';
export type AiContactAction = 'count' | 'list' | 'address' | 'add';
export type AiHistoryMessage = { role: 'user' | 'assistant'; content: string };
export type AiIntent = {
  kind: AiIntentKind;
  amount: string | null;
  token: 'XLM' | 'USDC' | null;
  from: 'XLM' | 'USDC' | null;
  to: 'XLM' | 'USDC' | null;
  recipient: string | null;
  contactAction: AiContactAction | null;
  contactName: string | null;
  limit: number | null;
  reply: string | null;
};

const simpleKinds = new Set<AiIntentKind>(['balance', 'receive', 'help', 'unknown']);

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

function cleanLimit(value: unknown) {
  if (value === null) return null;
  if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 20) throw new Error('La IA devolvió un límite no válido.');
  return Number(value);
}

function emptyFields() {
  return { amount: null, token: null, from: null, to: null, recipient: null, contactAction: null, contactName: null, limit: null } as const;
}

function normalized(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
}

export function parseAiIntent(value: unknown, sourceText: string): AiIntent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('La respuesta de la IA no es válida.');
  const candidate = value as Record<string, unknown>;
  const kind = candidate.kind;
  if (typeof kind !== 'string' || !['send', 'swap', 'swap_then_send', 'balance', 'receive', 'activity', 'contact', 'help', 'unknown'].includes(kind)) {
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
    return { kind, amount: cleanAmount(candidate.amount), token, from: null, to: null, recipient, contactAction: null, contactName: null, limit: null, reply };
  }
  if (kind === 'swap') {
    const from = cleanAsset(candidate.from);
    const to = cleanAsset(candidate.to);
    if (!from || !to || from === to) throw new Error('La IA devolvió un cambio no válido.');
    return { kind, amount: cleanAmount(candidate.amount), token: null, from, to, recipient: null, contactAction: null, contactName: null, limit: null, reply };
  }
  if (kind === 'swap_then_send') {
    const from = cleanAsset(candidate.from);
    const to = cleanAsset(candidate.to);
    const recipient = cleanString(candidate.recipient, 160);
    if (!from || !to || from === to) throw new Error('La IA devolvió un cambio no válido.');
    if (!recipient || !normalized(sourceText).includes(normalized(recipient))) {
      throw new Error('La IA intentó completar un destinatario que no escribiste.');
    }
    return { kind, amount: cleanAmount(candidate.amount), token: null, from, to, recipient, contactAction: null, contactName: null, limit: null, reply };
  }
  if (kind === 'activity') {
    return { kind, ...emptyFields(), limit: cleanLimit(candidate.limit), reply };
  }
  if (kind === 'contact') {
    const action = candidate.contactAction;
    if (action !== null && !['count', 'list', 'address', 'add'].includes(String(action))) throw new Error('La respuesta de la IA no es válida.');
    const contactAction = action as AiContactAction | null;
    const contactName = candidate.contactName === null ? null : cleanString(candidate.contactName, 80);
    if ((contactAction === 'address' || (contactAction === 'add' && contactName)) && (!contactName || !normalized(sourceText).includes(normalized(contactName)))) {
      throw new Error('La IA intentó completar un contacto que no escribiste.');
    }
    if (contactAction === 'address' && !contactName) throw new Error('La respuesta de la IA no es válida.');
    return { kind, ...emptyFields(), contactAction, contactName, reply };
  }
  if (!simpleKinds.has(kind as AiIntentKind)) throw new Error('La respuesta de la IA no es válida.');
  return { kind: kind as AiIntentKind, ...emptyFields(), reply };
}

export function sanitizeAiHistory(history: AiHistoryMessage[]) {
  return history.slice(-8).flatMap((message) => {
    if ((message.role !== 'user' && message.role !== 'assistant') || typeof message.content !== 'string') return [];
    const content = message.content.trim().slice(0, 500);
    return content ? [{ role: message.role, content }] : [];
  });
}
