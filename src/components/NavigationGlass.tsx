import type { PropsWithChildren } from 'react';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

// One surface for the footer, home header and dashboard actions.
export function NavigationGlass({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <BlurView intensity={78} tint="dark" style={[styles.surface, style, Platform.OS === 'web' ? webGlass : null]}>
    <LinearGradient colors={['rgba(24,86,153,0.86)', 'rgba(28,132,178,0.74)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} pointerEvents="none" style={StyleSheet.absoluteFill} />
    {children}
  </BlurView>;
}
const webGlass = { backdropFilter: 'blur(28px) saturate(160%)', WebkitBackdropFilter: 'blur(28px) saturate(160%)' } as const;
const styles = StyleSheet.create({
  surface: { overflow: 'hidden', backgroundColor: 'rgba(25,92,150,0.46)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.38)', borderRadius: 28 },
});
