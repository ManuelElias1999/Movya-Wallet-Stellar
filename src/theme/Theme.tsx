import { useEffect, useMemo, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import { createThemeStore, type ThemeStorage } from './preference';
import { themeColors, type ThemeColors } from './tokens';

export const themeStore = createThemeStore();

export function useTheme() {
  const mode = useSyncExternalStore(themeStore.subscribe, themeStore.get, () => 'dark' as const);
  return { mode, colors: themeColors[mode], setMode: themeStore.set };
}

export function useThemedStyles<T>(factory: (colors: ThemeColors) => T) {
  const theme = useTheme();
  const styles = useMemo(() => factory(theme.colors), [factory, theme.colors]);
  return { ...theme, styles };
}

export function ThemeProvider({ children, storage }: PropsWithChildren<{ storage: ThemeStorage }>) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    // A stuck device preference read must not leave the wallet on a blank screen.
    const fallback = setTimeout(() => { if (active) setReady(true); }, 1500);
    void themeStore.hydrate(storage).finally(() => { clearTimeout(fallback); if (active) setReady(true); });
    return () => { active = false; clearTimeout(fallback); };
  }, [storage]);
  return ready ? children : null;
}
