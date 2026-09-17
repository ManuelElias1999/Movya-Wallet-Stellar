import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AnimatedMovyaLogo } from '@/components/AnimatedMovyaLogo';
import { colors } from '@/theme/tokens';

type MovyaContextHelpProps = {
  question: string;
  explainPrompt: string;
  actionPrompt: string;
};

export function MovyaContextHelp({ question, explainPrompt, actionPrompt }: MovyaContextHelpProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const openMovya = (prompt: string) => {
    router.push({ pathname: '/movya', params: { prompt } });
  };

  return (
    <View style={styles.card}>
      <View style={styles.logoWrap}>
        <AnimatedMovyaLogo size={43} />
        <View style={styles.online} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>MOVYA · ASISTENTE</Text>
        <Text style={styles.question}>{question}</Text>
        <View style={styles.actions}>
          <Pressable onPress={() => openMovya(explainPrompt)} style={styles.secondaryAction}>
            <Text style={styles.secondaryText}>Explícame</Text>
          </Pressable>
          <Pressable onPress={() => openMovya(actionPrompt)} style={styles.primaryAction}>
            <Text style={styles.primaryText}>Hacerlo con Movya</Text>
            <Ionicons name="arrow-forward" size={13} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
      <Pressable accessibilityLabel="Ocultar ayuda" hitSlop={10} onPress={() => setVisible(false)} style={styles.close}>
        <Ionicons name="close" size={16} color={colors.muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F9FBFF', borderRadius: 20, borderWidth: 1, borderColor: '#CFE2FF', padding: 13, shadowColor: colors.navy, shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 3 },
  logoWrap: { width: 47, height: 47, alignItems: 'center', justifyContent: 'center' },
  online: { position: 'absolute', right: 0, bottom: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.positive, borderWidth: 2, borderColor: '#F9FBFF' },
  copy: { flex: 1, marginLeft: 11, paddingRight: 20 },
  eyebrow: { color: colors.brand, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  question: { color: colors.ink, fontSize: 13, lineHeight: 18, fontWeight: '700', marginTop: 3 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  secondaryAction: { height: 32, justifyContent: 'center', paddingHorizontal: 11, borderRadius: 11, backgroundColor: colors.brandSoft },
  secondaryText: { color: colors.brand, fontSize: 10, fontWeight: '800' },
  primaryAction: { height: 32, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, borderRadius: 11, backgroundColor: colors.brand },
  primaryText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  close: { position: 'absolute', right: 8, top: 8, width: 27, height: 27, alignItems: 'center', justifyContent: 'center' },
});
