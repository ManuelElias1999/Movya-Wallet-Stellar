import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageHeader } from '@/components/PageHeader';
import { PressableScale } from '@/components/PressableScale';
import { useTestnetWallet } from '@/context/TestnetWalletContext';
import { assetBalance, SubmissionUnknownError } from '@/services/stellar/payments';
import { useAuth } from '@/context/AuthContext';
import { TestnetFundingButtons } from '@/components/TestnetFundingButtons';
import { colors } from '@/theme/tokens';

export default function TestnetWalletScreen() {
  const wallet = useTestnetWallet();
  const auth = useAuth();
  const router = useRouter();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [ouali, setOuali] = useState(wallet.oualiAddress);
  const run = async (action: () => Promise<unknown>, success: string) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setMessage('');
    try { await action(); await wallet.refresh(); setMessage(success); }
    catch (failure) {
      if (failure instanceof SubmissionUnknownError) { await wallet.refresh(); setMessage('Actualiza el balance para comprobar si USDC ya se habilitó.'); }
      else setMessage(failure instanceof Error ? failure.message : 'No se pudo completar la acción.');
    } finally { lock.current = false; setBusy(false); }
  };
  const disabled = busy || !wallet.initialized;
  const usdc = wallet.account ? assetBalance(wallet.account, 'USDC') : undefined;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <PageHeader title="Wallet de pruebas" subtitle="Stellar Testnet · sin dinero real" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>Tu primera transferencia</Text>
          <Text style={styles.copy}>Crea una cuenta de pruebas, actívala con XLM y habilita USDC. Las operaciones se firman en tu dispositivo.</Text>
          <Text style={styles.notice}>{auth.user ? 'Tu wallet está vinculada a tu correo. Al ingresar en otro dispositivo, usa tu contraseña para recuperarla.' : 'Tu wallet de pruebas se guarda en este dispositivo. Podrás vincularla a tu correo al crear tu cuenta.'} {Platform.OS === 'web' ? 'En web tendrás que ingresar nuevamente para abrirla después de recargar.' : ''}</Text>
          {!wallet.publicKey ? <PressableScale disabled={disabled || Boolean(wallet.error)} onPress={() => void run(wallet.create, 'Cuenta creada. Ahora solicita XLM de prueba.')} style={styles.button}><Text style={styles.buttonText}>1. Crear wallet de Testnet</Text></PressableScale> : <>
            <Text selectable style={styles.address}>{wallet.publicKey}</Text>
            <PressableScale disabled={disabled} onPress={() => void run(() => Clipboard.setStringAsync(wallet.publicKey!), 'Dirección copiada.')} style={styles.secondary}><Text style={styles.secondaryText}>Copiar mi dirección</Text></PressableScale>
            <View style={styles.balances}><Text style={styles.copy}>XLM: {wallet.account ? assetBalance(wallet.account, 'XLM')?.balance ?? '0' : '—'}</Text><Text style={styles.copy}>USDC: {usdc?.balance ?? 'Sin habilitar'}</Text></View>
            <TestnetFundingButtons />
            <PressableScale disabled={disabled} onPress={() => void run(wallet.refresh, 'Balance actualizado.')} style={styles.secondary}><Text style={styles.secondaryText}>Actualizar balance</Text></PressableScale>
          </>}
          {busy || wallet.loading ? <ActivityIndicator color={colors.brand} style={{ marginTop: 14 }} /> : null}
          {message || wallet.error ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{message || wallet.error}</Text> : null}
        </View>
        {wallet.publicKey ? <View style={styles.card}>
          <Text style={styles.title}>Conecta a Ouali</Text>
          <Text style={styles.copy}>Pega la dirección de su cuenta de Testnet. Así podrás escribir “Envía 1 USDC a Ouali” en el chat.</Text>
          <TextInput autoCapitalize="characters" autoCorrect={false} placeholder="Dirección pública G..." value={ouali} onChangeText={setOuali} style={styles.input} placeholderTextColor={colors.muted} />
          <PressableScale disabled={disabled || !ouali.trim()} onPress={() => void run(() => wallet.saveOuali(ouali), 'Ouali conectado a su dirección de Testnet.')} style={styles.secondary}><Text style={styles.secondaryText}>Guardar dirección de Ouali</Text></PressableScale>
          {wallet.oualiAddress ? <Text selectable style={styles.address}>{wallet.oualiAddress}</Text> : null}
          <PressableScale disabled={disabled} onPress={() => router.push('/send')} style={styles.button}><Ionicons color="white" name="paper-plane-outline" size={18} /><Text style={styles.buttonText}>Hacer una transferencia</Text></PressableScale>
        </View> : null}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#D8E1EB' }, content: { padding: 20, gap: 18, maxWidth: 760, width: '100%', alignSelf: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: 24, padding: 20 }, title: { fontSize: 19, fontWeight: '800', color: colors.ink },
  copy: { fontSize: 13, lineHeight: 20, color: colors.text, marginTop: 10 }, notice: { fontSize: 12, lineHeight: 19, color: colors.brandDark, marginTop: 14, backgroundColor: colors.brandSoft, borderRadius: 12, padding: 12 },
  address: { fontSize: 12, lineHeight: 20, color: colors.ink, marginTop: 16 }, balances: { marginVertical: 8 },
  button: { minHeight: 52, padding: 12, backgroundColor: colors.brand, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9, marginTop: 14 }, buttonText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  secondary: { minHeight: 48, padding: 12, backgroundColor: colors.brandSoft, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 12 }, secondaryText: { color: colors.brandDark, fontSize: 13, fontWeight: '700' }, disabled: { opacity: 0.45 },
  input: { marginTop: 16, padding: 14, minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: colors.border, color: colors.ink, backgroundColor: '#F1F6FC' },
});
