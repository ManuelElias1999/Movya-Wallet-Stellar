import { Image, ImageSourcePropType, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/tokens';

type TokenIconProps = { code: string; color?: string; size?: number };

const tokenImages: Record<string, ImageSourcePropType> = {
  USDC: require('../../assets/token-usdc.png'),
  XLM: require('../../assets/token-xlm.png'),
};

export function TokenIcon({ code, color = colors.navy, size = 42 }: TokenIconProps) {
  const source = tokenImages[code];
  const imageSize = code === 'USDC' ? size : Math.round(size * 0.72);

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2, backgroundColor: source ? '#FFFFFF' : color }]}>
      {source ? <Image resizeMode="contain" source={source} style={{ width: imageSize, height: imageSize }} /> : <Text style={[styles.fallback, { fontSize: size * 0.38 }]}>{code === 'EURC' ? '€' : code.slice(0, 1)}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(31,75,116,0.12)' },
  fallback: { color: '#FFFFFF', fontWeight: '900' },
});
