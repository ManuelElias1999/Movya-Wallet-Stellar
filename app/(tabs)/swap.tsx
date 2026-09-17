import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageHeader } from '@/components/PageHeader';
import { MovyaContextHelp } from '@/components/MovyaContextHelp';
import { colors } from '@/theme/tokens';

export default function SwapScreen() {
  const [from, setFrom] = useState('USDC');
  const [amount, setAmount] = useState('');
  const to = from === 'USDC' ? 'XLM' : 'USDC';
  const switchAssets = () => setFrom(to);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <PageHeader subtitle="Vista previa sin operación real" title="Cambiar dinero" />
      <ScrollView contentContainerStyle={styles.content}>
        <MovyaContextHelp
          actionPrompt="Ayúdame a preparar un cambio de activos"
          explainPrompt="Explícame cómo funciona el cambio de activos"
          question="¿Necesitas ayuda para cambiar tus activos?"
        />
        <Text style={styles.label}>Tú entregas</Text>
        <View style={styles.assetBox}>
          <View style={[styles.assetDot, from === 'USDC' ? styles.usdc : styles.xlm]} /><Text style={styles.assetName}>{from === 'USDC' ? 'USD digital' : 'Stellar'}</Text><Text style={styles.code}>{from}</Text>
        </View>
        <View style={styles.amountBox}><TextInput keyboardType="decimal-pad" onChangeText={setAmount} placeholder="0.00" placeholderTextColor="#A7B2C5" style={styles.amountInput} value={amount} /><Text style={styles.code}>{from}</Text></View>
        <Pressable onPress={switchAssets} style={styles.switch}><Ionicons name="swap-vertical" size={22} color={colors.brand} /></Pressable>
        <Text style={styles.label}>Tú recibes</Text>
        <View style={styles.assetBox}>
          <View style={[styles.assetDot, to === 'USDC' ? styles.usdc : styles.xlm]} /><Text style={styles.assetName}>{to === 'USDC' ? 'USD digital' : 'Stellar'}</Text><Text style={styles.code}>{to}</Text>
        </View>
        <View style={styles.outputBox}><Text style={styles.output}>{amount ? '—' : '0.00'}</Text><Text style={styles.code}>{to}</Text></View>
        <View style={styles.rate}><Text style={styles.rateLabel}>Tipo de cambio estimado</Text><Text style={styles.rateValue}>Disponible al conectar Stellar DEX</Text></View>
        <Pressable disabled={!amount} onPress={() => Alert.alert('Vista previa', 'La cotización y confirmación se conectarán en una fase posterior.')} style={[styles.button, !amount && styles.disabled]}><Text style={styles.buttonText}>Revisar cambio</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, content: { padding: 20, paddingBottom: 40 }, label: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 18, marginBottom: 9 },
  assetBox: { height: 58, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, paddingHorizontal: 14 }, assetDot: { width: 32, height: 32, borderRadius: 11, marginRight: 11 }, usdc: { backgroundColor: '#2775CA' }, xlm: { backgroundColor: colors.navy }, assetName: { flex: 1, color: colors.ink, fontSize: 14, fontWeight: '700' }, code: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  amountBox: { height: 86, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 17, marginTop: 10 }, amountInput: { flex: 1, color: colors.ink, fontSize: 34, fontWeight: '800' },
  switch: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.brandSoft, borderWidth: 4, borderColor: colors.background, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginVertical: -5, zIndex: 2 },
  outputBox: { height: 86, flexDirection: 'row', alignItems: 'center', backgroundColor: '#EDF2F8', borderRadius: 20, paddingHorizontal: 17, marginTop: 10 }, output: { flex: 1, color: colors.ink, fontSize: 34, fontWeight: '800' },
  rate: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }, rateLabel: { color: colors.muted, fontSize: 11 }, rateValue: { color: colors.text, fontSize: 11, fontWeight: '700' },
  button: { height: 56, borderRadius: 18, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginTop: 30 }, disabled: { backgroundColor: '#BAC5D5' }, buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
