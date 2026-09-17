import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ActivityRow } from '@/components/ActivityRow';
import { BrandMark } from '@/components/BrandMark';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { demoActivity, demoAssets } from '@/data/demo';
import { useStellarAccount } from '@/hooks/useStellarAccount';
import { colors, radius } from '@/theme/tokens';

const quickActions = [
  { label: 'Send', icon: 'arrow-up' as const },
  { label: 'Receive', icon: 'arrow-down' as const },
  { label: 'Swap', icon: 'swap-horizontal' as const },
  { label: 'Add cash', icon: 'add' as const },
];

export default function HomeScreen() {
  const account = useStellarAccount();
  const assets = account.data?.balances.map((item) => ({
    code: item.assetCode,
    name: item.assetCode === 'XLM' ? 'Stellar' : item.assetCode,
    amount: Number(item.balance).toLocaleString(undefined, { maximumFractionDigits: 4 }),
    value: 'Testnet',
    color: item.assetCode === 'XLM' ? colors.ink : colors.brand,
  })) ?? demoAssets;

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <BrandMark size={34} />
          <Text style={styles.brandName}>movya</Text>
        </View>
        <Pressable style={styles.avatar}><Text style={styles.avatarText}>ME</Text></Pressable>
      </View>

      <LinearGradient colors={['#0D1A38', '#073F9B', '#0461F0']} style={styles.balanceCard}>
        <View style={styles.balanceTop}>
          <Text style={styles.balanceLabel}>Total balance</Text>
          <View style={styles.networkPill}>
            <View style={styles.networkDot} />
            <Text style={styles.networkText}>Stellar Testnet</Text>
          </View>
        </View>
        <Text style={styles.balance}>$1,516.84</Text>
        <Text style={styles.balanceHint}>
          {account.isDemo ? 'Preview data · connect a testnet account in .env' : account.loading ? 'Syncing with Horizon…' : account.error ?? 'Synced with Horizon'}
        </Text>
      </LinearGradient>

      <View style={styles.actions}>
        {quickActions.map((action) => (
          <Pressable key={action.label} style={styles.actionItem}>
            <View style={styles.actionIcon}>
              <Ionicons color={colors.brand} name={action.icon} size={21} />
            </View>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Assets" action="See all" />
        <View style={styles.card}>
          {assets.map((asset, index) => (
            <View key={`${asset.code}-${index}`} style={[styles.assetRow, index > 0 && styles.divider]}>
              <View style={[styles.assetIcon, { backgroundColor: asset.color }]}>
                <Text style={styles.assetCode}>{asset.code.slice(0, 1)}</Text>
              </View>
              <View style={styles.assetCopy}>
                <Text style={styles.assetName}>{asset.name}</Text>
                <Text style={styles.assetSymbol}>{asset.code}</Text>
              </View>
              <View style={styles.assetNumbers}>
                <Text style={styles.assetAmount}>{asset.amount}</Text>
                <Text style={styles.assetValue}>{asset.value}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Recent activity" action="See all" />
        <View style={styles.card}>
          {demoActivity.slice(0, 3).map((item) => <ActivityRow key={item.id} {...item} />)}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandName: { color: colors.ink, fontSize: 23, fontWeight: '800', letterSpacing: -0.8 },
  avatar: { width: 38, height: 38, borderRadius: 14, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.brand, fontWeight: '800', fontSize: 12 },
  balanceCard: { borderRadius: radius.lg, padding: 22, minHeight: 174, justifyContent: 'space-between' },
  balanceTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  balanceLabel: { color: 'rgba(255,255,255,0.72)', fontSize: 14, fontWeight: '600' },
  networkPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  networkDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#7AF0C7', marginRight: 6 },
  networkText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  balance: { color: '#FFFFFF', fontSize: 39, fontWeight: '800', letterSpacing: -1.5 },
  balanceHint: { color: 'rgba(255,255,255,0.65)', fontSize: 11 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  actionItem: { alignItems: 'center', width: '24%' },
  actionIcon: { width: 50, height: 50, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  actionLabel: { color: colors.text, fontSize: 12, fontWeight: '700', marginTop: 8 },
  section: { marginTop: 28, gap: 12 },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: 15, borderWidth: 1, borderColor: colors.border },
  assetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  assetIcon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  assetCode: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  assetCopy: { flex: 1, marginLeft: 12 },
  assetName: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  assetSymbol: { color: colors.muted, fontSize: 12, marginTop: 3 },
  assetNumbers: { alignItems: 'flex-end' },
  assetAmount: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  assetValue: { color: colors.muted, fontSize: 12, marginTop: 3 },
});
