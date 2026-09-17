import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { colors } from '@/theme/tokens';

type AnimatedAccountCardProps = {
  amountsVisible: boolean;
};

export function AnimatedAccountCard({ amountsVisible }: AnimatedAccountCardProps) {
  const movement = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const wink = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(movement, { toValue: 1, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(movement, { toValue: 0, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [movement]);

  const playReaction = () => {
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
      <Animated.View
        style={[
          styles.glowLarge,
          {
            transform: [
              { translateX: movement.interpolate({ inputRange: [0, 1], outputRange: [0, -42] }) },
              { translateY: movement.interpolate({ inputRange: [0, 1], outputRange: [0, 28] }) },
              { scale: movement.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.glowSmall,
          {
            transform: [
              { translateX: movement.interpolate({ inputRange: [0, 1], outputRange: [0, 34] }) },
              { translateY: movement.interpolate({ inputRange: [0, 1], outputRange: [0, -22] }) },
            ],
          },
        ]}
      />

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
        <Text style={styles.availableLabel}>Saldo disponible</Text>
        <Text style={styles.amount}>{amountsVisible ? '$1,240.00' : '••••••'}</Text>
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
  card: { borderRadius: 28, minHeight: 220, padding: 22, justifyContent: 'space-between', overflow: 'hidden', shadowColor: '#0B4FB8', shadowOpacity: 0.24, shadowRadius: 24, shadowOffset: { width: 0, height: 14 }, elevation: 8 },
  glowLarge: { position: 'absolute', width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(129,190,255,0.18)', right: -90, top: -98 },
  glowSmall: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.09)', left: -60, bottom: -70 },
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
