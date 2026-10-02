import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { InternalScreenBackground } from '@/components/InternalScreenBackground';
import { PageHeader } from '@/components/PageHeader';
import { PressableScale } from '@/components/PressableScale';
import { colors } from '@/theme/tokens';

export default function SecurityScreen() {
  const router = useRouter();
  return <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#D8E1EB' }}>
    <InternalScreenBackground />
    <PageHeader title="Seguridad" subtitle="Protege el acceso a tu wallet" backTo="/settings" />
    <ScrollView contentContainerStyle={styles.content}>
    <PressableScale onPress={() => router.push('/wallet-backup')} style={styles.card}>
      <View style={styles.icon}><Ionicons name="key-outline" color={colors.brand} size={23} /></View>
      <View style={{ flex: 1 }}><Text style={styles.title}>Respaldo y claves</Text><Text style={styles.subtitle}>Frase de recuperación y clave privada</Text></View>
      <Ionicons name="chevron-forward" color={colors.muted} size={19} />
    </PressableScale>
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: 32 },
  card: { marginTop: 22, minHeight: 88, padding: 16, borderRadius: 20, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.ink, fontSize: 15, fontWeight: '800' }, subtitle: { color: colors.muted, fontSize: 12, marginTop: 4 },
});
