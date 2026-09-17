import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActivityRow } from '@/components/ActivityRow';
import { InternalScreenBackground } from '@/components/InternalScreenBackground';
import { PageHeader } from '@/components/PageHeader';
import { PoweredByStellarFooter } from '@/components/PoweredByStellarFooter';
import { demoActivity } from '@/data/demo';
import { colors, radius } from '@/theme/tokens';

export default function ActivityScreen() {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <InternalScreenBackground />
      <PageHeader subtitle="Tus operaciones en un solo lugar" title="Movimientos" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusCard}>
          <View style={styles.statusIcon}><Ionicons name="checkmark" color={colors.positive} size={18} /></View>
          <View style={styles.statusCopy}>
            <Text style={styles.statusTitle}>Todo está al día</Text>
            <Text style={styles.statusText}>Tus movimientos aparecerán aquí automáticamente.</Text>
          </View>
        </View>
        <Text style={styles.month}>Septiembre</Text>
        <View style={styles.card}>
          {demoActivity.map((item) => <ActivityRow key={item.id} {...item} />)}
        </View>
        <PoweredByStellarFooter />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#E8F1FF' },
  content: { padding: 20, paddingBottom: 42 },
  statusCard: { flexDirection: 'row', backgroundColor: 'rgba(232,248,242,0.9)', borderRadius: radius.md, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.92)', shadowColor: colors.navy, shadowOpacity: 0.12, shadowRadius: 13, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  statusIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  statusCopy: { flex: 1, marginLeft: 12 },
  statusTitle: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  statusText: { color: colors.muted, fontSize: 12, marginTop: 3 },
  month: { color: colors.ink, fontSize: 17, fontWeight: '700', marginTop: 28, marginBottom: 12 },
  card: { backgroundColor: 'rgba(255,255,255,0.88)', borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.94)', paddingHorizontal: 15, shadowColor: colors.navy, shadowOpacity: 0.13, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
});
