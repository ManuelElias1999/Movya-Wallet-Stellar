import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedDashboardBackground } from '@/components/AnimatedDashboardBackground';
import { PressableScale } from '@/components/PressableScale';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/theme/tokens';

type AuthMode = 'login' | 'register';

export default function WelcomeScreen() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const auth = useAuth();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [linkExisting, setLinkExisting] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [code, setCode] = useState('');
  const unlocking = Boolean(auth.user && !auth.ready);
  const [name, setName] = useState('');
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const canContinue = auth.configured && !busy && (!pendingEmail || unlocking || /^\d{6,10}$/.test(code.trim())) && password.length >= (authMode === 'register' ? 12 : 1) && (unlocking || (/^\S+@\S+\.\S+$/.test(identity.trim()) && (authMode === 'login' || name.trim().length > 1)));

  const continueToApp = async () => {
    if (!canContinue || lock.current) return;
    lock.current = true; setBusy(true); setMessage('');
    try {
      if (unlocking) await auth.unlock(password, linkExisting);
      else if (pendingEmail) await auth.verifyEmail(pendingEmail, code, password, linkExisting);
      else if (authMode === 'register') {
        const ready = await auth.register(identity, password, name, linkExisting);
        if (!ready) {
          setPendingEmail(identity.trim().toLowerCase()); setAuthMode('login');
          setMessage('Te enviamos un código. Escríbelo aquí para confirmar tu correo y crear tu wallet. Si tu correo incluye un enlace, también puedes abrirlo y luego ingresar.');
          return;
        }
      } else await auth.login(identity, password, linkExisting);
      setPassword(''); router.replace(authMode === 'register' ? '/onboarding' : '/(tabs)');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'No se pudo completar el acceso. Inténtalo nuevamente.'); }
    finally { lock.current = false; setBusy(false); }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AnimatedDashboardBackground />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.page}>
            <View style={styles.brandArea}>
              <View style={styles.logoHalo}>
                <Image source={require('../assets/movya-logo.png')} style={styles.logo} />
              </View>
              <Text style={styles.brand}>Movya Wallet</Text>
              <Text style={styles.tagline}>Tu dinero, más simple. Habla con Movya y hazlo en segundos.</Text>
            </View>

            <BlurView intensity={72} tint="light" style={[styles.authCard, Platform.OS === 'web' ? webGlass : null]}>
              <View pointerEvents="none" style={styles.cardShine} />
              {!unlocking && !pendingEmail ? <View style={styles.modeTabs}>
                <PressableScale onPress={() => setAuthMode('login')} style={[styles.modeTab, authMode === 'login' && styles.modeTabActive]}>
                  <Text style={[styles.modeText, authMode === 'login' && styles.modeTextActive]}>Ingresar</Text>
                </PressableScale>
                <PressableScale onPress={() => setAuthMode('register')} style={[styles.modeTab, authMode === 'register' && styles.modeTabActive]}>
                  <Text style={[styles.modeText, authMode === 'register' && styles.modeTextActive]}>Crear cuenta</Text>
                </PressableScale>
              </View> : null}

              <View style={styles.cardHeading}>
                <Text style={styles.title}>{unlocking ? 'Abre tu wallet' : pendingEmail ? 'Confirma tu correo' : authMode === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta Movya'}</Text>
                <Text style={styles.description}>{unlocking ? `Ingresa tu contraseña para recuperar la wallet de ${auth.user?.email}.` : pendingEmail ? `Escribe el código que enviamos a ${pendingEmail}.` : authMode === 'login' ? 'Tu cuenta, tus contactos y tu wallet te esperan.' : 'Confirma tu correo y tendrás tu propia wallet de pruebas.'}</Text>
              </View>

              {!unlocking && authMode === 'register' ? (
                <View style={styles.field}>
                  <Ionicons color={colors.brand} name="person-outline" size={19} />
                  <TextInput autoCapitalize="words" onChangeText={setName} placeholder="Tu nombre" placeholderTextColor="#71809B" style={styles.input} value={name} />
                </View>
              ) : null}

              {!unlocking && !pendingEmail ? (
              <View style={styles.field}>
                <Ionicons color={colors.brand} name="mail-outline" size={19} />
                <TextInput
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onChangeText={setIdentity}
                  placeholder="tu@correo.com"
                  placeholderTextColor="#71809B"
                  style={styles.input}
                  value={identity}
                />
              </View>
              ) : null}

              {pendingEmail && !unlocking ? <View style={styles.field}><Ionicons color={colors.brand} name="key-outline" size={19} /><TextInput value={code} onChangeText={setCode} keyboardType="number-pad" textContentType="oneTimeCode" maxLength={10} placeholder="Código del correo" placeholderTextColor="#71809B" style={styles.input} /></View> : null}
              <View style={styles.field}>
                <Ionicons color={colors.brand} name="lock-closed-outline" size={19} />
                <TextInput onChangeText={setPassword} placeholder="Contraseña" placeholderTextColor="#71809B" secureTextEntry style={styles.input} value={password} />
                <Ionicons color={colors.muted} name="eye-outline" size={19} />
              </View>

              <Text style={styles.terms}>Tu contraseña también permite recuperar tu wallet. Consérvala en un lugar seguro. {authMode === 'register' ? 'Usa al menos 12 caracteres.' : ''}</Text>
              {auth.hasLegacyWallet ? <PressableScale disabled={busy} onPress={() => setLinkExisting(v => !v)} style={styles.demoButton}>
                <Ionicons name={linkExisting ? 'checkbox' : 'square-outline'} size={20} color={colors.brand} />
                <Text style={[styles.demoText, { flex: 1 }]}>Vincular mi wallet de pruebas anterior, si aún no tengo una asociada</Text>
              </PressableScale> : null}
              {!auth.configured ? <Text style={styles.terms}>El acceso por correo se activará pronto. Puedes continuar probando tu wallet actual.</Text> : null}
              {message || auth.error ? <Text accessibilityLiveRegion="polite" style={[styles.description, { marginTop: 12 }]}>{message || auth.error}</Text> : null}

              <PressableScale disabled={!canContinue} onPress={continueToApp} style={[styles.primaryButton, !canContinue && styles.primaryButtonDisabled]}>
                <LinearGradient colors={canContinue ? ['#287CFF', '#0755D8'] : ['#AEBBCD', '#97A6BA']} end={{ x: 1, y: 1 }} style={styles.primaryGradient}>
                  <Text style={styles.primaryText}>{busy ? 'Abriendo tu cuenta…' : unlocking ? 'Abrir mi wallet' : pendingEmail ? 'Confirmar y abrir mi wallet' : authMode === 'login' ? 'Ingresar a Movya' : 'Crear mi cuenta'}</Text>
                  <Ionicons color="#FFFFFF" name="arrow-forward" size={19} />
                </LinearGradient>
              </PressableScale>

              {pendingEmail && !unlocking ? <>
                <PressableScale disabled={busy} onPress={() => { setBusy(true); void auth.resendEmail(pendingEmail).then(() => setMessage('Enviamos otro código. Revisa tu correo.')).catch(e => setMessage(e.message)).finally(() => setBusy(false)); }} style={styles.demoButton}><Text style={styles.demoText}>Reenviar código</Text></PressableScale>
                <PressableScale disabled={busy} onPress={() => { setPendingEmail(''); setCode(''); setMessage(''); }} style={styles.demoButton}><Text style={styles.demoText}>Ya confirmé mi correo · Ingresar</Text></PressableScale>
              </> : null}
              {!auth.configured ? <PressableScale onPress={() => router.replace('/(tabs)')} style={styles.demoButton}><Text style={styles.demoText}>Continuar con mi wallet de pruebas</Text></PressableScale> : null}
              {unlocking ? <PressableScale disabled={busy} onPress={() => { setBusy(true); void auth.logout().catch(e => setMessage(e.message)).finally(() => setBusy(false)); }} style={styles.demoButton}><Text style={styles.demoText}>Ingresar con otra cuenta</Text></PressableScale> : null}
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
  safeArea: { flex: 1, backgroundColor: '#78AEF8' }, flex: { flex: 1 }, scroll: { flexGrow: 1, paddingHorizontal: 18, paddingVertical: 22 }, page: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center', justifyContent: 'center' },
  brandArea: { alignItems: 'center', marginBottom: 22 }, logoHalo: { width: 92, height: 92, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', shadowColor: colors.brandDark, shadowOpacity: 0.22, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 8 }, logo: { width: 82, height: 82, resizeMode: 'contain' }, brand: { color: colors.navy, fontSize: 28, fontWeight: '900', letterSpacing: -0.8, marginTop: 13 }, tagline: { maxWidth: 330, color: '#244F7A', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 6 },
  authCard: { overflow: 'hidden', borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', backgroundColor: 'rgba(244,250,255,0.48)', padding: 18, shadowColor: colors.navy, shadowOpacity: 0.2, shadowRadius: 26, shadowOffset: { width: 0, height: 14 }, elevation: 8 }, cardShine: { position: 'absolute', left: 1, right: 1, top: 1, height: '30%', borderTopLeftRadius: 29, borderTopRightRadius: 29, backgroundColor: 'rgba(255,255,255,0.18)' },
  modeTabs: { flexDirection: 'row', padding: 4, borderRadius: 18, backgroundColor: 'rgba(18,75,151,0.1)' }, modeTab: { flex: 1, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, modeTabActive: { backgroundColor: 'rgba(255,255,255,0.88)', shadowColor: colors.navy, shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2 }, modeText: { color: '#55708E', fontSize: 13, fontWeight: '800' }, modeTextActive: { color: colors.brandDark },
  cardHeading: { marginVertical: 20 }, title: { color: colors.ink, fontSize: 21, fontWeight: '900', letterSpacing: -0.35 }, description: { color: '#52708D', fontSize: 12, lineHeight: 17, marginTop: 5 },
  identityTabs: { flexDirection: 'row', gap: 9, marginBottom: 10 }, identityTab: { flex: 1, height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(111,145,183,0.24)', backgroundColor: 'rgba(233,242,251,0.62)' }, identityTabActive: { borderColor: '#8BB9FA', backgroundColor: 'rgba(231,241,255,0.94)' }, identityText: { color: colors.muted, fontSize: 12, fontWeight: '700' }, identityTextActive: { color: colors.brand },
  field: { height: 56, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, paddingHorizontal: 14, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(151,181,216,0.6)', backgroundColor: 'rgba(255,255,255,0.78)', shadowColor: colors.navy, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }, input: { flex: 1, color: colors.ink, fontSize: 14 }, forgot: { alignSelf: 'flex-end', color: colors.brand, fontSize: 11, fontWeight: '800', marginTop: 2 }, terms: { color: '#607995', fontSize: 9, lineHeight: 14, marginTop: 2 },
  primaryButton: { height: 56, borderRadius: 18, overflow: 'hidden', marginTop: 18, shadowColor: colors.brandDark, shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 5 }, primaryButtonDisabled: { shadowOpacity: 0.06 }, primaryGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }, primaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' }, demoButton: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 8 }, demoText: { color: colors.brand, fontSize: 12, fontWeight: '800' },
  stellarFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 22 }, powered: { color: colors.navy, fontSize: 11, fontWeight: '800' }, stellarLogo: { width: 76, height: 22, resizeMode: 'contain' }, networkText: { color: '#365E87', fontSize: 9, textAlign: 'center', marginTop: 4, marginBottom: 4 },
});
