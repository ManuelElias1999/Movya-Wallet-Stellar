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
  { eyebrow: 'CONOCE A MOVYA', title: 'Tu wallet también te escucha', description: 'Escribe o habla con Movya. El asistente entiende lo que quieres hacer y te guía sin ocultarte ningún detalle.' },
  { eyebrow: 'DEMO DEL CHAT', title: 'Pídele lo que necesitas', description: 'Movya prepara la operación, pero siempre te muestra el resumen antes de que confirmes.' },
  { eyebrow: 'ENVÍA EN SEGUNDOS', title: 'Token, monto y persona', description: 'Elige un contacto o una dirección Stellar. Revisa los datos y confirma cuando todo esté correcto.' },
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
          {step === 0 ? <AssistantPreview /> : step === 1 ? <ChatPreview /> : <SendPreview />}
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

function AssistantPreview() {
  return (
    <View style={styles.centerPreview}>
      <View style={styles.bigLogoHalo}><Image source={require('../assets/movya-logo.png')} style={styles.bigLogo} /><View style={styles.onlineDot} /></View>
      <Text style={styles.previewTitle}>Hola, soy Movya</Text>
      <Text style={styles.previewText}>Puedo ayudarte a enviar, recibir o cambiar dinero usando lenguaje natural.</Text>
      <View style={styles.capabilities}>
        <View style={styles.capability}><Ionicons color="#176BFF" name="chatbubble-ellipses-outline" size={18} /><Text style={styles.capabilityText}>Chat</Text></View>
        <View style={styles.capability}><Ionicons color="#176BFF" name="mic-outline" size={18} /><Text style={styles.capabilityText}>Audio</Text></View>
        <View style={styles.capability}><Ionicons color="#176BFF" name="shield-checkmark-outline" size={18} /><Text style={styles.capabilityText}>Confirmación</Text></View>
      </View>
    </View>
  );
}

function ChatPreview() {
  return (
    <View style={styles.phoneDemo}>
      <View style={styles.chatHeader}><Image source={require('../assets/movya-logo.png')} style={styles.chatLogo} /><View><Text style={styles.chatName}>Movya</Text><Text style={styles.chatStatus}>En línea</Text></View></View>
      <View style={styles.userMessage}><Text style={styles.userMessageText}>Envía 25 USDC a Camila</Text></View>
      <View style={styles.movyaRow}><Image source={require('../assets/movya-logo.png')} style={styles.messageLogo} /><View style={styles.movyaMessage}><Text style={styles.movyaMessageText}>Preparé el envío. Confirma el token, monto y destinatario antes de continuar.</Text></View></View>
      <View style={styles.reviewCard}><View style={styles.reviewRow}><Text style={styles.reviewLabel}>Enviar</Text><Text style={styles.reviewValue}>25 USDC</Text></View><View style={styles.reviewRow}><Text style={styles.reviewLabel}>A</Text><Text style={styles.reviewValue}>Camila</Text></View><View style={styles.reviewRow}><Text style={styles.reviewLabel}>Red</Text><Text style={styles.reviewValue}>Stellar</Text></View></View>
      <View style={styles.fakeComposer}><Ionicons color={colors.muted} name="mic-outline" size={18} /><Text style={styles.fakeComposerText}>Pregúntale algo a Movya…</Text><View style={styles.fakeSend}><Ionicons color="#FFFFFF" name="arrow-up" size={15} /></View></View>
    </View>
  );
}

function SendPreview() {
  return (
    <View style={styles.sendDemo}>
      <View style={styles.sendTitleRow}><View style={styles.sendIcon}><Ionicons color="#176BFF" name="paper-plane" size={20} /></View><View><Text style={styles.sendDemoTitle}>Nuevo envío</Text><Text style={styles.sendDemoSubtitle}>Stellar · Revisión antes de confirmar</Text></View></View>
      <Text style={styles.fieldLabel}>Monto y token</Text>
      <View style={styles.amountDemo}><Text style={styles.amountValue}>25.00</Text><View style={styles.tokenDemo}><View style={styles.usdcDot} /><Text style={styles.tokenText}>USDC</Text><Ionicons color={colors.brand} name="chevron-down" size={14} /></View></View>
      <Text style={styles.fieldLabel}>Destinatario</Text>
      <View style={styles.contactDemo}><View style={styles.contactAvatar}><Text style={styles.contactInitials}>CM</Text></View><View style={styles.contactCopy}><Text style={styles.contactName}>Camila Méndez</Text><Text style={styles.contactHandle}>Cuenta Movya verificada</Text></View><Ionicons color="#16A071" name="checkmark-circle" size={20} /></View>
      <View style={styles.confirmDemo}><Ionicons color="#FFFFFF" name="shield-checkmark" size={18} /><Text style={styles.confirmText}>Revisar y confirmar</Text></View>
    </View>
  );
}

const webGlass = { backdropFilter: 'blur(28px) saturate(170%)', WebkitBackdropFilter: 'blur(28px) saturate(170%)' } as const;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#78AEF8' }, header: { width: '100%', maxWidth: 760, alignSelf: 'center', height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 }, miniBrand: { flexDirection: 'row', alignItems: 'center', gap: 7 }, miniLogo: { width: 34, height: 34, resizeMode: 'contain' }, miniBrandText: { color: colors.navy, fontSize: 17, fontWeight: '900' }, skip: { paddingHorizontal: 15, paddingVertical: 9, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.42)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.65)' }, skipText: { color: colors.brandDark, fontSize: 11, fontWeight: '800' },
  content: { flexGrow: 1, width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 10, justifyContent: 'center' }, copy: { marginBottom: 18 }, eyebrow: { color: colors.brandDark, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 }, title: { color: colors.navy, fontSize: 28, lineHeight: 33, fontWeight: '900', letterSpacing: -0.8, marginTop: 7 }, description: { color: '#365F88', fontSize: 13, lineHeight: 19, marginTop: 8, maxWidth: 460 },
  demoCard: { minHeight: 390, borderRadius: 31, overflow: 'hidden', padding: 18, backgroundColor: 'rgba(244,250,255,0.48)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.78)', shadowColor: colors.navy, shadowOpacity: 0.2, shadowRadius: 25, shadowOffset: { width: 0, height: 13 }, elevation: 8 }, centerPreview: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 }, bigLogoHalo: { width: 126, height: 126, borderRadius: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.65)', shadowColor: colors.brand, shadowOpacity: 0.26, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } }, bigLogo: { width: 116, height: 116, resizeMode: 'contain' }, onlineDot: { position: 'absolute', right: 7, bottom: 8, width: 17, height: 17, borderRadius: 9, backgroundColor: '#16A071', borderWidth: 3, borderColor: '#FFFFFF' }, previewTitle: { color: colors.ink, fontSize: 21, fontWeight: '900', marginTop: 17 }, previewText: { maxWidth: 320, color: '#526F8D', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 7 }, capabilities: { flexDirection: 'row', gap: 8, marginTop: 20 }, capability: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.65)', borderWidth: 1, borderColor: '#C9DEFA' }, capabilityText: { color: colors.brandDark, fontSize: 10, fontWeight: '800' },
  phoneDemo: { flex: 1 }, chatHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(111,145,183,0.22)' }, chatLogo: { width: 39, height: 39, marginRight: 8 }, chatName: { color: colors.ink, fontSize: 14, fontWeight: '900' }, chatStatus: { color: '#16A071', fontSize: 9, fontWeight: '700', marginTop: 2 }, userMessage: { maxWidth: '78%', alignSelf: 'flex-end', marginTop: 18, borderRadius: 18, borderTopRightRadius: 5, paddingHorizontal: 13, paddingVertical: 10, backgroundColor: colors.brand }, userMessageText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' }, movyaRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 13 }, messageLogo: { width: 28, height: 28, marginRight: 7 }, movyaMessage: { flex: 1, borderRadius: 17, borderTopLeftRadius: 5, padding: 11, backgroundColor: 'rgba(255,255,255,0.78)', borderWidth: 1, borderColor: '#C5DDFB' }, movyaMessageText: { color: colors.text, fontSize: 11, lineHeight: 16 }, reviewCard: { marginLeft: 35, marginTop: 8, padding: 11, borderRadius: 16, backgroundColor: 'rgba(232,241,255,0.92)', borderWidth: 1, borderColor: '#BDD7FA' }, reviewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }, reviewLabel: { color: colors.muted, fontSize: 9 }, reviewValue: { color: colors.ink, fontSize: 10, fontWeight: '800' }, fakeComposer: { height: 50, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8, marginTop: 'auto', borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)' }, fakeComposerText: { flex: 1, color: colors.muted, fontSize: 10 }, fakeSend: { width: 30, height: 30, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand },
  sendDemo: { flex: 1 }, sendTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 }, sendIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 10, backgroundColor: '#E5F0FF' }, sendDemoTitle: { color: colors.ink, fontSize: 15, fontWeight: '900' }, sendDemoSubtitle: { color: colors.muted, fontSize: 9, marginTop: 3 }, fieldLabel: { color: colors.ink, fontSize: 10, fontWeight: '800', marginBottom: 7, marginTop: 8 }, amountDemo: { height: 65, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: '#BBD5F5' }, amountValue: { color: colors.ink, fontSize: 24, fontWeight: '900' }, tokenDemo: { height: 43, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, borderRadius: 14, backgroundColor: '#E6F0FF' }, usdcDot: { width: 22, height: 22, borderRadius: 8, backgroundColor: '#2775CA' }, tokenText: { color: colors.brandDark, fontSize: 11, fontWeight: '900' }, contactDemo: { minHeight: 62, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: '#C9DDF5' }, contactAvatar: { width: 39, height: 39, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D8E8FF' }, contactInitials: { color: colors.brandDark, fontSize: 10, fontWeight: '900' }, contactCopy: { flex: 1, marginLeft: 9 }, contactName: { color: colors.ink, fontSize: 12, fontWeight: '800' }, contactHandle: { color: colors.muted, fontSize: 8, marginTop: 3 }, confirmDemo: { height: 49, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 22, borderRadius: 16, backgroundColor: colors.brand }, confirmText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  controls: { marginTop: 19 }, dots: { flexDirection: 'row', justifyContent: 'center', gap: 7, marginBottom: 16 }, dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(16,63,119,0.22)' }, dotActive: { width: 26, backgroundColor: colors.brand }, nextButton: { height: 56, borderRadius: 18, overflow: 'hidden', shadowColor: colors.brandDark, shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 5 }, nextGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, nextText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' }, stellar: { height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, powered: { color: colors.navy, fontSize: 10, fontWeight: '800' }, stellarLogo: { width: 70, height: 20, resizeMode: 'contain' },
});
