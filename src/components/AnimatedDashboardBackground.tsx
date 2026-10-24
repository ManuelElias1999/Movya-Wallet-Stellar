import type { ThemeColors } from '@/theme/tokens';
import { useThemedStyles } from '@/theme/Theme';
import { StyleSheet, View } from 'react-native';

export function AnimatedDashboardBackground({ topInset = 0 }: { topInset?: number }) {
  const { styles } = useThemedStyles(createStyles);
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.background, { top: topInset }]} />;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  background: { backgroundColor: colors.background },
});
