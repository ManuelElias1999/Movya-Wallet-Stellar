import type { ThemeColors } from '@/theme/tokens';
import { useThemedStyles } from '@/theme/Theme';
import { Text } from '@/i18n/primitives';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

import { useRouter } from 'expo-router';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';

import { PressableScale } from '@/components/PressableScale';

type PageHeaderProps = { title: string; subtitle?: string; backTo?: '/(tabs)' | '/settings' | '/security'; onBack?: () => void };

export function PageHeader({ title, subtitle, backTo, onBack }: PageHeaderProps) {
  const { styles, colors, mode } = useThemedStyles(createStyles);
  const router = useRouter();
  const back = () => {
    if (onBack) onBack();
    else if (backTo) router.replace(backTo);
    else if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };
  return (
    <View style={styles.shell}>
      <BlurView intensity={54} tint={mode} style={[styles.header, Platform.OS === 'web' ? webGlass : null]}>
        <PressableScale accessibilityLabel="Volver" onPress={back} pressedScale={0.9} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
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

const webGlass: ViewStyle & { backdropFilter: string; WebkitBackdropFilter: string } = { backdropFilter: 'blur(30px) saturate(150%)', WebkitBackdropFilter: 'blur(30px) saturate(150%)' };

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  shell: { minHeight: 64, width: '100%', overflow: 'hidden', borderBottomWidth: 1, borderColor: colors.border, zIndex: 10 },
  header: { minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 7, backgroundColor: colors.background },
  shine: { position: 'absolute', left: 0, right: 0, top: 0, height: '50%', backgroundColor: 'rgba(255,255,255,0.045)' },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, alignItems: 'center', paddingHorizontal: 5 },
  title: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 10, marginTop: 1, maxWidth: 220 },
  spacer: { width: 44 },
});
