import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { colors } from '@/theme/tokens';

type AnimatedMovyaLogoProps = { size?: number };

export function AnimatedMovyaLogo({ size = 48 }: AnimatedMovyaLogoProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(3800),
        Animated.timing(pulse, { toValue: 1, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: -1, duration: 120, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.65, duration: 110, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <View style={[styles.wrap, { width: size, height: size }]}> 
      <Animated.View
        style={[
          styles.glow,
          {
            transform: [
              { scale: pulse.interpolate({ inputRange: [-1, 0, 1], outputRange: [1.04, 1, 1.12] }) },
            ],
            opacity: pulse.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.24, 0.14, 0.32] }),
          },
        ]}
      />
      <Animated.Image
        source={require('../../assets/movya-logo.png')}
        style={[
          styles.logo,
          {
            width: size,
            height: size,
            transform: [
              { translateX: pulse.interpolate({ inputRange: [-1, 0, 1], outputRange: [-2, 0, 2] }) },
              { rotate: pulse.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-2deg', '0deg', '2deg'] }) },
              { scale: pulse.interpolate({ inputRange: [-1, 0, 1], outputRange: [1.01, 1, 1.05] }) },
            ],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: '100%', height: '100%', borderRadius: 18, backgroundColor: colors.brand },
  logo: { resizeMode: 'contain' },
});
