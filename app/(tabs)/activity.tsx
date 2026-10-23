import { Text } from '@/i18n/primitives';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActivityRow } from '@/components/ActivityRow';
import { InternalScreenBackground } from '@/components/InternalScreenBackground';
import { PageHeader } from '@/components/PageHeader';
import { PressableScale } from '@/components/PressableScale';
import { demoActivity } from '@/data/demo';
import { TestnetPaymentHistory } from '@/components/TestnetPaymentHistory';
import { useTestnetWallet } from '@/context/TestnetWalletContext';
import { colors, radius } from '@/theme/tokens';
import type { ActivityPeriod } from '@/services/stellar/activity';

const periods: { key: ActivityPeriod; label: string }[] = [
  { key: 'today', label: 'Hoy' },
  { key: '7d', label: '7 días' },
  { key: '30d', label: '30 días' },
  { key: 'all', label: 'Todo' },
];

export default function ActivityScreen() {
  const wallet = useTestnetWallet();
  const [period, setPeriod] = useState<ActivityPeriod>('all');
  const demoRows = period === 'today' ? demoActivity.slice(0, 1) : demoActivity;
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <InternalScreenBackground />
      <PageHeader backTo="/(tabs)" subtitle="Tus operaciones en un solo lugar" title="Movimientos" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusCard}>
          <View style={styles.statusIcon}><Ionicons name="checkmark" color={colors.positive} size={18} /></View>
          <View style={styles.statusCopy}>
            <Text style={styles.statusTitle}>Todo está al día</Text>
            <Text style={styles.statusText}>Tus movimientos aparecerán aquí automáticamente.</Text>
          </View>
        </View>
        <View style={styles.historyHeader}>
          <Text style={styles.month}>{wallet.publicKey ? 'Stellar Testnet' : 'Actividad · Demo'}</Text>
          <View accessibilityRole="radiogroup" style={styles.filters}>
            {periods.map((item) => <PressableScale accessibilityRole="radio" accessibilityState={{ checked: period === item.key }} key={item.key} onPress={() => setPeriod(item.key)} style={[styles.filter, period === item.key && styles.filterActive]}>
              <Text style={[styles.filterText, period === item.key && styles.filterTextActive]}>{item.label}</Text>
            </PressableScale>)}
          </View>
        </View>
        <View style={styles.card}>
          {wallet.publicKey ? <TestnetPaymentHistory period={period} /> : demoRows.map((item) => <ActivityRow key={item.id} {...item} />)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#D8E1EB' },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, paddingBottom: 125 },
  statusCard: { flexDirection: 'row', backgroundColor: 'rgba(232,248,242,0.9)', borderRadius: radius.md, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.92)', shadowColor: colors.navy, shadowOpacity: 0.12, shadowRadius: 13, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  statusIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  statusCopy: { flex: 1, marginLeft: 12 },
  statusTitle: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  statusText: { color: colors.muted, fontSize: 12, marginTop: 3 },
  historyHeader: { marginTop: 28, marginBottom: 12, gap: 12 },
  month: { color: colors.ink, fontSize: 17, fontWeight: '700' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filter: { minHeight: 36, paddingHorizontal: 13, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.94)' },
  filterActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  filterText: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  filterTextActive: { color: '#FFFFFF' },
  card: { backgroundColor: 'rgba(255,255,255,0.88)', borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.94)', paddingHorizontal: 15, shadowColor: colors.navy, shadowOpacity: 0.13, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
});
