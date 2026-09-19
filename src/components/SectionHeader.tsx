import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/tokens';

type SectionHeaderProps = {
  title: string;
  action?: string;
  onPress?: () => void;
};

export function SectionHeader({ title, action, onPress }: SectionHeaderProps) {
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

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  action: { color: colors.brand, fontSize: 14, fontWeight: '700' },
});
