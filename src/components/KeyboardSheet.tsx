import { Ionicons } from '@expo/vector-icons';
import type { PropsWithChildren } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/tokens';

export function KeyboardSheet({ visible, onClose, children }: PropsWithChildren<{ visible: boolean; onClose: () => void }>) {
  const insets = useSafeAreaInsets();
  const close = () => { Keyboard.dismiss(); onClose(); };
  return <Modal animationType="slide" transparent visible={visible} onRequestClose={close}>
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Pressable accessibilityLabel="Cerrar formulario" onPress={close} style={styles.backdrop} />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.toolbar}>
          <Pressable onPress={Keyboard.dismiss} style={styles.action}><Ionicons name="chevron-down" size={18} color={colors.brand} /><Text style={styles.label}>Ocultar teclado</Text></Pressable>
          <Pressable accessibilityLabel="Cerrar formulario" onPress={close} style={styles.action}><Ionicons name="close" size={22} color={colors.ink} /></Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" style={{ flexShrink: 1 }}>
          {children}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' }, backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(5,16,35,0.38)' },
  sheet: { maxHeight: '90%', backgroundColor: colors.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  action: { minHeight: 44, minWidth: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, label: { color: colors.brand, fontSize: 12, fontWeight: '700' },
});
