import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedDashboardBackground } from '@/components/AnimatedDashboardBackground';
import { PressableScale } from '@/components/PressableScale';
import { colors } from '@/theme/tokens';

const steps = [
  { eyebrow: 'PASO 1', title: 'Abre el chat de Movya', description: 'En tu wallet, toca el logo de Movya ubicado en el centro del menú inferior.' },
  { eyebrow: 'PASO 2 · DEMO CON AYA', title: 'Escribe lo que quieres hacer', description: 'En este ejemplo enviarás 20 USDC a Aya directamente desde el chat, sin entrar al formulario de Enviar.' },
  { eyebrow: 'PASO 3', title: 'Confirma antes de enviar', description: 'Movya siempre mostrará un resumen y preguntará si estás seguro. Puedes responder Sí o No.' },
  { eyebrow: 'PASO 4', title: 'Revisa el resultado', description: 'Movya mostrará el envío exitoso y el enlace de la operación en el explorador de Stellar.' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const current = steps[step];

  const next = () => {
    if (step === steps.length - 1) router.replace('/(tabs)');
    else setStep((value) => value + 1);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AnimatedDashboardBackground />
      <View style={styles.header}>
        <View style={styles.miniBrand}><Image source={require('../assets/movya-logo.png')} style={styles.miniLogo} /><Text style={styles.miniBrandText}>Movya</Text></View>
        <PressableScale onPress={() => router.replace('/(tabs)')} style={styles.skip}><Text style={styles.skipText}>Omitir</Text></PressableScale>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>{current.eyebrow}</Text>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.description}>{current.description}</Text>
        </View>

        <BlurView intensity={74} tint="light" style={[styles.demoCard, Platform.OS === 'web' ? webGlass : null]}>
          {step === 0 ? <OpenMovyaPreview /> : step === 1 ? <ChatPreview /> : step === 2 ? <ConfirmationPreview /> : <SuccessPreview />}
        </BlurView>

        <View style={styles.controls}>
          <View style={styles.dots}>{steps.map((_, index) => <View key={index} style={[styles.dot, index === step && styles.dotActive]} />)}</View>
          <PressableScale onPress={next} style={styles.nextButton}>
            <LinearGradient colors={['#277BFF', '#0754D6']} end={{ x: 1, y: 1 }} style={styles.nextGradient}>
              <Text style={styles.nextText}>{step === steps.length - 1 ? 'Entrar a mi wallet' : 'Continuar'}</Text>
              <Ionicons color="#FFFFFF" name="arrow-forward" size={19} />
            </LinearGradient>
          </PressableScale>
        </View>
      </ScrollView>

      <View style={styles.stellar}><Text style={styles.powered}>Powered by</Text><Image source={require('../assets/stellar-footer-logo.png')} style={styles.stellarLogo} /></View>
    </SafeAreaView>
  );
}

function OpenMovyaPreview() {
  return (
    <View style={styles.openPreview}>
      <View style={styles.fakeBalanceCard}><Text style={styles.fakeBalanceLabel}>Tu saldo</Text><Text style={styles.fakeBalance}>$1,629.24</Text></View>
      <View style={styles.tapHint}><Ionicons color={colors.brand} name="hand-left-outline" size={18} /><Text style={styles.tapHintText}>Toca el logo de Movya</Text></View>
      <View style={styles.tutorialFooter}>
        <View style={styles.tutorialItem}><Ionicons color="#FFFFFF" name="home-outline" size={20} /><Text style={styles.tutorialLabel}>Inicio</Text></View>
        <View style={styles.tutorialItem}><Ionicons color="rgba(255,255,255,0.72)" name="stats-chart-outline" size={20} /><Text style={styles.tutorialLabel}>Actividad</Text></View>
        <View style={styles.tutorialItem}>
          <View style={styles.tutorialMovya}><Image source={require('../assets/movya-logo.png')} style={styles.tutorialMovyaLogo} /></View>
          <Text style={styles.tutorialLabel}>Movya</Text>
        </View>
        <View style={styles.tutorialItem}><Ionicons color="rgba(255,255,255,0.72)" name="people-outline" size={20} /><Text style={styles.tutorialLabel}>Contactos</Text></View>
        <View style={styles.tutorialItem}><Ionicons color="rgba(255,255,255,0.72)" name="person-outline" size={20} /><Text style={styles.tutorialLabel}>Cuenta</Text></View>
      </View>
    </View>
  );
}

function ChatPreview() {
  return (
    <View style={styles.phoneDemo}>
      <View style={styles.chatHeader}><Image source={require('../assets/movya-logo.png')} style={styles.chatLogo} /><View><Text style={styles.chatName}>Movya</Text><Text style={styles.chatStatus}>En línea</Text></View></View>
      <View style={styles.demoBadge}><Ionicons color={colors.brand} name="sparkles" size={12} /><Text style={styles.demoBadgeText}>DEMO · ENVÍO A AYA</Text></View>
      <View style={styles.movyaRow}><Image source={require('../assets/movya-logo.png')} style={styles.messageLogo} /><View style={styles.movyaMessage}><Text style={styles.movyaMessageText}>Hola, Manuel. Escribe el envío que quieres hacer.</Text></View></View>
      <View style={styles.userMessage}><Text style={styles.userMessageText}>Envía 20 USDC a Aya</Text></View>
      <View style={styles.fakeComposer}><Ionicons color={colors.muted} name="mic-outline" size={18} /><Text style={styles.fakeComposerText}>Pregúntale algo a Movya…</Text><View style={styles.fakeSend}><Ionicons color="#FFFFFF" name="arrow-up" size={15} /></View></View>
    </View>
  );
}

function ConfirmationPreview() {
  return (
    <View style={styles.phoneDemo}>
      <View style={styles.chatHeader}><Image source={require('../assets/movya-logo.png')} style={styles.chatLogo} /><View><Text style={styles.chatName}>Movya</Text><Text style={styles.chatStatus}>En línea</Text></View></View>
      <View style={styles.movyaRow}><Image source={require('../assets/movya-logo.png')} style={styles.messageLogo} /><View style={styles.movyaMessage}><Text style={styles.movyaMessageText}>¿Confirmas la transacción de 20 USDC a Aya?</Text><View style={styles.reviewCard}><View style={styles.reviewRow}><Text style={styles.reviewLabel}>Enviar</Text><Text style={styles.reviewValue}>20 USDC</Text></View><View style={styles.reviewRow}><Text style={styles.reviewLabel}>A</Text><Text style={styles.reviewValue}>Aya</Text></View><View style={styles.reviewRow}><Text style={styles.reviewLabel}>Red</Text><Text style={styles.reviewValue}>Stellar · Testnet</Text></View></View><View style={styles.demoActions}><View style={styles.demoNo}><Text style={styles.demoNoText}>No</Text></View><View style={styles.demoYes}><Text style={styles.demoYesText}>Sí, confirmar</Text></View></View></View></View>
      <View style={styles.userMessage}><Text style={styles.userMessageText}>Sí</Text></View>
    </View>
  );
}

function SuccessPreview() {
  return (
    <View style={styles.phoneDemo}>
      <View style={styles.chatHeader}><Image source={require('../assets/movya-logo.png')} style={styles.chatLogo} /><View><Text style={styles.chatName}>Movya</Text><Text style={styles.chatStatus}>En línea</Text></View></View>
      <View style={styles.movyaRow}><Image source={require('../assets/movya-logo.png')} style={styles.messageLogo} /><View style={styles.movyaMessage}><Text style={styles.movyaMessageText}>Preparando la transacción en Stellar Testnet…</Text></View></View>
      <View style={styles.movyaRow}><Image source={require('../assets/movya-logo.png')} style={styles.messageLogo} /><View style={styles.movyaMessage}><View style={styles.successDemoTitle}><Ionicons color="#16A071" name="checkmark-circle" size={21} /><Text style={styles.successDemoText}>Transacción exitosa</Text></View><Text style={styles.movyaMessageText}>Se enviaron 20 USDC a Aya.</Text><View style={styles.explorerDemo}><Ionicons color={colors.brand} name="open-outline" size={15} /><Text style={styles.explorerDemoText}>Ver en Stellar Expert · Testnet</Text></View></View></View>
      <View style={styles.movyaRow}><Image source={require('../assets/movya-logo.png')} style={styles.messageLogo} /><View style={styles.movyaMessage}><Text style={styles.movyaMessageText}>¿Deseas hacer algo más?</Text></View></View>
    </View>
  );
}

const webGlass = { backdropFilter: 'blur(28px) saturate(170%)', WebkitBackdropFilter: 'blur(28px) saturate(170%)' } as const;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#78AEF8' }, header: { width: '100%', maxWidth: 760, alignSelf: 'center', height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 }, miniBrand: { flexDirection: 'row', alignItems: 'center', gap: 7 }, miniLogo: { width: 34, height: 34, resizeMode: 'contain' }, miniBrandText: { color: colors.navy, fontSize: 17, fontWeight: '900' }, skip: { paddingHorizontal: 15, paddingVertical: 9, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.42)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.65)' }, skipText: { color: colors.brandDark, fontSize: 11, fontWeight: '800' },
  content: { flexGrow: 1, width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 10, justifyContent: 'center' }, copy: { marginBottom: 18 }, eyebrow: { color: colors.brandDark, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 }, title: { color: colors.navy, fontSize: 28, lineHeight: 33, fontWeight: '900', letterSpacing: -0.8, marginTop: 7 }, description: { color: '#365F88', fontSize: 13, lineHeight: 19, marginTop: 8, maxWidth: 460 },
  demoCard: { minHeight: 390, borderRadius: 31, overflow: 'hidden', padding: 18, backgroundColor: 'rgba(244,250,255,0.48)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.78)', shadowColor: colors.navy, shadowOpacity: 0.2, shadowRadius: 25, shadowOffset: { width: 0, height: 13 }, elevation: 8 }, centerPreview: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 }, bigLogoHalo: { width: 126, height: 126, borderRadius: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.65)', shadowColor: colors.brand, shadowOpacity: 0.26, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } }, bigLogo: { width: 116, height: 116, resizeMode: 'contain' }, onlineDot: { position: 'absolute', right: 7, bottom: 8, width: 17, height: 17, borderRadius: 9, backgroundColor: '#16A071', borderWidth: 3, borderColor: '#FFFFFF' }, previewTitle: { color: colors.ink, fontSize: 21, fontWeight: '900', marginTop: 17 }, previewText: { maxWidth: 320, color: '#526F8D', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 7 }, capabilities: { flexDirection: 'row', gap: 8, marginTop: 20 }, capability: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.65)', borderWidth: 1, borderColor: '#C9DEFA' }, capabilityText: { color: colors.brandDark, fontSize: 10, fontWeight: '800' },
  openPreview: { flex: 1, justifyContent: 'space-between', paddingTop: 24 }, fakeBalanceCard: { minHeight: 160, justifyContent: 'center', padding: 20, borderRadius: 25, backgroundColor: '#0A346C', shadowColor: colors.navy, shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 5 }, fakeBalanceLabel: { color: 'rgba(255,255,255,0.68)', fontSize: 10, fontWeight: '700' }, fakeBalance: { color: '#FFFFFF', fontSize: 29, fontWeight: '900', letterSpacing: -0.7, marginTop: 6 }, tapHint: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#C8D9EC' }, tapHintText: { color: colors.brandDark, fontSize: 10, fontWeight: '900' }, tutorialFooter: { minHeight: 77, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 4, borderRadius: 999, backgroundColor: '#246D9F', borderWidth: 1, borderColor: 'rgba(255,255,255,0.48)' }, tutorialItem: { width: 56, alignItems: 'center', justifyContent: 'center' }, tutorialLabel: { color: '#FFFFFF', fontSize: 8, fontWeight: '800', marginTop: 3 }, tutorialMovya: { width: 45, height: 45, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: -16, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.34)', shadowColor: '#FFFFFF', shadowOpacity: 0.42, shadowRadius: 12 }, tutorialMovyaLogo: { width: 42, height: 42, resizeMode: 'contain' },
  phoneDemo: { flex: 1 }, chatHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(111,145,183,0.22)' }, chatLogo: { width: 39, height: 39, marginRight: 8 }, chatName: { color: colors.ink, fontSize: 14, fontWeight: '900' }, chatStatus: { color: '#16A071', fontSize: 9, fontWeight: '700', marginTop: 2 }, demoBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, backgroundColor: '#E7F0FF', borderWidth: 1, borderColor: '#BED7FA' }, demoBadgeText: { color: colors.brandDark, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 }, userMessage: { maxWidth: '78%', alignSelf: 'flex-end', marginTop: 18, borderRadius: 18, borderTopRightRadius: 5, paddingHorizontal: 13, paddingVertical: 10, backgroundColor: colors.brand }, userMessageText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' }, movyaRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 13 }, messageLogo: { width: 28, height: 28, marginRight: 7 }, movyaMessage: { flex: 1, borderRadius: 17, borderTopLeftRadius: 5, padding: 11, backgroundColor: 'rgba(255,255,255,0.78)', borderWidth: 1, borderColor: '#C5DDFB' }, movyaMessageText: { color: colors.text, fontSize: 11, lineHeight: 16 }, reviewCard: { marginLeft: 35, marginTop: 8, padding: 11, borderRadius: 16, backgroundColor: 'rgba(232,241,255,0.92)', borderWidth: 1, borderColor: '#BDD7FA' }, reviewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }, reviewLabel: { color: colors.muted, fontSize: 9 }, reviewValue: { color: colors.ink, fontSize: 10, fontWeight: '800' }, fakeComposer: { height: 50, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8, marginTop: 'auto', borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' }, fakeComposerText: { flex: 1, color: colors.muted, fontSize: 10 }, fakeSend: { width: 30, height: 30, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand },
  demoActions: { flexDirection: 'row', gap: 7, marginTop: 9 }, demoNo: { flex: 1, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5ECF4' }, demoNoText: { color: colors.text, fontSize: 9, fontWeight: '800' }, demoYes: { flex: 1.4, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand }, demoYesText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' }, successDemoTitle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 7 }, successDemoText: { color: '#16A071', fontSize: 11, fontWeight: '900' }, explorerDemo: { minHeight: 35, flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 9, paddingHorizontal: 9, borderRadius: 11, backgroundColor: '#E8F1FF' }, explorerDemoText: { color: colors.brand, fontSize: 9, fontWeight: '800' },
  sendDemo: { flex: 1 }, sendTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 }, sendIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 10, backgroundColor: '#E5F0FF' }, sendDemoTitle: { color: colors.ink, fontSize: 15, fontWeight: '900' }, sendDemoSubtitle: { color: colors.muted, fontSize: 9, marginTop: 3 }, fieldLabel: { color: colors.ink, fontSize: 10, fontWeight: '800', marginBottom: 7, marginTop: 8 }, amountDemo: { height: 65, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: '#BBD5F5' }, amountValue: { color: colors.ink, fontSize: 24, fontWeight: '900' }, tokenDemo: { height: 43, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, borderRadius: 14, backgroundColor: '#E6F0FF' }, usdcDot: { width: 22, height: 22, borderRadius: 8, backgroundColor: '#2775CA' }, tokenText: { color: colors.brandDark, fontSize: 11, fontWeight: '900' }, contactDemo: { minHeight: 62, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: '#C9DDF5' }, contactAvatar: { width: 39, height: 39, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D8E8FF' }, contactInitials: { color: colors.brandDark, fontSize: 10, fontWeight: '900' }, contactCopy: { flex: 1, marginLeft: 9 }, contactName: { color: colors.ink, fontSize: 12, fontWeight: '800' }, contactHandle: { color: colors.muted, fontSize: 8, marginTop: 3 }, confirmDemo: { height: 49, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 22, borderRadius: 16, backgroundColor: colors.brand }, confirmText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  controls: { marginTop: 19 }, dots: { flexDirection: 'row', justifyContent: 'center', gap: 7, marginBottom: 16 }, dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(16,63,119,0.22)' }, dotActive: { width: 26, backgroundColor: colors.brand }, nextButton: { height: 56, borderRadius: 18, overflow: 'hidden', shadowColor: colors.brandDark, shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 5 }, nextGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, nextText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' }, stellar: { height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, powered: { color: colors.navy, fontSize: 10, fontWeight: '800' }, stellarLogo: { width: 70, height: 20, resizeMode: 'contain' },
});
