import { Alert, Text, TextInput } from '@/i18n/primitives';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageHeader } from '@/components/PageHeader';
import { PressableScale } from '@/components/PressableScale';
import { PasswordVisibilityButton, usePasswordVisibility } from '@/components/PasswordVisibility';
import { useSensitiveScreen } from '@/components/useSensitiveScreen';
import { useAuth } from '@/context/AuthContext';
import { useTestnetWallet } from '@/context/TestnetWalletContext';
import { isMfaRequired } from '@/services/backend/mfa';
import { colors } from '@/theme/tokens';

// One screen for both cases:
//  - the wallet's own 12 words (for example after a password reset made the
//    encrypted backup unreadable): restores the same key and re-encrypts it;
//  - the recovery kit (lost or stolen phone): authorizes a new key for this
//    device and disables every other device key.
export default function RestoreWordsScreen() {
  const auth = useAuth(); const router = useRouter(); const wallet = useTestnetWallet();
  const [mfaCode, setMfaCode] = useState(''); const [needsCode, setNeedsCode] = useState(false);
  const [words, setWords] = useState(''); const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const working = useRef(false);
  const visibility = usePasswordVisibility(password, busy);
  const hide = useCallback(() => { if (!working.current) { setWords(''); setPassword(''); } }, []);
  const screen = useSensitiveScreen('restore-words', hide);
  const count = words.trim() ? words.trim().split(/\s+/).length : 0;
  const canRestore = !busy && count === 12 && password.length >= 12 && screen.ready;

  const restore = async () => {
    if (!canRestore) return;
    Keyboard.dismiss(); working.current = true; setBusy(true); setMessage('');
    try {
      const kind = await auth.restoreWithWords(password, words, needsCode ? mfaCode : undefined);
      setWords(''); setPassword(''); setMfaCode('');
      await wallet.reload();
      if (kind === 'rotated') {
        Alert.alert('Clave del teléfono perdido desactivada', 'Las 12 palabras del teléfono anterior ya no controlan tu cuenta, pero siguen siendo secretas: no las publiques ni las uses en otra app. Ahora guarda las palabras nuevas de este teléfono.');
        router.replace('/wallet-backup');
      } else router.replace('/(tabs)');
    } catch (e) {
      if (isMfaRequired(e)) setNeedsCode(true);
      setMessage(e instanceof Error ? e.message : 'No se pudo restaurar tu wallet.');
    }
    finally { working.current = false; setBusy(false); }
  };

  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <PageHeader backTo={auth.ready ? '/security' : undefined} title="Recuperar acceso" subtitle="Con tus 12 palabras o tu kit" />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.icon}><Ionicons name="refresh-circle-outline" size={30} color={colors.brand} /></View>
          <Text style={styles.title}>Escribe tus 12 palabras</Text>
          <Text style={styles.copy}>• Las palabras de tu respaldo: recuperan tu misma wallet en este teléfono, por ejemplo si cambiaste tu contraseña.</Text>
          <Text style={styles.copy}>• Las palabras de tu kit de recuperación: si perdiste tu teléfono o te lo robaron. Este teléfono recibirá una clave nueva y la del teléfono perdido dejará de funcionar.</Text>
          <Text style={styles.notice}>Movya nunca te pedirá estas palabras por correo, chat o teléfono. Escríbelas solo aquí, en la app.</Text>
          <View style={[styles.field, { minHeight: 110, alignItems: 'flex-start' }]}>
            <TextInput value={words} onChangeText={setWords} multiline placeholder="palabra1 palabra2 …" placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false} autoComplete="off" spellCheck={false} editable={!busy} style={[styles.input, { minHeight: 110, textAlignVertical: 'top' }]} />
          </View>
          <Text style={styles.hint}>{`${count}/12 palabras`}</Text>
          <Text style={styles.label}>Tu contraseña actual de Movya</Text>
          <View style={styles.field}>
            <TextInput value={password} onChangeText={setPassword} secureTextEntry={!visibility.visible} placeholder="Contraseña" placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false} editable={!busy} style={styles.input} />
            <PasswordVisibilityButton visible={visibility.visible} onPress={visibility.toggle} disabled={busy} />
          </View>
          <Text style={styles.hint}>Tu wallet se volverá a cifrar con esta contraseña.</Text>
          {needsCode ? <>
            <Text style={styles.label}>Código de verificación en dos pasos</Text>
            <View style={styles.field}><TextInput value={mfaCode} onChangeText={setMfaCode} keyboardType="number-pad" textContentType="oneTimeCode" maxLength={6} placeholder="123456" placeholderTextColor={colors.muted} editable={!busy} style={styles.input} /></View>
          </> : null}
          <PressableScale disabled={!canRestore} onPress={() => void restore()} style={[styles.button, !canRestore && styles.disabled]}><Text style={styles.buttonText}>Recuperar mi wallet</Text></PressableScale>
          {busy ? <View style={{ flexDirection: 'row', gap: 9, alignItems: 'center', marginTop: 14 }}><ActivityIndicator color={colors.brand} /><Text style={[styles.copy, { marginTop: 0, flex: 1 }]}>{auth.accessStage || 'Recuperando…'}</Text></View> : null}
          {screen.failed ? <Text style={styles.notice}>No pudimos proteger esta pantalla de capturas. Actualiza la app antes de escribir tus palabras.</Text> : null}
          {message ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{message}</Text> : null}
          {!auth.ready ? <PressableScale disabled={busy} onPress={() => router.replace('/')} style={styles.secondary}><Text style={styles.secondaryText}>Volver al inicio</Text></PressableScale> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#D8E1EB' }, content: { padding: 20, maxWidth: 760, width: '100%', alignSelf: 'center' }, card: { padding: 20, backgroundColor: colors.surface, borderRadius: 24 },
  icon: { width: 58, height: 58, borderRadius: 19, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }, title: { color: colors.ink, fontSize: 19, fontWeight: '800', lineHeight: 26 },
  copy: { color: colors.text, fontSize: 13, lineHeight: 21, marginTop: 10 }, notice: { color: colors.brandDark, fontSize: 12, lineHeight: 20, padding: 14, backgroundColor: colors.brandSoft, borderRadius: 14, marginTop: 16 },
  label: { color: colors.ink, fontSize: 13, fontWeight: '700', marginTop: 18 }, hint: { color: colors.muted, fontSize: 11, marginTop: 6 },
  field: { minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: 14, marginTop: 10, flexDirection: 'row', alignItems: 'center', paddingRight: 4 }, input: { flex: 1, minWidth: 0, minHeight: 52, color: colors.ink, padding: 14 },
  secondary: { minHeight: 48, padding: 12, borderRadius: 16, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center', marginTop: 12 }, secondaryText: { color: colors.brandDark, fontSize: 13, fontWeight: '700' },
  button: { minHeight: 52, padding: 12, borderRadius: 16, backgroundColor: colors.brand, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18 }, buttonText: { color: 'white', fontSize: 14, fontWeight: '800' }, disabled: { opacity: 0.45 },
});
