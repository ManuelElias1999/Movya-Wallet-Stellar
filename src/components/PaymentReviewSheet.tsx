import { Text } from '@/i18n/primitives';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/PressableScale';
import { useTestnetWallet } from '@/context/TestnetWalletContext';
import { checkSubmission, SubmissionUnknownError, submitPayment, type PaymentReceipt, type PaymentReview } from '@/services/stellar/payments';
import { paymentReviewSecondsRemaining } from '@/services/transferPresentation';
import { colors } from '@/theme/tokens';

export function PaymentReviewSheet({ review, onClose, onSuccess }: { review: PaymentReview | null; onClose: () => void; onSuccess: (receipt: PaymentReceipt) => void }) {
  const wallet = useTestnetWallet();
  const insets = useSafeAreaInsets();
  const lock = useRef(false);
  const sent = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [unknownHash, setUnknownHash] = useState<string | null>(null);
  const [nowSeconds, setNowSeconds] = useState(() => Math.floor(Date.now() / 1000));
  const secondsRemaining = paymentReviewSecondsRemaining(review?.expiresAt ?? 0, nowSeconds);
  const expired = Boolean(review && secondsRemaining === 0);

  useEffect(() => {
    setNowSeconds(Math.floor(Date.now() / 1000));
    const timer = setInterval(() => setNowSeconds(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(timer);
  }, [review?.expiresAt]);

  const close = () => { if (!lock.current && !unknownHash) onClose(); };
  const submit = async () => {
    if (!review || lock.current || sent.current || unknownHash) return;
    if (expired) { setError('Esta revisión expiró. Vuelve al envío para generar una nueva.'); return; }
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
          <View style={styles.titleRow}><View><Text style={styles.eyebrow}>CONFIRMACIÓN FINAL</Text><Text style={styles.title}>Revisa tu transferencia</Text></View><View style={styles.secureIcon}><Ionicons name="shield-checkmark" size={22} color={colors.brand} /></View></View>
          <View style={styles.amountCard}><Text style={styles.amountLabel}>ENVIARÁS</Text><Text translate={false} style={styles.amount}>{review?.amount} <Text translate={false} style={styles.asset}>{review?.asset}</Text></Text></View>

          <View style={styles.detailCard}>
            <View style={styles.detailHeading}><Ionicons name="arrow-forward-circle-outline" size={19} color={colors.brand} /><Text style={styles.detailTitle}>Destinatario</Text></View>
            <Text translate={false} selectable style={styles.address}>{review?.destination}</Text>
            <View style={styles.divider} />
            <Text style={styles.label}>Desde tu wallet</Text><Text translate={false} selectable style={styles.address}>{review?.source}</Text>
          </View>

          <View style={styles.metadataCard}>
            <View style={styles.metadataRow}><Text style={styles.metadataLabel}>Red</Text><Text style={styles.metadataValue}>Stellar Testnet</Text></View>
            <View style={styles.metadataRow}><Text style={styles.metadataLabel}>Comisión de red</Text><Text translate={false} style={styles.metadataValue}>{review?.fee} XLM</Text></View>
            {review?.issuer ? <><View style={styles.divider} /><Text style={styles.label}>Emisor verificado de USDC</Text><Text translate={false} selectable style={styles.address}>{review.issuer}</Text></> : null}
          </View>

          <View style={[styles.expiry, expired && styles.expiryExpired]}><Ionicons name={expired ? 'alert-circle' : 'time-outline'} size={18} color={expired ? '#B52D42' : colors.brand} /><Text accessibilityLiveRegion="polite" style={[styles.expiryText, expired && styles.expiryTextExpired]}>{expired ? 'La revisión expiró. Regresa para actualizarla.' : `Esta revisión vence en ${secondsRemaining} s`}</Text></View>
          <Text style={styles.note}>Movya firmará y enviará exactamente estos datos desde tu dispositivo. Verifica el monto y el destinatario antes de continuar.</Text>
          {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
          {busy ? <ActivityIndicator color={colors.brand} style={{ marginTop: 18 }} /> : null}
          {unknownHash ? <>
            <PressableScale disabled={busy} onPress={() => void verify()} style={styles.primary}><Text style={styles.primaryText}>Verificar estado</Text></PressableScale>
            <PressableScale onPress={() => void Linking.openURL(`https://stellar.expert/explorer/testnet/tx/${unknownHash}`)} style={styles.secondary}><Text style={styles.secondaryText}>Abrir transacción</Text></PressableScale>
          </> : <>
            <PressableScale disabled={busy || sent.current || expired} onPress={() => void submit()} style={[styles.primary, expired && styles.primaryDisabled]}><Text style={styles.primaryText}>{busy ? 'Enviando…' : expired ? 'Revisión expirada' : 'Confirmar y enviar'}</Text></PressableScale>
            <PressableScale disabled={busy} onPress={close} style={styles.secondary}><Text style={styles.secondaryText}>Cancelar</Text></PressableScale>
          </>}
        </ScrollView>
      </View></View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(5,16,35,0.48)', justifyContent: 'flex-end' }, sheet: { padding: 24, backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%', width: '100%', maxWidth: 760, alignSelf: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, eyebrow: { color: colors.brand, fontSize: 9, fontWeight: '900', letterSpacing: 0.8, marginBottom: 4 }, title: { fontSize: 20, fontWeight: '800', color: colors.ink }, secureIcon: { width: 43, height: 43, borderRadius: 15, backgroundColor: '#E8F1FF', alignItems: 'center', justifyContent: 'center' },
  amountCard: { backgroundColor: '#EDF5FF', borderRadius: 20, padding: 18, marginTop: 20, borderWidth: 1, borderColor: '#CFE1F8' }, amountLabel: { color: colors.brand, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 }, amount: { fontSize: 30, fontWeight: '900', color: colors.ink, marginTop: 6 }, asset: { fontSize: 17, color: colors.brandDark },
  detailCard: { backgroundColor: '#FFF', borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 15, marginTop: 14 }, detailHeading: { flexDirection: 'row', alignItems: 'center', gap: 7 }, detailTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' }, metadataCard: { backgroundColor: '#F7F9FC', borderRadius: 18, padding: 15, marginTop: 12 }, metadataRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginVertical: 4 }, metadataLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' }, metadataValue: { color: colors.ink, fontSize: 12, fontWeight: '800' }, divider: { height: 1, backgroundColor: colors.border, marginVertical: 13 },
  label: { fontSize: 10, fontWeight: '700', color: colors.muted, marginTop: 2 }, address: { fontSize: 11, lineHeight: 17, color: colors.ink, marginTop: 6 }, expiry: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 14, backgroundColor: '#EAF3FF', marginTop: 14 }, expiryExpired: { backgroundColor: '#FCECEF' }, expiryText: { flex: 1, color: colors.brandDark, fontSize: 11, fontWeight: '800' }, expiryTextExpired: { color: '#B52D42' }, note: { fontSize: 11, lineHeight: 18, color: colors.muted, marginTop: 14 }, error: { color: '#B52D42', fontSize: 12, lineHeight: 19, marginTop: 16 },
  primary: { minHeight: 52, backgroundColor: colors.brand, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 20 }, primaryDisabled: { backgroundColor: '#AAB6C6' }, primaryText: { color: '#fff', fontSize: 15, fontWeight: '800' }, secondary: { minHeight: 45, alignItems: 'center', justifyContent: 'center', marginTop: 9 }, secondaryText: { fontSize: 13, color: colors.brandDark, fontWeight: '700' },
});
