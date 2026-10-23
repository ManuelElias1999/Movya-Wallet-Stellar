import { parseAiIntent, sanitizeAiHistory, type AiHistoryMessage } from '@/services/aiIntent';
import { requireBackend } from './client';

const AI_TIMEOUT_MS = 10_000;

export async function interpretChatWithAi(message: string, history: AiHistoryMessage[], locale: string) {
  const clean = message.trim();
  if (!clean || clean.length > 500) throw new Error('El mensaje debe tener entre 1 y 500 caracteres.');
  const safeHistory = sanitizeAiHistory(history);
  const invocation = requireBackend().functions.invoke('movya-ai-intent', {
    body: { message: clean, history: safeHistory, locale: /^en(?:-|$)/i.test(locale) ? 'en' : 'es' },
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Movya tardó demasiado en responder. Inténtalo nuevamente.')), AI_TIMEOUT_MS);
  });
  try {
    const { data, error } = await Promise.race([invocation, timeout]);
    if (error) throw new Error(error.message || 'No pudimos consultar a Movya AI.');
    // A recipient must be present in the newest message. History may help the
    // model recover an amount or asset in a follow-up, but it must never make
    // an old contact name pass the client-side safety check.
    return parseAiIntent(data?.intent, clean);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
