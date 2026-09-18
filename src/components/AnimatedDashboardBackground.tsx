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
      <LinearGradient colors={['#C6D3E1', '#E8EDF3', '#D6E0EA', '#B8C9DA']} end={{ x: 1, y: 1 }} locations={[0, 0.32, 0.68, 1]} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: transition }]}> 
        <LinearGradient colors={['#F4F6F8', '#CCD8E5', '#E1E7ED', '#AABED1']} end={{ x: 0.08, y: 1 }} locations={[0, 0.3, 0.68, 1]} start={{ x: 0.92, y: 0 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={[styles.lightWash, { opacity: transition.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.22, 0.08, 0.22] }) }]}> 
        <LinearGradient colors={['rgba(255,255,255,0.58)', 'rgba(255,255,255,0.04)', 'rgba(25,66,111,0.16)']} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  lightWash: { position: 'absolute', left: '-12%', right: '-12%', top: '-8%', bottom: '-8%', transform: [{ rotate: '-8deg' }] },
});
