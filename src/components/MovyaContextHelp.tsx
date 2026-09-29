import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { AnimatedMovyaLogo } from '@/components/AnimatedMovyaLogo';
import { PressableScale } from '@/components/PressableScale';
import { colors } from '@/theme/tokens';

type MovyaContextHelpProps = {
  question: string;
  actionPrompt: string;
  explanationTitle: string;
  explanationSteps: string[];
};

export function MovyaContextHelp({ question, actionPrompt, explanationTitle, explanationSteps }: MovyaContextHelpProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(true);
  const [explaining, setExplaining] = useState(false);

  if (!visible) return null;

  return (
    <>
      <View style={styles.card}>
        <View style={styles.logoWrap}><AnimatedMovyaLogo size={43} /><View style={styles.online} /></View>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>Movya · ahora</Text>
          <Text style={styles.question}>{question}</Text>
          <View style={styles.actions}>
            <PressableScale onPress={() => setExplaining(true)} style={styles.secondaryAction}><Text style={styles.secondaryText}>Explícame</Text></PressableScale>
            <PressableScale onPress={() => router.push({ pathname: '/movya', params: { prompt: actionPrompt } })} style={styles.primaryAction}><Text style={styles.primaryText}>Hacerlo con Movya</Text><Ionicons name="arrow-forward" size={13} color="#FFFFFF" /></PressableScale>
          </View>
        </View>
        <Pressable accessibilityLabel="Ocultar ayuda" hitSlop={10} onPress={() => setVisible(false)} style={styles.close}><Ionicons name="close" size={16} color={colors.muted} /></Pressable>
      </View>

      <Modal animationType="fade" onRequestClose={() => setExplaining(false)} transparent visible={explaining}>
        <Pressable onPress={() => setExplaining(false)} style={styles.backdrop} />
        <View style={styles.modalPosition} pointerEvents="box-none">
          <BlurView intensity={88} tint="light" style={styles.explanation}>
            <View style={styles.explanationHeader}>
              <View style={styles.modalLogo}><AnimatedMovyaLogo size={48} /></View>
              <View style={styles.titleCopy}><Text style={styles.modalEyebrow}>MOVYA TE EXPLICA</Text><Text style={styles.modalTitle}>{explanationTitle}</Text></View>
              <Pressable onPress={() => setExplaining(false)} style={styles.modalClose}><Ionicons name="close" size={19} color={colors.ink} /></Pressable>
            </View>
            <View style={styles.steps}>
              {explanationSteps.map((step, index) => <View key={step} style={styles.step}><View style={styles.stepNumber}><Text style={styles.stepNumberText}>{index + 1}</Text></View><Text style={styles.stepText}>{step}</Text></View>)}
            </View>
            <PressableScale onPress={() => { setExplaining(false); router.push({ pathname: '/movya', params: { prompt: actionPrompt } }); }} style={styles.chatAction}><Ionicons name="sparkles" size={16} color="#FFFFFF" /><Text style={styles.chatActionText}>Prefiero hacerlo con Movya</Text></PressableScale>
          </BlurView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'flex-end' },
  logoWrap: { width: 47, height: 47, alignItems: 'center', justifyContent: 'center', marginBottom: 5 }, online: { position: 'absolute', right: 0, bottom: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.positive, borderWidth: 2, borderColor: '#F9FBFF' },
  copy: { flex: 1, marginLeft: 10, paddingLeft: 14, paddingRight: 32, paddingTop: 12, paddingBottom: 13, backgroundColor: '#FFFFFF', borderRadius: 20, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: '#D4E0ED', shadowColor: colors.navy, shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 4 }, eyebrow: { color: colors.brand, fontSize: 9, fontWeight: '900', letterSpacing: 0.35 }, question: { color: colors.ink, fontSize: 13, lineHeight: 18, fontWeight: '700', marginTop: 3 }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  secondaryAction: { height: 32, justifyContent: 'center', paddingHorizontal: 11, borderRadius: 11, backgroundColor: '#E9F1FA', borderWidth: 1, borderColor: '#C8D8EA' }, secondaryText: { color: colors.brandDark, fontSize: 10, fontWeight: '800' }, primaryAction: { height: 32, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, borderRadius: 11, backgroundColor: '#075DDE', shadowColor: colors.brandDark, shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 }, primaryText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' }, close: { position: 'absolute', right: 7, top: 7, width: 26, height: 26, borderRadius: 10, backgroundColor: '#EDF3F9', alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(4,17,40,0.42)' }, modalPosition: { position: 'absolute', left: 16, right: 16, top: '18%' }, explanation: { overflow: 'hidden', borderRadius: 28, backgroundColor: 'rgba(247,251,255,0.88)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', padding: 19, shadowColor: colors.navy, shadowOpacity: 0.2, shadowRadius: 25, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
  explanationHeader: { flexDirection: 'row', alignItems: 'center' }, modalLogo: { width: 50, height: 50 }, titleCopy: { flex: 1, marginLeft: 10 }, modalEyebrow: { color: colors.brand, fontSize: 9, fontWeight: '900', letterSpacing: 0.9 }, modalTitle: { color: colors.ink, fontSize: 18, lineHeight: 23, fontWeight: '900', marginTop: 3 }, modalClose: { width: 37, height: 37, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.72)', alignItems: 'center', justifyContent: 'center' },
  steps: { gap: 13, marginTop: 20 }, step: { flexDirection: 'row', alignItems: 'flex-start' }, stepNumber: { width: 27, height: 27, borderRadius: 10, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center', marginRight: 10 }, stepNumberText: { color: colors.brand, fontSize: 11, fontWeight: '900' }, stepText: { flex: 1, color: colors.text, fontSize: 12, lineHeight: 18 },
  chatAction: { height: 51, borderRadius: 17, backgroundColor: colors.brand, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 21 }, chatActionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
});
