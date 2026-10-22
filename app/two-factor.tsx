import { Alert, Text, TextInput } from '@/i18n/primitives';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageHeader } from '@/components/PageHeader';
import { PressableScale } from '@/components/PressableScale';
import { secureStyles as styles } from '@/components/secureStyles';
import { useSensitiveScreen } from '@/components/useSensitiveScreen';
import { confirmTotpEnrollment, disableTotp, startTotpEnrollment, verifiedTotpFactors } from '@/services/backend/mfa';
import { colors } from '@/theme/tokens';

export default function TwoFactorScreen() {
  const [factorCount, setFactorCount] = useState<number | null>(null);
  const [enrollment, setEnrollment] = useState<{ factorId: string; uri: string; secret: string } | null>(null);
  const [code, setCode] = useState(''); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const hide = useCallback(() => { setEnrollment(null); setCode(''); }, []);
  const screen = useSensitiveScreen('two-factor', hide, { preserveOnBackground: true });
  useEffect(() => { void verifiedTotpFactors().then(factors => setFactorCount(factors.length)).catch(() => setFactorCount(0)); }, []);
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
    setEnrollment(null); setCode(''); setFactorCount(current => (current ?? 0) + 1);
    setMessage('Listo. Guarda al menos un autenticador en otro dispositivo para no perder el acceso si te roban el teléfono.');
  });
  const pasteCode = () => run(async () => {
    const value = (await Clipboard.getStringAsync()).replace(/\D/g, '').slice(0, 6);
    if (value.length !== 6) throw new Error('El portapapeles no contiene un código de 6 números.');
    setCode(value);
  });
  const disable = () => Alert.alert('Desactivar verificación en dos pasos', 'Tu cuenta quedará protegida solo con tu contraseña.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Desactivar', style: 'destructive', onPress: () => void run(async () => { await disableTotp(); setFactorCount(0); }) },
  ]);

  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <PageHeader backTo="/security" title="Verificación en dos pasos" subtitle="Un código además de tu contraseña" />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.copy}>Usa una app de autenticación (por ejemplo Google Authenticator, Microsoft Authenticator o 1Password). Te pediremos su código de 6 números al ingresar en un dispositivo y para cambios sensibles de tu cuenta.</Text>
        <Text style={styles.notice}>Protege tu cuenta de Movya. No reemplaza tus 12 palabras ni tu kit: si alguien ya copió la clave de un teléfono, la verificación en dos pasos no la invalida.</Text>
        {factorCount === null ? <ActivityIndicator color={colors.brand} style={{ marginTop: 16 }} /> : enrollment ? <>
          <Text style={styles.label}>1. Escanea este código con tu app</Text>
          <View style={{ alignItems: 'center', marginTop: 14, padding: 14, backgroundColor: '#FFFFFF', borderRadius: 16 }}><QRCode value={enrollment.uri} size={190} /></View>
          <Text style={styles.hint}>O escribe esta clave en tu app:</Text>
          <Text translate={false} selectable style={styles.mono}>{enrollment.secret}</Text>
          <Text style={styles.label}>2. Escribe el código que muestra</Text>
          <View style={styles.field}><TextInput value={code} onChangeText={value => setCode(value.replace(/\D/g, ''))} keyboardType="number-pad" textContentType="oneTimeCode" maxLength={6} placeholder="123456" placeholderTextColor={colors.muted} editable={!busy} style={styles.input} /></View>
          <PressableScale disabled={busy} onPress={() => void pasteCode()} style={styles.secondary}><Ionicons name="clipboard-outline" size={18} color={colors.brand} /><Text style={styles.secondaryText}>Pegar código</Text></PressableScale>
          <PressableScale disabled={busy || code.length !== 6} onPress={() => void confirm()} style={[styles.button, (busy || code.length !== 6) && styles.disabled]}><Text style={styles.buttonText}>Activar</Text></PressableScale>
        </> : factorCount > 0 ? <>
          <Text style={styles.label}>{factorCount === 1 ? 'Activada en un autenticador' : 'Activada en varios autenticadores'}</Text>
          <Text style={styles.notice}>Añade un autenticador en otro dispositivo. Si pierdes el único teléfono con tus códigos, no podrás iniciar sesión para usar el kit de recuperación.</Text>
          <PressableScale disabled={busy || !screen.ready} onPress={() => void start()} style={[styles.button, (busy || !screen.ready) && styles.disabled]}><Text style={styles.buttonText}>Añadir autenticador de respaldo</Text></PressableScale>
          <PressableScale disabled={busy} onPress={disable} style={[styles.button, styles.danger, busy && styles.disabled]}><Text style={styles.buttonText}>Desactivar todos</Text></PressableScale>
        </> : <PressableScale disabled={busy || !screen.ready} onPress={() => void start()} style={[styles.button, (busy || !screen.ready) && styles.disabled]}><Text style={styles.buttonText}>Configurar verificación en dos pasos</Text></PressableScale>}
        {busy ? <ActivityIndicator color={colors.brand} style={{ marginTop: 16 }} /> : null}
        {screen.failed ? <Text style={styles.notice}>No pudimos proteger esta pantalla de capturas. Actualiza la app antes de mostrar el código.</Text> : null}
        {message ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{message}</Text> : null}
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
