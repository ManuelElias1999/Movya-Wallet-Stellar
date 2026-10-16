import english from './en.json';
export type Language = 'es' | 'en';
export const localeFor = (language: Language) => language === 'en' ? 'en-US' : 'es-BO';
export const isLanguage = (value: unknown): value is Language => value === 'es' || value === 'en';
const dictionary: Record<string, string> = english;
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const templates = Object.entries(dictionary).filter(([key]) => /\{\d+\}/.test(key)).map(([key, value]) => ({
  pattern: new RegExp('^' + key.split(/\{\d+\}/).map(escape).join('([\\s\\S]+?)') + '$'), value,
}));

// Only UI copy passes through this function. User content (names, chat input,
// recovery material, addresses and amounts) is rendered verbatim.
export function translateText(text: string, language: Language): string {
  if (language === 'es') return text;
  if (dictionary[text] !== undefined) return dictionary[text];
  const trimmed = text.trim();
  if (trimmed && dictionary[trimmed] !== undefined) return text.replace(trimmed, () => dictionary[trimmed]);
  for (const template of templates) {
    const match = template.pattern.exec(text);
    if (match) return template.value.replace(/\{(\d+)\}/g, (_, index) => match[Number(index) + 1]);
  }
  return text;
}

export function createLanguageStore(storage: { read(): Promise<unknown>; write(value: Language): Promise<void> }) {
  let language: Language = 'es';
  let revision = 0;
  let writes = Promise.resolve();
  const listeners = new Set<() => void>();
  const publish = (next: Language) => { language = next; listeners.forEach(listener => listener()); };
  return {
    get: () => language,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    async hydrate() {
      const current = revision;
      try { const saved = await storage.read(); if (revision === current && isLanguage(saved)) publish(saved); } catch { /* Spanish remains available if storage is unavailable. */ }
    },
    set(next: Language) {
      if (!isLanguage(next)) return;
      revision++;
      publish(next);
      writes = writes.catch(() => undefined).then(() => storage.write(next));
      // A storage failure must not make the UI unusable or reject unhandled.
      void writes.catch(() => undefined);
    },
    settled: () => writes,
  };
}
