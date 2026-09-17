import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/tokens';

type PageHeaderProps = { title: string; subtitle?: string };

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  const router = useRouter();
  return (
    <LinearGradient colors={['#ECE7FF', '#DFECFF', '#E4F5F2']} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.header}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Ionicons name="arrow-back" size={20} color={colors.ink} />
      </Pressable>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.spacer} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(120,139,183,0.16)' },
  back: { width: 42, height: 42, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, alignItems: 'center' },
  title: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 11, marginTop: 2 },
  spacer: { width: 42 },
});
