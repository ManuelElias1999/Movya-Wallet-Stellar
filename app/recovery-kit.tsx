import { Text, TextInput } from '@/i18n/primitives';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Keypair } from '@stellar/stellar-sdk/base';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageHeader } from '@/components/PageHeader';
import { PressableScale } from '@/components/PressableScale';
import { useSensitiveScreen } from '@/components/useSensitiveScreen';
import { useTestnetWallet } from '@/context/TestnetWalletContext';
import { createRecoveryWallet } from '@/services/stellar/recovery';
import { recoveryState } from '@/services/stellar/signers';
import { prepareRecoverySetup, submitRecoverySetup } from '@/services/stellar/signerTransactions';
import { colors } from '@/theme/tokens';

type Step = 'intro' | 'words' | 'confirm' | 'done';
const pickPositions = () => {
  const all = Array.from({ length: 12 }, (_, i) => i);
  const picked: number[] = [];
  while (picked.length < 3) {
    const index = all.splice(Math.floor(Math.random() * all.length), 1)[0];
    picked.push(index);
  }
  return picked.sort((a, b) => a - b);
};

export default function RecoveryKitScreen() {
  const router = useRouter(); const wallet = useTestnetWallet();
  const [step, setStep] = useState<Step>('intro');
  const [words, setWords] = useState<string[] | null>(null);
  const kitPublicKey = useRef<string | null>(null);
  const [positions, setPositions] = useState<number[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const submitting = useRef(false);
  const hide = useCallback(() => {
    // The biometric prompt while submitting also leaves the foreground briefly.
    if (submitting.current) return;
    setWords(null); kitPublicKey.current = null; setAnswers({}); setStep(current => current === 'done' ? 'done' : 'intro');
  }, []);
  const screen = useSensitiveScreen('recovery-kit', hide);
  const state = useMemo(() => wallet.account && wallet.signerPublicKey ? recoveryState(wallet.account, wallet.signerPublicKey) : null, [wallet.account, wallet.signerPublicKey]);

  const start = () => {
    const kit = createRecoveryWallet();
    kitPublicKey.current = Keypair.fromSecret(kit.secret).publicKey();
    setWords(kit.mnemonic.split(' ')); setPositions(pickPositions()); setAnswers({}); setMessage(''); setStep('words');
  };
  const confirm = async () => {
    if (!words || !kitPublicKey.current || !wallet.publicKey || !wallet.signerPublicKey || busy) return;
    if (positions.some(i => (answers[i] ?? '').trim().toLowerCase() !== words[i])) { setMessage('Alguna palabra no coincide. Revisa tu papel y vuelve a intentarlo.'); return; }
    Keyboard.dismiss();
    const recovery = kitPublicKey.current;
    // The words are no longer needed: only the kit's public key goes on-chain.
    setWords(null); setAnswers({});
    submitting.current = true; setBusy(true); setMessage('');
    try {
      const prepared = await prepareRecoverySetup(wallet.publicKey, wallet.signerPublicKey, recovery);
      await submitRecoverySetup(prepared, xdr => wallet.signRecoverySetup(xdr, recovery), wallet.signerPublicKey);
      setStep('done'); void wallet.refresh();
    } catch (e) {
      setMessage(`${e instanceof Error ? e.message : 'No se pudo registrar el kit.'} No se cambió nada en tu cuenta; crea un kit nuevo para intentarlo otra vez.`);
      setStep('intro');
    } finally { submitting.current = false; kitPublicKey.current = null; setBusy(false); }
  };

  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <PageHeader backTo="/security" title="Kit de recuperación" subtitle="Protección si pierdes este teléfono" />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.icon}><Ionicons name="medkit-outline" size={28} color={colors.brand} /></View>
          {step === 'done' || state?.kind === 'protected' ? <>
            <Text style={styles.title}>Tu cuenta tiene un kit de recuperación</Text>
            <Text style={styles.copy}>Si pierdes este teléfono o te lo roban, entra a Movya desde otro dispositivo y usa «Reportar dispositivo perdido» con las 12 palabras del kit. Eso desactiva la clave del teléfono perdido.</Text>
            <Text style={styles.notice}>Este teléfono puede enviar y cambiar, pero no puede quitar el kit ni agregar claves. Si alguien usa tu teléfono antes de que actúes, podría enviar tu saldo: actúa rápido.</Text>
          </> : state?.kind === 'unexpected' ? <>
            <Text style={styles.title}>Tu cuenta tiene claves que Movya no configuró</Text>
            <Text style={styles.copy}>Por seguridad no agregaremos un kit encima. Revisa los firmantes de tu cuenta en Stellar Expert.</Text>
          </> : step === 'intro' ? <>
            <Text style={styles.title}>Crea un kit para recuperar tu cuenta</Text>
            <Text style={styles.copy}>Son 12 palabras nuevas, distintas de tu respaldo. Escríbelas en papel y guárdalas lejos del teléfono. Movya no las guarda: no estarán en este teléfono ni en nuestros servidores.</Text>
            <Text style={styles.notice}>Registrar el kit cuesta una pequeña reserva de XLM en Stellar y pedirá tu Face ID o huella.</Text>
            {!wallet.account ? <Text style={styles.copy}>Activa tu cuenta con XLM de prueba antes de crear el kit.</Text> : null}
            <PressableScale disabled={!wallet.account || busy || !screen.ready} onPress={start} style={[styles.button, (!wallet.account || busy || !screen.ready) && styles.disabled]}><Text style={styles.buttonText}>Crear kit de recuperación</Text></PressableScale>
          </> : step === 'words' && words ? <>
            <Text style={styles.title}>Escribe estas 12 palabras en papel</Text>
            <View style={styles.words}>{words.map((word, i) => <View key={i} style={styles.word}><Text style={styles.number}>{i + 1}</Text><Text translate={false} style={styles.wordText}>{word}</Text></View>)}</View>
            <Text style={styles.copy}>No las copies ni les tomes foto. Al salir de esta pantalla desaparecen.</Text>
            <PressableScale onPress={() => setStep('confirm')} style={styles.button}><Text style={styles.buttonText}>Ya las escribí</Text></PressableScale>
          </> : step === 'confirm' && words ? <>
            <Text style={styles.title}>Confirma tu kit</Text>
            <Text style={styles.copy}>Escribe las palabras que te pedimos, mirando tu papel.</Text>
            {positions.map(i => <View key={i} style={styles.field}>
              <Text style={styles.number}>{i + 1}</Text>
              <TextInput value={answers[i] ?? ''} onChangeText={value => setAnswers(current => ({ ...current, [i]: value }))} placeholder={`Palabra ${i + 1}`} placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false} editable={!busy} style={styles.input} />
            </View>)}
            <PressableScale disabled={busy} onPress={() => void confirm()} style={[styles.button, busy && styles.disabled]}><Text style={styles.buttonText}>Registrar kit en mi cuenta</Text></PressableScale>
            <PressableScale disabled={busy} onPress={() => setStep('words')} style={styles.secondary}><Text style={styles.secondaryText}>Ver las palabras otra vez</Text></PressableScale>
          </> : null}
          {busy ? <ActivityIndicator color={colors.brand} style={{ marginTop: 16 }} /> : null}
          {screen.failed ? <Text style={styles.notice}>No pudimos proteger esta pantalla de capturas. Actualiza la app antes de crear el kit.</Text> : null}
          {message ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{message}</Text> : null}
          <PressableScale disabled={busy} onPress={() => router.replace('/security')} style={styles.secondary}><Text style={styles.secondaryText}>Volver a Seguridad</Text></PressableScale>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#D8E1EB' }, content: { padding: 20, maxWidth: 760, width: '100%', alignSelf: 'center' }, card: { padding: 20, backgroundColor: colors.surface, borderRadius: 24 },
  icon: { width: 58, height: 58, borderRadius: 19, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }, title: { color: colors.ink, fontSize: 19, fontWeight: '800', lineHeight: 26 },
  copy: { color: colors.text, fontSize: 13, lineHeight: 21, marginTop: 10 }, notice: { color: colors.brandDark, fontSize: 12, lineHeight: 20, padding: 14, backgroundColor: colors.brandSoft, borderRadius: 14, marginTop: 16 },
  button: { minHeight: 52, padding: 12, borderRadius: 16, backgroundColor: colors.brand, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 }, buttonText: { color: 'white', fontSize: 14, fontWeight: '800' },
  secondary: { minHeight: 48, padding: 12, borderRadius: 16, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center', marginTop: 12 }, secondaryText: { color: colors.brandDark, fontSize: 13, fontWeight: '700' }, disabled: { opacity: 0.45 },
  words: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }, word: { width: '47%', minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9, padding: 10, backgroundColor: '#EFF5FC', borderRadius: 12 }, number: { fontSize: 11, color: colors.muted, width: 18 }, wordText: { fontSize: 14, color: colors.ink, fontWeight: '700' },
  field: { minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: 14, marginTop: 10, flexDirection: 'row', alignItems: 'center', paddingLeft: 12 }, input: { flex: 1, minWidth: 0, minHeight: 52, color: colors.ink, padding: 12 },
});
