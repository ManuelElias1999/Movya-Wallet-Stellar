import { useRef, useState } from 'react';
import { ActivityIndicator, Linking, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/PressableScale';
import { useTestnetWallet } from '@/context/TestnetWalletContext';
import { checkSubmission, SubmissionUnknownError, submitPayment, type PaymentReceipt, type PaymentReview } from '@/services/stellar/payments';
import { colors } from '@/theme/tokens';

export function PaymentReviewSheet({ review, onClose, onSuccess }: { review: PaymentReview | null; onClose: () => void; onSuccess: (receipt: PaymentReceipt) => void }) {
  const wallet = useTestnetWallet();
  const insets = useSafeAreaInsets();
  const lock = useRef(false);
  const sent = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [unknownHash, setUnknownHash] = useState<string | null>(null);
  const close = () => { if (!lock.current && !unknownHash) onClose(); };
  const submit = async () => {
    if (!review || lock.current || sent.current || unknownHash) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const receipt = await submitPayment(review, wallet.sign);
      sent.current = true;
      await wallet.refresh(); onSuccess(receipt);
    } catch (failure) {
      if (failure instanceof SubmissionUnknownError) setUnknownHash(failure.hash);
      setError(failure instanceof Error ? failure.message : 'No se pudo confirmar el envío.');
    } finally { lock.current = false; setBusy(false); }
  };
  const verify = async () => {
    if (!unknownHash || lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const receipt = await checkSubmission(unknownHash);
      if (receipt) { sent.current = true; await wallet.refresh(); onSuccess(receipt); }
      else setError('La transacción todavía no aparece. Espera unos segundos y verifica otra vez.');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'No se pudo consultar la transacción.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return (
    <Modal visible={Boolean(review)} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.backdrop}><View style={[styles.sheet, { paddingBottom: Math.max(24, insets.bottom + 16) }]}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Revisa tu transferencia</Text>
          <Text style={styles.amount}>{review?.amount} {review?.asset}</Text>
          <Text style={styles.label}>De tu wallet</Text><Text selectable style={styles.address}>{review?.source}</Text>
          <Text style={styles.label}>Dirección destinataria</Text><Text selectable style={styles.address}>{review?.destination}</Text>
          <Text style={styles.label}>Red</Text><Text style={styles.value}>Stellar Testnet · tokens de prueba</Text>
          {review?.issuer ? <><Text style={styles.label}>Emisor de USDC</Text><Text selectable style={styles.address}>{review.issuer}</Text></> : null}
          <Text style={styles.label}>Comisión de red</Text><Text style={styles.value}>{review?.fee} XLM</Text>
          <Text style={styles.note}>Al confirmar, Movya firma y envía esta operación desde tu dispositivo. La revisión expira en 3 minutos.</Text>
          {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
          {busy ? <ActivityIndicator color={colors.brand} style={{ marginTop: 18 }} /> : null}
          {unknownHash ? <>
            <PressableScale disabled={busy} onPress={() => void verify()} style={styles.primary}><Text style={styles.primaryText}>Verificar estado</Text></PressableScale>
            <PressableScale onPress={() => void Linking.openURL(`https://stellar.expert/explorer/testnet/tx/${unknownHash}`)} style={styles.secondary}><Text style={styles.secondaryText}>Abrir transacción</Text></PressableScale>
          </> : <>
            <PressableScale disabled={busy || sent.current} onPress={() => void submit()} style={styles.primary}><Text style={styles.primaryText}>{busy ? 'Enviando…' : 'Confirmar y enviar'}</Text></PressableScale>
            <PressableScale disabled={busy} onPress={close} style={styles.secondary}><Text style={styles.secondaryText}>Cancelar</Text></PressableScale>
          </>}
        </ScrollView>
      </View></View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(5,16,35,0.48)', justifyContent: 'flex-end' }, sheet: { padding: 24, backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%', width: '100%', maxWidth: 760, alignSelf: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: colors.ink }, amount: { fontSize: 28, fontWeight: '800', color: colors.brandDark, marginTop: 18 },
  label: { fontSize: 11, fontWeight: '700', color: colors.muted, marginTop: 16 }, address: { fontSize: 12, lineHeight: 18, color: colors.ink, marginTop: 5 }, value: { fontSize: 13, color: colors.ink, marginTop: 5 }, note: { fontSize: 12, lineHeight: 19, color: colors.muted, marginTop: 18 }, error: { color: '#B52D42', fontSize: 12, lineHeight: 19, marginTop: 16 },
  primary: { minHeight: 52, backgroundColor: colors.brand, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 20 }, primaryText: { color: '#fff', fontSize: 15, fontWeight: '800' }, secondary: { minHeight: 45, alignItems: 'center', justifyContent: 'center', marginTop: 9 }, secondaryText: { fontSize: 13, color: colors.brandDark, fontWeight: '700' },
});
