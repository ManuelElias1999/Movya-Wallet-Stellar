import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { ActivityIndicator, Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { Text } from '@/i18n/primitives';
import { PressableScale } from '@/components/PressableScale';
import { useThemedStyles } from '@/theme/Theme';
import type { ThemeColors } from '@/theme/tokens';

type Props = { name: string; loading: boolean; onProfile: () => void; onRefresh: () => void; topInset?: number };

export function DashboardHeader({ name, loading, onProfile, onRefresh, topInset = 0 }: Props) {
  const { colors, mode, styles } = useThemedStyles(createStyles);
  const glassColor = mode === 'dark' ? 'rgba(4,8,14,0.10)' : 'rgba(245,247,251,0.10)';
  const buttonGlass = mode === 'dark' ? 'rgba(34,44,59,0.24)' : 'rgba(255,255,255,0.24)';
  const buttonBorder = mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.62)';
  return <BlurView intensity={90} tint={mode} style={[styles.shell, { paddingTop: topInset, backgroundColor: glassColor }, Platform.OS === 'web' ? webGlass : null]}>
    <View style={styles.header}>
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.greeting}>Hola, <Text translate={false}>{name.split(/\s+/)[0]}</Text></Text>
        <Text numberOfLines={1} style={styles.tagline}>Un mensaje, una transacción</Text>
      </View>
      <View style={styles.actions}>
        <PressableScale accessibilityRole="button" accessibilityLabel="Actualizar portafolio" accessibilityState={{ disabled: loading }} disabled={loading} onPress={onRefresh} style={[styles.button, { backgroundColor: buttonGlass, borderColor: buttonBorder }]}>
          {loading ? <ActivityIndicator color={colors.ink} size="small" /> : <Ionicons name="refresh-outline" size={21} color={colors.ink} />}
        </PressableScale>
        <PressableScale accessibilityRole="button" accessibilityLabel="Abrir ajustes" onPress={onProfile} style={[styles.button, { backgroundColor: buttonGlass, borderColor: buttonBorder }]}>
          <Ionicons name="settings-outline" size={21} color={colors.ink} />
        </PressableScale>
      </View>
    </View>
  </BlurView>;
}

const webGlass: ViewStyle & { backdropFilter: string; WebkitBackdropFilter: string } = { backdropFilter: 'blur(28px) saturate(170%)', WebkitBackdropFilter: 'blur(28px) saturate(170%)' };

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  shell: { position: 'absolute', zIndex: 30, top: 0, left: 0, right: 0, overflow: 'hidden' },
  header: { width: '100%', maxWidth: 760, minHeight: 58, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 7, flexDirection: 'row', alignItems: 'center' },
  copy: { flex: 1, minWidth: 0, paddingRight: 12 },
  greeting: { color: colors.ink, fontSize: 19, lineHeight: 24, letterSpacing: -0.3, fontWeight: '800' },
  tagline: { color: colors.ink, fontSize: 11.5, lineHeight: 16, fontWeight: '700', marginTop: 1 },
  actions: { flexDirection: 'row', gap: 8 },
  button: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
