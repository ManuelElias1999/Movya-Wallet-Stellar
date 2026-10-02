import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Keyboard, Pressable, Text } from 'react-native';
import { colors } from '@/theme/tokens';

export function KeyboardDismissButton() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  if (!visible) return null;
  return <Pressable onPress={Keyboard.dismiss} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, paddingHorizontal: 20 }}>
    <Ionicons name="chevron-down" size={18} color={colors.brand} /><Text style={{ color: colors.brand, fontSize: 12, fontWeight: '700' }}>Ocultar teclado</Text>
  </Pressable>;
}
