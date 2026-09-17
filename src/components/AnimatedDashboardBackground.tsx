import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

export function AnimatedDashboardBackground() {
  const transition = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(transition, { toValue: 1, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(transition, { toValue: 0, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [transition]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={['#92BFFF', '#C7D8FF', '#D8C9FF', '#AEE8E3']} end={{ x: 1, y: 1 }} locations={[0, 0.34, 0.68, 1]} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: transition }]}>
        <LinearGradient colors={['#B7E3F3', '#91BAFF', '#B7A9F4', '#D9E8FF']} end={{ x: 0.08, y: 1 }} locations={[0, 0.31, 0.67, 1]} start={{ x: 0.92, y: 0 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={[styles.lightWash, { opacity: transition.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.18, 0.04, 0.2] }) }]}>
        <LinearGradient colors={['rgba(255,255,255,0.72)', 'rgba(255,255,255,0)', 'rgba(112,171,255,0.3)']} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  lightWash: { position: 'absolute', left: '-12%', right: '-12%', top: '-8%', bottom: '-8%', transform: [{ rotate: '-8deg' }] },
});
