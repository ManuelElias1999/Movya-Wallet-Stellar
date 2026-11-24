import { Text, TextInput } from '@/i18n/primitives';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Keyboard, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageHeader } from '@/components/PageHeader';
import { PressableScale } from '@/components/PressableScale';
import { secureStyles as styles } from '@/components/secureStyles';
import { useAuth } from '@/context/AuthContext';
import { MIN_PASSWORD_LENGTH } from '@/services/security/passwordStrength';
import { colors } from '@/theme/tokens';

export default function PinScreen() {
  const auth = useAuth(); const router = useRouter();
  const [password, setPassword] = useState(''); const [pin, setPin] = useState(''); const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const save = async () => {
    if (busy) return;
    Keyboard.dismiss(); setBusy(true); setMessage('');
    try {
      if (pin !== repeat) throw new Error('Los PIN no coinciden.');
      await auth.setPin(password, pin);
      setPassword(''); setPin(''); setRepeat('');
      setMessage('PIN guardado. Podrás usarlo para desbloquear Movya; enviar seguirá pidiendo Face ID o huella.');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'No se pudo guardar el PIN.'); }
    finally { setBusy(false); }
  };
  const remove = async () => { setBusy(true); try { await auth.removePin(); setMessage('PIN eliminado.'); } finally { setBusy(false); } };
  const ready = password.length >= MIN_PASSWORD_LENGTH && pin.length === 6 && repeat.length === 6 && !busy;

  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <PageHeader backTo="/security" title="PIN de Movya" subtitle="Desbloqueo rápido de la app" />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.copy}>El PIN de 6 números desbloquea Movya cuando se bloquea. No reemplaza a Face ID o la huella para firmar, ni a tu contraseña para recuperar tu wallet.</Text>
        <Text style={styles.notice}>Tras 5 errores tendrás que esperar cada vez más. Con 10 errores el PIN se borra y tendrás que ingresar con tu contraseña.</Text>
        {auth.pinAvailable ? <>
          <Text style={styles.label}>Tienes un PIN activo</Text>
          <PressableScale disabled={busy} onPress={() => void remove()} style={[styles.button, styles.danger, busy && styles.disabled]}><Text style={styles.buttonText}>Eliminar PIN</Text></PressableScale>
          <Text style={styles.label}>Cambiarlo</Text>
        </> : null}
        <Text style={styles.label}>Tu contraseña de Movya</Text>
        <View style={styles.field}><TextInput value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} placeholder="Contraseña" placeholderTextColor={colors.muted} editable={!busy} style={styles.input} /></View>
        <Text style={styles.label}>Nuevo PIN</Text>
        <View style={styles.field}><TextInput value={pin} onChangeText={value => setPin(value.replace(/\D/g, ''))} secureTextEntry keyboardType="number-pad" maxLength={6} placeholder="6 números" placeholderTextColor={colors.muted} editable={!busy} style={styles.input} /></View>
        <View style={styles.field}><TextInput value={repeat} onChangeText={value => setRepeat(value.replace(/\D/g, ''))} secureTextEntry keyboardType="number-pad" maxLength={6} placeholder="Repite el PIN" placeholderTextColor={colors.muted} editable={!busy} style={styles.input} /></View>
        <PressableScale disabled={!ready} onPress={() => void save()} style={[styles.button, !ready && styles.disabled]}><Text style={styles.buttonText}>Guardar PIN</Text></PressableScale>
        {busy ? <ActivityIndicator color={colors.brand} style={{ marginTop: 16 }} /> : null}
        {message ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{message}</Text> : null}
        <PressableScale disabled={busy} onPress={() => router.replace('/security')} style={styles.secondary}><Text style={styles.secondaryText}>Volver a Seguridad</Text></PressableScale>
      </View>
    </ScrollView>
  </SafeAreaView>;
}
