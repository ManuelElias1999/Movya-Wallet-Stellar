import type { PropsWithChildren } from 'react';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

// One surface for the footer, home header and dashboard actions.
export function NavigationGlass({ children, style, gradientColors = ['rgba(15,35,64,0.97)', 'rgba(20,61,91,0.94)'] }: PropsWithChildren<{ style?: StyleProp<ViewStyle>; gradientColors?: readonly [string, string] }>) {
  return <BlurView intensity={78} tint="dark" style={[styles.surface, style, Platform.OS === 'web' ? webGlass : null]}>
    <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} pointerEvents="none" style={StyleSheet.absoluteFill} />
    {children}
  </BlurView>;
}
const webGlass = { backdropFilter: 'blur(28px) saturate(160%)', WebkitBackdropFilter: 'blur(28px) saturate(160%)' } as const;
const styles = StyleSheet.create({
  surface: { overflow: 'hidden', backgroundColor: 'rgba(11,24,42,0.94)', borderWidth: 1, borderColor: 'rgba(158,197,255,0.2)', borderRadius: 28 },
});
