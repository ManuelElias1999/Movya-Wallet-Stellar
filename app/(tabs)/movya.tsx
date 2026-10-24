import type { ThemeColors } from '@/theme/tokens';
import { useThemedStyles } from '@/theme/Theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MovyaChatSheet } from '@/components/MovyaChatSheet';

export default function MovyaScreen() {
  const { styles } = useThemedStyles(createStyles);
  const router = useRouter();
  const { prompt } = useLocalSearchParams<{ prompt?: string }>();

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <MovyaChatSheet initialPrompt={prompt} onClose={() => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)'); }} open />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
});
