import { Text, TextInput } from '@/i18n/primitives';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Image, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedDashboardBackground } from '@/components/AnimatedDashboardBackground';
import { PressableScale } from '@/components/PressableScale';
import { MovyaLogo } from '@/components/MovyaLogo';
import { useAuth } from '@/context/AuthContext';
import { WalletForge } from '@/components/WalletForge';
import { PasswordVisibilityButton, usePasswordVisibility } from '@/components/PasswordVisibility';
import { PasswordInput } from '@/components/PasswordInput';
import { colors } from '@/theme/tokens';
import { checkPasswordStrength, MIN_PASSWORD_LENGTH } from '@/services/security/passwordStrength';
import { isMfaRequired } from '@/services/backend/mfa';

type AuthMode = 'login' | 'register';

export default function WelcomeScreen() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const auth = useAuth();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [mfaCode, setMfaCode] = useState(''); const [needsMfa, setNeedsMfa] = useState(false);
  const passwordVisibility = usePasswordVisibility(password, busy);
  const confirmationVisibility = usePasswordVisibility(confirmation, busy);
  const changeAuthMode = (next: AuthMode) => {
    if (next === authMode || busy || lock.current) return;
    Keyboard.dismiss();
    setIdentity(''); setPassword(''); setConfirmation(''); setName(''); setCode(''); setPendingEmail(''); setMessage('');
    passwordVisibility.hide(); confirmationVisibility.hide();
    setAuthMode(next);
  };
  const passwordCheck = checkPasswordStrength(password, { email: identity, name });
  const registrationPasswordReady = authMode !== 'register' || Boolean(pendingEmail) || (passwordCheck.ok && password === confirmation);
  const canContinue = auth.configured && !busy && (!pendingEmail || /^\d{6,10}$/.test(code.trim())) && password.length >= (authMode === 'register' ? MIN_PASSWORD_LENGTH : 1) && registrationPasswordReady && (pendingEmail || (/^\S+@\S+\.\S+$/.test(identity.trim()) && (authMode === 'login' || name.trim().length > 1))) && (!needsMfa || /^\d{6}$/.test(mfaCode));
  const continueToApp = async () => {
    if (!canContinue || lock.current) return;
    Keyboard.dismiss(); lock.current = true; setBusy(true); setMessage('');
    try {
      if (pendingEmail) await auth.verifyEmail(pendingEmail, code, password);
      else if (authMode === 'register') {
        const ready = await auth.register(identity, password, name, confirmation);
        if (!ready) {
          setPendingEmail(identity.trim().toLowerCase()); setAuthMode('login');
          setMessage('Te enviamos un código. Escríbelo aquí para confirmar tu correo y crear tu wallet. Si tu correo incluye un enlace, también puedes abrirlo y luego ingresar.');
          return;
        }
      } else await auth.login(identity, password, needsMfa ? mfaCode : undefined);
      // Protected routes open the backup step for a new account, or the
      // dashboard directly for every returning account.
      setPassword(''); setConfirmation(''); setMfaCode(''); setNeedsMfa(false);
    } catch (e) {
      if (isMfaRequired(e)) setNeedsMfa(true); setMessage(e && typeof e === 'object' && 'message' in e && typeof e.message === 'string' ? e.message : 'No se pudo completar el acceso. Inténtalo nuevamente.'); }
    finally { lock.current = false; setBusy(false); }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {busy && (authMode === 'register' || (pendingEmail && auth.accessStage)) ? <WalletForge stage={auth.accessStage || 'Preparando la creación de tu wallet…'} onCancel={auth.cancelAccess} /> : null}
      <AnimatedDashboardBackground />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
          <View style={styles.page}>
            <View style={styles.brandArea}>
              <View style={styles.logoHalo}>
                <MovyaLogo size={82} />
              </View>
              <Text style={styles.brand}>Movya Wallet</Text>
              <Text style={styles.tagline}>Un mensaje, una transacción</Text>
            </View>

            <BlurView intensity={72} tint="dark" style={[styles.authCard, Platform.OS === 'web' ? webGlass : null]}>
              <View pointerEvents="none" style={styles.cardShine} />
              {!pendingEmail ? <View style={styles.modeTabs}>
                <PressableScale disabled={busy} onPress={() => changeAuthMode('login')} style={[styles.modeTab, authMode === 'login' && styles.modeTabActive]}>
                  <Text style={[styles.modeText, authMode === 'login' && styles.modeTextActive]}>Ingresar</Text>
                </PressableScale>
                <PressableScale disabled={busy} onPress={() => changeAuthMode('register')} style={[styles.modeTab, authMode === 'register' && styles.modeTabActive]}>
                  <Text style={[styles.modeText, authMode === 'register' && styles.modeTextActive]}>Crear cuenta</Text>
                </PressableScale>
              </View> : null}

              <View style={styles.cardHeading}>
                <Text style={styles.title}>{pendingEmail ? 'Confirma tu correo' : auth.locked && auth.user ? 'Tu wallet está bloqueada' : authMode === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta Movya'}</Text>
                <Text style={styles.description}>{pendingEmail ? `Escribe el código que enviamos a ${pendingEmail}.` : auth.locked && auth.user ? 'Desbloquea Movya para continuar.' : authMode === 'login' ? 'Tu cuenta, tus contactos y tu wallet te esperan.' : 'Ingresa tus datos y tendrás tu propia wallet.'}</Text>
              </View>

              {authMode === 'register' ? (
                <View key="name" style={styles.field}>
                  <Ionicons color={colors.brand} name="person-outline" size={19} />
                  <TextInput returnKeyType="done" submitBehavior="blurAndSubmit" onSubmitEditing={Keyboard.dismiss} editable={!busy} autoCapitalize="words" onChangeText={setName} placeholder="Tu nombre" placeholderTextColor="#71809B" style={styles.input} value={name} />
                </View>
              ) : null}

              {!pendingEmail ? (
              <View key={`email-${authMode}`} style={styles.field}>
                <Ionicons color={colors.brand} name="mail-outline" size={19} />
                <TextInput
                  returnKeyType="done"
                  submitBehavior="blurAndSubmit"
                  onSubmitEditing={Keyboard.dismiss}
                  editable={!busy}
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="username"
                  keyboardType="email-address"
                  onChangeText={setIdentity}
                  placeholder="tu@correo.com"
                  placeholderTextColor="#71809B"
                  style={styles.input}
                  value={identity}
                />
              </View>
              ) : null}

              {pendingEmail ? <View style={styles.field}><Ionicons color={colors.brand} name="key-outline" size={19} /><TextInput editable={!busy} value={code} onChangeText={setCode} keyboardType="number-pad" textContentType="oneTimeCode" maxLength={10} placeholder="Código del correo" placeholderTextColor="#71809B" style={styles.input} /></View> : null}
              <View key={`password-${authMode}`} style={styles.field}>
                <Ionicons color={colors.brand} name="lock-closed-outline" size={19} />
                <PasswordInput returnKeyType="done" submitBehavior="blurAndSubmit" onSubmitEditing={Keyboard.dismiss} editable={!busy} autoCapitalize="none" autoCorrect={false} autoComplete={authMode === 'register' ? 'new-password' : 'current-password'} textContentType={authMode === 'register' ? 'newPassword' : 'password'} onChangeText={setPassword} placeholder="Contraseña" placeholderTextColor="#71809B" secureTextEntry={!passwordVisibility.visible} style={styles.input} value={password} />
                <PasswordVisibilityButton visible={passwordVisibility.visible} onPress={passwordVisibility.toggle} disabled={busy} />
              </View>

              {needsMfa && authMode === 'login' ? <View key="mfa" style={styles.field}>
                <Ionicons color={colors.brand} name="shield-checkmark-outline" size={19} />
                <TextInput editable={!busy} value={mfaCode} onChangeText={setMfaCode} keyboardType="number-pad" textContentType="oneTimeCode" maxLength={6} placeholder="Código de tu app de autenticación" placeholderTextColor="#71809B" style={styles.input} />
              </View> : null}
              {authMode === 'register' && !pendingEmail ? <View key="confirm" style={styles.field}>
                <Ionicons color={colors.brand} name="lock-closed-outline" size={19} />
                <PasswordInput returnKeyType="done" submitBehavior="blurAndSubmit" onSubmitEditing={Keyboard.dismiss} editable={!busy} autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" onChangeText={setConfirmation} placeholder="Repite tu contraseña" placeholderTextColor="#71809B" secureTextEntry={!confirmationVisibility.visible} style={styles.input} value={confirmation} />
                <PasswordVisibilityButton visible={confirmationVisibility.visible} onPress={confirmationVisibility.toggle} disabled={busy} />
              </View> : null}
              {authMode === 'register' && !pendingEmail ? <View style={styles.passwordChecklist}>
                {[
                  [password.length >= MIN_PASSWORD_LENGTH, `Mínimo ${MIN_PASSWORD_LENGTH} caracteres`],
                  [/[A-Z]/.test(password), 'Una letra mayúscula'],
                  [/[a-z]/.test(password), 'Una letra minúscula'],
                  [/[0-9]/.test(password), 'Un número'],
                  [/[^A-Za-z0-9\s]/.test(password), 'Un carácter especial'],
                  [confirmation.length > 0 && password === confirmation, 'Las dos contraseñas coinciden'],
                ].map(([ok, label]) => <View key={String(label)} style={styles.requirement}><Ionicons name={ok ? 'checkmark-circle' : 'ellipse-outline'} size={14} color={ok ? '#14845F' : '#8294AA'} /><Text style={[styles.requirementText, ok && styles.requirementMet]}>{String(label)}</Text></View>)}
              </View> : null}
              <Text style={styles.terms}>Tu contraseña también permite recuperar tu wallet. Consérvala en un lugar seguro. {authMode === 'register' ? 'Usa al menos 10 caracteres, una mayúscula, una minúscula, un número y un carácter especial.' : ''}</Text>
              {!auth.configured ? <Text style={styles.terms}>El acceso por correo se activará pronto. Puedes continuar probando tu wallet actual.</Text> : null}
              {message || auth.error ? <Text accessibilityLiveRegion="polite" style={[styles.description, { marginTop: 12 }]}>{message || auth.error}</Text> : null}

              {busy && auth.accessStage ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 14 }}>
                <ActivityIndicator color={colors.brand} />
                <Text accessibilityLiveRegion="polite" style={[styles.description, { flex: 1 }]}>Cargando tu wallet… {auth.accessStage}</Text>
              </View> : null}

              <PressableScale disabled={!canContinue} onPress={continueToApp} style={[styles.primaryButton, !canContinue && styles.primaryButtonDisabled]}>
                <LinearGradient colors={canContinue ? ['#287CFF', '#0755D8'] : ['#AEBBCD', '#97A6BA']} end={{ x: 1, y: 1 }} style={styles.primaryGradient}>
                  <Text style={styles.primaryText}>{busy ? 'Cargando…' : pendingEmail ? 'Confirmar y abrir mi wallet' : authMode === 'login' ? 'Ingresar a Movya' : 'Crear mi cuenta'}</Text>
                  {busy ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons color="#FFFFFF" name="arrow-forward" size={19} />}
                </LinearGradient>
              </PressableScale>
              {busy && auth.accessStage ? <PressableScale onPress={auth.cancelAccess} style={styles.demoButton}><Text style={styles.demoText}>Cancelar y volver a intentar</Text></PressableScale> : null}
              {auth.user && auth.deviceUnlockAvailable && !busy ? <PressableScale onPress={() => { setBusy(true); setMessage(''); void auth.unlockWithDevice().catch(e => setMessage(e.message)).finally(() => setBusy(false)); }} style={styles.demoButton}>
                <Ionicons color={colors.brand} name="finger-print-outline" size={18} /><Text style={styles.demoText}>Desbloquear con Face ID o huella</Text>
              </PressableScale> : null}
              {auth.user && auth.needsRestore && !busy ? <PressableScale onPress={() => router.push('/restore-words')} style={styles.demoButton}>
                <Ionicons color={colors.brand} name="reader-outline" size={18} /><Text style={styles.demoText}>Restaurar con mis 12 palabras</Text>
              </PressableScale> : null}

              {pendingEmail ? <>
                <PressableScale disabled={busy} onPress={() => { setBusy(true); void auth.resendEmail(pendingEmail).then(() => setMessage('Enviamos otro código. Revisa tu correo.')).catch(e => setMessage(e.message)).finally(() => setBusy(false)); }} style={styles.demoButton}><Text style={styles.demoText}>Reenviar código</Text></PressableScale>
                <PressableScale disabled={busy} onPress={() => { setPendingEmail(''); setCode(''); setMessage(''); }} style={styles.demoButton}><Text style={styles.demoText}>Ya confirmé mi correo · Ingresar</Text></PressableScale>
              </> : null}
              {!auth.configured ? <PressableScale onPress={() => router.replace('/(tabs)')} style={styles.demoButton}><Text style={styles.demoText}>Continuar con mi wallet de pruebas</Text></PressableScale> : null}
            </BlurView>

            <View style={styles.stellarFooter}>
              <Text style={styles.powered}>Powered by</Text>
              <Image source={require('../assets/stellar-footer-logo.png')} style={styles.stellarLogo} />
            </View>
            <Text style={styles.networkText}>Operaciones construidas sobre la red Stellar</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const webGlass = { backdropFilter: 'blur(28px) saturate(170%)', WebkitBackdropFilter: 'blur(28px) saturate(170%)' } as const;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 }, scroll: { flexGrow: 1, paddingHorizontal: 18, paddingVertical: 22 }, page: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center', justifyContent: 'center' },
  brandArea: { alignItems: 'center', marginBottom: 22 }, logoHalo: { width: 92, height: 92, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, shadowColor: '#000000', shadowOpacity: 0.3, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 8 }, logo: { width: 82, height: 82, resizeMode: 'contain' }, brand: { color: colors.ink, fontSize: 28, fontWeight: '900', letterSpacing: -0.8, marginTop: 13 }, tagline: { maxWidth: 330, color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 6 },
  authCard: { overflow: 'hidden', borderRadius: 30, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 18, shadowColor: colors.navy, shadowOpacity: 0.2, shadowRadius: 26, shadowOffset: { width: 0, height: 14 }, elevation: 8 }, cardShine: { position: 'absolute', left: 1, right: 1, top: 1, height: '30%', borderTopLeftRadius: 29, borderTopRightRadius: 29, backgroundColor: 'rgba(255,255,255,0.18)' },
  modeTabs: { flexDirection: 'row', padding: 4, borderRadius: 18, backgroundColor: colors.background }, modeTab: { flex: 1, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, modeTabActive: { backgroundColor: colors.surfaceElevated, shadowColor: '#000000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2 }, modeText: { color: colors.muted, fontSize: 13, fontWeight: '800' }, modeTextActive: { color: colors.brandDark },
  cardHeading: { marginVertical: 20 }, title: { color: colors.ink, fontSize: 21, fontWeight: '900', letterSpacing: -0.35 }, description: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 5 },
  identityTabs: { flexDirection: 'row', gap: 9, marginBottom: 10 }, identityTab: { flex: 1, height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSoft }, identityTabActive: { borderColor: colors.brandIce, backgroundColor: colors.brandSoft }, identityText: { color: colors.muted, fontSize: 12, fontWeight: '700' }, identityTextActive: { color: colors.brand },
  field: { height: 56, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, paddingHorizontal: 14, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceElevated, shadowColor: '#000000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }, input: { flex: 1, color: colors.ink, fontSize: 14 }, forgot: { alignSelf: 'flex-end', color: colors.brand, fontSize: 11, fontWeight: '800', marginTop: 2 }, terms: { color: colors.muted, fontSize: 9, lineHeight: 14, marginTop: 2 },
  passwordChecklist: { marginTop: 4, padding: 12, borderRadius: 15, backgroundColor: colors.surfaceSoft, gap: 7 }, requirement: { flexDirection: 'row', alignItems: 'center', gap: 7 }, requirementText: { color: colors.muted, fontSize: 10, fontWeight: '700' }, requirementMet: { color: colors.positive },
  primaryButton: { height: 56, borderRadius: 18, overflow: 'hidden', marginTop: 18, shadowColor: colors.brandDark, shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 5 }, primaryButtonDisabled: { shadowOpacity: 0.06 }, primaryGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }, primaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' }, demoButton: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 8 }, demoText: { color: colors.brand, fontSize: 12, fontWeight: '800' },
  stellarFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 22 }, powered: { color: colors.muted, fontSize: 11, fontWeight: '800' }, stellarLogo: { width: 76, height: 22, resizeMode: 'contain', tintColor: colors.ink }, networkText: { color: colors.muted, fontSize: 9, textAlign: 'center', marginTop: 4, marginBottom: 4 },
});
