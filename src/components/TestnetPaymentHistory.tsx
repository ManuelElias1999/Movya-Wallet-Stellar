import { Text } from '@/i18n/primitives';
import { useEffect, useMemo, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { ActivityRow } from '@/components/ActivityRow';
import { PressableScale } from '@/components/PressableScale';
import { useTestnetWallet } from '@/context/TestnetWalletContext';
import { type ActivityPeriod, type StellarActivity, filterActivityByPeriod, getActivityHistory } from '@/services/stellar/activity';
import { useContacts } from '@/context/ContactsContext';
import { formatEnteredAmount, formatReceivedAmount, paymentDescription } from '@/services/presentation';
import { colors } from '@/theme/tokens';
import { useLanguage } from '@/i18n/Language';

export function TestnetPaymentHistory({ hidden = false, limit, period = 'all' }: { hidden?: boolean; limit?: number; period?: ActivityPeriod }) {
  const { locale } = useLanguage();
  const wallet = useTestnetWallet();
  const { contacts } = useContacts();
  const [activities, setActivities] = useState<StellarActivity[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    setActivities([]); setError('');
    if (wallet.publicKey && wallet.account) {
      setLoading(true);
      void getActivityHistory(wallet.publicKey).then((records) => { if (active) setActivities(records); })
        .catch(() => { if (active) setError('No se pudo consultar el historial. Actualiza el balance para reintentar.'); })
        .finally(() => { if (active) setLoading(false); });
    }
    return () => { active = false; };
  }, [wallet.publicKey, wallet.account]);
  const visibleActivities = useMemo(() => {
    const filtered = filterActivityByPeriod(activities, period);
    return typeof limit === 'number' ? filtered.slice(0, limit) : filtered;
  }, [activities, limit, period]);
  return <View>
    {!visibleActivities.length ? <Text style={styles.empty}>{loading ? 'Cargando movimientos…' : error || (activities.length ? 'No hay movimientos en este periodo.' : 'Tus movimientos de Testnet aparecerán aquí.')}</Text> : null}
    {visibleActivities.map((activity) => {
      if (activity.kind === 'swap') return <PressableScale accessibilityLabel="Ver swap en Stellar Expert" key={activity.id} onPress={() => void Linking.openURL(`https://stellar.expert/explorer/testnet/tx/${activity.transactionHash}`)}>
        <ActivityRow hidden={hidden} type="Swap" detail={`${formatEnteredAmount(activity.sourceAmount)} ${activity.fromAsset} → ${formatReceivedAmount(activity.destinationAmount)} ${activity.toAsset}`} amount={`+ ${formatReceivedAmount(activity.destinationAmount)} ${activity.toAsset}`} time={new Date(activity.createdAt).toLocaleString(locale)} positive />
      </PressableScale>;
      const payment = activity.payment;
      const received = payment.to === wallet.publicKey;
      const other = received ? payment.from : payment.to;
      const description = paymentDescription(received, other, contacts);
      return <PressableScale accessibilityLabel="Ver transacción en Stellar Expert" key={payment.id} onPress={() => void Linking.openURL(`https://stellar.expert/explorer/testnet/tx/${payment.transaction_hash}`)}>
        <ActivityRow hidden={hidden} type={description.title} detail={description.detail} amount={`${received ? '+' : '-'} ${received ? formatReceivedAmount(payment.amount) : formatEnteredAmount(payment.amount)} ${payment.asset_type === 'native' ? 'XLM' : payment.asset_code}`} time={new Date(payment.created_at).toLocaleString(locale)} positive={received} />
      </PressableScale>;
    })}
  </View>;
}

const styles = StyleSheet.create({ empty: { color: colors.muted, fontSize: 12, lineHeight: 19, paddingVertical: 18 } });
