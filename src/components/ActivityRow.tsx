import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/tokens';

type ActivityRowProps = {
  type: string;
  detail: string;
  amount: string;
  time: string;
  positive: boolean;
  hidden?: boolean;
};

export function ActivityRow({ type, detail, amount, time, positive, hidden = false }: ActivityRowProps) {
  const icon = type === 'Swap' ? 'swap-horizontal' : positive ? 'arrow-down' : 'arrow-up';

  return (
    <View style={styles.row}>
      <View style={[styles.icon, positive ? styles.positiveIcon : styles.neutralIcon]}>
        <Ionicons color={positive ? colors.positive : colors.ink} name={icon} size={19} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.type}>{type}</Text>
        <Text style={styles.detail}>{detail} · {time}</Text>
      </View>
      <Text style={[styles.amount, positive && styles.positiveText]}>{hidden ? '••••' : amount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13 },
  icon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  positiveIcon: { backgroundColor: colors.positiveSoft },
  neutralIcon: { backgroundColor: '#EEF1F6' },
  copy: { flex: 1, marginLeft: 12 },
  type: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  detail: { color: colors.muted, fontSize: 12, marginTop: 3 },
  amount: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  positiveText: { color: colors.positive },
});
