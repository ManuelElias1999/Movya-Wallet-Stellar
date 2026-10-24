import type { PropsWithChildren } from 'react';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useThemedStyles } from '@/theme/Theme';
import type { ThemeColors } from '@/theme/tokens';

// One surface for the footer, home header and dashboard actions.
export function NavigationGlass({ children, style, gradientColors }: PropsWithChildren<{ style?: StyleProp<ViewStyle>; gradientColors?: readonly [string, string] }>) {
  const { colors, styles } = useThemedStyles(createStyles);
  return <BlurView intensity={78} tint="dark" style={[styles.surface, style, Platform.OS === 'web' ? webGlass : null]}>
    <LinearGradient colors={gradientColors ?? [colors.glassStart, colors.glassEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} pointerEvents="none" style={StyleSheet.absoluteFill} />
    {children}
  </BlurView>;
}
const webGlass: ViewStyle & { backdropFilter: string; WebkitBackdropFilter: string } = { backdropFilter: 'blur(28px) saturate(160%)', WebkitBackdropFilter: 'blur(28px) saturate(160%)' };
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  surface: { overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 28 },
});
