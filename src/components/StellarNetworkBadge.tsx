import { FontAwesome5 } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/tokens';

type StellarNetworkBadgeProps = {
  label?: string;
  dark?: boolean;
};

export function StellarNetworkBadge({ label = 'Powered by Stellar', dark = false }: StellarNetworkBadgeProps) {
  return (
    <View style={[styles.badge, dark ? styles.badgeDark : styles.badgeLight]}>
      <Text style={[styles.label, dark && styles.labelDark]}>{label}</Text>
      <FontAwesome5 name="stellar" size={13} color={dark ? '#FFFFFF' : colors.navy} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', height: 29, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 999, paddingHorizontal: 11, borderWidth: 1 },
  badgeLight: { backgroundColor: 'rgba(255,255,255,0.58)', borderColor: 'rgba(255,255,255,0.9)' },
  badgeDark: { backgroundColor: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.25)' },
  label: { color: colors.navy, fontSize: 10, fontWeight: '800' },
  labelDark: { color: '#FFFFFF' },
});
