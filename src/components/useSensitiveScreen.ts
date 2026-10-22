import { useFocusEffect } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

// Blocks screenshots/recording (and the iOS app-switcher preview) while a
// screen that shows or receives recovery words is focused, and calls `hide`
// whenever the app leaves the foreground.
export function useSensitiveScreen(name: string, hide: () => void, options: { preserveOnBackground?: boolean } = {}) {
  const preserveOnBackground = options.preserveOnBackground === true;
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
    // Screen-capture and app-switcher protection stays enabled. Some setup
    // flows (TOTP) must survive a trip to another app so the person can copy
    // the generated code back; other sensitive screens still clear on a real
    // background transition. `inactive` is ignored because iOS uses it for
    // system biometric sheets as well.
    const subscription = AppState.addEventListener('change', state => { if (state === 'background' && !preserveOnBackground) hide(); });
    return () => subscription.remove();
  }, [hide, preserveOnBackground]);
  return { ready, failed };
}
