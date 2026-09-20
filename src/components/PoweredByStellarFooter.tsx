import { Image, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/tokens';

export function PoweredByStellarFooter() {
  return (
    <View style={styles.footer}>
      <Text style={styles.text}>Powered by</Text>
      <Image source={require('../../assets/stellar-footer-logo.png')} style={styles.logo} />
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 28 },
  text: { color: colors.navy, fontSize: 11, fontWeight: '800', letterSpacing: 0.15 },
  logo: { width: 72, height: 21, resizeMode: 'contain' },
});
