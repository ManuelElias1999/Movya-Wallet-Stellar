import { Alert, Text } from '@/i18n/primitives';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageHeader } from '@/components/PageHeader';
import { PressableScale } from '@/components/PressableScale';
import { secureStyles as styles } from '@/components/secureStyles';
import { useAuth } from '@/context/AuthContext';
import { currentDeviceId, listDevices, revokeDevice, revokeOtherDevices, type DeviceRow } from '@/services/backend/devices';
import { colors } from '@/theme/tokens';

const when = (iso: string) => new Date(iso).toLocaleString();

export default function DevicesScreen() {
  const auth = useAuth(); const router = useRouter();
  const [devices, setDevices] = useState<DeviceRow[] | null>(null);
  const [current, setCurrent] = useState('');
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const load = useCallback(async () => {
    try { const [list, id] = await Promise.all([listDevices(), currentDeviceId()]); setDevices(list); setCurrent(id); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'No se pudieron cargar tus dispositivos.'); }
  }, []);
  useEffect(() => { void load(); void auth.acknowledgeDevices(); }, [load]);
  const run = (action: () => Promise<unknown>, done: string) => {
    if (busy) return;
    setBusy(true); setMessage('');
    void action().then(() => { setMessage(done); return load(); })
      .catch(e => setMessage(e instanceof Error ? e.message : 'No se pudo completar la acción.'))
      .finally(() => setBusy(false));
  };
  const confirmRevoke = (device: DeviceRow) => Alert.alert('Cerrar sesión en este dispositivo', `${device.label}: cerraremos su sesión y, cuando se conecte, borrará la wallet guardada allí.`, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Cerrar sesión', style: 'destructive', onPress: () => run(() => revokeDevice(device.id), 'Dispositivo desactivado.') },
  ]);
  const confirmRevokeAll = () => Alert.alert('Cerrar todas las demás sesiones', 'Todos los demás dispositivos tendrán que volver a ingresar y borrarán la wallet guardada al conectarse.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Cerrar las demás', style: 'destructive', onPress: () => run(() => revokeOtherDevices(), 'Cerramos las sesiones de los demás dispositivos.') },
  ]);
  const others = devices?.filter(device => device.id !== current && !device.revoked_at) ?? [];

  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <PageHeader backTo="/security" title="Dispositivos y sesiones" subtitle="Dónde está abierta tu cuenta" />
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.notice}>Cerrar una sesión bloquea tu cuenta de Movya en ese dispositivo, pero no invalida una clave privada que ya se haya copiado de él. Si perdiste un teléfono, usa también «Reportar dispositivo perdido» con tu kit de recuperación.</Text>
        {!devices ? <ActivityIndicator color={colors.brand} style={{ marginTop: 16 }} /> : devices.map(device => <View key={device.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 }}>
          <Ionicons name={device.platform === 'web' ? 'desktop-outline' : 'phone-portrait-outline'} size={24} color={device.revoked_at ? colors.muted : colors.brand} />
          <View style={{ flex: 1 }}>
            <Text translate={false} style={styles.subtitle}>{device.label}</Text>
            {device.id === current ? <Text style={styles.hint}>Este dispositivo</Text> : null}
            {device.revoked_at ? <Text style={styles.hint}>Desactivado</Text> : null}
            <Text style={styles.hint}>{`Último acceso: ${when(device.last_seen_at)} · Registrado: ${when(device.created_at)}`}</Text>
          </View>
          {device.id !== current && !device.revoked_at ? <PressableScale disabled={busy} onPress={() => confirmRevoke(device)} style={[styles.secondary, { marginTop: 0 }]}><Text style={styles.secondaryText}>Cerrar sesión</Text></PressableScale> : null}
        </View>)}
        {others.length ? <PressableScale disabled={busy} onPress={confirmRevokeAll} style={[styles.button, styles.danger, busy && styles.disabled]}><Text style={styles.buttonText}>Cerrar todas las demás sesiones</Text></PressableScale> : null}
        <PressableScale disabled={busy} onPress={() => router.push('/restore-words')} style={styles.secondary}><Text style={styles.secondaryText}>Reportar dispositivo perdido</Text></PressableScale>
        {message ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{message}</Text> : null}
      </View>
    </ScrollView>
  </SafeAreaView>;
}
