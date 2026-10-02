import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { AppState, Pressable } from 'react-native';
import { colors } from '@/theme/tokens';

export function usePasswordVisibility(password: string, busy: boolean) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { if (!password || busy) setVisible(false); }, [password, busy]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => { if (state !== 'active') setVisible(false); });
    const onVisibilityChange = () => { if (document.visibilityState !== 'visible') setVisible(false); };
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      subscription.remove();
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);
  return { visible, toggle: () => setVisible(value => !value) };
}

export function PasswordVisibilityButton({ visible, onPress, disabled }: { visible: boolean; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} accessibilityState={{ disabled: Boolean(disabled) }} disabled={disabled} onPress={onPress} style={{ width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
    <Ionicons color={visible ? colors.brand : colors.muted} name={visible ? 'eye-off-outline' : 'eye-outline'} size={21} />
  </Pressable>;
}
