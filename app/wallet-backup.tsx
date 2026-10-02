import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageHeader } from '@/components/PageHeader';
import { PressableScale } from '@/components/PressableScale';
import { useAuth } from '@/context/AuthContext';
import type { RecoveryMaterial } from '@/services/stellar/recovery';
import { colors } from '@/theme/tokens';
import { createSensitiveClipboard } from '@/services/sensitiveClipboard';

const copySensitive = createSensitiveClipboard(Clipboard);

export default function WalletBackupScreen() {
  const auth = useAuth(); const router = useRouter(); const lock = useRef(false); const generation = useRef(0);
  const captureOwner = useRef<string | null>(null);
  const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false);
  const passwordInput = useRef<TextInput>(null);
  const [material, setMaterial] = useState<RecoveryMaterial | null>(null);
  const [mode, setMode] = useState<'phrase' | 'key'>('phrase'); const [message, setMessage] = useState('');
  const [captureReady, setCaptureReady] = useState(Platform.OS === 'web');
  const [checked, setChecked] = useState(false); const [viewed, setViewed] = useState(false); const [done, setDone] = useState(false);
  const hide = useCallback(() => { generation.current++; setMaterial(null); setPassword(''); setChecked(false); }, []);

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
    const subscription = AppState.addEventListener('change', state => { if (state !== 'active') hide(); });
    const visibility = () => { if (typeof document !== 'undefined' && document.visibilityState !== 'visible') hide(); };
    if (Platform.OS === 'web' && typeof document !== 'undefined') document.addEventListener('visibilitychange', visibility);
    return () => { subscription.remove(); if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', visibility); };
  }, [hide]);
  useEffect(() => { if (!material) return; const timer = setTimeout(hide, 60_000); return () => clearTimeout(timer); }, [material, hide]);
  useEffect(() => { if (done && !auth.needsBackup) router.replace(auth.needsOnboarding ? '/onboarding' : '/(tabs)'); }, [done, auth.needsBackup, auth.needsOnboarding, router]);

  const reveal = async (requested: 'phrase' | 'key') => {
    if (!password || !captureReady || lock.current) return;
    Keyboard.dismiss();
    lock.current = true; setBusy(true); setMaterial(null); setMessage(''); setChecked(false);
    const current = generation.current;
    try {
      const result = await auth.readRecovery(password);
      if (current !== generation.current) return;
      setMode(requested === 'phrase' && result.mnemonic ? 'phrase' : 'key'); setMaterial(result); setViewed(true);
      if (!result.mnemonic) setMessage('Tu wallet anterior se creó sin una frase de 12 palabras. Guarda su clave privada para conservar esta misma dirección y saldo.');
    } catch (e) { if (current === generation.current) setMessage(e instanceof Error ? e.message : 'No se pudo abrir el respaldo.'); }
    finally { setPassword(''); lock.current = false; setBusy(false); }
  };
  const finish = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setMessage(''); hide();
    try { await auth.acknowledgeBackup(); setDone(true); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'No se pudo continuar.'); }
    finally { lock.current = false; setBusy(false); }
  };
  const acknowledge = () => {
    if (!viewed) {
      const warning = 'Primero ingresa tu contraseña y toca «Ver frase de recuperación» o «Ver clave privada». Después de guardar tu respaldo podrás marcar esta casilla.';
      setMessage(warning);
      Alert.alert('Primero verifica tu contraseña', warning, [{ text: 'Entendido', onPress: () => passwordInput.current?.focus() }]);
      return;
    }
    setMessage(''); setChecked(value => !value);
  };
  const copy = async () => {
    if (!material || !captureReady || lock.current) return;
    const current = generation.current;
    const value = mode === 'phrase' ? material.mnemonic : material.secret;
    if (!value) return;
    lock.current = true; setBusy(true);
    try {
      await copySensitive(value, () => generation.current === current);
      if (generation.current === current) setMessage(mode === 'phrase' ? 'Frase copiada.' : 'Clave privada copiada.');
    } catch (e) { if (generation.current === current) setMessage(e instanceof Error ? e.message : 'No pudimos copiar el respaldo.'); }
    finally { lock.current = false; setBusy(false); }
  };
  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <PageHeader backTo={auth.needsBackup ? undefined : '/security'} title={auth.needsBackup ? 'Respalda tu wallet' : 'Respaldo y claves'} subtitle="Stellar Testnet · tu cuenta de pruebas" />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.icon}><Ionicons name="shield-checkmark-outline" size={30} color={colors.brand} /></View>
          <Text style={styles.title}>Tu wallet también es tuya fuera de Movya</Text>
          <Text style={styles.copy}>Las 12 palabras permiten recuperar tu wallet en un servicio compatible. Guárdalas en su orden original, en un lugar privado.</Text>
          <Text style={styles.notice}>Quien tenga tus palabras o tu clave privada puede controlar la wallet. No las compartas ni las envíes por chat. Movya no te las pedirá por correo.</Text>
          {!auth.user ? <>
            <Text style={styles.copy}>Ingresa con tu correo para consultar el respaldo de tu cuenta.</Text>
            <PressableScale onPress={() => router.replace('/')} style={styles.button}><Text style={styles.buttonText}>Crear cuenta o ingresar</Text></PressableScale>
          </> : <>
            <Text style={styles.label}>Confirma tu contraseña para mostrar el respaldo</Text>
            <TextInput ref={passwordInput} value={password} onChangeText={setPassword} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} placeholder="Tu contraseña de Movya" placeholderTextColor={colors.muted} secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!busy} style={styles.input} />
            <PressableScale disabled={busy || !password || !captureReady} onPress={() => void reveal('phrase')} style={[styles.button, (busy || !password || !captureReady) && styles.disabled]}><Ionicons name="key-outline" size={20} color="white" /><Text style={styles.buttonText}>Ver frase de recuperación</Text></PressableScale>
            <PressableScale disabled={busy || !password || !captureReady} onPress={() => void reveal('key')} style={[styles.button, (busy || !password || !captureReady) && styles.disabled]}><Ionicons name="lock-closed-outline" size={20} color="white" /><Text style={styles.buttonText}>Ver clave privada · opción avanzada</Text></PressableScale>
          </>}
          {busy ? <ActivityIndicator color={colors.brand} style={{ marginTop: 16 }} /> : null}
          {message ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{message}</Text> : null}
          {material ? <View style={styles.recovery}>
            <Text style={styles.title}>{mode === 'phrase' ? 'Tus 12 palabras' : 'Tu clave privada Stellar'}</Text>
            {mode === 'phrase' && material.mnemonic ? <View style={styles.words}>{material.mnemonic.split(' ').map((word, i) => <View key={i} style={styles.word}><Text style={styles.number}>{i + 1}</Text><Text style={styles.wordText}>{word}</Text></View>)}</View> : <Text selectable style={styles.secret}>{material.secret}</Text>}
            <PressableScale disabled={busy} onPress={() => void copy()} style={styles.button}><Ionicons name="copy-outline" size={19} color="white" /><Text style={styles.buttonText}>{mode === 'phrase' ? 'Copiar las 12 palabras' : 'Copiar clave privada'}</Text></PressableScale>
            <Text style={styles.copy}>Se ocultará en un minuto, al salir o al poner la app en segundo plano.</Text>
            <PressableScale onPress={hide} style={styles.secondary}><Text style={styles.secondaryText}>Ocultar ahora</Text></PressableScale>
          </View> : null}
          {auth.needsBackup ? <>
            <PressableScale disabled={busy} accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel="Ya guardé mi respaldo en un lugar seguro" onPress={acknowledge} style={styles.checkbox}><Ionicons name={checked ? 'checkbox' : 'square-outline'} size={23} color={colors.brand} /><Text style={[styles.copy, { flex: 1, marginTop: 0 }]}>Ya guardé mi respaldo en un lugar seguro</Text></PressableScale>
            <PressableScale disabled={busy || !checked || !viewed} onPress={() => void finish()} style={[styles.button, (!checked || !viewed || busy) && styles.disabled]}><Text style={styles.buttonText}>Continuar a Movya</Text></PressableScale>
            <PressableScale disabled={busy} onPress={() => void finish()} style={styles.secondary}><Text style={styles.secondaryText}>Lo haré más tarde desde Seguridad</Text></PressableScale>
          </> : <PressableScale onPress={() => { hide(); router.replace('/security'); }} style={styles.secondary}><Text style={styles.secondaryText}>Volver a Seguridad</Text></PressableScale>}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#D8E1EB' }, content: { padding: 20, maxWidth: 760, width: '100%', alignSelf: 'center' }, card: { padding: 20, backgroundColor: colors.surface, borderRadius: 24 },
  icon: { width: 58, height: 58, borderRadius: 19, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }, title: { color: colors.ink, fontSize: 19, fontWeight: '800', lineHeight: 26 },
  copy: { color: colors.text, fontSize: 13, lineHeight: 21, marginTop: 10 }, notice: { color: colors.brandDark, fontSize: 12, lineHeight: 20, padding: 14, backgroundColor: colors.brandSoft, borderRadius: 14, marginTop: 16 },
  label: { color: colors.ink, fontSize: 13, fontWeight: '700', marginTop: 22 }, input: { minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: 14, color: colors.ink, padding: 14, marginTop: 10 },
  button: { minHeight: 52, padding: 12, borderRadius: 16, backgroundColor: colors.brand, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 }, buttonText: { color: 'white', fontSize: 14, fontWeight: '800' },
  secondary: { minHeight: 48, padding: 12, borderRadius: 16, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center', marginTop: 12 }, secondaryText: { color: colors.brandDark, fontSize: 13, fontWeight: '700' }, disabled: { opacity: 0.45 },
  recovery: { marginTop: 22, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 20 }, words: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }, word: { width: '47%', minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9, padding: 10, backgroundColor: '#EFF5FC', borderRadius: 12 }, number: { fontSize: 11, color: colors.muted, width: 18 }, wordText: { fontSize: 14, color: colors.ink, fontWeight: '700' },
  secret: { fontSize: 14, lineHeight: 24, color: colors.ink, padding: 14, backgroundColor: '#EFF5FC', borderRadius: 12, marginTop: 16 }, checkbox: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
});
