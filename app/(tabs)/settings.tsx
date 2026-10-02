import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageHeader } from '@/components/PageHeader';
import { InternalScreenBackground } from '@/components/InternalScreenBackground';
import { PressableScale } from '@/components/PressableScale';
import { ProfilePhoto } from '@/components/ProfilePhoto';
import { useAuth } from '@/context/AuthContext';
import { displayName as getDisplayName } from '@/services/presentation';
import { colors, radius } from '@/theme/tokens';

const rows = [
  { icon: 'person-outline' as const, title: 'Datos personales', subtitle: 'Nombre, correo y teléfono', tint: '#E8F1FF', color: '#176BFF' },
  { icon: 'shield-checkmark-outline' as const, title: 'Seguridad', subtitle: 'Acceso y recuperación', tint: '#E4F8F5', color: '#008B83' },
  { icon: 'cash-outline' as const, title: 'Moneda principal', subtitle: 'USD', tint: '#F0EBFF', color: '#7655D9' },
  { icon: 'help-circle-outline' as const, title: 'Ayuda', subtitle: 'Preguntas y soporte', tint: '#FFF3DE', color: '#B66A00' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const auth = useAuth();
  const displayName = getDisplayName(auth.user?.user_metadata);
  const [busy, setBusy] = useState(false);
  const [notifications, setNotifications] = useState(true);
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <InternalScreenBackground />
      <PageHeader backTo="/(tabs)" subtitle="Preferencias de tu cuenta" title="Ajustes" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profile}>
          <View style={styles.avatar}>{auth.user ? <Text style={styles.name}>{displayName[0]?.toUpperCase()}</Text> : <ProfilePhoto size={54} />}</View>
          <View><Text style={styles.name}>{displayName}</Text><Text style={styles.email}>{auth.user?.email ?? 'Wallet de pruebas'}</Text></View>
        </View>
        <Text style={styles.sectionTitle}>Cuenta</Text>
        <View style={styles.card}>
          {rows.map((row, index) => (
            <PressableScale key={row.title} onPress={row.title === 'Seguridad' ? () => router.push('/security') : undefined} style={[styles.row, index > 0 && styles.divider]}>
              <View style={[styles.rowIcon, { backgroundColor: row.tint }]}><Ionicons name={row.icon} size={20} color={row.color} /></View>
              <View style={styles.rowCopy}><Text style={styles.rowTitle}>{row.title}</Text><Text style={styles.rowSubtitle}>{row.subtitle}</Text></View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </PressableScale>
          ))}
        </View>
        <Text style={styles.sectionTitle}>Preferencias</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: '#FCEAF0' }]}><Ionicons name="notifications-outline" size={20} color="#B94F72" /></View>
            <View style={styles.rowCopy}><Text style={styles.rowTitle}>Notificaciones</Text><Text style={styles.rowSubtitle}>Movimientos y seguridad</Text></View>
            <Switch onValueChange={setNotifications} trackColor={{ false: '#CED5E0', true: colors.brandIce }} thumbColor={notifications ? colors.brand : '#FFFFFF'} value={notifications} />
          </View>
        </View>
        {auth.user ? <PressableScale disabled={busy} onPress={() => { setBusy(true); void auth.logout().then(() => router.replace('/')).catch(e => Alert.alert('No se pudo cerrar sesión', e.message)).finally(() => setBusy(false)); }} style={[styles.card, styles.row, { marginTop: 24 }]}><Text style={styles.rowTitle}>{busy ? 'Cerrando sesión…' : 'Cerrar sesión'}</Text></PressableScale> : <PressableScale onPress={() => router.replace('/')} style={[styles.card, styles.row, { marginTop: 24 }]}><Text style={styles.rowTitle}>Crear cuenta o ingresar con correo</Text></PressableScale>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#D8E1EB' }, content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, paddingBottom: 125 },
  profile: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.86)', borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.94)', padding: 17, shadowColor: colors.navy, shadowOpacity: 0.13, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  avatar: { width: 54, height: 54, borderRadius: 27, overflow: 'hidden', backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center', marginRight: 13 }, name: { color: colors.ink, fontSize: 17, fontWeight: '800' }, email: { color: colors.muted, fontSize: 11, marginTop: 4 },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', marginTop: 26, marginBottom: 10 }, card: { backgroundColor: 'rgba(255,255,255,0.86)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.94)', borderRadius: radius.md, paddingHorizontal: 14, shadowColor: colors.navy, shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  row: { minHeight: 70, flexDirection: 'row', alignItems: 'center' }, divider: { borderTopWidth: 1, borderTopColor: colors.border }, rowIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, rowCopy: { flex: 1, marginLeft: 11 }, rowTitle: { color: colors.ink, fontSize: 14, fontWeight: '700' }, rowSubtitle: { color: colors.muted, fontSize: 10, marginTop: 3 },
});
