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
      <LinearGradient colors={['#72AFFF', '#A9CCFF', '#D8E9FF', '#8EBFFF']} end={{ x: 1, y: 1 }} locations={[0, 0.32, 0.68, 1]} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: transition }]}>
        <LinearGradient colors={['#DDEEFF', '#85B8FF', '#B6D6FF', '#5E9CF4']} end={{ x: 0.08, y: 1 }} locations={[0, 0.3, 0.68, 1]} start={{ x: 0.92, y: 0 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={[styles.lightWash, { opacity: transition.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.22, 0.08, 0.22] }) }]}>
        <LinearGradient colors={['rgba(255,255,255,0.62)', 'rgba(255,255,255,0.04)', 'rgba(35,113,226,0.24)']} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  lightWash: { position: 'absolute', left: '-12%', right: '-12%', top: '-8%', bottom: '-8%', transform: [{ rotate: '-8deg' }] },
});
