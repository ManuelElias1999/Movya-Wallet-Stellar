import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, Image, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { PressableScale } from './PressableScale';
import { colors } from '@/theme/tokens';

export function WalletForge({ stage, onCancel }: { stage: string; onCancel: () => void }) {
  const strike = useRef(new Animated.Value(0)).current;
  const started = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(value); }).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const timer = setInterval(() => setElapsed(Math.max(0, Math.floor((Date.now() - started.current) / 1000))), 1000);
    return () => { active = false; subscription.remove(); clearInterval(timer); };
  }, []);
  useEffect(() => {
    if (reduceMotion) { strike.setValue(0); return; }
    // All movement runs on the native animation thread, including during the
    // portable KDF. No artificial completion delay or simulated percentage.
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(strike, { toValue: 1, duration: 580, easing: Easing.linear, useNativeDriver: true, isInteraction: false }),
      Animated.delay(400),
      Animated.timing(strike, { toValue: 0, duration: 0, useNativeDriver: true, isInteraction: false }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [reduceMotion, strike]);
  const impact = strike.interpolate({ inputRange: [0, 0.55, 0.7, 0.86, 1], outputRange: [0, 0, 1, 0.3, 0] });
  return <Modal animationType="fade" onRequestClose={onCancel} presentationStyle="fullScreen" visible>
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.panel} accessibilityRole="progressbar" accessibilityLabel="Creación de tu wallet en curso" accessibilityValue={{ text: stage }}>
          <Text style={styles.eyebrow}>EL TALLER DE MOVYA</Text>
          <View style={styles.scene} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={styles.halo} />
            <View style={styles.floor} />
            <Svg width={155} height={89} style={styles.anvil} viewBox="0 0 155 89">
              <Path d="M0 9 H136 L154 27 H111 L94 44 V61 H116 V79 H29 V61 H52 V44 L31 31 H0 Z" fill="#234E7A" />
              <Path d="M0 9 H136 L154 27 H0 Z" fill="#5B8FB4" />
              <Rect x="26" y="78" width="97" height="11" rx="4" fill="#153653" />
            </Svg>
            <Animated.View style={[styles.robot, { transform: [{ translateY: impact.interpolate({ inputRange: [0, 1], outputRange: [0, 3] }) }] }]}>
              <View style={styles.apron}><View style={styles.apronPocket} /></View>
              <Image source={require('../../assets/movya-logo.png')} style={styles.logo} />
              <View style={styles.legLeft} /><View style={styles.legRight} />
            </Animated.View>
            <Animated.View style={[styles.hammerArm, { transform: [{ rotate: strike.interpolate({ inputRange: [0, 0.5, 0.7, 1], outputRange: ['-28deg', '-72deg', '12deg', '-28deg'] }) }] }]}>
              <View style={styles.arm} /><View style={styles.handle} /><View style={styles.hammerHead}><View style={styles.hammerShine} /></View>
            </Animated.View>
            <Animated.View style={[styles.wallet, { transform: [{ scale: impact.interpolate({ inputRange: [0, 1], outputRange: [1, 0.93] }) }] }]}>
              <View style={styles.walletStitch} /><View style={styles.walletClasp}><View style={styles.walletDot} /></View>
            </Animated.View>
            {!reduceMotion ? [-1, 1, 2, -2].map((direction, i) => <Animated.View key={direction} style={[styles.spark, { opacity: impact, transform: [
              { translateX: impact.interpolate({ inputRange: [0, 1], outputRange: [0, direction * 19] }) },
              { translateY: impact.interpolate({ inputRange: [0, 1], outputRange: [0, -24 - i * 7] }) },
              { rotate: `${direction * 30}deg` },
            ] }]} />) : null}
          </View>
          <Text style={styles.title}>Movya está forjando{ '\n' }tu billetera</Text>
          <Text style={styles.copy}>Estamos preparando una wallet que será solo tuya.</Text>
          <View style={styles.progress}><ActivityIndicator color={colors.brand} /><Text accessibilityLiveRegion="polite" style={styles.stage}>{stage}</Text></View>
          {elapsed >= 20 ? <Text style={styles.wait}>Seguimos trabajando. Si hay un problema, te avisaremos aquí.</Text> : null}
          <Text style={styles.time}>Tiempo transcurrido: {elapsed} s</Text>
          <PressableScale onPress={onCancel} style={styles.cancel}><Text style={styles.cancelText}>Cancelar</Text></PressableScale>
        </View>
      </ScrollView>
    </SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#EAF2FC' }, page: { flexGrow: 1, justifyContent: 'center', padding: 22 }, panel: { width: '100%', maxWidth: 520, alignSelf: 'center', alignItems: 'center' },
  eyebrow: { color: colors.brand, fontSize: 11, fontWeight: '900', letterSpacing: 2 }, scene: { width: 300, height: 255, marginTop: 20, marginBottom: 10 },
  halo: { position: 'absolute', width: 224, height: 224, borderRadius: 112, left: 36, top: 7, backgroundColor: '#D4E7FF' }, floor: { position: 'absolute', bottom: 13, left: 6, right: 6, height: 15, borderRadius: 50, backgroundColor: '#B9CDE4' },
  anvil: { position: 'absolute', left: 139, top: 151 }, robot: { position: 'absolute', left: 19, top: 47, width: 115, height: 189 }, logo: { width: 114, height: 114, position: 'absolute', top: 0 },
  apron: { position: 'absolute', top: 88, left: 24, width: 70, height: 79, borderRadius: 18, backgroundColor: '#BD7349', borderWidth: 4, borderColor: '#945635' }, apronPocket: { marginTop: 38, marginHorizontal: 12, height: 22, borderRadius: 7, borderWidth: 2, borderColor: '#E1A474' },
  legLeft: { position: 'absolute', bottom: 0, left: 26, width: 26, height: 24, borderRadius: 8, backgroundColor: '#153653' }, legRight: { position: 'absolute', bottom: 0, right: 21, width: 26, height: 24, borderRadius: 8, backgroundColor: '#153653' },
  hammerArm: { position: 'absolute', left: 122, top: 72, width: 103, height: 90 }, arm: { position: 'absolute', left: 0, top: 58, width: 57, height: 17, borderRadius: 10, backgroundColor: '#2481FB' }, handle: { position: 'absolute', left: 65, top: 22, width: 13, height: 61, borderRadius: 4, backgroundColor: '#945635' }, hammerHead: { position: 'absolute', left: 48, top: 12, width: 49, height: 28, borderRadius: 6, backgroundColor: '#234E7A', borderWidth: 3, borderColor: '#153653' }, hammerShine: { height: 5, margin: 3, backgroundColor: '#8CB2CA', borderRadius: 2 },
  wallet: { position: 'absolute', left: 182, top: 126, width: 61, height: 34, backgroundColor: '#277CFF', borderRadius: 8, borderWidth: 2, borderColor: '#0755D8' }, walletStitch: { position: 'absolute', left: 5, top: 5, right: 5, bottom: 5, borderRadius: 4, borderWidth: 1, borderStyle: 'dashed', borderColor: '#98C6FF' }, walletClasp: { position: 'absolute', right: -4, top: 9, width: 21, height: 13, borderRadius: 4, backgroundColor: '#0755D8', justifyContent: 'center', alignItems: 'center' }, walletDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#F4C569' }, spark: { position: 'absolute', left: 205, top: 133, width: 4, height: 11, borderRadius: 3, backgroundColor: '#ECAB35' },
  title: { color: colors.ink, fontSize: 27, lineHeight: 34, fontWeight: '900', textAlign: 'center' }, copy: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 12, maxWidth: 330 }, progress: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderRadius: 18, backgroundColor: '#FFFFFF', width: '100%', marginTop: 24 }, stage: { flex: 1, color: colors.ink, fontSize: 13, lineHeight: 20, fontWeight: '600' }, wait: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 14 }, time: { color: colors.muted, fontSize: 11, marginTop: 12 }, cancel: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 24, marginTop: 10 }, cancelText: { color: colors.brand, fontSize: 13, fontWeight: '700' },
});
