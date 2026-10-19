import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';
import { Pressable, Text } from '@/i18n/primitives';
import type { ChatPaymentState, createChatPaymentFlow } from '@/services/chatPayment';
import { colors } from '@/theme/tokens';

export function ChatPaymentCard({ state, flow }: { state: ChatPaymentState; flow: ReturnType<typeof createChatPaymentFlow> }) {
  if (state.phase === 'idle') return null;
  const { review, request, receipt } = state;
  const busy = state.phase === 'preparing' || state.phase === 'submitting';
  return <View style={styles.card} accessibilityLiveRegion="polite">
    <Text style={styles.title}>{state.phase === 'success' ? 'Transacción exitosa' : state.phase === 'choosing' ? 'Elegir contacto' : 'Revisa tu transferencia'}</Text>
    {request ? <Text style={styles.amount}>{review?.amount ?? request.amount} {request.token}</Text> : null}
    {state.phase === 'choosing' ? <>
      <Text style={styles.copy}>Tienes varias personas con ese nombre. Elige a quién quieres enviar.</Text>
      {state.choices?.map(contact => <Pressable accessibilityRole="button" key={contact.id} onPress={() => void flow.start(request!, contact.id)} style={styles.secondary}>
        <Text translate={false} style={styles.title}>{contact.name}</Text><Text translate={false} style={styles.address}>{contact.handle}</Text>
      </Pressable>)}
      <Pressable accessibilityRole="button" onPress={() => flow.cancel()} style={styles.secondary}><Text>Cancelar</Text></Pressable>
    </> : null}
    {review ? <>
      <Text style={styles.label}>Destinatario</Text><Text translate={false} style={styles.copy}>{state.recipient}</Text>
      <Text style={styles.label}>Dirección destinataria</Text><Text translate={false} selectable style={styles.address}>{review.destination}</Text>
      <Text style={styles.label}>De tu wallet</Text><Text translate={false} selectable style={styles.address}>{review.source}</Text>
      <Text style={styles.label}>Red</Text><Text style={styles.copy}>Stellar · Testnet</Text>
      {review.issuer ? <><Text style={styles.label}>Emisor de USDC</Text><Text translate={false} selectable style={styles.address}>{review.issuer}</Text></> : null}
      <Text style={styles.label}>Comisión de red</Text><Text style={styles.copy}>{review.fee} XLM</Text>
    </> : null}
    {state.phase === 'review' ? <>
      <Text style={styles.copy}>Al confirmar, Movya firma y envía esta operación desde tu dispositivo. La revisión expira en 3 minutos.</Text>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={() => flow.cancel()} style={[styles.secondary, styles.flex]}><Text>No</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => void flow.confirm()} style={[styles.primary, styles.flex]}><Text style={styles.primaryText}>Sí, confirmar</Text></Pressable>
      </View>
    </> : null}
    {busy ? <View style={styles.progress}><ActivityIndicator color={colors.brand} /><Text style={styles.copy}>{state.phase === 'preparing' ? 'Verificando…' : 'Enviando o verificando la transacción…'}</Text></View> : null}
    {state.error ? <Text style={styles.error}>{state.error}</Text> : null}
    {state.phase === 'unknown' ? <>
      <Pressable accessibilityRole="button" onPress={() => void flow.verify()} style={styles.primary}><Text style={styles.primaryText}>Verificar estado</Text></Pressable>
      <Text translate={false} selectable style={styles.address}>{review?.hash}</Text>
      <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(`https://stellar.expert/explorer/testnet/tx/${review?.hash}`)} style={styles.secondary}><Text>Abrir transacción</Text></Pressable>
    </> : null}
    {state.phase === 'success' && receipt ? <>
      <Text translate={false} selectable style={styles.address}>{receipt.hash}</Text>
      <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(receipt.explorerUrl)} style={styles.secondary}><Text>Ver comprobante en Stellar Expert</Text></Pressable>
      <Text style={styles.copy}>¿Deseas hacer algo más?</Text>
    </> : null}
  </View>;
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 22, backgroundColor: '#F8FCFF', borderWidth: 1.5, borderColor: '#BBD6FF', marginBottom: 16 },
  title: { color: colors.ink, fontSize: 15, fontWeight: '800' }, amount: { color: colors.brandDark, fontSize: 23, fontWeight: '800', marginTop: 10 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 12 }, copy: { color: colors.text, fontSize: 13, lineHeight: 19, marginTop: 6 },
  address: { color: colors.ink, fontSize: 11, lineHeight: 17, marginTop: 5 }, actions: { flexDirection: 'row', gap: 8 }, flex: { flex: 1 },
  primary: { minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 14, backgroundColor: colors.brand, marginTop: 12, padding: 10 }, primaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  secondary: { minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 14, backgroundColor: '#E8F1FF', marginTop: 12, padding: 10 },
  error: { color: '#B52D42', fontSize: 13, lineHeight: 19, marginTop: 12 }, progress: { alignItems: 'center', gap: 8, marginTop: 14 },
});
