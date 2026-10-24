import type { ThemeColors } from '@/theme/tokens';
import { useThemedStyles } from '@/theme/Theme';
import { Pressable, Text } from '@/i18n/primitives';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { PressableScale } from '@/components/PressableScale';
import { MovyaLogo } from '@/components/MovyaLogo';

type AnimatedAccountCardProps = {
  amountsVisible: boolean;
  onToggleAmounts: () => void;
  totalAmount?: string;
  balanceLabel?: string;
  ownerName?: string;
};

export function AnimatedAccountCard({ amountsVisible, onToggleAmounts, totalAmount = '$1,629.24', balanceLabel = 'Saldo total en USD', ownerName = 'Usuario' }: AnimatedAccountCardProps) {
  const { styles } = useThemedStyles(createStyles);
  const movement = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;

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
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0.7, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 90, useNativeDriver: true }),
    ]).start();
  };

  return (
    <Pressable accessibilityHint="Movya reaccionará al tocar la tarjeta" accessibilityRole="button" onPress={playReaction}>
    <Animated.View style={{ transform: [{ translateX: shake.interpolate({ inputRange: [-1, 0, 1], outputRange: [-3, 0, 3] }) }, { rotate: shake.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-0.4deg', '0deg', '0.4deg'] }) }] }}>
    <LinearGradient colors={['#061A38', '#0B4FB8', '#2578FF']} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.card}>
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
              <MovyaLogo size={34} />
            </View>
            <Text style={styles.brand}>Movya</Text>
          </View>
          <Text style={styles.type}>Cuenta personal</Text>
        </View>
        <View style={styles.statusPill}><View style={styles.statusDot} /><Text style={styles.statusText}>Activa</Text></View>
      </View>
      <View>
        <Text style={styles.availableLabel}>{balanceLabel}</Text>
        <View style={styles.amountRow}>
          <Text style={styles.amount}>{amountsVisible ? totalAmount : '••••••'}</Text>
          <PressableScale
            accessibilityLabel={amountsVisible ? 'Ocultar saldo total' : 'Mostrar saldo total'}
            onPress={(event) => {
              event.stopPropagation?.();
              onToggleAmounts();
            }}
            pressedScale={0.88}
            style={styles.eyeButton}
          >
            <Ionicons color="#FFFFFF" name={amountsVisible ? 'eye-outline' : 'eye-off-outline'} size={20} />
          </PressableScale>
        </View>
      </View>
      <View style={styles.footer}>
        <Text translate={false} numberOfLines={1} style={[styles.owner, { flex: 1, marginRight: 12 }]}>{ownerName.toUpperCase()}</Text>
        <View accessibilityLabel="Stellar" accessible style={styles.stellarPill}><Image source={require('../../assets/token-xlm.png')} style={styles.stellarLogo} /></View>
      </View>
    </LinearGradient>
    </Animated.View>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: { borderRadius: 28, minHeight: 220, padding: 22, justifyContent: 'space-between', overflow: 'hidden', shadowColor: '#0B4FB8', shadowOpacity: 0.28, shadowRadius: 26, shadowOffset: { width: 0, height: 14 }, elevation: 9 },
  lightSweep: { position: 'absolute', top: -95, bottom: -95, width: 115 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  brandLogoWrap: { width: 34, height: 34, marginRight: 7 },
  brandLogo: { width: 34, height: 34, resizeMode: 'contain' },
  brand: { color: '#FFFFFF', fontSize: 25, fontWeight: '800', letterSpacing: -0.8 },
  type: { color: 'rgba(255,255,255,0.68)', fontSize: 11, marginTop: 2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#78F0C3', marginRight: 6 },
  statusText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  availableLabel: { color: 'rgba(255,255,255,0.68)', fontSize: 12, fontWeight: '600' },
  amountRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  amount: { color: '#FFFFFF', fontSize: 35, fontWeight: '800', letterSpacing: -1.2, flexShrink: 1 },
  eyeButton: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginLeft: 10, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  owner: { color: 'rgba(255,255,255,0.76)', fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  stellarPill: { width: 43, height: 31, backgroundColor: '#FFFFFF', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stellarLogo: { width: 27, height: 22, resizeMode: 'contain' },
});
