import type { ThemeColors } from '@/theme/tokens';
import { useThemedStyles } from '@/theme/Theme';
import { Text } from '@/i18n/primitives';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, StyleSheet, View } from 'react-native';
import { useTestnetWallet } from '@/context/TestnetWalletContext';
import { assetBalance, enableUSDC, fundTestnetAccount, readTestnetAccount, SubmissionUnknownError } from '@/services/stellar/payments';

import { PressableScale } from './PressableScale';
import { NavigationGlass } from './NavigationGlass';

export function TestnetFundingButtons() {
  const { styles } = useThemedStyles(createStyles);
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
          await enableUSDC(wallet.publicKey, wallet.signTrustline, wallet.signerPublicKey ?? wallet.publicKey);
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
      <NavigationGlass style={styles.surface}><Ionicons name="download-outline" size={18} color="#FFFFFF" /><Text style={styles.label}>{busy === asset ? 'Solicitando…' : `Pedir fondos en ${asset}`}</Text></NavigationGlass>
    </PressableScale>)}</View>
    {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}
  </View>;
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { marginTop: 14 }, row: { flexDirection: 'row', gap: 10 },
  button: { flex: 1, borderRadius: 999, backgroundColor: 'transparent', shadowColor: '#00123F', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  surface: { minHeight: 46, width: '100%', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  label: { flexShrink: 1, color: '#FFFFFF', fontSize: 11, fontWeight: '800', textAlign: 'center' },
  hint: { fontSize: 10, color: colors.muted, textAlign: 'center', marginTop: 8 },
  message: { fontSize: 12, lineHeight: 19, color: colors.brandDark, marginTop: 10 }, disabled: { opacity: 0.5 },
});
