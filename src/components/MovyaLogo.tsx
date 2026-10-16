import { useState } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

type MovyaLogoProps = { size?: number; style?: StyleProp<ViewStyle>; outlineColor?: string };
export function MovyaLogo({ size = 48, style, outlineColor = '#4D6A87' }: MovyaLogoProps) {
  const [loaded, setLoaded] = useState(false);
  const stroke = Math.min(1.1, Math.max(0.65, size * 0.0075));
  return <View collapsable={false} style={[{ width: size, height: size, position: 'relative', overflow: 'visible' }, style]}>
    {/* Keep the mascot visible during asset loading or after a load failure. */}
    {!loaded ? <Svg width={size} height={size} viewBox="0 0 100 100" style={styles.image} accessible={false}>
      <Path d="M15 26 L21 9 Q24 4 30 10 L39 18 H61 L70 10 Q76 4 79 9 L85 26 Q95 31 95 48 V72 Q95 94 74 95 H26 Q5 94 5 72 V48 Q5 31 15 26 Z" fill="#A8D3FF" stroke={outlineColor} strokeWidth={stroke * 100 / size} strokeLinejoin="round" />
      <Rect x="17" y="30" width="66" height="51" rx="16" fill="#293F54" />
      <Circle cx="36" cy="53" r="5" fill="#FFFFFF" /><Circle cx="64" cy="53" r="5" fill="#FFFFFF" />
      <Path d="M45 61 Q50 65 55 61" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
    </Svg> : null}
    {loaded ? <Image accessible={false} source={require('../../assets/movya-logo.png')} style={{ position: 'absolute', left: -stroke, top: -stroke, width: size + stroke * 2, height: size + stroke * 2, resizeMode: 'contain', tintColor: outlineColor }} /> : null}
    <Image accessible={false} source={require('../../assets/movya-logo.png')} onLoad={() => setLoaded(true)} onError={() => setLoaded(false)} style={[styles.image, { width: size, height: size }]} />
  </View>;
}
const styles = StyleSheet.create({ image: { position: 'absolute', left: 0, top: 0, resizeMode: 'contain' } });
