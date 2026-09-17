import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/tokens';

type TokenSelectorProps = { value: string; onChange: (value: string) => void; options?: string[] };

export function TokenSelector({ value, onChange, options = ['USDC', 'XLM'] }: TokenSelectorProps) {
  return (
    <View style={styles.container}>
      {options.map((option) => (
        <Pressable key={option} onPress={() => onChange(option)} style={[styles.option, value === option && styles.active]}>
          <View style={[styles.dot, option === 'USDC' ? styles.usdc : styles.xlm]} />
          <Text style={[styles.text, value === option && styles.activeText]}>{option === 'USDC' ? 'USD digital' : 'Stellar'}</Text>
          <Text style={[styles.code, value === option && styles.activeText]}>{option}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  option: { height: 58, flexDirection: 'row', alignItems: 'center', borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 14 },
  active: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  dot: { width: 30, height: 30, borderRadius: 11, marginRight: 11 },
  usdc: { backgroundColor: '#2775CA' },
  xlm: { backgroundColor: colors.navy },
  text: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '700' },
  code: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  activeText: { color: colors.brandDark },
});
