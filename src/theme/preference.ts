import type { ThemeMode } from './tokens';

export type ThemeStorage = { read: () => Promise<string | null>; write: (mode: ThemeMode) => Promise<void> };

export function createThemeStore() {
  let mode: ThemeMode = 'dark';
  let revision = 0;
  let storage: ThemeStorage | undefined;
  let writes = Promise.resolve();
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach(listener => listener());
  return {
    get: () => mode,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    hydrate: async (adapter: ThemeStorage) => {
      storage = adapter;
      const start = revision;
      try {
        const saved = await adapter.read();
        if (start === revision && (saved === 'light' || saved === 'dark') && saved !== mode) { mode = saved; emit(); }
      } catch { /* Storage failure must never prevent opening the wallet. */ }
    },
    set: (next: ThemeMode) => {
      if (next !== 'light' && next !== 'dark') return;
      revision++;
      if (next !== mode) { mode = next; emit(); }
      const adapter = storage;
      if (adapter) writes = writes.catch(() => undefined).then(() => adapter.write(next)).catch(() => undefined);
    },
    flush: () => writes,
  };
}
