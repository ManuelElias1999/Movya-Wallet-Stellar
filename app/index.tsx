import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedDashboardBackground } from '@/components/AnimatedDashboardBackground';
import { PressableScale } from '@/components/PressableScale';
import { colors } from '@/theme/tokens';

type AuthMode = 'login' | 'register';
type IdentityMode = 'email' | 'phone';

export default function WelcomeScreen() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [identityMode, setIdentityMode] = useState<IdentityMode>('email');
  const [name, setName] = useState('');
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const canContinue = identity.trim().length > 3 && password.length >= 4 && (authMode === 'login' || name.trim().length > 1);

  const continueToApp = () => {
    if (!canContinue) return;
    router.replace(authMode === 'register' ? '/onboarding' : '/(tabs)');
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
              <View style={styles.modeTabs}>
                <PressableScale onPress={() => setAuthMode('login')} style={[styles.modeTab, authMode === 'login' && styles.modeTabActive]}>
                  <Text style={[styles.modeText, authMode === 'login' && styles.modeTextActive]}>Ingresar</Text>
                </PressableScale>
                <PressableScale onPress={() => setAuthMode('register')} style={[styles.modeTab, authMode === 'register' && styles.modeTabActive]}>
                  <Text style={[styles.modeText, authMode === 'register' && styles.modeTextActive]}>Crear cuenta</Text>
                </PressableScale>
              </View>

              <View style={styles.cardHeading}>
                <Text style={styles.title}>{authMode === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta Movya'}</Text>
                <Text style={styles.description}>{authMode === 'login' ? 'Ingresa para acceder a tu wallet.' : 'Te mostraremos cómo usar el chat antes de comenzar.'}</Text>
              </View>

              {authMode === 'register' ? (
                <View style={styles.field}>
                  <Ionicons color={colors.brand} name="person-outline" size={19} />
                  <TextInput autoCapitalize="words" onChangeText={setName} placeholder="Tu nombre" placeholderTextColor="#71809B" style={styles.input} value={name} />
                </View>
              ) : null}

              <View style={styles.identityTabs}>
                <PressableScale onPress={() => { setIdentityMode('email'); setIdentity(''); }} style={[styles.identityTab, identityMode === 'email' && styles.identityTabActive]}>
                  <Ionicons color={identityMode === 'email' ? colors.brand : colors.muted} name="mail-outline" size={16} />
                  <Text style={[styles.identityText, identityMode === 'email' && styles.identityTextActive]}>Correo</Text>
                </PressableScale>
                <PressableScale onPress={() => { setIdentityMode('phone'); setIdentity(''); }} style={[styles.identityTab, identityMode === 'phone' && styles.identityTabActive]}>
                  <Ionicons color={identityMode === 'phone' ? colors.brand : colors.muted} name="phone-portrait-outline" size={16} />
                  <Text style={[styles.identityText, identityMode === 'phone' && styles.identityTextActive]}>Celular</Text>
                </PressableScale>
              </View>

              <View style={styles.field}>
                <Ionicons color={colors.brand} name={identityMode === 'email' ? 'mail-outline' : 'phone-portrait-outline'} size={19} />
                <TextInput
                  autoCapitalize="none"
                  keyboardType={identityMode === 'email' ? 'email-address' : 'phone-pad'}
                  onChangeText={setIdentity}
                  placeholder={identityMode === 'email' ? 'tu@correo.com' : '+591 70000000'}
                  placeholderTextColor="#71809B"
                  style={styles.input}
                  value={identity}
                />
              </View>

              <View style={styles.field}>
                <Ionicons color={colors.brand} name="lock-closed-outline" size={19} />
                <TextInput onChangeText={setPassword} placeholder="Contraseña" placeholderTextColor="#71809B" secureTextEntry style={styles.input} value={password} />
                <Ionicons color={colors.muted} name="eye-outline" size={19} />
              </View>

              {authMode === 'login' ? <Text style={styles.forgot}>¿Olvidaste tu contraseña?</Text> : <Text style={styles.terms}>Al continuar aceptas los términos y la política de privacidad de Movya.</Text>}

              <PressableScale disabled={!canContinue} onPress={continueToApp} style={[styles.primaryButton, !canContinue && styles.primaryButtonDisabled]}>
                <LinearGradient colors={canContinue ? ['#287CFF', '#0755D8'] : ['#AEBBCD', '#97A6BA']} end={{ x: 1, y: 1 }} style={styles.primaryGradient}>
                  <Text style={styles.primaryText}>{authMode === 'login' ? 'Ingresar a Movya' : 'Crear cuenta y ver demo'}</Text>
                  <Ionicons color="#FFFFFF" name="arrow-forward" size={19} />
                </LinearGradient>
              </PressableScale>

              <PressableScale onPress={() => router.push('/onboarding')} style={styles.demoButton}>
                <Ionicons color={colors.brand} name="play-circle-outline" size={20} />
                <Text style={styles.demoText}>Ver cómo funciona Movya</Text>
              </PressableScale>
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
