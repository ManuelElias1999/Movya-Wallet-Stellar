import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InternalScreenBackground } from '@/components/InternalScreenBackground';
import { MovyaContextHelp } from '@/components/MovyaContextHelp';
import { PageHeader } from '@/components/PageHeader';
import { PressableScale } from '@/components/PressableScale';
import { TokenSelector } from '@/components/TokenSelector';
import { colors } from '@/theme/tokens';

const tokenInfo: Record<string, { name: string; color: string }> = {
  USDC: { name: 'USD digital', color: '#2775CA' },
  XLM: { name: 'Stellar', color: colors.navy },
  EURC: { name: 'Euro digital', color: '#6857E5' },
  AQUA: { name: 'Aquarius', color: '#00A6A6' },
};

export default function SwapScreen() {
  const [from, setFrom] = useState('USDC');
  const [to, setTo] = useState('XLM');
  const [amount, setAmount] = useState('');
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  const chooseFrom = (value: string) => {
    if (value === to) setTo(from);
    setFrom(value);
    setFromOpen(false);
  };

  const chooseTo = (value: string) => {
    if (value === from) setFrom(to);
    setTo(value);
    setToOpen(false);
  };

  const switchAssets = () => {
    setFrom(to);
    setTo(from);
  };

  const assetSelector = (code: string, onPress: () => void) => (
    <PressableScale onPress={onPress} pressedScale={0.97} style={styles.assetBox}>
      <View style={[styles.assetDot, { backgroundColor: tokenInfo[code].color }]}><Text style={styles.assetInitial}>{code[0]}</Text></View>
      <View style={styles.assetCopy}><Text style={styles.assetName}>{tokenInfo[code].name}</Text><Text style={styles.assetNetwork}>Activo en Stellar</Text></View>
      <Text style={styles.code}>{code}</Text>
      <Ionicons name="chevron-down" size={17} color={colors.brand} />
    </PressableScale>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <InternalScreenBackground />
      <PageHeader subtitle="Revisarás la cotización antes de confirmar" title="Cambiar dinero" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Tú entregas</Text>
        {assetSelector(from, () => setFromOpen(true))}
        <View style={styles.amountBox}>
          <TextInput keyboardType="decimal-pad" onChangeText={setAmount} placeholder="0.00" placeholderTextColor="#94A5BE" style={styles.amountInput} value={amount} />
          <View style={styles.amountToken}><Text style={styles.amountTokenText}>{from}</Text></View>
        </View>

        <PressableScale onPress={switchAssets} pressedScale={0.88} style={styles.switch}><Ionicons name="swap-vertical" size={22} color={colors.brand} /></PressableScale>

        <Text style={styles.label}>Tú recibes</Text>
        {assetSelector(to, () => setToOpen(true))}
        <View style={styles.outputBox}>
          <Text style={styles.output}>{amount ? '—' : '0.00'}</Text>
          <View style={[styles.amountToken, styles.outputToken]}><Text style={styles.amountTokenText}>{to}</Text></View>
        </View>

        <View style={styles.rate}><Text style={styles.rateLabel}>Tipo de cambio estimado</Text><Text style={styles.rateValue}>Disponible al conectar Stellar DEX</Text></View>
        <PressableScale disabled={!amount} onPress={() => Alert.alert('Vista previa', 'La cotización y confirmación se conectarán en una fase posterior.')} style={[styles.button, !amount && styles.disabled]}><Text style={styles.buttonText}>Revisar cambio</Text></PressableScale>
        <View style={styles.contextHelp}>
          <MovyaContextHelp
            actionPrompt={`Quiero cambiar ${amount || 'un monto'} de ${from} a ${to}. Ayúdame a prepararlo.`}
            explanationSteps={[
              'Abre la lista de Tú entregas y escoge el activo que quieres cambiar.',
              'Escribe el monto y luego elige, en la segunda lista, el activo que quieres recibir.',
              'Movya mostrará la cotización, el mínimo recibido y cualquier comisión antes de confirmar.',
              'Nada se cambiará hasta que revises y apruebes el resumen final.',
            ]}
            explanationTitle="Cómo cambiar activos"
            question="¿Necesitas ayuda para cambiar tus activos?"
          />
        </View>
      </ScrollView>

      <Modal animationType="slide" onRequestClose={() => setFromOpen(false)} transparent visible={fromOpen}>
        <Pressable onPress={() => setFromOpen(false)} style={styles.backdrop} />
        <View style={styles.sheet}><View style={styles.sheetHandle} /><Text style={styles.sheetTitle}>Activo que entregas</Text><TokenSelector onChange={chooseFrom} value={from} /></View>
      </Modal>
      <Modal animationType="slide" onRequestClose={() => setToOpen(false)} transparent visible={toOpen}>
        <Pressable onPress={() => setToOpen(false)} style={styles.backdrop} />
        <View style={styles.sheet}><View style={styles.sheetHandle} /><Text style={styles.sheetTitle}>Activo que recibes</Text><TokenSelector onChange={chooseTo} value={to} /></View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#D8E1EB' },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, paddingBottom: 44 },
  label: { color: colors.text, fontSize: 13, fontWeight: '800', marginTop: 18, marginBottom: 9 },
  assetBox: { minHeight: 64, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.88)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.96)', borderRadius: 20, paddingHorizontal: 13, shadowColor: colors.navy, shadowOpacity: 0.14, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  assetDot: { width: 37, height: 37, borderRadius: 13, marginRight: 11, alignItems: 'center', justifyContent: 'center' },
  assetInitial: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  assetCopy: { flex: 1 },
  assetName: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  assetNetwork: { color: colors.muted, fontSize: 9, marginTop: 2 },
  code: { color: colors.ink, fontSize: 12, fontWeight: '900', marginRight: 7 },
  amountBox: { height: 76, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(235,245,255,0.94)', borderWidth: 1.5, borderColor: '#BCD5F5', borderRadius: 21, paddingLeft: 15, paddingRight: 10, marginTop: 10, shadowColor: colors.navy, shadowOpacity: 0.14, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  amountInput: { flex: 1, minWidth: 0, color: colors.ink, fontSize: 30, fontWeight: '800', paddingHorizontal: 0 },
  amountToken: { width: 70, height: 43, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.88)', borderWidth: 1, borderColor: '#C8DDF6', alignItems: 'center', justifyContent: 'center' },
  amountTokenText: { color: colors.brandDark, fontSize: 12, fontWeight: '900' },
  switch: { width: 46, height: 46, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 2, borderColor: '#CDE0FA', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginVertical: -2, zIndex: 2, shadowColor: colors.navy, shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  outputBox: { height: 76, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(225,239,255,0.95)', borderWidth: 1.5, borderColor: '#AFCDF4', borderRadius: 21, paddingLeft: 15, paddingRight: 10, marginTop: 10, shadowColor: colors.navy, shadowOpacity: 0.14, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  output: { flex: 1, color: colors.ink, fontSize: 30, fontWeight: '800' },
  outputToken: { borderColor: '#B9D5F7' },
  rate: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  rateLabel: { color: colors.muted, fontSize: 11 },
  rateValue: { color: colors.text, fontSize: 11, fontWeight: '700' },
  button: { height: 56, borderRadius: 18, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginTop: 30, shadowColor: colors.brandDark, shadowOpacity: 0.25, shadowRadius: 13, shadowOffset: { width: 0, height: 7 }, elevation: 5 },
  contextHelp: { marginTop: 24 },
  disabled: { backgroundColor: '#BAC5D5', shadowOpacity: 0.05 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  backdrop: { flex: 1, backgroundColor: 'rgba(5,16,35,0.42)' },
  sheet: { backgroundColor: '#F8FBFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 22, paddingBottom: 30, shadowColor: colors.navy, shadowOpacity: 0.22, shadowRadius: 24, shadowOffset: { width: 0, height: -8 }, elevation: 8 },
  sheetHandle: { width: 42, height: 5, borderRadius: 3, backgroundColor: '#CDD8E7', alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
});
