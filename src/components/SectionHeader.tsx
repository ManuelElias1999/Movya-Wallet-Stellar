import type { ThemeColors } from '@/theme/tokens';
import { useThemedStyles } from '@/theme/Theme';
import { Pressable, Text } from '@/i18n/primitives';
import { StyleSheet, View } from 'react-native';

type SectionHeaderProps = {
  title: string;
  action?: string;
  onPress?: () => void;
};

export function SectionHeader({ title, action, onPress }: SectionHeaderProps) {
  const { styles } = useThemedStyles(createStyles);
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {action ? (
        <Pressable hitSlop={12} onPress={onPress}>
          <Text style={styles.action}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  action: { color: colors.brand, fontSize: 14, fontWeight: '700' },
});
