import { StyleSheet, View } from 'react-native';

export function AnimatedDashboardBackground() {
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.background]} />;
}

const styles = StyleSheet.create({
  background: { backgroundColor: '#E9EFF5' },
});
