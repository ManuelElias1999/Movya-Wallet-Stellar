import { FontAwesome5 } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/tokens';

export function PoweredByStellarFooter() {
  return (
    <View style={styles.footer}>
      <Text style={styles.text}>Powered by Stellar</Text>
      <FontAwesome5 name="stellar" size={16} color={colors.navy} />
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 28, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.42)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)' },
  text: { color: colors.navy, fontSize: 11, fontWeight: '800', letterSpacing: 0.15 },
});
