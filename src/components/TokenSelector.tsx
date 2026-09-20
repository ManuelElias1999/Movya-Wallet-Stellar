import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/PressableScale';
import { TokenIcon } from '@/components/TokenIcon';
import { colors } from '@/theme/tokens';

type TokenSelectorProps = { value: string; onChange: (value: string) => void; options?: string[] };

const tokenMeta: Record<string, { name: string; color: string }> = {
  USDC: { name: 'USD digital', color: '#2775CA' },
  XLM: { name: 'Stellar', color: '#0B2348' },
  EURC: { name: 'Euro digital', color: '#6857E5' },
  AQUA: { name: 'Aquarius', color: '#00A6A6' },
};

export function TokenSelector({ value, onChange, options = ['USDC', 'XLM', 'EURC', 'AQUA'] }: TokenSelectorProps) {
  return (
    <View style={styles.container}>
      {options.map((option) => (
        <PressableScale key={option} onPress={() => onChange(option)} style={[styles.option, value === option && styles.active]}>
          <View style={styles.dot}><TokenIcon code={option} color={tokenMeta[option]?.color ?? colors.navy} size={30} /></View>
          <Text style={[styles.text, value === option && styles.activeText]}>{tokenMeta[option]?.name ?? option}</Text>
          <Text style={[styles.code, value === option && styles.activeText]}>{option}</Text>
        </PressableScale>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  option: { height: 58, flexDirection: 'row', alignItems: 'center', borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 14, shadowColor: colors.navy, shadowOpacity: 0.09, shadowRadius: 9, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  active: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  dot: { width: 30, height: 30, marginRight: 11 },
  text: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '700' },
  code: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  activeText: { color: colors.brandDark },
});
