import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedAccountCard } from '@/components/AnimatedAccountCard';
import { AnimatedMovyaLogo } from '@/components/AnimatedMovyaLogo';
import { MovyaChatSheet } from '@/components/MovyaChatSheet';
import { SectionHeader } from '@/components/SectionHeader';
import { demoAssets } from '@/data/demo';
import { useStellarAccount } from '@/hooks/useStellarAccount';
import { colors, radius } from '@/theme/tokens';

export default function HomeScreen() {
  const router = useRouter();
  const [amountsVisible, setAmountsVisible] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const account = useStellarAccount();
  const assets = account.data?.balances.map((item) => ({
    code: item.assetCode,
    name: item.assetCode === 'XLM' ? 'Stellar' : item.assetCode === 'USDC' ? 'Dólares digitales' : item.assetCode,
    amount: Number(item.balance).toLocaleString(undefined, { maximumFractionDigits: 4 }),
    value: 'Cuenta Testnet',
    color: item.assetCode === 'XLM' ? colors.navy : colors.brand,
  })) ?? demoAssets;
  const privateValue = (value: string) => amountsVisible ? value : '••••••';

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.fixedHeader}>
        <View>
          <Text style={styles.greeting}>Hola, Manuel!</Text>
          <Text style={styles.subtitle}>Qué gusto verte de nuevo.</Text>
        </View>
        <Pressable onPress={() => router.push('/settings')} style={styles.settingsButton}><Ionicons name="settings-outline" size={22} color={colors.ink} /></Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AnimatedAccountCard amountsVisible={amountsVisible} />

        <View style={styles.totalCard}>
          <View>
            <Text style={styles.totalLabel}>Balance total en USD</Text>
            <Text style={styles.totalAmount}>{privateValue('$1,516.84')}</Text>
            <Text style={styles.totalCaption}>Entre todas tus cuentas</Text>
          </View>
          <Pressable accessibilityLabel={amountsVisible ? 'Ocultar montos' : 'Mostrar montos'} onPress={() => setAmountsVisible((visible) => !visible)} style={styles.eyeButton}>
            <Ionicons color={colors.brand} name={amountsVisible ? 'eye-outline' : 'eye-off-outline'} size={22} />
          </Pressable>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Accesos rápidos" />
          <ScrollView contentContainerStyle={styles.quickRow} horizontal showsHorizontalScrollIndicator={false}>
            <Pressable onPress={() => router.push('/send')} style={styles.quickItem}><View style={[styles.quickIcon, styles.blue]}><Ionicons name="paper-plane-outline" size={21} color="#176BFF" /></View><Text style={styles.quickLabel}>Enviar</Text></Pressable>
            <Pressable onPress={() => router.push('/receive')} style={styles.quickItem}><View style={[styles.quickIcon, styles.teal]}><Ionicons name="qr-code-outline" size={21} color="#008B83" /></View><Text style={styles.quickLabel}>Recibir</Text></Pressable>
            <Pressable onPress={() => router.push('/swap')} style={styles.quickItem}><View style={[styles.quickIcon, styles.violet]}><Ionicons name="repeat-outline" size={21} color="#7655D9" /></View><Text style={styles.quickLabel}>Cambiar</Text></Pressable>
            <Pressable onPress={() => router.push('/contacts')} style={styles.quickItem}><View style={[styles.quickIcon, styles.amber]}><Ionicons name="people-outline" size={21} color="#B66A00" /></View><Text style={styles.quickLabel}>Contactos</Text></Pressable>
            <Pressable onPress={() => router.push('/activity')} style={styles.quickItem}><View style={[styles.quickIcon, styles.rose]}><Ionicons name="time-outline" size={21} color="#B94F72" /></View><Text style={styles.quickLabel}>Historial</Text></Pressable>
          </ScrollView>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Mis cuentas" action="Ver todas" />
          <View style={styles.card}>
            {assets.map((asset, index) => (
              <View key={`${asset.code}-${index}`} style={[styles.assetRow, index > 0 && styles.divider]}>
                <View style={[styles.assetIcon, { backgroundColor: asset.color }]}><Text style={styles.assetCode}>{asset.code.slice(0, 1)}</Text></View>
                <View style={styles.assetCopy}>
                  <Text style={styles.assetName}>{asset.name}</Text>
                  <Text style={styles.assetSymbol}>{asset.code}</Text>
                </View>
                <View style={styles.assetNumbers}>
                  <Text style={styles.assetAmount}>{privateValue(asset.amount)}</Text>
                  <Text style={styles.assetValue}>{amountsVisible ? asset.value : '••••'}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
        {account.error ? <Text style={styles.syncError}>No pudimos sincronizar Testnet: {account.error}</Text> : null}
      </ScrollView>

      <Pressable onPress={() => setChatOpen(true)} style={styles.movyaDock}>
        <AnimatedMovyaLogo size={48} />
        <View style={styles.dockCopy}>
          <View style={styles.dockTitleRow}><Ionicons name="chatbubble-ellipses-outline" size={15} color={colors.brand} /><Text style={styles.dockPlaceholder}>Habla con Movya</Text><View style={styles.onlineDot} /></View>
          <Text style={styles.dockHint}>Tu asistente para mover y entender tu dinero</Text>
        </View>
        <View style={styles.dockAction}><Ionicons name="chevron-up" size={20} color={colors.brand} /></View>
      </Pressable>

      <MovyaChatSheet onClose={() => setChatOpen(false)} open={chatOpen} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  fixedHeader: { minHeight: 78, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: 'rgba(227,234,244,0.7)', zIndex: 10 },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 126 },
  greeting: { color: colors.ink, fontSize: 27, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 4 },
  settingsButton: { width: 46, height: 46, borderRadius: 17, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  totalCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, marginTop: 22, padding: 20, borderWidth: 1, borderColor: colors.border },
  totalLabel: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  totalAmount: { color: colors.ink, fontSize: 28, fontWeight: '800', letterSpacing: -0.8, marginTop: 5 },
  totalCaption: { color: colors.muted, fontSize: 11, marginTop: 4 },
  eyeButton: { width: 44, height: 44, borderRadius: 16, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  section: { marginTop: 30, gap: 12 },
  quickRow: { gap: 11, paddingRight: 4 },
  quickItem: { width: 72, alignItems: 'center' },
  quickIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  blue: { backgroundColor: '#E8F1FF', borderColor: '#D2E3FF' },
  teal: { backgroundColor: '#E4F8F5', borderColor: '#C9EEE9' },
  violet: { backgroundColor: '#F0EBFF', borderColor: '#E0D7FF' },
  amber: { backgroundColor: '#FFF3DE', borderColor: '#FFE3B2' },
  rose: { backgroundColor: '#FCEAF0', borderColor: '#F6D4E0' },
  quickLabel: { color: colors.text, fontSize: 10, fontWeight: '700', marginTop: 7 },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: 15, borderWidth: 1, borderColor: colors.border },
  assetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  assetIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  assetCode: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  assetCopy: { flex: 1, marginLeft: 12 },
  assetName: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  assetSymbol: { color: colors.muted, fontSize: 12, marginTop: 3 },
  assetNumbers: { alignItems: 'flex-end' },
  assetAmount: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  assetValue: { color: colors.muted, fontSize: 12, marginTop: 3 },
  syncError: { color: colors.warning, fontSize: 11, lineHeight: 16, marginTop: 16 },
  movyaDock: { position: 'absolute', left: 18, right: 18, bottom: 16, minHeight: 70, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 24, borderWidth: 1.5, borderColor: colors.brandIce, paddingHorizontal: 11, shadowColor: colors.navy, shadowOpacity: 0.16, shadowRadius: 22, shadowOffset: { width: 0, height: 9 }, elevation: 8 },
  dockCopy: { flex: 1, marginLeft: 11 },
  dockTitleRow: { flexDirection: 'row', alignItems: 'center' },
  dockPlaceholder: { color: colors.ink, fontSize: 14, fontWeight: '700', marginLeft: 6 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.positive, marginLeft: 7 },
  dockHint: { color: colors.muted, fontSize: 10, marginTop: 4 },
  dockAction: { width: 38, height: 38, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brandSoft },
});
