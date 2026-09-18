import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { colors } from '@/theme/tokens';

type AnimatedAccountCardProps = {
  amountsVisible: boolean;
  totalAmount?: string;
};

export function AnimatedAccountCard({ amountsVisible, totalAmount = '$1,629.24' }: AnimatedAccountCardProps) {
  const movement = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const wink = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(900),
        Animated.timing(movement, { toValue: 1, duration: 2800, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.delay(1800),
        Animated.timing(movement, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [movement]);

  const playReaction = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(shake, { toValue: 1, duration: 55, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -1, duration: 55, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0.7, duration: 55, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 90, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(60),
        Animated.timing(wink, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.delay(170),
        Animated.timing(wink, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]),
    ]).start();
  };

  return (
    <Pressable accessibilityHint="Movya reaccionará al tocar la tarjeta" accessibilityRole="button" onPress={playReaction}>
    <Animated.View style={{ transform: [{ translateX: shake.interpolate({ inputRange: [-1, 0, 1], outputRange: [-3, 0, 3] }) }, { rotate: shake.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-0.4deg', '0deg', '0.4deg'] }) }] }}>
    <LinearGradient colors={['#061A38', '#0B4FB8', '#2578FF']} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.card}>
      <View pointerEvents="none" style={styles.ambientLight} />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.lightSweep,
          {
            opacity: movement.interpolate({ inputRange: [0, 0.08, 0.78, 1], outputRange: [0, 0.8, 0.62, 0] }),
            transform: [
              { translateX: movement.interpolate({ inputRange: [0, 1], outputRange: [-210, 410] }) },
              { rotate: '16deg' },
            ],
          },
        ]}
      >
        <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(168,216,255,0.46)', 'rgba(255,255,255,0)']} end={{ x: 1, y: 0 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
      </Animated.View>

      <View style={styles.top}>
        <View>
          <View style={styles.brandRow}>
            <View style={styles.brandLogoWrap}>
              <Image source={require('../../assets/movya-logo.png')} style={styles.brandLogo} />
              <Animated.View style={[styles.wink, { opacity: wink, transform: [{ scaleX: wink.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }] }]} />
            </View>
            <Text style={styles.brand}>Movya</Text>
          </View>
          <Text style={styles.type}>Cuenta personal</Text>
        </View>
        <View style={styles.statusPill}><View style={styles.statusDot} /><Text style={styles.statusText}>Activa</Text></View>
      </View>
      <View>
        <Text style={styles.availableLabel}>Saldo total en USD</Text>
        <Text style={styles.amount}>{amountsVisible ? totalAmount : '••••••'}</Text>
      </View>
      <View style={styles.footer}>
        <Text style={styles.owner}>MANUEL ELIAS</Text>
        <View style={styles.currencyPill}><Text style={styles.currencyText}>USD</Text></View>
      </View>
    </LinearGradient>
    </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 28, minHeight: 220, padding: 22, justifyContent: 'space-between', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', shadowColor: '#0B4FB8', shadowOpacity: 0.28, shadowRadius: 26, shadowOffset: { width: 0, height: 14 }, elevation: 9 },
  ambientLight: { position: 'absolute', left: 0, right: 0, top: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.52)' },
  lightSweep: { position: 'absolute', top: -95, bottom: -95, width: 115 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  brandLogoWrap: { width: 34, height: 34, marginRight: 7 },
  brandLogo: { width: 34, height: 34, resizeMode: 'contain' },
  wink: { position: 'absolute', width: 5, height: 2, borderRadius: 2, backgroundColor: '#172638', top: 16, left: 22 },
  brand: { color: '#FFFFFF', fontSize: 25, fontWeight: '800', letterSpacing: -0.8 },
  type: { color: 'rgba(255,255,255,0.68)', fontSize: 11, marginTop: 2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#78F0C3', marginRight: 6 },
  statusText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  availableLabel: { color: 'rgba(255,255,255,0.68)', fontSize: 12, fontWeight: '600' },
  amount: { color: '#FFFFFF', fontSize: 35, fontWeight: '800', letterSpacing: -1.2, marginTop: 4 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  owner: { color: 'rgba(255,255,255,0.76)', fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  currencyPill: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  currencyText: { color: colors.navy, fontSize: 11, fontWeight: '800' },
});
