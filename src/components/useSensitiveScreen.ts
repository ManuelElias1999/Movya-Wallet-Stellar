import { useFocusEffect } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

// Blocks screenshots/recording (and the iOS app-switcher preview) while a
// screen that shows or receives recovery words is focused, and calls `hide`
// whenever the app leaves the foreground.
export function useSensitiveScreen(name: string, hide: () => void) {
  const [ready, setReady] = useState(Platform.OS === 'web');
  const [failed, setFailed] = useState(false);
  useFocusEffect(useCallback(() => {
    let active = true; const key = `movya-${name}-${Date.now()}`;
    setFailed(false);
    if (Platform.OS === 'web') { setReady(true); return () => { active = false; setReady(false); hide(); }; }
    setReady(false);
    const protection = (async () => {
      await ScreenCapture.preventScreenCaptureAsync(key);
      if (Platform.OS === 'ios') await ScreenCapture.enableAppSwitcherProtectionAsync();
      if (active) setReady(true);
    })().catch(() => { if (active) setFailed(true); });
    return () => {
      active = false; setReady(false); hide();
      void protection.then(async () => {
        await ScreenCapture.allowScreenCaptureAsync(key).catch(() => undefined);
        if (Platform.OS === 'ios') await ScreenCapture.disableAppSwitcherProtectionAsync().catch(() => undefined);
      });
    };
  }, [name, hide]));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => { if (state !== 'active') hide(); });
    return () => subscription.remove();
  }, [hide]);
  return { ready, failed };
}
