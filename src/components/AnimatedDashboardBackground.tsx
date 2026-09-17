import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

export function AnimatedDashboardBackground() {
  const movement = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(movement, { toValue: 1, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(movement, { toValue: 0, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [movement]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={['#BBD8FF', '#D6E7FF', '#C9DEFF', '#E1E9FF']} locations={[0, 0.32, 0.68, 1]} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.orb, styles.orbBlue, { transform: [{ translateX: movement.interpolate({ inputRange: [0, 1], outputRange: [-25, 70] }) }, { translateY: movement.interpolate({ inputRange: [0, 1], outputRange: [0, 90] }) }, { scale: movement.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }] }]} />
      <Animated.View style={[styles.orb, styles.orbViolet, { transform: [{ translateX: movement.interpolate({ inputRange: [0, 1], outputRange: [45, -45] }) }, { translateY: movement.interpolate({ inputRange: [0, 1], outputRange: [80, -15] }) }] }]} />
      <Animated.View style={[styles.orb, styles.orbCyan, { transform: [{ translateX: movement.interpolate({ inputRange: [0, 1], outputRange: [-15, 65] }) }, { translateY: movement.interpolate({ inputRange: [0, 1], outputRange: [-30, 45] }) }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  orb: { position: 'absolute', borderRadius: 999 },
  orbBlue: { width: 280, height: 280, left: -110, top: 120, backgroundColor: 'rgba(38,117,255,0.22)' },
  orbViolet: { width: 250, height: 250, right: -90, top: 370, backgroundColor: 'rgba(111,79,224,0.16)' },
  orbCyan: { width: 230, height: 230, left: 35, bottom: -80, backgroundColor: 'rgba(0,173,185,0.13)' },
});
