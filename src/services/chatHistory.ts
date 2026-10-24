export type ChatTextHistoryMessage = { id: number; role: 'movya' | 'user'; kind: 'text'; text: string };
export type ChatVoiceHistoryMessage = { id: number; role: 'user'; kind: 'voice'; duration: number };
export type ChatReceiptHistoryMessage = {
  id: number; role: 'movya'; kind: 'receipt'; title: 'Cambio realizado' | 'Enviado'; summary: string; receiptHash: string;
  details: { label: string; value: string }[]; explorerUrl?: string;
};
export type ChatHistoryMessage = ChatTextHistoryMessage | ChatVoiceHistoryMessage | ChatReceiptHistoryMessage;

type Storage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void>; removeItem(key: string): Promise<void> };
const key = (owner: string) => `movya.chat.v1.${owner.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
const short = (value: unknown, maximum: number) => typeof value === 'string' && value.length <= maximum ? value : null;

export function validChatHistory(value: unknown): ChatHistoryMessage[] {
  if (!Array.isArray(value)) return [];
  return value.slice(-120).flatMap<ChatHistoryMessage>(item => {
    if (!item || typeof item !== 'object') return [];
    const candidate = item as Record<string, unknown>;
    if (!Number.isSafeInteger(candidate.id) || candidate.id as number < 0) return [];
    if (candidate.kind === 'text' && (candidate.role === 'movya' || candidate.role === 'user')) {
      const text = short(candidate.text, 1_000);
      return text ? [{ id: candidate.id as number, role: candidate.role, kind: 'text' as const, text }] : [];
    }
    if (candidate.kind === 'voice' && candidate.role === 'user' && Number.isInteger(candidate.duration) && Number(candidate.duration) > 0 && Number(candidate.duration) <= 3_600) {
      return [{ id: candidate.id as number, role: 'user' as const, kind: 'voice' as const, duration: Number(candidate.duration) }];
    }
    if (candidate.kind === 'receipt' && candidate.role === 'movya' && (candidate.title === 'Cambio realizado' || candidate.title === 'Enviado')) {
      const summary = short(candidate.summary, 300);
      const receiptHash = short(candidate.receiptHash, 128);
      const details = Array.isArray(candidate.details) ? candidate.details.slice(0, 16).flatMap<{ label: string; value: string }>(detail => {
        if (!detail || typeof detail !== 'object') return [];
        const row = detail as Record<string, unknown>;
        const label = short(row.label, 100), content = short(row.value, 500);
        return label && content ? [{ label, value: content }] : [];
      }) : [];
      const explorerUrl = candidate.explorerUrl === undefined ? undefined : short(candidate.explorerUrl, 500) ?? undefined;
      return summary && receiptHash ? [{ id: candidate.id as number, role: 'movya' as const, kind: 'receipt' as const, title: candidate.title, summary, receiptHash, details, ...(explorerUrl ? { explorerUrl } : {}) }] : [];
    }
    return [];
  });
}

export function createChatHistoryStore(storage: Storage) {
  return {
    async read(owner: string) {
      try { const raw = await storage.getItem(key(owner)); return raw ? validChatHistory(JSON.parse(raw)) : []; }
      catch { return []; }
    },
    async write(owner: string, messages: ChatHistoryMessage[]) {
      await storage.setItem(key(owner), JSON.stringify(validChatHistory(messages)));
    },
    async clear(owner: string) { await storage.removeItem(key(owner)); },
  };
}

// Load the native storage adapter only when persistence is used. Keeping the
// validator independent also lets security tests run without a native runtime.
const chatHistory = createChatHistoryStore({
  getItem: async key => (await import('@/services/backend/storage')).sessionStorage.getItem(key),
  setItem: async (key, value) => (await import('@/services/backend/storage')).sessionStorage.setItem(key, value),
  removeItem: async key => (await import('@/services/backend/storage')).sessionStorage.removeItem(key),
});
export const readChatHistory = (owner: string) => chatHistory.read(owner);
export const writeChatHistory = (owner: string, messages: ChatHistoryMessage[]) => chatHistory.write(owner, messages);
export const clearChatHistory = (owner: string) => chatHistory.clear(owner);
