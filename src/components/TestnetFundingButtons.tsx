import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, StyleSheet, Text, View } from 'react-native';
import { useTestnetWallet } from '@/context/TestnetWalletContext';
import { assetBalance, enableUSDC, fundTestnetAccount, readTestnetAccount, SubmissionUnknownError } from '@/services/stellar/payments';
import { colors } from '@/theme/tokens';
import { PressableScale } from './PressableScale';

export function TestnetFundingButtons() {
  const wallet = useTestnetWallet(); const router = useRouter();
  const lock = useRef(false); const [busy, setBusy] = useState<'XLM' | 'USDC' | null>(null); const [message, setMessage] = useState('');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void wallet.refresh(); });
    return () => subscription.remove();
  }, [wallet.refresh]);
  const request = async (asset: 'XLM' | 'USDC') => {
    if (lock.current) return;
    if (!wallet.publicKey) { router.push('/testnet-wallet'); return; }
    lock.current = true; setBusy(asset); setMessage('');
    try {
      if (asset === 'XLM') {
        await fundTestnetAccount(wallet.publicKey);
        await wallet.refresh(); setMessage('Solicitud de XLM completada. Revisa tu saldo actualizado.');
      } else {
        const current = await readTestnetAccount(wallet.publicKey);
        if (!assetBalance(current, 'USDC')) {
          setMessage('Habilitando tu wallet para recibir USDC de prueba…');
          await enableUSDC(wallet.publicKey, wallet.sign);
        }
        await Clipboard.setStringAsync(wallet.publicKey);
        await Linking.openURL('https://faucet.circle.com/');
        setMessage('Dirección copiada. En Circle elige USDC y Stellar Testnet, pega tu dirección y solicita los fondos. Al volver, actualiza el saldo.');
        await wallet.refresh();
      }
    } catch (e) {
      if (e instanceof SubmissionUnknownError) setMessage('Todavía no sabemos si se habilitó USDC. Actualiza el saldo antes de volver a intentarlo.');
      else setMessage(e instanceof Error ? e.message : 'No pudimos solicitar los fondos.');
    } finally { lock.current = false; setBusy(null); }
  };
  return <View style={styles.container}>
    <View style={styles.row}>{(['XLM', 'USDC'] as const).map(asset => <PressableScale key={asset} accessibilityLabel={`Pedir fondos de prueba en ${asset}`} disabled={Boolean(busy) || !wallet.initialized} onPress={() => void request(asset)} style={[styles.button, busy && styles.disabled]}>
      <Ionicons name="download-outline" size={18} color={colors.brand} /><Text style={styles.label}>{busy === asset ? 'Solicitando…' : `Pedir fondos en ${asset}`}</Text>
    </PressableScale>)}</View>
    {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({
  container: { marginTop: 20 }, row: { flexDirection: 'row', gap: 10 },
  button: { flex: 1, minHeight: 54, paddingHorizontal: 10, paddingVertical: 12, borderRadius: 16, backgroundColor: '#E8F2FF', borderWidth: 1, borderColor: '#B8D2F1', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  label: { flexShrink: 1, color: colors.brandDark, fontSize: 12, fontWeight: '800', textAlign: 'center' },
  hint: { fontSize: 10, color: colors.muted, textAlign: 'center', marginTop: 8 },
  message: { fontSize: 12, lineHeight: 19, color: colors.brandDark, marginTop: 10 }, disabled: { opacity: 0.5 },
});
