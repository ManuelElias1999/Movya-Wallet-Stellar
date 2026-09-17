import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/PressableScale';
import { StellarNetworkBadge } from '@/components/StellarNetworkBadge';
import { colors } from '@/theme/tokens';

type PageHeaderProps = { title: string; subtitle?: string };

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  const router = useRouter();
  return (
    <View style={styles.shell}>
      <View style={styles.blueGlow} />
      <View style={styles.cyanGlow} />
      <BlurView intensity={72} tint="light" style={styles.header}>
        <PressableScale onPress={() => router.back()} pressedScale={0.9} style={styles.back}>
          <Ionicons name="arrow-back" size={20} color={colors.ink} />
        </PressableScale>
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text numberOfLines={1} style={styles.subtitle}>{subtitle}</Text> : null}
          <View style={styles.badge}><StellarNetworkBadge /></View>
        </View>
        <View style={styles.spacer} />
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { minHeight: 88, marginHorizontal: 12, marginTop: 7, borderRadius: 25, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.88)', shadowColor: colors.navy, shadowOpacity: 0.2, shadowRadius: 18, shadowOffset: { width: 0, height: 9 }, elevation: 7 },
  header: { minHeight: 86, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, backgroundColor: 'rgba(228,241,255,0.38)' },
  blueGlow: { position: 'absolute', width: 230, height: 120, borderRadius: 999, backgroundColor: '#6EA8FF', opacity: 0.52, left: -55, top: -50 },
  cyanGlow: { position: 'absolute', width: 190, height: 110, borderRadius: 999, backgroundColor: '#79E2D5', opacity: 0.44, right: -35, bottom: -55 },
  back: { width: 40, height: 40, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.58)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center', shadowColor: colors.navy, shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  copy: { flex: 1, alignItems: 'center', paddingHorizontal: 5 },
  title: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  subtitle: { color: '#496786', fontSize: 10, marginTop: 1, maxWidth: 220 },
  spacer: { width: 42 },
  badge: { marginTop: 4 },
});
