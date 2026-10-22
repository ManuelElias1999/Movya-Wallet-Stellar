import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '@/i18n/primitives';
import { useAuth } from '@/context/AuthContext';
import { PasswordInput } from '@/components/PasswordInput';
import { PasswordVisibilityButton, usePasswordVisibility } from '@/components/PasswordVisibility';
import { PressableScale } from '@/components/PressableScale';
import { isMfaRequired } from '@/services/backend/mfa';
import { colors } from '@/theme/tokens';

export function AppLockOverlay() {
  const auth = useAuth();
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [needsMfa, setNeedsMfa] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const passwordVisibility = usePasswordVisibility(password, busy);
  if (!auth.ready || !auth.locked || !auth.user) return null;

  const unlockWithPassword = async () => {
    if (!password || busy || (needsMfa && !/^\d{6}$/.test(mfaCode))) return;
    Keyboard.dismiss(); setBusy(true); setMessage('');
    try {
      await auth.unlock(password, needsMfa ? mfaCode : undefined);
      setPassword(''); setMfaCode(''); setNeedsMfa(false);
    } catch (failure) {
      if (isMfaRequired(failure)) setNeedsMfa(true);
      setMessage(failure instanceof Error ? failure.message : 'No pudimos abrir Movya.');
    } finally { setBusy(false); }
  };
  const unlockWithDevice = async () => {
    if (busy) return;
    setBusy(true); setMessage('');
    try { await auth.unlockWithDevice(); }
    catch (failure) { setMessage(failure instanceof Error ? failure.message : 'No se confirmó tu identidad.'); }
    finally { setBusy(false); }
  };
  const useAnotherAccount = async () => {
    if (busy) return;
    setBusy(true); setMessage('');
    try { await auth.logout(); }
    catch (failure) { setMessage(failure instanceof Error ? failure.message : 'No pudimos cerrar esta sesión.'); setBusy(false); }
  };

  return <View accessibilityViewIsModal style={styles.overlay}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.center}>
      <View style={styles.card}>
        <View style={styles.icon}><Ionicons name="lock-closed" size={25} color={colors.brand} /></View>
        <Text style={styles.title}>Movya está bloqueada</Text>
        <Text translate={false} selectable style={styles.email}>{auth.user.email ?? auth.user.id}</Text>
        <View style={styles.field}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.brand} />
          <PasswordInput value={password} onChangeText={setPassword} editable={!busy} autoCapitalize="none" autoCorrect={false} autoComplete="current-password" textContentType="password" secureTextEntry={!passwordVisibility.visible} returnKeyType="done" onSubmitEditing={() => void unlockWithPassword()} placeholder="Contraseña" placeholderTextColor={colors.muted} style={styles.input} />
          <PasswordVisibilityButton visible={passwordVisibility.visible} onPress={passwordVisibility.toggle} disabled={busy} />
        </View>
        {needsMfa ? <View style={styles.field}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.brand} />
          <TextInput value={mfaCode} onChangeText={setMfaCode} editable={!busy} keyboardType="number-pad" textContentType="oneTimeCode" maxLength={6} placeholder="Código de tu app de autenticación" placeholderTextColor={colors.muted} style={styles.input} />
        </View> : null}
        {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}
        <PressableScale disabled={busy || !password || (needsMfa && !/^\d{6}$/.test(mfaCode))} onPress={() => void unlockWithPassword()} style={[styles.primary, (busy || !password || (needsMfa && !/^\d{6}$/.test(mfaCode))) && styles.disabled]}>
          {busy ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="mail-outline" size={18} color="#FFFFFF" />}
          <Text style={styles.primaryText}>Entrar con contraseña</Text>
        </PressableScale>
        {auth.deviceUnlockAvailable ? <PressableScale disabled={busy} onPress={() => void unlockWithDevice()} style={styles.secondary}>
          <Ionicons name="finger-print-outline" size={20} color={colors.brand} /><Text style={styles.secondaryText}>Usar Face ID o huella</Text>
        </PressableScale> : null}
        <PressableScale disabled={busy} onPress={() => void useAnotherAccount()} style={styles.accountButton}><Text style={styles.accountText}>Usar otra cuenta</Text></PressableScale>
      </View>
    </KeyboardAvoidingView>
  </View>;
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', inset: 0, zIndex: 1000, elevation: 1000, backgroundColor: 'rgba(7,24,52,0.64)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 22 },
  card: { width: '100%', maxWidth: 420, padding: 20, borderRadius: 24, backgroundColor: colors.surface, shadowColor: '#000000', shadowOpacity: 0.25, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
  icon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', borderRadius: 18, backgroundColor: colors.brandSoft },
  title: { marginTop: 12, color: colors.ink, fontSize: 20, fontWeight: '900', textAlign: 'center' },
  email: { marginTop: 7, color: colors.brandDark, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  field: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingLeft: 14, paddingRight: 4, borderWidth: 1, borderColor: colors.border, borderRadius: 15, backgroundColor: '#FFFFFF' },
  input: { flex: 1, minWidth: 0, minHeight: 52, color: colors.ink, fontSize: 14 },
  message: { marginTop: 10, color: '#A33B4B', fontSize: 11, lineHeight: 16, textAlign: 'center' },
  primary: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, borderRadius: 16, backgroundColor: colors.brand },
  primaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  secondary: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10, borderRadius: 16, backgroundColor: colors.brandSoft },
  secondaryText: { color: colors.brandDark, fontSize: 13, fontWeight: '800' },
  accountButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 5 },
  accountText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  disabled: { opacity: 0.45 },
});
