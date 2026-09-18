import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/PressableScale';
import { colors } from '@/theme/tokens';

type PageHeaderProps = { title: string; subtitle?: string };

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  const router = useRouter();
  return (
    <View style={styles.shell}>
      <BlurView intensity={62} tint="light" style={[styles.header, Platform.OS === 'web' ? webGlass : null]}>
        <View pointerEvents="none" style={styles.shine} />
        <PressableScale onPress={() => router.back()} pressedScale={0.9} style={styles.back}>
          <Ionicons name="arrow-back" size={20} color={colors.ink} />
        </PressableScale>
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text numberOfLines={1} style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <View style={styles.spacer} />
      </BlurView>
    </View>
  );
}

const webGlass = { backdropFilter: 'blur(26px) saturate(165%)', WebkitBackdropFilter: 'blur(26px) saturate(165%)' } as const;

const styles = StyleSheet.create({
  shell: { minHeight: 72, marginHorizontal: 14, marginTop: 8, overflow: 'hidden', borderRadius: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.68)', shadowColor: colors.navy, shadowOpacity: 0.17, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 7, zIndex: 10 },
  header: { minHeight: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: 'rgba(238,247,255,0.16)' },
  shine: { position: 'absolute', left: 1, right: 1, top: 1, height: '48%', borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)' },
  back: { width: 40, height: 40, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.34)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.66)', alignItems: 'center', justifyContent: 'center', shadowColor: colors.navy, shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  copy: { flex: 1, alignItems: 'center', paddingHorizontal: 5 },
  title: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  subtitle: { color: '#496786', fontSize: 10, marginTop: 1, maxWidth: 220 },
  spacer: { width: 42 },
});
