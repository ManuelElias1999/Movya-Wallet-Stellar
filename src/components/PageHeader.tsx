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
      <BlurView intensity={72} tint="dark" style={[styles.header, Platform.OS === 'web' ? webGlass : null]}>
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

const webGlass = { backdropFilter: 'blur(28px) saturate(145%)', WebkitBackdropFilter: 'blur(28px) saturate(145%)' } as const;

const styles = StyleSheet.create({
  shell: { minHeight: 76, width: '100%', overflow: 'hidden', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, borderBottomWidth: 1.5, borderColor: 'rgba(95,160,255,0.68)', shadowColor: '#071B36', shadowOpacity: 0.2, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 7, zIndex: 10 },
  header: { minHeight: 76, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 9, backgroundColor: 'rgba(7,27,54,0.76)' },
  shine: { position: 'absolute', left: 0, right: 0, top: 0, height: '46%', backgroundColor: 'rgba(255,255,255,0.055)' },
  back: { width: 40, height: 40, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, alignItems: 'center', paddingHorizontal: 5 },
  title: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  subtitle: { color: 'rgba(222,237,255,0.72)', fontSize: 10, marginTop: 1, maxWidth: 220 },
  spacer: { width: 42 },
});
