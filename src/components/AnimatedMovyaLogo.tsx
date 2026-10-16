import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { MovyaLogo } from './MovyaLogo';
import { colors } from '@/theme/tokens';

type AnimatedMovyaLogoProps = { size?: number; delayMs?: number; repeat?: boolean; showGlow?: boolean; outlineColor?: string };
export function AnimatedMovyaLogo({ size = 48, delayMs = 3800, repeat = true, showGlow = true, outlineColor = '#4D6A87' }: AnimatedMovyaLogoProps) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const gesture = Animated.sequence([
      Animated.delay(delayMs),
      Animated.timing(pulse, { toValue: 1, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: -1, duration: 120, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.65, duration: 110, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]);
    const animation = repeat ? Animated.loop(gesture) : gesture;
    animation.start();
    return () => animation.stop();
  }, [delayMs, pulse, repeat]);
  return <Animated.View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', transform: [{ translateY: pulse.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 0, -5] }) }] }}>
    {showGlow ? <Animated.View style={[styles.glow, { opacity: pulse.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.24, 0.14, 0.32] }), transform: [{ scale: pulse.interpolate({ inputRange: [-1, 0, 1], outputRange: [1.04, 1, 1.12] }) }] }]} /> : null}
    <Animated.View style={{ width: size, height: size, transform: [
      { translateX: pulse.interpolate({ inputRange: [-1, 0, 1], outputRange: [-2, 0, 2] }) },
      { rotate: pulse.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-2deg', '0deg', '2deg'] }) },
      { scale: pulse.interpolate({ inputRange: [-1, 0, 1], outputRange: [1.01, 1, 1.05] }) },
    ] }}><MovyaLogo size={size} outlineColor={outlineColor} /></Animated.View>
  </Animated.View>;
}
const styles = StyleSheet.create({ glow: { position: 'absolute', width: '100%', height: '100%', borderRadius: 18, backgroundColor: colors.brand } });
