import { StyleSheet, View } from 'react-native';
import { colors } from '@/theme/tokens';

export function AnimatedDashboardBackground({ topInset = 0 }: { topInset?: number }) {
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.background, { top: topInset }]} />;
}

const styles = StyleSheet.create({
  background: { backgroundColor: colors.background },
});
