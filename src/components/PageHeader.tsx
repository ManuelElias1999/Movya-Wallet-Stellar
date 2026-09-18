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
  shell: { minHeight: 72, width: '100%', overflow: 'hidden', borderBottomLeftRadius: 27, borderBottomRightRadius: 27, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.62)', shadowColor: colors.navy, shadowOpacity: 0.16, shadowRadius: 19, shadowOffset: { width: 0, height: 8 }, elevation: 7, zIndex: 10 },
  header: { minHeight: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: 'rgba(238,247,255,0.12)' },
  shine: { position: 'absolute', left: 0, right: 0, top: 0, height: '48%', backgroundColor: 'rgba(255,255,255,0.12)' },
  back: { width: 40, height: 40, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.34)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.66)', alignItems: 'center', justifyContent: 'center', shadowColor: colors.navy, shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  copy: { flex: 1, alignItems: 'center', paddingHorizontal: 5 },
  title: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  subtitle: { color: '#496786', fontSize: 10, marginTop: 1, maxWidth: 220 },
  spacer: { width: 42 },
});
