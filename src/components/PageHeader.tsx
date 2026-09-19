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
      <BlurView intensity={54} tint="dark" style={[styles.header, Platform.OS === 'web' ? webGlass : null]}>
        <View pointerEvents="none" style={styles.shine} />
        <PressableScale onPress={() => router.back()} pressedScale={0.9} style={styles.back}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
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

const webGlass = { backdropFilter: 'blur(30px) saturate(150%)', WebkitBackdropFilter: 'blur(30px) saturate(150%)' } as const;

const styles = StyleSheet.create({
  shell: { minHeight: 68, width: '100%', overflow: 'hidden', borderBottomLeftRadius: 18, borderBottomRightRadius: 18, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.22)', shadowColor: '#00123F', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 5, zIndex: 10 },
  header: { minHeight: 68, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 7, backgroundColor: 'rgba(7,31,73,0.94)' },
  shine: { position: 'absolute', left: 0, right: 0, top: 0, height: '50%', backgroundColor: 'rgba(255,255,255,0.045)' },
  back: { width: 38, height: 38, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.09)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, alignItems: 'center', paddingHorizontal: 5 },
  title: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  subtitle: { color: 'rgba(233,244,255,0.7)', fontSize: 10, marginTop: 1, maxWidth: 220 },
  spacer: { width: 40 },
});
