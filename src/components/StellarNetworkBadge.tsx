import type { ThemeColors } from '@/theme/tokens';
import { useThemedStyles } from '@/theme/Theme';
import { Text } from '@/i18n/primitives';
import { FontAwesome5 } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

type StellarNetworkBadgeProps = {
  label?: string;
  dark?: boolean;
};

export function StellarNetworkBadge({ label = 'Powered by Stellar', dark = false }: StellarNetworkBadgeProps) {
  const { styles, colors } = useThemedStyles(createStyles);
  return (
    <View style={[styles.badge, dark ? styles.badgeDark : styles.badgeLight]}>
      <Text style={[styles.label, dark && styles.labelDark]}>{label}</Text>
      <FontAwesome5 name="stellar" size={13} color={dark ? '#FFFFFF' : colors.ink} />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  badge: { alignSelf: 'flex-start', height: 29, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 999, paddingHorizontal: 11, borderWidth: 1 },
  badgeLight: { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
  badgeDark: { backgroundColor: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.25)' },
  label: { color: colors.ink, fontSize: 10, fontWeight: '800' },
  labelDark: { color: '#FFFFFF' },
});
