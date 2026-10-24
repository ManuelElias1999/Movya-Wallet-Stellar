import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text } from '@/i18n/primitives';
import { PressableScale } from '@/components/PressableScale';
import { ThemeToggle } from '@/components/ThemeSelector';
import { useThemedStyles } from '@/theme/Theme';
import type { ThemeColors } from '@/theme/tokens';

type Props = { name: string; loading: boolean; onProfile: () => void; onRefresh: () => void };

export function DashboardHeader({ name, loading, onProfile, onRefresh }: Props) {
  const { colors, styles } = useThemedStyles(createStyles);
  return <View style={styles.header}>
    <View style={styles.toolbar}>
      <PressableScale accessibilityRole="button" accessibilityLabel="Abrir ajustes y mi cuenta" onPress={onProfile} style={styles.button}>
        <Ionicons name="ellipsis-horizontal" size={23} color={colors.ink} />
      </PressableScale>
      <View style={styles.actions}>
        <ThemeToggle />
        <PressableScale accessibilityRole="button" accessibilityLabel="Actualizar portafolio" accessibilityState={{ disabled: loading }} disabled={loading} onPress={onRefresh} style={styles.button}>
          {loading ? <ActivityIndicator color={colors.ink} size="small" /> : <Ionicons name="refresh-outline" size={21} color={colors.ink} />}
        </PressableScale>
      </View>
    </View>
    <Text style={styles.title}>Inicio</Text>
    <Text numberOfLines={1} style={styles.greeting}>Hola, <Text translate={false}>{name.split(/\s+/)[0]}</Text></Text>
  </View>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  header: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 18, backgroundColor: colors.background },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 },
  actions: { flexDirection: 'row', gap: 10 }, button: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.ink, fontSize: 32, lineHeight: 39, letterSpacing: -0.7, fontWeight: '800' },
  greeting: { color: colors.muted, fontSize: 13, marginTop: 3 },
});
