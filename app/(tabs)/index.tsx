import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AssetDetail, AssetDetailSheet } from '@/components/AssetDetailSheet';
import { AnimatedAccountCard } from '@/components/AnimatedAccountCard';
import { AnimatedDashboardBackground } from '@/components/AnimatedDashboardBackground';
import { AnimatedMovyaLogo } from '@/components/AnimatedMovyaLogo';
import { MovyaChatSheet } from '@/components/MovyaChatSheet';
import { PressableScale } from '@/components/PressableScale';
import { SectionHeader } from '@/components/SectionHeader';
import { StellarNetworkBadge } from '@/components/StellarNetworkBadge';
import { demoAssets } from '@/data/demo';
import { useStellarAccount } from '@/hooks/useStellarAccount';
import { colors, radius } from '@/theme/tokens';

export default function HomeScreen() {
  const router = useRouter();
  const [amountsVisible, setAmountsVisible] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetDetail | null>(null);
  const [showAllAssets, setShowAllAssets] = useState(false);
  const account = useStellarAccount();
  const assets = account.data?.balances.map((item) => ({
    code: item.assetCode,
    name: item.assetCode === 'XLM' ? 'Stellar' : item.assetCode === 'USDC' ? 'Dólares digitales' : item.assetCode,
    amount: Number(item.balance).toLocaleString(undefined, { maximumFractionDigits: 4 }),
    value: 'Cuenta Testnet',
    color: item.assetCode === 'XLM' ? colors.navy : colors.brand,
  })) ?? demoAssets;
  const visibleAssets = showAllAssets ? assets : assets.slice(0, 3);
  const privateValue = (value: string) => amountsVisible ? value : '••••••';

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <StatusBar style="dark" />
      <AnimatedDashboardBackground />
      <View style={styles.headerShell}>
        <View style={styles.headerBlueGlow} /><View style={styles.headerCyanGlow} />
        <BlurView intensity={78} tint="light" style={styles.fixedHeader}>
          <View>
            <Text style={styles.greeting}>Hola, Manuel!</Text>
            <Text style={styles.subtitle}>Qué gusto verte de nuevo.</Text>
            <View style={styles.headerNetwork}><StellarNetworkBadge /></View>
          </View>
          <PressableScale onPress={() => router.push('/settings')} pressedScale={0.9} style={styles.settingsButton}><Ionicons name="settings-outline" size={22} color={colors.ink} /></PressableScale>
        </BlurView>
      </View>

      <View style={styles.body}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AnimatedAccountCard amountsVisible={amountsVisible} />

        <View style={styles.totalCard}>
          <View>
            <Text style={styles.totalLabel}>Balance total en USD</Text>
            <Text style={styles.totalAmount}>{privateValue('$1,629.24')}</Text>
            <Text style={styles.totalCaption}>Entre todas tus cuentas</Text>
          </View>
          <Pressable accessibilityLabel={amountsVisible ? 'Ocultar montos' : 'Mostrar montos'} onPress={() => setAmountsVisible((visible) => !visible)} style={styles.eyeButton}>
            <Ionicons color={colors.brand} name={amountsVisible ? 'eye-outline' : 'eye-off-outline'} size={22} />
          </Pressable>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Accesos rápidos" />
          <ScrollView contentContainerStyle={styles.quickRow} horizontal showsHorizontalScrollIndicator={false}>
            <PressableScale onPress={() => router.push('/send')} style={styles.quickItem}><View style={[styles.quickIcon, styles.blue]}><Ionicons name="paper-plane-outline" size={21} color="#176BFF" /></View><Text style={styles.quickLabel}>Enviar</Text></PressableScale>
            <PressableScale onPress={() => router.push('/receive')} style={styles.quickItem}><View style={[styles.quickIcon, styles.teal]}><Ionicons name="qr-code-outline" size={21} color="#008B83" /></View><Text style={styles.quickLabel}>Recibir</Text></PressableScale>
            <PressableScale onPress={() => router.push('/swap')} style={styles.quickItem}><View style={[styles.quickIcon, styles.violet]}><Ionicons name="repeat-outline" size={21} color="#7655D9" /></View><Text style={styles.quickLabel}>Cambiar</Text></PressableScale>
            <PressableScale onPress={() => router.push('/contacts')} style={styles.quickItem}><View style={[styles.quickIcon, styles.amber]}><Ionicons name="people-outline" size={21} color="#B66A00" /></View><Text style={styles.quickLabel}>Contactos</Text></PressableScale>
            <PressableScale onPress={() => router.push('/activity')} style={styles.quickItem}><View style={[styles.quickIcon, styles.rose]}><Ionicons name="time-outline" size={21} color="#B94F72" /></View><Text style={styles.quickLabel}>Historial</Text></PressableScale>
          </ScrollView>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Mis cuentas" action="Ver todas" />
          <View style={styles.card}>
            {visibleAssets.map((asset, index) => (
              <PressableScale key={`${asset.code}-${index}`} onPress={() => setSelectedAsset(asset)} style={styles.assetRow}>
                <View style={[styles.assetIcon, { backgroundColor: asset.color }]}><Text style={styles.assetCode}>{asset.code.slice(0, 1)}</Text></View>
                <View style={styles.assetCopy}>
                  <Text style={styles.assetName}>{asset.name}</Text>
                  <Text style={styles.assetSymbol}>{asset.code}</Text>
                </View>
                <View style={styles.assetNumbers}>
                  <Text style={styles.assetAmount}>{privateValue(asset.amount)}</Text>
                  <Text style={styles.assetValue}>{amountsVisible ? asset.value : '••••'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.muted} style={styles.assetChevron} />
              </PressableScale>
            ))}
          </View>
          {assets.length > 3 ? <Pressable onPress={() => setShowAllAssets((current) => !current)} style={styles.moreAssets}><Text style={styles.moreAssetsText}>{showAllAssets ? 'Ver menos' : `Ver ${assets.length - 3} activo más`}</Text><Ionicons name={showAllAssets ? 'chevron-up' : 'chevron-down'} size={17} color={colors.brand} /></Pressable> : null}
          <View style={styles.networkCard}>
            <View style={styles.networkCopy}><Text style={styles.networkEyebrow}>RED PRINCIPAL Y ÚNICA</Text><Text style={styles.networkTitle}>Movya funciona en Stellar</Text><Text style={styles.networkText}>Todos tus envíos, cobros y cambios se realizan en la red Stellar.</Text><View style={styles.testnetBadge}><View style={styles.testnetDot} /><Text style={styles.testnetText}>Testnet durante esta versión</Text></View></View>
            <View style={styles.wordmarkCrop}><Image source={require('../../assets/stellar-wordmark.png')} style={styles.stellarWordmark} /></View>
          </View>
        </View>
        {account.error ? <Text style={styles.syncError}>No pudimos sincronizar Testnet: {account.error}</Text> : null}
      </ScrollView>
      </View>

      <PressableScale accessibilityLabel="Abrir el chat de Movya" onPress={() => setChatOpen(true)} pressedScale={0.9} style={styles.movyaButton}>
        <View style={styles.buttonHalo} />
        <AnimatedMovyaLogo size={58} />
        <View style={styles.onlineDot} />
        <View style={styles.chatBadge}><Ionicons name="chatbubble-ellipses" size={14} color="#FFFFFF" /></View>
      </PressableScale>

      <MovyaChatSheet onClose={() => setChatOpen(false)} open={chatOpen} />
      <AssetDetailSheet asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#BBD8FF' }, body: { flex: 1, backgroundColor: 'transparent' },
  headerShell: { minHeight: 92, marginHorizontal: 12, marginTop: 7, borderRadius: 25, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.88)', shadowColor: colors.navy, shadowOpacity: 0.22, shadowRadius: 18, shadowOffset: { width: 0, height: 9 }, elevation: 7, zIndex: 10 },
  headerBlueGlow: { position: 'absolute', width: 250, height: 120, borderRadius: 999, backgroundColor: '#609EFF', opacity: 0.56, left: -55, top: -52 },
  headerCyanGlow: { position: 'absolute', width: 210, height: 120, borderRadius: 999, backgroundColor: '#72E4D4', opacity: 0.47, right: -45, bottom: -60 },
  fixedHeader: { minHeight: 90, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: 'rgba(225,240,255,0.34)', overflow: 'hidden' },
  content: { paddingHorizontal: 20, paddingTop: 17, paddingBottom: 106 },
  greeting: { color: colors.navy, fontSize: 23, fontWeight: '800', letterSpacing: -0.6 },
  subtitle: { color: '#486887', fontSize: 11, marginTop: 1 },
  headerNetwork: { marginTop: 5 },
  settingsButton: { width: 42, height: 42, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.66)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', shadowColor: colors.navy, shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  totalCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FBFF', borderRadius: radius.lg, marginTop: 22, padding: 20, borderWidth: 1, borderColor: '#CFE2FF', shadowColor: colors.brandDark, shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  totalLabel: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  totalAmount: { color: colors.ink, fontSize: 28, fontWeight: '800', letterSpacing: -0.8, marginTop: 5 },
  totalCaption: { color: colors.muted, fontSize: 11, marginTop: 4 },
  eyeButton: { width: 44, height: 44, borderRadius: 16, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  section: { marginTop: 30, gap: 12 },
  quickRow: { gap: 11, paddingRight: 4 },
  quickItem: { width: 72, alignItems: 'center' },
  quickIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, shadowColor: colors.navy, shadowOpacity: 0.13, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  blue: { backgroundColor: '#E8F1FF', borderColor: '#D2E3FF' },
  teal: { backgroundColor: '#E4F8F5', borderColor: '#C9EEE9' },
  violet: { backgroundColor: '#F0EBFF', borderColor: '#E0D7FF' },
  amber: { backgroundColor: '#FFF3DE', borderColor: '#FFE3B2' },
  rose: { backgroundColor: '#FCEAF0', borderColor: '#F6D4E0' },
  quickLabel: { color: colors.text, fontSize: 10, fontWeight: '700', marginTop: 7 },
  card: { gap: 11 },
  assetRow: { minHeight: 74, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 20, backgroundColor: 'rgba(252,253,255,0.9)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)', shadowColor: colors.navy, shadowOpacity: 0.13, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  assetIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  assetCode: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  assetCopy: { flex: 1, marginLeft: 12 },
  assetName: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  assetSymbol: { color: colors.muted, fontSize: 12, marginTop: 3 },
  assetNumbers: { alignItems: 'flex-end' },
  assetChevron: { marginLeft: 8 },
  assetAmount: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  assetValue: { color: colors.muted, fontSize: 12, marginTop: 3 },
  moreAssets: { height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.75)', marginTop: 2 }, moreAssetsText: { color: colors.brand, fontSize: 12, fontWeight: '800' },
  networkCard: { minHeight: 132, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 23, borderWidth: 1, borderColor: 'rgba(255,255,255,0.88)', padding: 17, marginTop: 16, shadowColor: colors.navy, shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3 }, networkCopy: { flex: 1, paddingRight: 8 }, networkEyebrow: { color: colors.brand, fontSize: 9, fontWeight: '900', letterSpacing: 0.9 }, networkTitle: { color: colors.ink, fontSize: 16, fontWeight: '900', marginTop: 4 }, networkText: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 5 }, testnetBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', marginTop: 9 }, testnetDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.warning, marginRight: 5 }, testnetText: { color: colors.muted, fontSize: 9, fontWeight: '700' }, wordmarkCrop: { width: 118, height: 42, overflow: 'hidden' }, stellarWordmark: { position: 'absolute', width: 150, height: 84, resizeMode: 'contain', left: -16, top: -22 },
  syncError: { color: colors.warning, fontSize: 11, lineHeight: 16, marginTop: 16 },
  movyaButton: { position: 'absolute', right: 20, bottom: 18, width: 68, height: 68, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.brandIce, shadowColor: colors.brandDark, shadowOpacity: 0.28, shadowRadius: 20, shadowOffset: { width: 0, height: 9 }, elevation: 10 },
  buttonHalo: { position: 'absolute', width: 62, height: 62, borderRadius: 23, backgroundColor: colors.brandSoft },
  onlineDot: { position: 'absolute', right: 4, top: 5, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.positive, borderWidth: 2, borderColor: colors.surface },
  chatBadge: { position: 'absolute', left: -5, bottom: -3, width: 27, height: 27, borderRadius: 10, backgroundColor: colors.brand, borderWidth: 2, borderColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
});
