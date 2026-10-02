import { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { ActivityRow } from '@/components/ActivityRow';
import { PressableScale } from '@/components/PressableScale';
import { useTestnetWallet } from '@/context/TestnetWalletContext';
import { getPaymentHistory, type PaymentRecord } from '@/services/stellar/payments';
import { colors } from '@/theme/tokens';

export function TestnetPaymentHistory({ hidden = false }: { hidden?: boolean }) {
  const wallet = useTestnetWallet();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    setPayments([]); setError('');
    if (wallet.publicKey && wallet.account) {
      setLoading(true);
      void getPaymentHistory(wallet.publicKey).then((records) => { if (active) setPayments(records); })
        .catch(() => { if (active) setError('No se pudo consultar el historial. Actualiza el balance para reintentar.'); })
        .finally(() => { if (active) setLoading(false); });
    }
    return () => { active = false; };
  }, [wallet.publicKey, wallet.account]);
  return <View>
    {!payments.length ? <Text style={styles.empty}>{loading ? 'Cargando movimientos…' : error || 'Tus transferencias de Testnet aparecerán aquí.'}</Text> : null}
    {payments.map((payment) => {
      const received = payment.to === wallet.publicKey;
      const other = received ? payment.from : payment.to;
      return <PressableScale accessibilityLabel="Ver transacción en Stellar Expert" key={payment.id} onPress={() => void Linking.openURL(`https://stellar.expert/explorer/testnet/tx/${payment.transaction_hash}`)}>
        <ActivityRow hidden={hidden} type={received ? 'Recibiste' : 'Enviaste'} detail={`${received ? 'De' : 'A'} ${other === wallet.oualiAddress ? 'Ouali' : `${other.slice(0, 5)}…${other.slice(-4)}`}`} amount={`${received ? '+' : '-'} ${payment.amount} ${payment.asset_type === 'native' ? 'XLM' : payment.asset_code}`} time={new Date(payment.created_at).toLocaleString()} positive={received} />
      </PressableScale>;
    })}
  </View>;
}

const styles = StyleSheet.create({ empty: { color: colors.muted, fontSize: 12, lineHeight: 19, paddingVertical: 18 } });
