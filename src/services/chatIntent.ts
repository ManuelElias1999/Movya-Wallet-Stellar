export function parseSendRequest(message: string) {
  const match = message.trim().match(/^(?:env[ií]a(?:r)?|send)\s+\$?\s*(\d+(?:[.,]\d+)?)\s+([a-z0-9]+)\s+(?:a|to)\s+(.+)$/i);
  return match ? { amount: match[1].replace(',', '.'), token: match[2].toUpperCase(), recipient: match[3].trim() } : null;
}
export function parseSwapRequest(message: string) {
  const match = message.trim().match(/^(?:cambia(?:r)?|swap|exchange|change)\s+(\d+(?:[.,]\d+)?)\s+([a-z0-9]+)\s+(?:a|por|to|for)\s+([a-z0-9]+)$/i);
  return match ? { amount: match[1].replace(',', '.'), from: match[2].toUpperCase(), to: match[3].toUpperCase() } : null;
}
export function chatTopic(message: string) {
  const text = message.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/balance|cuanto dinero|how much money/.test(text)) return 'balance';
  if (/cambia|cambio|swap|exchange/.test(text)) return 'swap';
  if (/contact/.test(text)) return 'contact';
  if (/recibir|compartir|receive|share/.test(text)) return 'receive';
  return 'send';
}
