import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedMovyaLogo } from '@/components/AnimatedMovyaLogo';

const screenWidth = Dimensions.get('window').width;

export default function EnteringWalletScreen() {
  const router = useRouter();
  const travelX = useRef(new Animated.Value(Math.min(screenWidth * 0.68, 520))).current;
  const runningY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const runCycle = Animated.sequence([
      Animated.timing(runningY, { toValue: -6, duration: 90, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(runningY, { toValue: 4, duration: 90, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]);
    const running = Animated.loop(runCycle, { iterations: 4 });
    const travel = Animated.sequence([
      Animated.delay(80),
      Animated.timing(travelX, { toValue: -22, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(travelX, { toValue: 0, duration: 210, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]);

    Animated.parallel([travel, running]).start(() => {
      Animated.timing(runningY, { toValue: 0, duration: 90, useNativeDriver: true }).start();
    });

    const timer = setTimeout(() => router.replace('/(tabs)'), 1900);
    return () => {
      travel.stop();
      running.stop();
      clearTimeout(timer);
    };
  }, [router, runningY, travelX]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.center}>
        <Animated.View style={{ transform: [{ translateX: travelX }, { translateY: runningY }] }}>
          <View style={styles.logoRing}>
            <AnimatedMovyaLogo delayMs={1040} repeat={false} size={126} />
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#DCEBFA' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoRing: { width: 136, height: 136, borderRadius: 68, alignItems: 'center', justifyContent: 'center', borderWidth: 0.75, borderColor: 'rgba(13,62,120,0.2)', backgroundColor: 'rgba(255,255,255,0.2)' },
});
