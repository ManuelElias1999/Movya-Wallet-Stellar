import { Text, TextInput } from '@/i18n/primitives';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageHeader } from '@/components/PageHeader';
import { PressableScale } from '@/components/PressableScale';
import { useAuth } from '@/context/AuthContext';
import { useTestnetWallet } from '@/context/TestnetWalletContext';
import type { RecoveryMaterial } from '@/services/stellar/recovery';
import { colors } from '@/theme/tokens';
import { PasswordVisibilityButton, usePasswordVisibility } from '@/components/PasswordVisibility';

const challengePositions = () => {
  const available = [...Array(12).keys()]; const selected: number[] = [];
  while (selected.length < 3) selected.push(available.splice(Math.floor(Math.random() * available.length), 1)[0]);
  return selected.sort((a, b) => a - b);
};

export default function WalletBackupScreen() {
  const auth = useAuth(); const wallet = useTestnetWallet(); const router = useRouter(); const lock = useRef(false); const generation = useRef(0);
  const captureOwner = useRef<string | null>(null);
  const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false);
  const passwordVisibility = usePasswordVisibility(password, busy);
  const passwordInput = useRef<TextInput>(null);
  const [material, setMaterial] = useState<RecoveryMaterial | null>(null);
  const [mode, setMode] = useState<'phrase' | 'key'>('phrase'); const [message, setMessage] = useState('');
  const [captureReady, setCaptureReady] = useState(Platform.OS === 'web');
  const [step, setStep] = useState<'reveal' | 'confirm' | 'protection'>('reveal');
  const expectedWords = useRef<string[]>([]); const [positions, setPositions] = useState<number[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({}); const [done, setDone] = useState(false);
  const hide = useCallback(() => {
    generation.current++; expectedWords.current = []; setMaterial(null); setPassword('');
    setPositions([]); setAnswers({}); setStep('reveal');
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true; const key = `movya-backup-${++generation.current}`;
    hide(); setCaptureReady(Platform.OS === 'web');
    captureOwner.current = key;
    const protection = Platform.OS === 'web' ? Promise.resolve() : (async () => {
        await ScreenCapture.preventScreenCaptureAsync(key);
        if (Platform.OS === 'ios') await ScreenCapture.enableAppSwitcherProtectionAsync();
        if (active) setCaptureReady(true);
      })().catch(() => { if (active) setMessage('No pudimos proteger esta pantalla. Actualiza Expo Go y vuelve a intentarlo.'); });
    return () => {
      active = false; hide();
      if (Platform.OS !== 'web') {
        // Wait for activation before removing protection. A late native
        // activation must not remain globally enabled after leaving the page.
        void protection.then(async () => {
          await ScreenCapture.allowScreenCaptureAsync(key).catch(() => undefined);
          if (captureOwner.current === key) {
            captureOwner.current = null;
            if (Platform.OS === 'ios') await ScreenCapture.disableAppSwitcherProtectionAsync().catch(() => undefined);
          }
        });
      }
    };
  }, [hide]));
  useEffect(() => {
    // During first-time backup the person must be able to switch to a secure
    // place where they are recording the words and return to the exact same
    // step. The app-switcher preview remains protected. Later disclosures from
    // Security still clear immediately on background.
    const subscription = AppState.addEventListener('change', state => { if (state === 'background' && !auth.needsBackup) hide(); });
    const visibility = () => { if (typeof document !== 'undefined' && document.visibilityState !== 'visible' && !auth.needsBackup) hide(); };
    if (Platform.OS === 'web' && typeof document !== 'undefined') document.addEventListener('visibilitychange', visibility);
    return () => { subscription.remove(); if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', visibility); };
  }, [auth.needsBackup, hide]);
  useEffect(() => { if (!material || auth.needsBackup) return; const timer = setTimeout(hide, 60_000); return () => clearTimeout(timer); }, [material, auth.needsBackup, hide]);
  useEffect(() => { if (done && !auth.needsBackup) router.replace(auth.needsOnboarding ? '/onboarding' : '/(tabs)'); }, [done, auth.needsBackup, auth.needsOnboarding, router]);

  const reveal = async (requested: 'phrase' | 'key') => {
    if (!password || !captureReady || lock.current) return;
    Keyboard.dismiss();
    lock.current = true; setBusy(true); setMaterial(null); setMessage('');
    const current = generation.current;
    try {
      const result = await auth.readRecovery(password);
      if (current !== generation.current) return;
      setMode(requested === 'phrase' && result.mnemonic ? 'phrase' : 'key'); setMaterial(result);
      if (!result.mnemonic) setMessage('Tu wallet anterior se creó sin una frase de 12 palabras. Guarda su clave privada para conservar esta misma dirección y saldo.');
    } catch (e) { if (current === generation.current) setMessage(e instanceof Error ? e.message : 'No se pudo abrir el respaldo.'); }
    finally { setPassword(''); lock.current = false; setBusy(false); }
  };
  const beginConfirmation = () => {
    if (!material) return;
    if (!material.mnemonic || mode !== 'phrase') {
      expectedWords.current = []; setMaterial(null); setStep('protection'); return;
    }
    expectedWords.current = material.mnemonic.trim().split(/\s+/);
    setPositions(challengePositions()); setAnswers({}); setMaterial(null); setPassword(''); setMessage(''); setStep('confirm');
  };
  const confirmWords = () => {
    if (!positions.length || positions.some(position => (answers[position] ?? '').trim().toLowerCase() !== expectedWords.current[position])) {
      setMessage('Alguna palabra no coincide. Revisa el orden de tu respaldo e inténtalo nuevamente.'); return;
    }
    expectedWords.current = []; setAnswers({}); setMessage('Respaldo confirmado correctamente.'); setStep('protection');
  };
  const finish = async (borrowedDevice: boolean) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setMessage('');
    try {
      if (borrowedDevice) { await auth.disableDeviceBiometrics(); await wallet.reload(); }
      await auth.acknowledgeBackup(); setDone(true);
    }
    catch (e) { setMessage(e instanceof Error ? e.message : 'No se pudo continuar.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <PageHeader backTo={auth.needsBackup ? undefined : '/security'} title={auth.needsBackup ? 'Respalda tu wallet' : 'Respaldo y claves'} subtitle="Stellar Testnet · tu cuenta de pruebas" />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.icon}><Ionicons name="shield-checkmark-outline" size={30} color={colors.brand} /></View>
          <Text style={styles.title}>{step === 'confirm' ? 'Confirma tus 12 palabras' : step === 'protection' ? 'Protege Movya en este dispositivo' : 'Tu wallet también es tuya fuera de Movya'}</Text>
          <Text style={styles.copy}>{step === 'confirm'
            ? 'Escribe las palabras solicitadas para comprobar que guardaste el respaldo en el orden correcto.'
            : step === 'protection'
              ? 'Activa la biometría solamente si este teléfono es tuyo. Face ID y Touch ID pertenecen al dispositivo, no a tu cuenta de Movya.'
              : 'Las 12 palabras permiten recuperar tu wallet en un servicio compatible. Guárdalas en su orden original, en un lugar privado.'}</Text>
          {step === 'reveal' ? <Text style={styles.notice}>Quien tenga tus palabras o tu clave privada puede controlar la wallet. No las compartas ni las envíes por chat. Movya no te las pedirá por correo.</Text> : null}
          {step === 'reveal' && !auth.user ? <>
            <Text style={styles.copy}>Ingresa con tu correo para consultar el respaldo de tu cuenta.</Text>
            <PressableScale onPress={() => router.replace('/')} style={styles.button}><Text style={styles.buttonText}>Crear cuenta o ingresar</Text></PressableScale>
          </> : step === 'reveal' ? (material ? null : <>
            <Text style={styles.label}>Confirma tu contraseña para mostrar el respaldo</Text>
            <View style={styles.passwordField}>
              <TextInput ref={passwordInput} value={password} onChangeText={setPassword} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} placeholder="Tu contraseña de Movya" placeholderTextColor={colors.muted} secureTextEntry={!passwordVisibility.visible} autoCapitalize="none" autoCorrect={false} editable={!busy} style={styles.input} />
              <PasswordVisibilityButton visible={passwordVisibility.visible} onPress={passwordVisibility.toggle} disabled={busy} />
            </View>
            <PressableScale disabled={busy || !password || !captureReady} onPress={() => void reveal('phrase')} style={[styles.button, (busy || !password || !captureReady) && styles.disabled]}><Ionicons name="key-outline" size={20} color="white" /><Text style={styles.buttonText}>Ver frase de recuperación</Text></PressableScale>
            <PressableScale disabled={busy || !password || !captureReady} onPress={() => void reveal('key')} style={[styles.button, (busy || !password || !captureReady) && styles.disabled]}><Ionicons name="lock-closed-outline" size={20} color="white" /><Text style={styles.buttonText}>Ver clave privada · opción avanzada</Text></PressableScale>
          </>) : step === 'confirm' ? <>
            <Text style={styles.notice}>{`Completa únicamente los recuadros ${positions.map(position => position + 1).join(', ')} usando el respaldo que guardaste.`}</Text>
            <View style={styles.words}>{expectedWords.current.map((word, position) => positions.includes(position)
              ? <View key={position} style={[styles.word, styles.wordRequested]}><Text style={styles.number}>{position + 1}</Text><TextInput value={answers[position] ?? ''} onChangeText={value => setAnswers(current => ({ ...current, [position]: value }))} autoCapitalize="none" autoCorrect={false} editable={!busy} placeholder="Escribe aquí" placeholderTextColor={colors.muted} style={styles.wordInput} /></View>
              : <View key={position} style={styles.word}><Text style={styles.number}>{position + 1}</Text><Text translate={false} style={styles.wordText}>{word}</Text></View>)}</View>
            <PressableScale disabled={busy || positions.some(position => !(answers[position] ?? '').trim())} onPress={confirmWords} style={[styles.button, (busy || positions.some(position => !(answers[position] ?? '').trim())) && styles.disabled]}><Text style={styles.buttonText}>Confirmar respaldo</Text></PressableScale>
          </> : <>
            <Text style={styles.notice}>Si es un teléfono prestado, no guardaremos aquí la clave que firma tus operaciones. Podrás consultar el dashboard, pero no enviar ni hacer swaps desde este dispositivo.</Text>
            {wallet.biometric ? <PressableScale disabled={busy} onPress={() => void finish(false)} style={[styles.button, busy && styles.disabled]}><Ionicons name="finger-print-outline" size={20} color="white" /><Text style={styles.buttonText}>Activar Face ID o huella</Text></PressableScale> : null}
            <PressableScale disabled={busy} onPress={() => void finish(true)} style={styles.secondary}><Ionicons name="phone-portrait-outline" size={19} color={colors.brand} /><Text style={styles.secondaryText}>{wallet.biometric ? 'Este teléfono no es mío · solo consulta' : 'Continuar en modo consulta'}</Text></PressableScale>
          </>}
          {busy ? <ActivityIndicator color={colors.brand} style={{ marginTop: 16 }} /> : null}
          {message ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{message}</Text> : null}
          {step === 'reveal' && material ? <View style={styles.recovery}>
            <Text style={styles.title}>{mode === 'phrase' ? 'Tus 12 palabras' : 'Tu clave privada Stellar'}</Text>
            {mode === 'phrase' && material.mnemonic ? <View style={styles.words}>{material.mnemonic.split(' ').map((word, i) => <View key={i} style={styles.word}><Text style={styles.number}>{i + 1}</Text><Text translate={false} style={styles.wordText}>{word}</Text></View>)}</View> : <Text translate={false} selectable style={styles.secret}>{material.secret}</Text>}
            {auth.needsBackup ? <PressableScale disabled={busy} onPress={beginConfirmation} style={styles.button}><Text style={styles.buttonText}>Siguiente</Text><Ionicons name="arrow-forward" size={20} color="white" /></PressableScale> : <Text style={styles.copy}>Se ocultará en un minuto o al salir de la app.</Text>}
          </View> : null}
          {!auth.needsBackup && step === 'reveal' ? <PressableScale onPress={() => { hide(); router.replace('/security'); }} style={styles.secondary}><Text style={styles.secondaryText}>Volver a Seguridad</Text></PressableScale> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#D8E1EB' }, content: { padding: 20, maxWidth: 760, width: '100%', alignSelf: 'center' }, card: { padding: 20, backgroundColor: colors.surface, borderRadius: 24 },
  icon: { width: 58, height: 58, borderRadius: 19, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }, title: { color: colors.ink, fontSize: 19, fontWeight: '800', lineHeight: 26 },
  copy: { color: colors.text, fontSize: 13, lineHeight: 21, marginTop: 10 }, notice: { color: colors.brandDark, fontSize: 12, lineHeight: 20, padding: 14, backgroundColor: colors.brandSoft, borderRadius: 14, marginTop: 16 },
  label: { color: colors.ink, fontSize: 13, fontWeight: '700', marginTop: 22 }, passwordField: { minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: 14, marginTop: 10, flexDirection: 'row', alignItems: 'center', paddingRight: 4 }, input: { flex: 1, minWidth: 0, minHeight: 52, color: colors.ink, padding: 14 },
  button: { minHeight: 52, padding: 12, borderRadius: 16, backgroundColor: colors.brand, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 }, buttonText: { color: 'white', fontSize: 14, fontWeight: '800' },
  secondary: { minHeight: 48, padding: 12, borderRadius: 16, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center', marginTop: 12 }, secondaryText: { color: colors.brandDark, fontSize: 13, fontWeight: '700' }, disabled: { opacity: 0.45 },
  recovery: { marginTop: 22, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 20 }, words: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }, word: { width: '47%', minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: '#EFF5FC', borderWidth: 1.5, borderColor: 'transparent', borderRadius: 12 }, wordRequested: { backgroundColor: '#E6F0FF', borderColor: colors.brand }, number: { fontSize: 11, color: colors.muted, width: 18 }, wordText: { flex: 1, fontSize: 14, color: colors.ink, fontWeight: '700' }, wordInput: { flex: 1, minWidth: 0, minHeight: 36, paddingVertical: 4, color: colors.ink, fontSize: 13, fontWeight: '700' },
  secret: { fontSize: 14, lineHeight: 24, color: colors.ink, padding: 14, backgroundColor: '#EFF5FC', borderRadius: 12, marginTop: 16 },
});
