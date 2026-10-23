export function parseSendRequest(message: string) {
  const match = message.trim().match(/^(?:env[ií]a(?:r)?|send)\s+\$?\s*(\d+(?:[.,]\d+)?)\s+([a-z0-9]+)\s+(?:a|to)\s+(.+)$/i);
  return match ? { amount: match[1].replace(',', '.'), token: match[2].toUpperCase(), recipient: match[3].trim() } : null;
}
export function parseSwapRequest(message: string) {
  const match = message.trim().match(/^(?:cambia(?:r)?|swap|exchange|change)\s+(\d+(?:[.,]\d+)?)\s+([a-z0-9]+)\s+(?:a|por|to|for)\s+([a-z0-9]+)$/i);
  return match ? { amount: match[1].replace(',', '.'), from: match[2].toUpperCase(), to: match[3].toUpperCase() } : null;
}

export function parseChainedSwapSendRequest(message: string) {
  const match = message.trim().match(/^(?:cambia(?:r)?|swap|exchange|change)\s+(\d+(?:[.,]\d+)?)\s+(XLM|USDC)\s+(?:a|por|to|for)\s+(XLM|USDC)\s+(?:y|and)\s*(?:(?:despu[eé]s|luego|then)\s+)?(?:env[ií]a(?:r)?|manda(?:r)?|send)\s+(?:(?:ese|el|that|the)\s+(?:monto|amount)|eso|it|lo\s+recibido)\s+(?:a|to)\s+(.+?)[.!?]*$/i);
  if (!match) return null;
  const from = match[2].toUpperCase() as 'XLM' | 'USDC';
  const to = match[3].toUpperCase() as 'XLM' | 'USDC';
  if (from === to) return null;
  return { amount: match[1].replace(',', '.'), from, to, recipient: match[4].trim() };
}

export function parseActivityLimit(message: string, fallback = 5) {
  const text = normalizedChat(message);
  const match = text.match(/ultim(?:a|as|o|os)\s+(\d{1,2})/);
  if (!match) return fallback;
  return Math.min(20, Math.max(1, Number(match[1])));
}

export type ContactChatRequest =
  | { kind: 'count' }
  | { kind: 'list' }
  | { kind: 'address'; name: string }
  | { kind: 'add'; name?: string };

const normalizedChat = (message: string) => message.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function parseContactChatRequest(message: string): ContactChatRequest | null {
  const text = normalizedChat(message);
  if (!/contact|address|direccion/.test(text)) return null;
  if (/(?:cuantos|numero de|cantidad de).*contact|contact.*(?:tengo|guardad)/.test(text)) return { kind: 'count' };
  if (/(?:dime|muestra|muestrame|lista|listar|ver|quienes|cuales|todos|todas|mis|my|show|list).*(?:contact)|(?:contact).*(?:dime|muestra|lista|todos|todas|guardad|saved)/.test(text)) return { kind: 'list' };
  const address = message.trim().match(/(?:cu[aá]l\s+es\s+(?:el\s+)?|dime\s+(?:el\s+)?|what(?:'s|\s+is)\s+(?:the\s+)?)(?:address|direcci[oó]n)\s+(?:de|of)\s+(.+?)[?.!]*$/i);
  if (address?.[1]?.trim()) return { kind: 'address', name: address[1].trim() };
  if (/(?:agregar|anadir|añadir|guardar|nuevo|add|save).*(?:contact)|(?:contact).*(?:agregar|anadir|añadir|guardar|add|save)/.test(text)) {
    const named = message.trim().match(/(?:se\s+llama|llamad[oa]|named)\s+([\p{L}\p{M}][\p{L}\p{M}' -]{0,79})[?.!]*$/iu);
    return { kind: 'add', ...(named?.[1]?.trim() ? { name: named[1].trim() } : {}) };
  }
  return null;
}

export function isChainedTransactionRequest(message: string) {
  const text = normalizedChat(message);
  const asksSwap = /cambia|cambio|swap|exchange/.test(text);
  const asksSend = /envia|enviar|manda|mandar|send/.test(text);
  return asksSwap && asksSend;
}

export function chatTopic(message: string) {
  const text = normalizedChat(message);
  if (/balance|cuanto dinero|how much money/.test(text)) return 'balance';
  if (/ultim.*(?:operacion|movimiento|transaction)|(?:mis|my).*(?:operacion|movimiento|transaction)|historial|activity/.test(text)) return 'activity';
  if (/cambia|cambio|swap|exchange/.test(text)) return 'swap';
  if (/contact|address|direccion/.test(text)) return 'contact';
  if (/recibir|compartir|receive|share/.test(text)) return 'receive';
  return 'send';
}
