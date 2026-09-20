import { StyleSheet, View } from 'react-native';

export function AnimatedDashboardBackground({ topInset = 0 }: { topInset?: number }) {
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.background, { top: topInset }]} />;
}

const styles = StyleSheet.create({
  background: { backgroundColor: '#E9EFF5' },
});
