import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text } from '@/i18n/primitives';
import { PressableScale } from '@/components/PressableScale';
import { useThemedStyles } from '@/theme/Theme';
import type { ThemeColors } from '@/theme/tokens';

type Props = { name: string; loading: boolean; onProfile: () => void; onRefresh: () => void };

export function DashboardHeader({ name, loading, onProfile, onRefresh }: Props) {
  const { colors, styles } = useThemedStyles(createStyles);
  return <View style={styles.header}>
    <View style={styles.copy}>
      <Text numberOfLines={1} style={styles.greeting}>Hola, <Text translate={false}>{name.split(/\s+/)[0]}</Text></Text>
      <Text numberOfLines={1} style={styles.tagline}>Un mensaje, una transacción</Text>
    </View>
    <View style={styles.actions}>
      <PressableScale accessibilityRole="button" accessibilityLabel="Actualizar portafolio" accessibilityState={{ disabled: loading }} disabled={loading} onPress={onRefresh} style={styles.button}>
        {loading ? <ActivityIndicator color={colors.ink} size="small" /> : <Ionicons name="refresh-outline" size={21} color={colors.ink} />}
      </PressableScale>
      <PressableScale accessibilityRole="button" accessibilityLabel="Abrir ajustes" onPress={onProfile} style={styles.button}>
        <Ionicons name="settings-outline" size={21} color={colors.ink} />
      </PressableScale>
    </View>
  </View>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  header: { width: '100%', maxWidth: 760, minHeight: 58, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 7, backgroundColor: colors.background, flexDirection: 'row', alignItems: 'center' },
  copy: { flex: 1, minWidth: 0, paddingRight: 12 },
  greeting: { color: colors.ink, fontSize: 19, lineHeight: 24, letterSpacing: -0.3, fontWeight: '800' },
  tagline: { color: colors.muted, fontSize: 11, lineHeight: 15, marginTop: 1 },
  actions: { flexDirection: 'row', gap: 8 },
  button: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
});
