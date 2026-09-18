import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { ActivityRow } from '@/components/ActivityRow';
import { AssetDetail, AssetDetailSheet } from '@/components/AssetDetailSheet';
import { AnimatedAccountCard } from '@/components/AnimatedAccountCard';
import { AnimatedDashboardBackground } from '@/components/AnimatedDashboardBackground';
import { BottomNavigation } from '@/components/BottomNavigation';
import { MovyaChatSheet } from '@/components/MovyaChatSheet';
import { PoweredByStellarFooter } from '@/components/PoweredByStellarFooter';
import { PressableScale } from '@/components/PressableScale';
import { demoActivity, demoAssets } from '@/data/demo';
import { useStellarAccount } from '@/hooks/useStellarAccount';
import { colors } from '@/theme/tokens';

const quickActions = [
  { label: 'Enviar', icon: 'arrow-up' as const, route: '/send' as const, tint: '#E4F0FF', color: '#176BFF' },
  { label: 'Recibir', icon: 'arrow-down' as const, route: '/receive' as const, tint: '#E4F8F5', color: '#008B83' },
  { label: 'Swap', icon: 'swap-horizontal' as const, route: '/swap' as const, tint: '#E8EEFF', color: '#3158B8' },
  { label: 'Agregar', icon: 'add' as const, route: '/receive' as const, tint: '#E6F4FF', color: '#1677B8' },
];

export default function HomeScreen() {
  const router = useRouter();
  const [amountsVisible, setAmountsVisible] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetDetail | null>(null);
  const account = useStellarAccount();
  const assets = account.data?.balances.map((item) => ({
    code: item.assetCode,
    name: item.assetCode === 'XLM' ? 'Stellar' : item.assetCode === 'USDC' ? 'USD Coin' : item.assetCode,
    amount: Number(item.balance).toLocaleString(undefined, { maximumFractionDigits: 4 }),
    value: 'Cuenta Testnet',
    color: item.assetCode === 'XLM' ? colors.navy : colors.brand,
  })) ?? demoAssets;
  const privateValue = (value: string) => amountsVisible ? value : '••••••';

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <AnimatedDashboardBackground />

      <BlurView intensity={68} tint="light" style={[styles.header, Platform.OS === 'web' ? webGlass : null]}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}><Text style={styles.avatarText}>ME</Text></View>
          <View>
            <Text style={styles.hello}>Hola, Manuel</Text>
            <Text style={styles.welcome}>Bienvenido a tu wallet</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <PressableScale accessibilityLabel={amountsVisible ? 'Ocultar saldos' : 'Mostrar saldos'} onPress={() => setAmountsVisible((value) => !value)} pressedScale={0.9} style={styles.headerButton}>
            <Ionicons color={colors.navy} name={amountsVisible ? 'eye-outline' : 'eye-off-outline'} size={20} />
          </PressableScale>
          <PressableScale onPress={() => router.push('/settings')} pressedScale={0.9} style={styles.headerButton}>
            <Ionicons color={colors.navy} name="notifications-outline" size={20} />
            <View style={styles.notificationDot} />
          </PressableScale>
        </View>
      </BlurView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AnimatedAccountCard amountsVisible={amountsVisible} totalAmount="$1,629.24" />

        <View style={styles.actionsRow}>
          {quickActions.map((action) => (
            <PressableScale key={action.label} onPress={() => router.push(action.route)} style={styles.actionItem}>
              <View style={[styles.actionIcon, { backgroundColor: action.tint }]}><Ionicons color={action.color} name={action.icon} size={22} /></View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </PressableScale>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <View><Text style={styles.sectionTitle}>Portafolio</Text><Text style={styles.sectionSubtitle}>Tus activos en Stellar</Text></View>
          <Pressable onPress={() => router.push('/activity')}><Text style={styles.sectionAction}>Ver todo</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.portfolioRow} horizontal showsHorizontalScrollIndicator={false}>
          {assets.map((asset, index) => (
            <PressableScale key={`${asset.code}-${index}`} onPress={() => setSelectedAsset(asset)} style={styles.assetCard}>
              <View style={styles.assetTop}>
                <View style={[styles.assetIcon, { backgroundColor: asset.color }]}><Text style={styles.assetInitial}>{asset.code.slice(0, 1)}</Text></View>
                <View style={styles.assetIdentity}><Text style={styles.assetName}>{asset.name}</Text><Text style={styles.assetCode}>{asset.code}</Text></View>
                <Ionicons color="#9AA7B8" name="chevron-forward" size={16} />
              </View>
              <Text style={styles.assetAmount}>{privateValue(asset.amount)}</Text>
              <Text style={styles.assetValue}>{amountsVisible ? asset.value : '••••'}</Text>
            </PressableScale>
          ))}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <View><Text style={styles.sectionTitle}>Actividad reciente</Text><Text style={styles.sectionSubtitle}>Tus últimos movimientos</Text></View>
          <Pressable onPress={() => router.push('/activity')}><Text style={styles.sectionAction}>Ver todo</Text></Pressable>
        </View>
        <View style={styles.activityCard}>
          {demoActivity.map((item) => <ActivityRow hidden={!amountsVisible} key={item.id} {...item} />)}
        </View>

        {account.error ? <Text style={styles.syncError}>No pudimos sincronizar Testnet: {account.error}</Text> : null}
        <PoweredByStellarFooter />
      </ScrollView>

      <BottomNavigation active="home" onMovyaPress={() => setChatOpen(true)} />
      <MovyaChatSheet onClose={() => setChatOpen(false)} open={chatOpen} />
      <AssetDetailSheet asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
    </SafeAreaView>
  );
}

const webGlass = { backdropFilter: 'blur(24px) saturate(165%)', WebkitBackdropFilter: 'blur(24px) saturate(165%)' } as const;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#9DC9FF' },
  header: { width: '100%', minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 9, backgroundColor: 'rgba(245,250,255,0.25)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.55)' }, profileRow: { flexDirection: 'row', alignItems: 'center' }, avatar: { width: 43, height: 43, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 10, backgroundColor: 'rgba(255,255,255,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' }, avatarText: { color: colors.brandDark, fontSize: 12, fontWeight: '900' }, hello: { color: colors.navy, fontSize: 16, fontWeight: '900' }, welcome: { color: '#52708D', fontSize: 10, marginTop: 3 }, headerActions: { flexDirection: 'row', gap: 8 }, headerButton: { width: 39, height: 39, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.58)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.76)' }, notificationDot: { position: 'absolute', right: 8, top: 7, width: 7, height: 7, borderRadius: 4, backgroundColor: '#176BFF', borderWidth: 1.5, borderColor: '#FFFFFF' },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 126 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 23, paddingHorizontal: 2 }, actionItem: { width: '23%', alignItems: 'center' }, actionIcon: { width: 54, height: 54, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.78)', shadowColor: colors.navy, shadowOpacity: 0.11, shadowRadius: 11, shadowOffset: { width: 0, height: 6 }, elevation: 3 }, actionLabel: { color: colors.navy, fontSize: 10, fontWeight: '800', marginTop: 7 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 31, marginBottom: 12 }, sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '900', letterSpacing: -0.35 }, sectionSubtitle: { color: '#66809B', fontSize: 10, marginTop: 3 }, sectionAction: { color: colors.brand, fontSize: 11, fontWeight: '800' },
  portfolioRow: { gap: 12, paddingRight: 4, paddingBottom: 12 }, assetCard: { width: 184, minHeight: 142, padding: 14, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.96)', shadowColor: colors.navy, shadowOpacity: 0.13, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 4 }, assetTop: { flexDirection: 'row', alignItems: 'center' }, assetIcon: { width: 42, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, assetInitial: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' }, assetIdentity: { flex: 1, marginLeft: 9 }, assetName: { color: colors.ink, fontSize: 12, fontWeight: '800' }, assetCode: { color: colors.muted, fontSize: 9, marginTop: 3 }, assetAmount: { color: colors.ink, fontSize: 19, fontWeight: '900', letterSpacing: -0.4, marginTop: 16 }, assetValue: { color: '#657A93', fontSize: 10, marginTop: 4 },
  activityCard: { paddingHorizontal: 15, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.96)', shadowColor: colors.navy, shadowOpacity: 0.12, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 4 }, syncError: { color: colors.warning, fontSize: 10, lineHeight: 15, marginTop: 14 },
});
