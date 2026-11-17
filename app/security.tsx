import { Alert, Text } from '@/i18n/primitives';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { InternalScreenBackground } from '@/components/InternalScreenBackground';
import { PageHeader } from '@/components/PageHeader';
import { PressableScale } from '@/components/PressableScale';
import { useAuth } from '@/context/AuthContext';
import { useTestnetWallet } from '@/context/TestnetWalletContext';
import { readDiscoverable, setDiscoverable } from '@/services/backend/accounts';
import { recoveryState } from '@/services/stellar/signers';
import { colors } from '@/theme/tokens';

type RowProps = { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; onPress?: () => void; right?: ReactNode };
function Row({ icon, title, subtitle, onPress, right }: RowProps) {
  return <PressableScale disabled={!onPress} onPress={onPress} style={styles.card}>
    <View style={styles.icon}><Ionicons name={icon} color={colors.brand} size={23} /></View>
    <View style={{ flex: 1 }}><Text style={styles.title}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text></View>
    {right ?? (onPress ? <Ionicons name="chevron-forward" color={colors.muted} size={19} /> : null)}
  </PressableScale>;
}

export default function SecurityScreen() {
  const router = useRouter(); const auth = useAuth(); const wallet = useTestnetWallet();
  const userId = auth.user?.id;
  const [discoverable, setDiscoverableState] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    void readDiscoverable(userId).then(value => { if (active) setDiscoverableState(value); }).catch(() => undefined);
    return () => { active = false; };
  }, [userId]);
  const recovery = useMemo(() => wallet.account && wallet.signerPublicKey ? recoveryState(wallet.account, wallet.signerPublicKey) : null, [wallet.account, wallet.signerPublicKey]);
  const toggleDiscoverable = (next: boolean) => {
    if (!userId || saving) return;
    setSaving(true); setDiscoverableState(next);
    void setDiscoverable(userId, next).then(setDiscoverableState)
      .catch(e => { setDiscoverableState(!next); Alert.alert('No se pudo guardar', e instanceof Error ? e.message : 'Inténtalo de nuevo.'); })
      .finally(() => setSaving(false));
  };

  return <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#D8E1EB' }}>
    <InternalScreenBackground />
    <PageHeader title="Seguridad" subtitle="Protege el acceso a tu wallet" backTo="/settings" />
    <ScrollView contentContainerStyle={styles.content}>
      <Row icon="finger-print-outline" title={wallet.biometric ? 'Face ID o huella activos' : 'Biometría no disponible'}
        subtitle={wallet.biometric ? 'Se piden antes de cada envío, cambio o al ver tu respaldo' : 'Activa Face ID o huella en tu teléfono y vuelve a ingresar. Mientras tanto, Movya pedirá tu contraseña al abrirse.'} />
      <Row icon="lock-closed-outline" title="Bloquear ahora" subtitle="Movya también se bloquea tras 5 minutos sin uso o 30 segundos fuera de la app" onPress={() => { auth.lockNow(); router.replace('/'); }} />
      <Row icon="key-outline" title="Respaldo y claves" subtitle="Frase de recuperación y clave privada" onPress={() => router.push('/wallet-backup')} />
      <Row icon="medkit-outline" title="Kit de recuperación"
        subtitle={recovery?.kind === 'protected' ? 'Configurado. Úsalo si pierdes este teléfono' : recovery?.kind === 'unexpected' ? 'Tu cuenta tiene claves que Movya no configuró' : 'Recomendado: protege tu cuenta si pierdes este teléfono'}
        onPress={() => router.push('/recovery-kit')} />
      <Row icon="alert-circle-outline" title="Reportar dispositivo perdido" subtitle="Usa tu kit para desactivar la clave del teléfono perdido, o tus 12 palabras para restaurar" onPress={() => router.push('/restore-words')} />
      {userId ? <Row icon="mail-outline" title="Encontrarme por correo"
        subtitle={discoverable === false ? 'Nadie puede agregarte escribiendo tu correo' : 'Otras personas de Movya pueden agregarte con tu correo exacto'}
        right={<Switch disabled={discoverable === null || saving} value={discoverable ?? true} onValueChange={toggleDiscoverable} trackColor={{ false: '#CED5E0', true: colors.brandIce }} thumbColor={discoverable === false ? '#FFFFFF' : colors.brand} />} /> : null}
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: 32 },
  card: { marginTop: 14, minHeight: 88, padding: 16, borderRadius: 20, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.ink, fontSize: 15, fontWeight: '800' }, subtitle: { color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 17 },
});
