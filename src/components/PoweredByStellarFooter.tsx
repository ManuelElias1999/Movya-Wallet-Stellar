import type { ThemeColors } from '@/theme/tokens';
import { useThemedStyles } from '@/theme/Theme';
import { Text } from '@/i18n/primitives';
import { Image, StyleSheet, View } from 'react-native';

export function PoweredByStellarFooter() {
  const { styles } = useThemedStyles(createStyles);
  return (
    <View style={styles.footer}>
      <Text style={styles.text}>Powered by</Text>
      <Image source={require('../../assets/stellar-footer-logo.png')} style={styles.logo} />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  footer: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 28 },
  text: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 0.15 },
  logo: { width: 72, height: 21, resizeMode: 'contain', tintColor: colors.ink },
});
