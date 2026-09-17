import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedAccountCard } from '@/components/AnimatedAccountCard';
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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hola, Manuel!</Text>
            <Text style={styles.subtitle}>Qué gusto verte de nuevo.</Text>
          </View>
          <View style={styles.logoButton}><Image source={require('../../assets/movya-logo.png')} style={styles.logo} /></View>
        </View>

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
          <SectionHeader title="Tu cuenta" />
          <View style={styles.shortcuts}>
            <Pressable onPress={() => router.push('/contacts')} style={styles.shortcut}>
              <View style={styles.shortcutIcon}><Ionicons name="people-outline" size={22} color={colors.brand} /></View>
              <Text style={styles.shortcutTitle}>Contactos</Text>
              <Text style={styles.shortcutText}>Personas guardadas</Text>
              <Ionicons name="arrow-forward" size={17} color={colors.muted} style={styles.shortcutArrow} />
            </Pressable>
            <Pressable onPress={() => router.push('/activity')} style={styles.shortcut}>
              <View style={styles.shortcutIcon}><Ionicons name="time-outline" size={22} color={colors.brand} /></View>
              <Text style={styles.shortcutTitle}>Historial</Text>
              <Text style={styles.shortcutText}>Todos tus movimientos</Text>
              <Ionicons name="arrow-forward" size={17} color={colors.muted} style={styles.shortcutArrow} />
            </Pressable>
          </View>
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
        <Image source={require('../../assets/movya-logo.png')} style={styles.dockLogo} />
        <View style={styles.dockCopy}>
          <Text style={styles.dockPlaceholder}>Escríbele a Movya…</Text>
          <Text style={styles.dockHint}>Transferencias, consultas y ayuda</Text>
        </View>
        <View style={styles.dockAction}><Ionicons name="arrow-up" size={20} color="#FFFFFF" /></View>
      </Pressable>

      <MovyaChatSheet onClose={() => setChatOpen(false)} open={chatOpen} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 126 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  greeting: { color: colors.ink, fontSize: 27, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 4 },
  logoButton: { width: 54, height: 54, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  logo: { width: 48, height: 48, resizeMode: 'contain' },
  totalCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, marginTop: 22, padding: 20, borderWidth: 1, borderColor: colors.border },
  totalLabel: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  totalAmount: { color: colors.ink, fontSize: 28, fontWeight: '800', letterSpacing: -0.8, marginTop: 5 },
  totalCaption: { color: colors.muted, fontSize: 11, marginTop: 4 },
  eyeButton: { width: 44, height: 44, borderRadius: 16, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  section: { marginTop: 30, gap: 12 },
  shortcuts: { flexDirection: 'row', gap: 12 },
  shortcut: { flex: 1, minHeight: 148, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 15 },
  shortcutIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  shortcutTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  shortcutText: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 4, paddingRight: 18 },
  shortcutArrow: { position: 'absolute', right: 14, bottom: 16 },
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
  movyaDock: { position: 'absolute', left: 18, right: 18, bottom: 16, minHeight: 68, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 24, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, shadowColor: colors.navy, shadowOpacity: 0.14, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  dockLogo: { width: 48, height: 48, resizeMode: 'contain' },
  dockCopy: { flex: 1, marginLeft: 8 },
  dockPlaceholder: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  dockHint: { color: colors.muted, fontSize: 10, marginTop: 3 },
  dockAction: { width: 42, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand },
});
