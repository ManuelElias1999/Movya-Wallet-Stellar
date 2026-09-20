import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
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
        <LinearGradient colors={['rgba(31,80,135,0.8)', 'rgba(60,127,150,0.64)']} end={{ x: 1, y: 0 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
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
  shell: { minHeight: 70, width: '100%', overflow: 'hidden', borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.34)', shadowColor: '#173C65', shadowOpacity: 0.13, shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: 5, zIndex: 10 },
  header: { minHeight: 70, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 8, backgroundColor: 'rgba(42,92,137,0.32)' },
  shine: { position: 'absolute', left: 0, right: 0, top: 0, height: '50%', backgroundColor: 'rgba(255,255,255,0.045)' },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, alignItems: 'center', paddingHorizontal: 5 },
  title: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  subtitle: { color: 'rgba(233,244,255,0.7)', fontSize: 10, marginTop: 1, maxWidth: 220 },
  spacer: { width: 40 },
});
