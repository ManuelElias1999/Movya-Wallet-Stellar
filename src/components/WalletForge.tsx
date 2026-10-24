import { Text } from '@/i18n/primitives';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, Modal, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WalletForgeScene } from './WalletForgeScene';
import { PressableScale } from './PressableScale';
import { colors } from '@/theme/tokens';
import { useLanguage } from '@/i18n/Language';

export function WalletForge({ stage, onCancel }: { stage: string; onCancel: () => void }) {
  const { t } = useLanguage();
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
    const animation = Animated.loop(Animated.timing(strike, { toValue: 1, duration: 1250, easing: Easing.linear, useNativeDriver: true, isInteraction: false }));
    animation.start();
    return () => animation.stop();
  }, [reduceMotion, strike]);
  return <Modal animationType="fade" onRequestClose={onCancel} presentationStyle="fullScreen" visible>
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.panel} accessibilityRole="progressbar" accessibilityLabel={t('Creación de tu wallet en curso')} accessibilityValue={{ text: t(stage) }}>
          <Text style={styles.eyebrow}>EL TALLER DE MOVYA</Text>
          <WalletForgeScene strike={strike} reduceMotion={reduceMotion} />
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
  safe: { flex: 1, backgroundColor: colors.background }, page: { flexGrow: 1, justifyContent: 'center', padding: 22 }, panel: { width: '100%', maxWidth: 520, alignSelf: 'center', alignItems: 'center' },
  eyebrow: { color: colors.brand, fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  title: { color: colors.ink, fontSize: 24, lineHeight: 31, fontWeight: '900', textAlign: 'center' }, copy: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 10, maxWidth: 330 }, progress: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, width: '100%', marginTop: 20 }, stage: { flex: 1, color: colors.ink, fontSize: 13, lineHeight: 20, fontWeight: '600' }, wait: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 14 }, time: { color: colors.muted, fontSize: 11, marginTop: 12 }, cancel: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 24, marginTop: 10 }, cancelText: { color: colors.brand, fontSize: 13, fontWeight: '700' },
});
