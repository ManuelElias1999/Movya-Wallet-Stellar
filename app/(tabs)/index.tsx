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
  { label: 'Enviar', icon: 'arrow-up-outline' as const, route: '/send' as const },
  { label: 'Recibir', icon: 'arrow-down-outline' as const, route: '/receive' as const },
  { label: 'Swap', icon: 'swap-horizontal-outline' as const, route: '/swap' as const },
  { label: 'Agregar', icon: 'add-outline' as const, route: '/receive' as const },
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
      <StatusBar style="light" />
      <AnimatedDashboardBackground />

      <BlurView intensity={54} tint="dark" style={[styles.header, Platform.OS === 'web' ? webGlass : null]}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}><Text style={styles.avatarText}>ME</Text></View>
          <View>
            <Text style={styles.hello}>Hola, Manuel</Text>
            <Text style={styles.welcome}>Bienvenido a tu wallet</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <PressableScale accessibilityLabel="Abrir notificaciones" onPress={() => router.push('/settings')} pressedScale={0.9} style={styles.headerButton}>
            <Ionicons color="#FFFFFF" name="notifications-outline" size={20} />
            <View style={styles.notificationDot} />
          </PressableScale>
        </View>
      </BlurView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AnimatedAccountCard amountsVisible={amountsVisible} onToggleAmounts={() => setAmountsVisible((value) => !value)} totalAmount="$1,629.24" />

        <View style={styles.actionsRow}>
          {quickActions.map((action) => (
            <PressableScale key={action.label} onPress={() => router.push(action.route)} style={styles.actionItem}>
              <View style={styles.actionIcon}><Ionicons color="#FFFFFF" name={action.icon} size={23} /></View>
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
  safeArea: { flex: 1, backgroundColor: '#EAF2F7' },
  header: { width: '100%', minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 7, backgroundColor: 'rgba(2,21,68,0.24)', borderBottomLeftRadius: 18, borderBottomRightRadius: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.22)', shadowColor: '#00123F', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 5, overflow: 'hidden' }, profileRow: { flexDirection: 'row', alignItems: 'center' }, avatar: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)' }, avatarText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' }, hello: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' }, welcome: { color: 'rgba(233,244,255,0.7)', fontSize: 10, marginTop: 3 }, headerActions: { flexDirection: 'row' }, headerButton: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.09)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' }, notificationDot: { position: 'absolute', right: 7, top: 6, width: 7, height: 7, borderRadius: 4, backgroundColor: '#66D5E7', borderWidth: 1.5, borderColor: '#FFFFFF' },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 136 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 23, paddingHorizontal: 2 }, actionItem: { width: '23%', alignItems: 'center' }, actionIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(5,37,89,0.82)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', shadowColor: '#00123F', shadowOpacity: 0.2, shadowRadius: 11, shadowOffset: { width: 0, height: 6 }, elevation: 4 }, actionLabel: { color: '#F8FBFF', fontSize: 10, fontWeight: '800', marginTop: 7 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 31, marginBottom: 12 }, sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '900', letterSpacing: -0.35 }, sectionSubtitle: { color: '#66809B', fontSize: 10, marginTop: 3 }, sectionAction: { color: colors.brand, fontSize: 11, fontWeight: '800' },
  portfolioRow: { gap: 12, paddingRight: 4, paddingBottom: 12 }, assetCard: { width: 184, minHeight: 142, padding: 14, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.96)', shadowColor: colors.navy, shadowOpacity: 0.13, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 4 }, assetTop: { flexDirection: 'row', alignItems: 'center' }, assetIcon: { width: 42, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, assetInitial: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' }, assetIdentity: { flex: 1, marginLeft: 9 }, assetName: { color: colors.ink, fontSize: 12, fontWeight: '800' }, assetCode: { color: colors.muted, fontSize: 9, marginTop: 3 }, assetAmount: { color: colors.ink, fontSize: 19, fontWeight: '900', letterSpacing: -0.4, marginTop: 16 }, assetValue: { color: '#657A93', fontSize: 10, marginTop: 4 },
  activityCard: { paddingHorizontal: 15, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.96)', shadowColor: colors.navy, shadowOpacity: 0.12, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 4 }, syncError: { color: colors.warning, fontSize: 10, lineHeight: 15, marginTop: 14 },
});
