import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { ActivityRow } from '@/components/ActivityRow';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { demoActivity, demoAssets } from '@/data/demo';
import { useStellarAccount } from '@/hooks/useStellarAccount';
import { colors, radius } from '@/theme/tokens';

const quickActions = [
  { label: 'Enviar', icon: 'arrow-up' as const },
  { label: 'Recibir', icon: 'arrow-down' as const },
  { label: 'Cambiar', icon: 'swap-horizontal' as const },
  { label: 'Agregar', icon: 'add' as const },
];

export default function HomeScreen() {
  const [amountsVisible, setAmountsVisible] = useState(true);
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
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hola, Manuel!</Text>
          <Text style={styles.subtitle}>Qué gusto verte de nuevo.</Text>
        </View>
        <Pressable style={styles.logoButton}>
          <Image source={require('../../assets/movya-logo.png')} style={styles.logo} />
        </Pressable>
      </View>

      <LinearGradient colors={['#0B2348', '#0B4FB8', '#176BFF']} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.accountCard}>
        <View style={styles.cardGlowOne} />
        <View style={styles.cardGlowTwo} />
        <View style={styles.cardTop}>
          <View>
            <Text style={styles.cardBrand}>movya</Text>
            <Text style={styles.cardType}>Cuenta personal</Text>
          </View>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Activa</Text>
          </View>
        </View>
        <View>
          <Text style={styles.availableLabel}>Saldo disponible</Text>
          <Text style={styles.cardAmount}>{privateValue('$1,240.00')}</Text>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.cardOwner}>MANUEL ELIAS</Text>
          <View style={styles.currencyPill}><Text style={styles.currencyText}>USD</Text></View>
        </View>
      </LinearGradient>

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

      <View style={styles.actions}>
        {quickActions.map((action) => (
          <Pressable key={action.label} style={styles.actionItem}>
            <View style={styles.actionIcon}><Ionicons color={colors.brand} name={action.icon} size={22} /></View>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </Pressable>
        ))}
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

      <View style={styles.section}>
        <SectionHeader title="Últimos movimientos" action="Ver todos" />
        <View style={styles.card}>
          {demoActivity.slice(0, 3).map((item) => <ActivityRow hidden={!amountsVisible} key={item.id} {...item} />)}
        </View>
      </View>
      {account.error ? <Text style={styles.syncError}>No pudimos sincronizar Testnet: {account.error}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  greeting: { color: colors.ink, fontSize: 27, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 4 },
  logoButton: { width: 54, height: 54, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  logo: { width: 48, height: 48, resizeMode: 'contain' },
  accountCard: { borderRadius: 28, minHeight: 220, padding: 22, justifyContent: 'space-between', overflow: 'hidden', shadowColor: '#0B4FB8', shadowOpacity: 0.24, shadowRadius: 24, shadowOffset: { width: 0, height: 14 }, elevation: 8 },
  cardGlowOne: { position: 'absolute', width: 210, height: 210, borderRadius: 105, backgroundColor: 'rgba(255,255,255,0.09)', right: -72, top: -80 },
  cardGlowTwo: { position: 'absolute', width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(185,219,255,0.12)', left: -55, bottom: -52 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardBrand: { color: '#FFFFFF', fontSize: 25, fontWeight: '800', letterSpacing: -0.8 },
  cardType: { color: 'rgba(255,255,255,0.68)', fontSize: 11, marginTop: 2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#78F0C3', marginRight: 6 },
  statusText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  availableLabel: { color: 'rgba(255,255,255,0.68)', fontSize: 12, fontWeight: '600' },
  cardAmount: { color: '#FFFFFF', fontSize: 35, fontWeight: '800', letterSpacing: -1.2, marginTop: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardOwner: { color: 'rgba(255,255,255,0.76)', fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  currencyPill: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  currencyText: { color: colors.navy, fontSize: 11, fontWeight: '800' },
  totalCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, marginTop: 22, padding: 20, borderWidth: 1, borderColor: colors.border },
  totalLabel: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  totalAmount: { color: colors.ink, fontSize: 28, fontWeight: '800', letterSpacing: -0.8, marginTop: 5 },
  totalCaption: { color: colors.muted, fontSize: 11, marginTop: 4 },
  eyeButton: { width: 44, height: 44, borderRadius: 16, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
  actionItem: { alignItems: 'center', width: '24%' },
  actionIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  actionLabel: { color: colors.text, fontSize: 12, fontWeight: '700', marginTop: 8 },
  section: { marginTop: 30, gap: 12 },
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
});
