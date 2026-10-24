import { Text, TextInput } from '@/i18n/primitives';
import { Keypair } from '@stellar/stellar-sdk/base';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageHeader } from '@/components/PageHeader';
import { PressableScale } from '@/components/PressableScale';
import { useSecureStyles } from '@/components/secureStyles';
import { useSensitiveScreen } from '@/components/useSensitiveScreen';
import { useAuth } from '@/context/AuthContext';
import { useTestnetWallet } from '@/context/TestnetWalletContext';
import { moveAccountToNewWallet, verifyPasswordOffline } from '@/services/backend/accounts';
import { clearPendingSweep, writePendingSweep } from '@/services/backend/storage';
import { createRecoveryWallet } from '@/services/stellar/recovery';
import { prepareSweep, submitSweep } from '@/services/stellar/sweep';
import { SubmissionUnknownError } from '@/services/stellar/payments';
import { MIN_PASSWORD_LENGTH } from '@/services/security/passwordStrength';

type Step = 'intro' | 'words' | 'confirm' | 'done';
const positions = () => { const all = [...Array(12).keys()]; const out: number[] = []; while (out.length < 3) out.push(all.splice(Math.floor(Math.random() * all.length), 1)[0]); return out.sort((a, b) => a - b); };

// Emergency alternative to key rotation: moves XLM and USDC to a brand-new
// wallet and points the Movya account to it. The address changes.
export default function EmergencyTransferScreen() {
  const { styles, colors } = useSecureStyles();
  const auth = useAuth(); const wallet = useTestnetWallet(); const router = useRouter();
  const [step, setStep] = useState<Step>('intro');
  const [password, setPassword] = useState('');
  const fresh = useRef<{ secret: string; mnemonic: string } | null>(null);
  const [words, setWords] = useState<string[] | null>(null);
  const [asked, setAsked] = useState<number[]>([]); const [answers, setAnswers] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [newAddress, setNewAddress] = useState('');
  const working = useRef(false);
  const hide = useCallback(() => { if (working.current) return; setWords(null); setAnswers({}); fresh.current = null; setStep(current => current === 'done' ? 'done' : 'intro'); }, []);
  const screen = useSensitiveScreen('emergency-transfer', hide);
  const owner = auth.user?.id;

  const begin = async () => {
    if (!owner || busy) return;
    Keyboard.dismiss(); setBusy(true); setMessage('');
    try {
      await verifyPasswordOffline(owner, password);
      const material = createRecoveryWallet();
      fresh.current = material; setWords(material.mnemonic.split(' ')); setAsked(positions()); setStep('words');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'No pudimos verificar tu contraseña.'); }
    finally { setBusy(false); }
  };
  const execute = async () => {
    const material = fresh.current;
    if (!owner || !material || !words || !wallet.publicKey || !wallet.signerPublicKey || busy) return;
    if (asked.some(i => (answers[i] ?? '').trim().toLowerCase() !== words[i])) { setMessage('Alguna palabra no coincide. Revisa tu papel.'); return; }
    Keyboard.dismiss(); working.current = true; setBusy(true); setMessage('');
    const from = wallet.publicKey;
    const newKey = Keypair.fromSecret(material.secret);
    try {
      // Saved first: if anything stops after the transfer, the next sign-in finishes it.
      const createdAt = Date.now();
      await writePendingSweep(owner, { ...material, from, createdAt });
      let prepared: Awaited<ReturnType<typeof prepareSweep>>;
      try { prepared = await prepareSweep(from, wallet.signerPublicKey, newKey.publicKey()); }
      catch (error) { await clearPendingSweep(owner).catch(() => undefined); throw error; }
      await writePendingSweep(owner, { ...material, from, createdAt, hash: prepared.hash });
      try { await submitSweep(prepared, () => wallet.signSweep(prepared), newKey); }
      catch (error) {
        // A timeout can happen after Stellar accepted the transaction. Keep
        // the new key so the next sign-in can check the hash and finish safely.
        if (!(error instanceof SubmissionUnknownError)) await clearPendingSweep(owner).catch(() => undefined);
        throw error;
      }
      await moveAccountToNewWallet(owner, password, material, from);
      await wallet.reload();
      setNewAddress(newKey.publicKey()); setWords(null); setPassword(''); setStep('done');
    } catch (e) {
      setMessage(e instanceof SubmissionUnknownError
        ? 'Stellar recibió la operación, pero todavía no podemos confirmar el resultado. No vuelvas a enviarla: Movya conservará la wallet nueva y verificará esta misma transacción.'
        : e instanceof Error ? e.message : 'No se pudo completar la transferencia.');
    }
    finally { working.current = false; setBusy(false); }
  };

  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <PageHeader backTo="/security" title="Mover todo a una wallet nueva" subtitle="Alternativa de emergencia" />
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <View style={styles.card}>
        {step === 'intro' ? <>
          <Text style={styles.title}>Transferencia total de emergencia</Text>
          <Text style={styles.copy}>Creamos una wallet nueva con 12 palabras nuevas, movemos tu XLM y tu USDC y tu cuenta de Movya pasa a usarla. Úsala si crees que tu clave está comprometida y no puedes rotarla con tu kit.</Text>
          <Text style={styles.warning}>Tu dirección cambiará. Las personas que te tengan guardado verán un aviso de cambio de dirección. Si tu cuenta tiene kit de recuperación, quedará una pequeña reserva de XLM en la wallet anterior.</Text>
          <Text style={styles.label}>Tu contraseña de Movya</Text>
          <View style={styles.field}><TextInput value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} placeholder="Contraseña" placeholderTextColor={colors.muted} editable={!busy} style={styles.input} /></View>
          <PressableScale disabled={busy || password.length < MIN_PASSWORD_LENGTH || !screen.ready || !wallet.account} onPress={() => void begin()} style={[styles.button, styles.danger, (busy || password.length < MIN_PASSWORD_LENGTH || !screen.ready || !wallet.account) && styles.disabled]}><Text style={styles.buttonText}>Crear wallet nueva</Text></PressableScale>
        </> : step === 'words' && words ? <>
          <Text style={styles.title}>Escribe las 12 palabras de tu wallet nueva</Text>
          <View style={styles.words}>{words.map((word, i) => <View key={i} style={styles.word}><Text style={styles.number}>{i + 1}</Text><Text translate={false} style={styles.wordText}>{word}</Text></View>)}</View>
          <Text style={styles.copy}>Guárdalas en papel antes de continuar: si algo se interrumpe, son la forma segura de recuperar tus fondos.</Text>
          <PressableScale onPress={() => setStep('confirm')} style={styles.button}><Text style={styles.buttonText}>Ya las escribí</Text></PressableScale>
        </> : step === 'confirm' && words ? <>
          <Text style={styles.title}>Confirma y transfiere</Text>
          {asked.map(i => <View key={i} style={styles.field}><Text style={styles.number}>{i + 1}</Text><TextInput value={answers[i] ?? ''} onChangeText={value => setAnswers(current => ({ ...current, [i]: value }))} autoCapitalize="none" autoCorrect={false} editable={!busy} placeholder={`Palabra ${i + 1}`} placeholderTextColor={colors.muted} style={styles.input} /></View>)}
          <PressableScale disabled={busy} onPress={() => void execute()} style={[styles.button, styles.danger, busy && styles.disabled]}><Text style={styles.buttonText}>Mover todo a la wallet nueva</Text></PressableScale>
        </> : step === 'done' ? <>
          <Text style={styles.title}>Listo: tus fondos están en tu wallet nueva</Text>
          <Text translate={false} selectable style={styles.mono}>{newAddress}</Text>
          <Text style={styles.copy}>Las 12 palabras anteriores ya no controlan tu cuenta de Movya, pero siguen siendo secretas: no las publiques ni las uses en otra app.</Text>
          <PressableScale onPress={() => router.replace('/wallet-backup')} style={styles.button}><Text style={styles.buttonText}>Revisar mi respaldo nuevo</Text></PressableScale>
        </> : null}
        {busy ? <ActivityIndicator color={colors.brand} style={{ marginTop: 16 }} /> : null}
        {screen.failed ? <Text style={styles.warning}>No pudimos proteger esta pantalla de capturas. Actualiza la app antes de continuar.</Text> : null}
        {message ? <Text accessibilityLiveRegion="polite" style={styles.warning}>{message}</Text> : null}
      </View>
    </ScrollView>
  </SafeAreaView>;
}
