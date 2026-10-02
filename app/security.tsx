import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { PageHeader } from '@/components/PageHeader';
import { PressableScale } from '@/components/PressableScale';
import { colors } from '@/theme/tokens';

export default function SecurityScreen() {
  const router = useRouter();
  return <Screen>
    <PageHeader title="Seguridad" subtitle="Protege el acceso a tu wallet" />
    <PressableScale onPress={() => router.push('/wallet-backup')} style={styles.card}>
      <View style={styles.icon}><Ionicons name="key-outline" color={colors.brand} size={23} /></View>
      <View style={{ flex: 1 }}><Text style={styles.title}>Respaldo y claves</Text><Text style={styles.subtitle}>Frase de recuperación y clave privada</Text></View>
      <Ionicons name="chevron-forward" color={colors.muted} size={19} />
    </PressableScale>
  </Screen>;
}
const styles = StyleSheet.create({
  card: { marginTop: 22, minHeight: 88, padding: 16, borderRadius: 20, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.ink, fontSize: 15, fontWeight: '800' }, subtitle: { color: colors.muted, fontSize: 12, marginTop: 4 },
});
