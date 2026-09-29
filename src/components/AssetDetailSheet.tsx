import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';

import { StellarNetworkBadge } from '@/components/StellarNetworkBadge';
import { TokenIcon } from '@/components/TokenIcon';
import { colors } from '@/theme/tokens';

export type AssetDetail = {
  code: string;
  name: string;
  amount: string;
  value: string;
  color: string;
  unitPrice?: string;
  change?: string;
  description?: string;
};

type AssetDetailSheetProps = {
  asset: AssetDetail | null;
  onClose: () => void;
};

const metadata: Record<string, Pick<AssetDetail, 'unitPrice' | 'change' | 'description'>> = {
  USDC: { unitPrice: '$1.00', change: '+0.01%', description: 'Dólar digital emitido por Circle para pagos y transferencias.' },
  XLM: { unitPrice: '$0.34', change: '+2.4%', description: 'Activo nativo de Stellar, utilizado para operaciones y comisiones de red.' },
  EURC: { unitPrice: '$1.17', change: '+0.3%', description: 'Euro digital emitido por Circle y disponible como activo en Stellar.' },
  AQUA: { unitPrice: '$0.0010', change: '-0.8%', description: 'Token del ecosistema Aquarius para liquidez dentro de Stellar.' },
};

export function AssetDetailSheet({ asset, onClose }: AssetDetailSheetProps) {
  if (!asset) return null;
  const details = metadata[asset.code] ?? {};
  const positive = !details.change?.startsWith('-');

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible>
      <Pressable onPress={onClose} style={styles.backdrop} />
      <BlurView intensity={85} tint="light" style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.topRow}>
          <TokenIcon code={asset.code} color={asset.color} size={52} />
          <View style={styles.assetCopy}><Text style={styles.name}>{asset.name}</Text><Text style={styles.code}>{asset.code} · Stellar</Text></View>
          <Pressable onPress={onClose} style={styles.close}><Ionicons name="close" size={19} color={colors.ink} /></Pressable>
        </View>

        <LinearGradient colors={['rgba(23,107,255,0.13)', 'rgba(118,85,217,0.08)', 'rgba(0,166,166,0.08)']} style={styles.priceCard}>
          <View><Text style={styles.priceLabel}>1 {asset.code} equivale a</Text><Text style={styles.price}>{details.unitPrice ?? 'Sin cotización'}</Text></View>
          <View style={[styles.change, !positive && styles.changeNegative]}><Ionicons name={positive ? 'trending-up' : 'trending-down'} size={15} color={positive ? colors.positive : '#C84B63'} /><Text style={[styles.changeText, !positive && styles.changeTextNegative]}>{details.change ?? '—'}</Text></View>
          <View style={styles.chart}>
            <Svg height="92" viewBox="0 0 320 92" width="100%">
              <Defs><SvgGradient id="area" x1="0" x2="0" y1="0" y2="1"><Stop offset="0" stopColor={asset.color} stopOpacity="0.34" /><Stop offset="1" stopColor={asset.color} stopOpacity="0" /></SvgGradient></Defs>
              <Path d="M0 72 C30 62 43 70 66 52 C91 32 112 50 137 38 C164 25 179 43 204 28 C232 11 247 31 269 20 C290 10 305 16 320 7 L320 92 L0 92 Z" fill="url(#area)" />
              <Path d="M0 72 C30 62 43 70 66 52 C91 32 112 50 137 38 C164 25 179 43 204 28 C232 11 247 31 269 20 C290 10 305 16 320 7" fill="none" stroke={asset.color} strokeLinecap="round" strokeWidth="3" />
            </Svg>
          </View>
          <View style={styles.periodRow}><Text style={styles.period}>Gráfico demostrativo · 7 días</Text><Text style={styles.demo}>DEMO</Text></View>
        </LinearGradient>

        <View style={styles.balanceCard}><View><Text style={styles.balanceLabel}>Tu balance</Text><Text style={styles.balance}>{asset.amount} {asset.code}</Text></View><Text style={styles.balanceValue}>{asset.value}</Text></View>
        <Text style={styles.description}>{details.description}</Text>
        <StellarNetworkBadge label="Activo en la red Stellar" />
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(4,15,36,0.42)' },
  sheet: { borderTopLeftRadius: 34, borderTopRightRadius: 34, overflow: 'hidden', padding: 22, paddingBottom: 32, backgroundColor: 'rgba(247,251,255,0.88)', borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.75)' },
  handle: { width: 43, height: 5, borderRadius: 3, backgroundColor: 'rgba(83,105,137,0.28)', alignSelf: 'center', marginBottom: 20 },
  topRow: { flexDirection: 'row', alignItems: 'center' }, assetIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, assetLetter: { color: '#FFFFFF', fontSize: 19, fontWeight: '900' }, assetCopy: { flex: 1, marginLeft: 12 }, name: { color: colors.ink, fontSize: 18, fontWeight: '800' }, code: { color: colors.muted, fontSize: 11, marginTop: 4 }, close: { width: 39, height: 39, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.72)', alignItems: 'center', justifyContent: 'center' },
  priceCard: { borderRadius: 25, padding: 18, marginTop: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.75)' }, priceLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' }, price: { color: colors.ink, fontSize: 32, fontWeight: '900', letterSpacing: -1, marginTop: 4 },
  change: { position: 'absolute', right: 17, top: 19, height: 30, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.positiveSoft, borderRadius: 11, paddingHorizontal: 9 }, changeNegative: { backgroundColor: '#FCEAF0' }, changeText: { color: colors.positive, fontSize: 11, fontWeight: '800' }, changeTextNegative: { color: '#C84B63' }, chart: { height: 92, marginTop: 10 }, periodRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }, period: { color: colors.muted, fontSize: 9 }, demo: { color: colors.brand, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  balanceCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.72)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', padding: 15, marginTop: 14 }, balanceLabel: { color: colors.muted, fontSize: 10 }, balance: { color: colors.ink, fontSize: 14, fontWeight: '800', marginTop: 4 }, balanceValue: { color: colors.brand, fontSize: 15, fontWeight: '800' },
  description: { color: colors.text, fontSize: 11, lineHeight: 17, marginVertical: 16 },
});
