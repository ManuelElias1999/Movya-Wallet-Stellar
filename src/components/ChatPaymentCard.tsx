import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';
import { useContacts } from '@/context/ContactsContext';
import { RecipientRiskNotice } from '@/components/RecipientRiskNotice';
import { assessRecipient } from '@/services/security/recipientRisk';
import { formatEnteredAmount } from '@/services/presentation';
import { Pressable, Text } from '@/i18n/primitives';
import type { ChatPaymentState, createChatPaymentFlow } from '@/services/chatPayment';
import { colors } from '@/theme/tokens';
import { Ionicons } from '@expo/vector-icons';

export function ChatPaymentCard({ state, flow, onCancel }: { state: ChatPaymentState; flow: ReturnType<typeof createChatPaymentFlow>; onCancel?: () => void }) {
  const { contacts } = useContacts();
  const { review, request, receipt } = state;
  const [acknowledged, setAcknowledged] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  useEffect(() => setAcknowledged(false), [review?.hash]);
  useEffect(() => setDetailsVisible(false), [receipt?.hash]);
  const risk = useMemo(() => review ? assessRecipient({ destination: review.destination, amount: review.amount, asset: review.asset, known: contacts.filter(c => c.address).map(c => ({ address: c.address!, label: c.name })) }) : null, [review, contacts]);
  if (state.phase === 'idle') return null;
  if (state.phase === 'success' && receipt && review && request) return <View style={[styles.card, styles.successCard]} accessibilityLiveRegion="polite">
    <View style={styles.successHeader}>
      <View style={styles.successIcon}><Ionicons name="checkmark" size={20} color="#FFFFFF" /></View>
      <View style={styles.successCopy}><Text style={styles.successTitle}>Enviado</Text><Text style={styles.successSummary}>{formatEnteredAmount(review.amount)} {review.asset} a {state.recipient ?? request.recipient}</Text></View>
    </View>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: detailsVisible }} onPress={() => setDetailsVisible(value => !value)} style={styles.detailsButton}>
      <Text style={styles.detailsButtonText}>{detailsVisible ? 'Ocultar detalles' : 'Ver detalles'}</Text><Ionicons name={detailsVisible ? 'chevron-up' : 'chevron-down'} size={17} color={colors.brand} />
    </Pressable>
    {detailsVisible ? <View style={styles.expandedDetails}>
      <Text style={styles.label}>Monto</Text><Text style={styles.amount}>{formatEnteredAmount(review.amount)} {review.asset}</Text>
      <Text style={styles.label}>Destinatario</Text><Text translate={false} style={styles.recipient}>{state.recipient ?? request.recipient}</Text>
      <Text style={styles.label}>Dirección destinataria completa</Text><Text translate={false} selectable style={styles.address}>{review.destination}</Text>
      <Text style={styles.label}>De tu wallet</Text><Text translate={false} selectable style={styles.address}>{review.source}</Text>
      <Text style={styles.label}>Red</Text><Text style={styles.copy}>Stellar · Testnet</Text>
      {review.issuer ? <><Text style={styles.label}>Emisor de USDC</Text><Text translate={false} selectable style={styles.address}>{review.issuer}</Text></> : null}
      <Text style={styles.label}>Comisión de red</Text><Text style={styles.copy}>{formatEnteredAmount(review.fee)} XLM</Text>
      <Text style={styles.label}>Hash de transacción</Text><Text translate={false} selectable style={styles.address}>{receipt.hash}</Text>
      <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(receipt.explorerUrl)} style={styles.secondary}><Text>Ver comprobante en Stellar Expert</Text></Pressable>
    </View> : null}
  </View>;
  const confirm = () => {
    if (risk?.needsExtraConfirmation && !acknowledged) { setAcknowledged(true); return; }
    void flow.confirm();
  };
  const busy = state.phase === 'preparing' || state.phase === 'submitting';
  const cancel = () => { if (flow.cancel()) onCancel?.(); };
  return <View style={styles.card} accessibilityLiveRegion="polite">
    <Text style={styles.title}>{state.phase === 'success' ? 'Transacción exitosa' : state.phase === 'choosing' ? 'Elegir contacto' : 'Revisa tu transferencia'}</Text>
    {request ? <View style={styles.summary}>
      <Text style={styles.summaryLabel}>Monto</Text>
      <Text style={styles.amount}>{formatEnteredAmount(review?.amount ?? request.amount)} {request.token}</Text>
      {state.recipient ? <>
        <View style={styles.summaryDivider} />
        <Text style={styles.summaryLabel}>Destinatario</Text>
        <Text translate={false} style={styles.recipient}>{state.recipient}</Text>
      </> : null}
    </View> : null}
    {state.phase === 'choosing' ? <>
      <Text style={styles.copy}>Tienes varias personas con ese nombre. Elige a quién quieres enviar.</Text>
      {state.choices?.map(contact => <Pressable accessibilityRole="button" key={contact.id} onPress={() => void flow.start(request!, contact.id)} style={styles.secondary}>
        <Text translate={false} style={styles.title}>{contact.name}</Text><Text translate={false} style={styles.address}>{contact.handle}</Text>
      </Pressable>)}
      <Pressable accessibilityRole="button" onPress={cancel} style={styles.secondary}><Text>Cancelar</Text></Pressable>
    </> : null}
    {review ? <>
      <Text style={styles.label}>Dirección destinataria completa</Text><Text translate={false} selectable style={styles.address}>{review.destination}</Text>
      {risk ? <RecipientRiskNotice risk={risk} destination={review.destination} /> : null}
      <Text style={styles.label}>De tu wallet</Text><Text translate={false} selectable style={styles.address}>{review.source}</Text>
      <Text style={styles.label}>Red</Text><Text style={styles.copy}>Stellar · Testnet</Text>
      {review.issuer ? <><Text style={styles.label}>Emisor de USDC</Text><Text translate={false} selectable style={styles.address}>{review.issuer}</Text></> : null}
      <Text style={styles.label}>Comisión de red</Text><Text style={styles.copy}>{formatEnteredAmount(review.fee)} XLM</Text>
    </> : null}
    {state.phase === 'review' ? <>
      <Text style={styles.copy}>Al confirmar, Movya firma y envía esta operación desde tu dispositivo. La revisión expira en 3 minutos.</Text>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={cancel} style={[styles.secondary, styles.flex]}><Text>No</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={confirm} style={[styles.primary, styles.flex]}><Text style={styles.primaryText}>{risk?.needsExtraConfirmation && !acknowledged ? 'Revisé la dirección' : 'Sí, confirmar'}</Text></Pressable>
      </View>
    </> : null}
    {busy ? <View style={styles.progress}><ActivityIndicator color={colors.brand} /><Text style={styles.copy}>{state.phase === 'preparing' ? 'Verificando…' : 'Enviando o verificando la transacción…'}</Text></View> : null}
    {state.error ? <Text style={styles.error}>{state.error}</Text> : null}
    {state.phase === 'unknown' ? <>
      <Pressable accessibilityRole="button" onPress={() => void flow.verify()} style={styles.primary}><Text style={styles.primaryText}>Verificar estado</Text></Pressable>
      <Text translate={false} selectable style={styles.address}>{review?.hash}</Text>
      <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(`https://stellar.expert/explorer/testnet/tx/${review?.hash}`)} style={styles.secondary}><Text>Abrir transacción</Text></Pressable>
    </> : null}
  </View>;
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 22, backgroundColor: '#F8FCFF', borderWidth: 1.5, borderColor: '#BBD6FF', marginBottom: 16 },
  title: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  summary: { backgroundColor: '#E8F2FF', borderWidth: 1.5, borderColor: '#AFCFFF', borderRadius: 18, padding: 15, marginTop: 12 },
  summaryLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.7, textTransform: 'uppercase' },
  amount: { color: colors.brandDark, fontSize: 31, lineHeight: 38, fontWeight: '900', marginTop: 3 },
  summaryDivider: { height: 1, backgroundColor: '#C3D9F3', marginVertical: 12 },
  recipient: { color: colors.ink, fontSize: 21, lineHeight: 27, fontWeight: '900', marginTop: 3 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 12 }, copy: { color: colors.text, fontSize: 13, lineHeight: 19, marginTop: 6 },
  address: { color: colors.ink, fontSize: 11, lineHeight: 17, marginTop: 5 }, actions: { flexDirection: 'row', gap: 8 }, flex: { flex: 1 },
  primary: { minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 14, backgroundColor: colors.brand, marginTop: 12, padding: 10 }, primaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  secondary: { minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 14, backgroundColor: '#E8F1FF', marginTop: 12, padding: 10 },
  error: { color: '#B52D42', fontSize: 13, lineHeight: 19, marginTop: 12 }, progress: { alignItems: 'center', gap: 8, marginTop: 14 },
  successCard: { padding: 13 }, successHeader: { flexDirection: 'row', alignItems: 'center' }, successIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: colors.positive, alignItems: 'center', justifyContent: 'center' }, successCopy: { flex: 1, marginLeft: 11 }, successTitle: { color: colors.positive, fontSize: 15, fontWeight: '900' }, successSummary: { color: colors.ink, fontSize: 12, lineHeight: 17, marginTop: 2, fontWeight: '700' }, detailsButton: { minHeight: 38, marginTop: 9, borderRadius: 12, backgroundColor: '#E8F1FF', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, detailsButtonText: { color: colors.brand, fontSize: 12, fontWeight: '800' }, expandedDetails: { borderTopWidth: 1, borderTopColor: '#D3E2F2', marginTop: 12, paddingTop: 2 },
});
