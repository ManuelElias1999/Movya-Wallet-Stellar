import { Alert, Text, TextInput } from '@/i18n/primitives';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Keyboard, ScrollView, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageHeader } from '@/components/PageHeader';
import { PressableScale } from '@/components/PressableScale';
import { secureStyles as styles } from '@/components/secureStyles';
import { confirmTotpEnrollment, disableTotp, startTotpEnrollment, verifiedTotpFactor } from '@/services/backend/mfa';
import { colors } from '@/theme/tokens';

export default function TwoFactorScreen() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [enrollment, setEnrollment] = useState<{ factorId: string; uri: string; secret: string } | null>(null);
  const [code, setCode] = useState(''); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  useEffect(() => { void verifiedTotpFactor().then(factor => setEnabled(Boolean(factor))).catch(() => setEnabled(false)); }, []);
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    Keyboard.dismiss(); setBusy(true); setMessage('');
    try { await action(); } catch (e) { setMessage(e instanceof Error ? e.message : 'No se pudo completar la acción.'); }
    finally { setBusy(false); }
  };
  const start = () => run(async () => { setEnrollment(await startTotpEnrollment()); setCode(''); });
  const confirm = () => run(async () => {
    if (!enrollment) return;
    await confirmTotpEnrollment(enrollment.factorId, code);
    setEnrollment(null); setCode(''); setEnabled(true);
    setMessage('Listo. Desde ahora te pediremos el código al ingresar y para cambios sensibles.');
  });
  const disable = () => Alert.alert('Desactivar verificación en dos pasos', 'Tu cuenta quedará protegida solo con tu contraseña.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Desactivar', style: 'destructive', onPress: () => void run(async () => { await disableTotp(); setEnabled(false); }) },
  ]);

  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <PageHeader backTo="/security" title="Verificación en dos pasos" subtitle="Un código además de tu contraseña" />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.copy}>Usa una app de autenticación (por ejemplo Google Authenticator, Microsoft Authenticator o 1Password). Te pediremos su código de 6 números al ingresar en un dispositivo y para cambios sensibles de tu cuenta.</Text>
        <Text style={styles.notice}>Protege tu cuenta de Movya. No reemplaza tus 12 palabras ni tu kit: si alguien ya copió la clave de un teléfono, la verificación en dos pasos no la invalida.</Text>
        {enabled === null ? <ActivityIndicator color={colors.brand} style={{ marginTop: 16 }} /> : enabled ? <>
          <Text style={styles.label}>Activada</Text>
          <PressableScale disabled={busy} onPress={disable} style={[styles.button, styles.danger, busy && styles.disabled]}><Text style={styles.buttonText}>Desactivar</Text></PressableScale>
        </> : enrollment ? <>
          <Text style={styles.label}>1. Escanea este código con tu app</Text>
          <View style={{ alignItems: 'center', marginTop: 14, padding: 14, backgroundColor: '#FFFFFF', borderRadius: 16 }}><QRCode value={enrollment.uri} size={190} /></View>
          <Text style={styles.hint}>O escribe esta clave en tu app:</Text>
          <Text translate={false} selectable style={styles.mono}>{enrollment.secret}</Text>
          <Text style={styles.label}>2. Escribe el código que muestra</Text>
          <View style={styles.field}><TextInput value={code} onChangeText={setCode} keyboardType="number-pad" textContentType="oneTimeCode" maxLength={6} placeholder="123456" placeholderTextColor={colors.muted} editable={!busy} style={styles.input} /></View>
          <PressableScale disabled={busy || code.length !== 6} onPress={() => void confirm()} style={[styles.button, (busy || code.length !== 6) && styles.disabled]}><Text style={styles.buttonText}>Activar</Text></PressableScale>
        </> : <PressableScale disabled={busy} onPress={() => void start()} style={[styles.button, busy && styles.disabled]}><Text style={styles.buttonText}>Configurar verificación en dos pasos</Text></PressableScale>}
        {busy ? <ActivityIndicator color={colors.brand} style={{ marginTop: 16 }} /> : null}
        {message ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{message}</Text> : null}
      </View>
    </ScrollView>
  </SafeAreaView>;
}
