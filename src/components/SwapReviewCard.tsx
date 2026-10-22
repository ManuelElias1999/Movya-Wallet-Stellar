import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';
import { Pressable, Text } from '@/i18n/primitives';
import { type createSwapFlow, type SwapState } from '@/services/swapFlow';
import { USDC_ISSUER } from '@/services/stellar/payments';
import { colors } from '@/theme/tokens';
import { formatEnteredAmount, formatReceivedAmount } from '@/services/presentation';

export function SwapReviewCard({ state, flow, onCancel }: { state: SwapState; flow: ReturnType<typeof createSwapFlow>; onCancel?: () => void }) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    if (state.phase !== 'review') return;
    setNow(Math.floor(Date.now() / 1000));
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(timer);
  }, [state.phase, state.review?.expiresAt]);
  if (state.phase === 'idle') return null;
  const { review, receipt } = state;
  const expired = review ? now >= review.expiresAt : false;
  const cancel = () => { if (flow.clear()) onCancel?.(); };
  return <View style={styles.card} accessibilityLiveRegion="polite">
    <Text style={styles.title}>{state.phase === 'success' ? 'Cambio confirmado' : 'Revisa tu cambio'}</Text>
    {state.phase === 'quoting' || state.phase === 'submitting' ? <View style={styles.progress}><ActivityIndicator color={colors.brand} /><Text>{state.phase === 'quoting' ? 'Buscando cotización en Stellar…' : 'Enviando o verificando la transacción…'}</Text></View> : null}
    {review ? <>
      <Text style={styles.label}>Tú entregas</Text><Text style={styles.amount}>{formatEnteredAmount(review.amount)} {review.from}</Text>
      <Text style={styles.label}>Monto que se cambia</Text><Text style={styles.value}>{formatEnteredAmount(review.swapAmount)} {review.from}</Text>
      <Text style={styles.label}>Comisión de Movya (0,5 %)</Text><Text style={styles.value}>{formatEnteredAmount(review.appFee)} {review.from}</Text>
      <Text style={styles.note}>La comisión de Movya ya está incluida en el monto que entregas.</Text>
      <Text style={styles.label}>Recibes aproximadamente</Text><Text style={styles.amount}>{formatReceivedAmount(review.estimated)} {review.to}</Text>
      <Text style={styles.label}>Comisión máxima de red</Text><Text style={styles.value}>{formatEnteredAmount(review.fee)} XLM</Text>
      <Text style={styles.label}>Red</Text><Text style={styles.value}>Stellar DEX · Testnet</Text>
      <Text style={styles.label}>Tu wallet recibe el cambio</Text><Text translate={false} selectable style={styles.address}>{review.source}</Text>
      <Text style={styles.label}>Wallet de Movya</Text><Text translate={false} selectable style={styles.address}>{review.treasury}</Text>
      <Text style={styles.label}>Emisor de USDC</Text><Text translate={false} selectable style={styles.address}>{USDC_ISSUER}</Text>
      {state.phase === 'review' ? <>
        <Text style={styles.note}>{expired ? 'La cotización expiró. Actualízala antes de confirmar.' : 'Esta cotización dura 60 segundos. Nada se cambia hasta que confirmes.'}</Text>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" onPress={cancel} style={[styles.secondary, styles.flex]}><Text>No</Text></Pressable>
          <Pressable accessibilityRole="button" disabled={expired} accessibilityState={{ disabled: expired }} onPress={() => void flow.confirm()} style={[styles.primary, styles.flex, expired && styles.disabled]}><Text style={styles.primaryText}>Sí, cambiar</Text></Pressable>
        </View>
      </> : null}
    </> : null}
    {state.error ? <Text style={styles.error}>{state.error}</Text> : null}
    {(state.phase === 'review' || state.phase === 'error') && state.input ? <Pressable accessibilityRole="button" onPress={() => void flow.start(state.input!)} style={styles.secondary}><Text>Actualizar cotización</Text></Pressable> : null}
    {state.phase === 'unknown' ? <>
      <Text translate={false} selectable style={styles.address}>{review?.hash}</Text>
      <Pressable accessibilityRole="button" onPress={() => void flow.verify()} style={styles.primary}><Text style={styles.primaryText}>Verificar estado</Text></Pressable>
      <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(`https://stellar.expert/explorer/testnet/tx/${review?.hash}`)} style={styles.secondary}><Text>Abrir transacción</Text></Pressable>
    </> : null}
    {state.phase === 'success' && receipt ? <>
      <Text translate={false} selectable style={styles.address}>{receipt.hash}</Text>
      <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(receipt.explorerUrl)} style={styles.secondary}><Text>Ver comprobante en Stellar Expert</Text></Pressable>
      <Text style={styles.note}>¿Deseas hacer algo más?</Text>
    </> : null}
  </View>;
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, padding: 16, marginVertical: 14, backgroundColor: '#F8FCFF', borderWidth: 1.5, borderColor: '#BBD6FF' },
  title: { color: colors.ink, fontSize: 18, fontWeight: '800' }, label: { color: colors.muted, fontSize: 11, marginTop: 14 }, amount: { color: colors.brandDark, fontSize: 23, fontWeight: '800', marginTop: 5 }, value: { color: colors.ink, fontSize: 14, marginTop: 5 },
  address: { color: colors.ink, fontSize: 11, lineHeight: 17, marginTop: 5 }, note: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 12 }, error: { color: '#B52D42', fontSize: 13, lineHeight: 19, marginTop: 12 },
  progress: { alignItems: 'center', gap: 10, marginTop: 14 }, actions: { flexDirection: 'row', gap: 8 }, flex: { flex: 1 },
  primary: { minHeight: 46, justifyContent: 'center', alignItems: 'center', padding: 10, backgroundColor: colors.brand, borderRadius: 14, marginTop: 12 }, primaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  secondary: { minHeight: 44, justifyContent: 'center', alignItems: 'center', padding: 10, borderRadius: 14, backgroundColor: '#E8F1FF', marginTop: 12 }, disabled: { backgroundColor: '#BAC5D5' },
});
