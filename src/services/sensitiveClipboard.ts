type Clipboard = { setStringAsync: (value: string) => Promise<boolean>; getStringAsync: () => Promise<string> };

// Only clear text copied by this operation; never overwrite a newer clipboard.
// Cleanup is best effort because an OS may suspend the app in the background.
export function createSensitiveClipboard(clipboard: Clipboard, lifetime = 60_000) {
  let generation = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const clearIfCurrent = async (value: string, current: number) => {
    try {
      if (await clipboard.getStringAsync() === value && generation === current) await clipboard.setStringAsync('');
    } catch { /* Clipboard permissions can be revoked. */ }
  };
  return async (value: string, stillCurrent: () => boolean) => {
    if (!stillCurrent()) throw new Error('Vuelve a mostrar tu respaldo antes de copiarlo.');
    const current = ++generation;
    if (timer) clearTimeout(timer);
    if (!await clipboard.setStringAsync(value)) throw new Error('No pudimos copiar el respaldo. Vuelve a intentarlo.');
    if (!stillCurrent()) {
      await clearIfCurrent(value, current);
      throw new Error('El respaldo se ocultó. Vuelve a mostrarlo antes de copiarlo.');
    }
    timer = setTimeout(() => { void clearIfCurrent(value, current); }, lifetime);
  };
}
