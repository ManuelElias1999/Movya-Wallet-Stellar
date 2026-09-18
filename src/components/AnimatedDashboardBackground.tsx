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
      <LinearGradient colors={['#020D3F', '#063B83', '#7AB9D2', '#EAF2F7']} end={{ x: 1, y: 1 }} locations={[0, 0.18, 0.48, 1]} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: transition }]}> 
        <LinearGradient colors={['#03175B', '#07539B', '#91C9D9', '#F1F6F9']} end={{ x: 0.08, y: 1 }} locations={[0, 0.2, 0.5, 1]} start={{ x: 0.92, y: 0 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={[styles.lightWash, { opacity: transition.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.18, 0.07, 0.18] }) }]}> 
        <LinearGradient colors={['rgba(90,176,222,0.08)', 'rgba(255,255,255,0.18)', 'rgba(8,60,126,0.08)']} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  lightWash: { position: 'absolute', left: '-12%', right: '-12%', top: '-8%', bottom: '-8%', transform: [{ rotate: '-8deg' }] },
});
