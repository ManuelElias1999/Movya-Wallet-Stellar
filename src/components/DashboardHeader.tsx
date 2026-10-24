import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text } from '@/i18n/primitives';
import { PressableScale } from '@/components/PressableScale';
import { useThemedStyles } from '@/theme/Theme';
import type { ThemeColors } from '@/theme/tokens';

type Props = { name: string; loading: boolean; onProfile: () => void; onRefresh: () => void; topInset?: number };

export function DashboardHeader({ name, loading, onProfile, onRefresh, topInset = 0 }: Props) {
  const { colors, mode, styles } = useThemedStyles(createStyles);
  const buttonGlass = mode === 'dark' ? 'rgba(35,35,38,0.28)' : 'rgba(255,255,255,0.28)';
  const buttonBorder = mode === 'dark' ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.72)';
  return <BlurView intensity={22} tint={mode} style={[styles.shell, { paddingTop: topInset }]}>
    <View style={styles.header}>
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.greeting}>Hola, <Text translate={false}>{name.split(/\s+/)[0]}</Text></Text>
        <Text numberOfLines={1} style={styles.tagline}>Un mensaje, una transacción</Text>
      </View>
      <View style={styles.actions}>
        <PressableScale accessibilityRole="button" accessibilityLabel="Actualizar portafolio" accessibilityState={{ disabled: loading }} disabled={loading} onPress={onRefresh} style={[styles.button, { borderColor: buttonBorder }]}>
          <BlurView pointerEvents="none" intensity={62} tint={mode} style={[StyleSheet.absoluteFill, styles.buttonGlass, { backgroundColor: buttonGlass }]} />
          {loading ? <ActivityIndicator color={colors.ink} size="small" /> : <Ionicons name="refresh-outline" size={20} color={colors.ink} />}
        </PressableScale>
        <PressableScale accessibilityRole="button" accessibilityLabel="Abrir ajustes" onPress={onProfile} style={[styles.button, { borderColor: buttonBorder }]}>
          <BlurView pointerEvents="none" intensity={62} tint={mode} style={[StyleSheet.absoluteFill, styles.buttonGlass, { backgroundColor: buttonGlass }]} />
          <Ionicons name="settings-outline" size={20} color={colors.ink} />
        </PressableScale>
      </View>
    </View>
  </BlurView>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  shell: { position: 'absolute', zIndex: 30, top: 0, left: 0, right: 0, overflow: 'hidden', backgroundColor: 'transparent' },
  header: { width: '100%', maxWidth: 760, minHeight: 52, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 3, paddingBottom: 5, flexDirection: 'row', alignItems: 'center' },
  copy: { flex: 1, minWidth: 0, paddingRight: 12 },
  greeting: { color: colors.ink, fontSize: 18, lineHeight: 22, letterSpacing: -0.3, fontWeight: '800' },
  tagline: { color: colors.ink, fontSize: 10.5, lineHeight: 14, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8 },
  button: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  buttonGlass: { borderRadius: 19 },
});
