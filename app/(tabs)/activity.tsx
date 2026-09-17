import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { ActivityRow } from '@/components/ActivityRow';
import { Screen } from '@/components/Screen';
import { demoActivity } from '@/data/demo';
import { colors, radius } from '@/theme/tokens';

export default function ActivityScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>YOUR MONEY</Text>
          <Text style={styles.title}>Activity</Text>
        </View>
        <View style={styles.filter}><Ionicons name="options-outline" size={20} color={colors.ink} /></View>
      </View>
      <View style={styles.statusCard}>
        <View style={styles.statusIcon}><Ionicons name="checkmark" color={colors.positive} size={18} /></View>
        <View style={styles.statusCopy}>
          <Text style={styles.statusTitle}>Everything is up to date</Text>
          <Text style={styles.statusText}>Your Stellar activity will appear here automatically.</Text>
        </View>
      </View>
      <Text style={styles.month}>September</Text>
      <View style={styles.card}>
        {demoActivity.map((item) => <ActivityRow key={item.id} {...item} />)}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  eyebrow: { color: colors.brand, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: colors.ink, fontSize: 32, fontWeight: '800', letterSpacing: -1, marginTop: 3 },
  filter: { width: 42, height: 42, borderRadius: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  statusCard: { flexDirection: 'row', backgroundColor: colors.positiveSoft, borderRadius: radius.md, padding: 16, alignItems: 'center' },
  statusIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  statusCopy: { flex: 1, marginLeft: 12 },
  statusTitle: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  statusText: { color: colors.muted, fontSize: 12, marginTop: 3 },
  month: { color: colors.ink, fontSize: 17, fontWeight: '700', marginTop: 28, marginBottom: 12 },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 15 },
});
