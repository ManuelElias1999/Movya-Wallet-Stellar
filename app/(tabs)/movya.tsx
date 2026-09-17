import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MovyaChatSheet } from '@/components/MovyaChatSheet';
import { colors } from '@/theme/tokens';

export default function MovyaScreen() {
  const router = useRouter();
  const { prompt } = useLocalSearchParams<{ prompt?: string }>();

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <MovyaChatSheet initialPrompt={prompt} onClose={() => router.back()} open />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
});
