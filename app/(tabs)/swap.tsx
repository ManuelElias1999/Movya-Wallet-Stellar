import type { ThemeColors } from '@/theme/tokens';
import { useThemedStyles } from '@/theme/Theme';
import { Pressable, Text, TextInput } from '@/i18n/primitives';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InternalScreenBackground } from '@/components/InternalScreenBackground';
import { MovyaContextHelp } from '@/components/MovyaContextHelp';
import { PageHeader } from '@/components/PageHeader';
import { PressableScale } from '@/components/PressableScale';
import { TokenSelector } from '@/components/TokenSelector';
import { TokenIcon } from '@/components/TokenIcon';
import { colors } from '@/theme/tokens';
import { useTestnetWallet } from '@/context/TestnetWalletContext';
import { useSwapFlow } from '@/context/useSwapFlow';
import { SwapReviewCard } from '@/components/SwapReviewCard';
import { type PaymentAsset } from '@/services/stellar/payments';
import { readSwapSpendable } from '@/services/stellar/swaps';
import { swapBlocked } from '@/services/swapFlow';
import { formatEnteredAmount, formatReceivedAmount } from '@/services/presentation';

const tokenInfo: Record<string, { name: string; color: string }> = {
  USDC: { name: 'USD digital', color: '#2775CA' },
  XLM: { name: 'Stellar', color: colors.navy },
  EURC: { name: 'Euro digital', color: '#6857E5' },
  AQUA: { name: 'Aquarius', color: '#00A6A6' },
};

export default function SwapScreen() {
  const { styles, colors } = useThemedStyles(createStyles);
  const [from, setFrom] = useState<PaymentAsset>('XLM');
  const [to, setTo] = useState<PaymentAsset>('USDC');
  const [amount, setAmount] = useState('');
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  const wallet = useTestnetWallet();
  const { flow, state } = useSwapFlow();
  const blocked = swapBlocked(state);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [spendable, setSpendable] = useState<Record<PaymentAsset, string> | null>(null);
  const [balanceError, setBalanceError] = useState('');
  useEffect(() => {
    let active = true;
    setSpendable(null); setBalanceError('');
    if (wallet.publicKey) void readSwapSpendable(wallet.publicKey)
      .then(next => { if (active) setSpendable(next); })
      .catch(error => { if (active) setBalanceError(error instanceof Error ? error.message : 'No se pudo leer el balance.'); });
    return () => { active = false; };
  }, [wallet.publicKey, wallet.account]);

  useEffect(() => {
    flow.clear();
    if (!wallet.publicKey || !amount.trim()) return;
    const source = wallet.publicKey;
    const timer = setTimeout(() => void flow.start({ source, amount, from, to }), 400);
    return () => { clearTimeout(timer); flow.clear(); };
  }, [amount, from, to, wallet.publicKey, flow]);

  const editAmount = (value: string) => { if (!blocked) { flow.clear(); setAmount(value); } };
  const chooseFrom = (value: string) => {
    if (blocked) return;
    flow.clear();
    if (value === to) setTo(from);
    setFrom(value as PaymentAsset); setFromOpen(false);
  };
  const chooseTo = (value: string) => {
    if (blocked) return;
    flow.clear();
    if (value === from) setFrom(to);
    setTo(value as PaymentAsset); setToOpen(false);
  };
  const switchAssets = () => { if (!blocked) { flow.clear(); setFrom(to); setTo(from); } };
  const requestQuote = () => { if (wallet.publicKey) void flow.start({ source: wallet.publicKey, amount, from, to }); };
  const closeReview = () => { if (!swapBlocked(flow.get())) setReviewOpen(false); };

  const assetSelector = (code: string, onPress: () => void) => (
    <PressableScale disabled={blocked} onPress={onPress} pressedScale={0.97} style={styles.assetBox}>
      <View style={styles.assetDot}><TokenIcon code={code} color={tokenInfo[code].color} size={37} /></View>
      <View style={styles.assetCopy}><Text style={styles.assetName}>{tokenInfo[code].name}</Text><Text style={styles.assetNetwork}>Activo en Stellar</Text></View>
      <Text style={styles.code}>{code}</Text>
      <Ionicons name="chevron-down" size={17} color={colors.brand} />
    </PressableScale>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <InternalScreenBackground />
      <PageHeader subtitle="Revisarás la cotización antes de confirmar" title="Cambiar dinero" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardDismissMode="on-drag" contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Tú entregas</Text>
        {assetSelector(from, () => setFromOpen(true))}
        <View style={styles.amountBox}>
          <TextInput keyboardType="decimal-pad" accessibilityLabel="Monto que entregas" editable={!blocked} onChangeText={editAmount} placeholder="0.00" placeholderTextColor="#94A5BE" style={styles.amountInput} value={amount} />
          <View style={styles.amountToken}><Text style={styles.amountTokenText}>{from}</Text></View>
        </View>

        <View style={styles.balanceRow}>
          <View style={{ flex: 1 }}><Text style={styles.balance}>Saldo disponible: {spendable ? formatEnteredAmount(spendable[from]) : '…'} {from}</Text></View>
          <Pressable accessibilityRole="button" disabled={blocked || !spendable} accessibilityState={{ disabled: blocked || !spendable }} onPress={() => { if (spendable) editAmount(formatEnteredAmount(spendable[from])); }} style={styles.maxButton}><Text style={styles.maxText}>Máximo</Text></Pressable>
        </View>
        {balanceError ? <Text style={styles.error}>{balanceError}</Text> : null}

        <PressableScale disabled={blocked} onPress={switchAssets} pressedScale={0.88} style={styles.switch}><Ionicons name="swap-vertical" size={22} color={colors.brand} /></PressableScale>

        <Text style={styles.label}>Tú recibes</Text>
        {assetSelector(to, () => setToOpen(true))}
        <View style={styles.outputBox}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} style={styles.output}>{state.review ? formatReceivedAmount(state.review.estimated) : amount ? '—' : '0.00'}</Text>
          <View style={[styles.amountToken, styles.outputToken]}><Text style={styles.amountTokenText}>{to}</Text></View>
        </View>

        {state.phase === 'quoting' ? <View style={styles.quoteLoading}><ActivityIndicator color={colors.brand} /><Text>Buscando cotización en Stellar…</Text></View> : null}
        {state.error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{state.error}</Text> : null}
        <PressableScale disabled={!amount || !wallet.publicKey || state.phase === 'quoting' || blocked} onPress={() => { if (state.phase === 'review' || state.phase === 'success') { Keyboard.dismiss(); setReviewOpen(true); } else requestQuote(); }} style={[styles.button, (!amount || !wallet.publicKey || state.phase === 'quoting' || blocked) && styles.disabled]}><Text style={styles.buttonText}>{state.phase === 'review' ? 'Revisar cambio' : state.phase === 'success' ? 'Ver comprobante' : 'Cotizar cambio'}</Text></PressableScale>
        <View style={styles.contextHelp}>
          <MovyaContextHelp
            actionPrompt={amount ? `Cambia ${amount} ${from} a ${to}` : 'Quiero cambiar XLM a USDC. Ayúdame a prepararlo.'}
            explanationSteps={[
              'Abre la lista de Tú entregas y escoge el activo que quieres cambiar.',
              'Escribe el monto y luego elige, en la segunda lista, el activo que quieres recibir.',
              'Movya mostrará cuánto recibirás y el detalle del cambio antes de confirmar.',
              'Nada se cambiará hasta que revises y apruebes el resumen final.',
            ]}
            explanationTitle="Cómo cambiar activos"
            question="¿Necesitas ayuda para cambiar tus activos?"
          />
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      <Modal animationType="slide" onRequestClose={() => setFromOpen(false)} transparent visible={fromOpen}>
        <Pressable onPress={() => setFromOpen(false)} style={styles.backdrop} />
        <View style={styles.sheet}><View style={styles.sheetHandle} /><Text style={styles.sheetTitle}>Activo que entregas</Text><TokenSelector options={['XLM', 'USDC']} onChange={chooseFrom} value={from} /></View>
      </Modal>
      <Modal animationType="slide" onRequestClose={() => setToOpen(false)} transparent visible={toOpen}>
        <Pressable onPress={() => setToOpen(false)} style={styles.backdrop} />
        <View style={styles.sheet}><View style={styles.sheetHandle} /><Text style={styles.sheetTitle}>Activo que recibes</Text><TokenSelector options={['XLM', 'USDC']} onChange={chooseTo} value={to} /></View>
      </Modal>
      <Modal animationType="slide" transparent visible={reviewOpen} onRequestClose={closeReview}>
        <View style={styles.reviewBackdrop}>
          <Pressable accessibilityLabel="Cerrar revisión" accessibilityRole="button" onPress={closeReview} style={styles.reviewDismiss} />
          <View style={styles.reviewSheet}>
            <ScrollView keyboardShouldPersistTaps="handled"><SwapReviewCard state={state} flow={flow} onCancel={closeReview} /></ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, paddingBottom: 44 },
  label: { color: colors.text, fontSize: 13, fontWeight: '800', marginTop: 18, marginBottom: 9 },
  assetBox: { minHeight: 64, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 13, shadowColor: colors.navy, shadowOpacity: 0.14, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  assetDot: { width: 37, height: 37, borderRadius: 13, marginRight: 11, alignItems: 'center', justifyContent: 'center' },
  assetInitial: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  assetCopy: { flex: 1 },
  assetName: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  assetNetwork: { color: colors.muted, fontSize: 9, marginTop: 2 },
  code: { color: colors.ink, fontSize: 12, fontWeight: '900', marginRight: 7 },
  amountBox: { minHeight: 88, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceSoft, borderWidth: 1.5, borderColor: colors.brandIce, borderRadius: 21, paddingLeft: 15, paddingRight: 10, marginTop: 10, shadowColor: '#000000', shadowOpacity: 0.24, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  amountInput: { flex: 1, minWidth: 0, color: colors.ink, fontSize: 30, fontWeight: '800', minHeight: 56, paddingHorizontal: 0, paddingVertical: 8, textAlignVertical: 'center', includeFontPadding: false },
  amountToken: { width: 70, height: 43, borderRadius: 15, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.brandIce, alignItems: 'center', justifyContent: 'center' },
  amountTokenText: { color: colors.brandDark, fontSize: 12, fontWeight: '900' },
  switch: { width: 46, height: 46, borderRadius: 17, backgroundColor: colors.surfaceElevated, borderWidth: 2, borderColor: colors.brandIce, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginVertical: -2, zIndex: 2, shadowColor: '#000000', shadowOpacity: 0.24, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  outputBox: { height: 76, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.brandSoft, borderWidth: 1.5, borderColor: colors.brandIce, borderRadius: 21, paddingLeft: 15, paddingRight: 10, marginTop: 10, shadowColor: '#000000', shadowOpacity: 0.24, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  output: { flex: 1, color: colors.ink, fontSize: 30, fontWeight: '800' },
  outputToken: { borderColor: '#B9D5F7' },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 }, balance: { color: colors.muted, fontSize: 12, lineHeight: 19 },
  maxButton: { minHeight: 44, paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.brandSoft }, maxText: { color: colors.brand, fontSize: 12, fontWeight: '800' },
  help: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 8 }, error: { color: '#B52D42', fontSize: 12, lineHeight: 18, marginTop: 12 }, quoteLoading: { alignItems: 'center', gap: 8, marginTop: 16 },
  reviewBackdrop: { flex: 1, backgroundColor: 'rgba(5,16,35,0.48)', justifyContent: 'flex-end' }, reviewDismiss: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, reviewSheet: { maxHeight: '90%', padding: 18, paddingBottom: 40, backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, width: '100%', maxWidth: 760, alignSelf: 'center' },
  button: { height: 56, borderRadius: 18, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginTop: 30, shadowColor: colors.brandDark, shadowOpacity: 0.25, shadowRadius: 13, shadowOffset: { width: 0, height: 7 }, elevation: 5 },
  contextHelp: { marginTop: 24 },
  disabled: { backgroundColor: '#BAC5D5', shadowOpacity: 0.05 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  backdrop: { flex: 1, backgroundColor: 'rgba(5,16,35,0.42)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 22, paddingBottom: 30, shadowColor: colors.navy, shadowOpacity: 0.22, shadowRadius: 24, shadowOffset: { width: 0, height: -8 }, elevation: 8 },
  sheetHandle: { width: 42, height: 5, borderRadius: 3, backgroundColor: '#CDD8E7', alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
});
