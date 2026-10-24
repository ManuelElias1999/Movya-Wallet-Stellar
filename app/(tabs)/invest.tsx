import type { ThemeColors } from '@/theme/tokens';
import { useThemedStyles } from '@/theme/Theme';
import { Text } from '@/i18n/primitives';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InternalScreenBackground } from '@/components/InternalScreenBackground';
import { PageHeader } from '@/components/PageHeader';

export default function InvestScreen() {
  const { colors, styles } = useThemedStyles(createStyles);
  return <SafeAreaView edges={['top']} style={styles.safeArea}>
    <InternalScreenBackground />
    <PageHeader backTo="/(tabs)" subtitle="Próximamente" title="Invest" />
    <View style={styles.content}>
      <View style={styles.card}>
        <View style={styles.icon}><Ionicons name="trending-up" size={31} color={colors.brand} /></View>
        <Text style={styles.title}>Inversiones</Text>
        <Text style={styles.copy}>Estamos preparando nuevas formas de hacer crecer y organizar tus activos desde Movya.</Text>
        <View style={styles.badge}><Text style={styles.badgeText}>Próximamente</Text></View>
      </View>
    </View>
  </SafeAreaView>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 44, paddingBottom: 132 },
  card: { alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 28, paddingHorizontal: 24, paddingVertical: 32, shadowColor: colors.navy, shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  icon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brandSoft, borderWidth: 1, borderColor: colors.brandIce },
  title: { color: colors.ink, fontSize: 22, fontWeight: '900', marginTop: 18 },
  copy: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 360, marginTop: 8 },
  badge: { marginTop: 20, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border },
  badgeText: { color: colors.brand, fontSize: 11, fontWeight: '800' },
});
