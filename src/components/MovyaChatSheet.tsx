import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Image, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AnimatedDashboardBackground } from '@/components/AnimatedDashboardBackground';
import { colors } from '@/theme/tokens';

type TextMessage = { id: number; role: 'movya' | 'user'; kind: 'text'; text: string };
type VoiceMessage = { id: number; role: 'user'; kind: 'voice'; duration: number };
type TransactionDetails = { amount: string; token: string; recipient: string };
type ConfirmationMessage = { id: number; role: 'movya'; kind: 'confirmation'; transaction: TransactionDetails };
type SuccessMessage = { id: number; role: 'movya'; kind: 'success'; transaction: TransactionDetails; explorerUrl: string };
type Message = TextMessage | VoiceMessage | ConfirmationMessage | SuccessMessage;
type MovyaChatSheetProps = { open: boolean; onClose: () => void; initialPrompt?: string };

const screenHeight = Dimensions.get('window').height;
const suggestions = ['¿Cuánto dinero tengo?', 'Envía 20 USDC a Aya', 'Cambia 50 XLM a USDC'];
const waveBars = [11, 18, 25, 15, 29, 21, 13, 24, 18, 28, 16, 23, 12, 19];
const formatDuration = (seconds: number) => `0:${String(seconds).padStart(2, '0')}`;

export function MovyaChatSheet({ open, onClose, initialPrompt }: MovyaChatSheetProps) {
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const scrollRef = useRef<ScrollView | null>(null);
  const consumedPrompt = useRef('');
  const [text, setText] = useState(initialPrompt ?? '');
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [playingVoiceId, setPlayingVoiceId] = useState<number | null>(null);
  const [pendingTransaction, setPendingTransaction] = useState<TransactionDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: 'movya', kind: 'text', text: 'Hola, Manuel. Puedo ayudarte a enviar, recibir o cambiar dinero en Stellar. ¿Qué necesitas hacer?' },
  ]);

  useEffect(() => {
    Animated.timing(translateY, { toValue: open ? 0 : screenHeight, duration: open ? 440 : 350, easing: open ? Easing.out(Easing.cubic) : Easing.inOut(Easing.cubic), useNativeDriver: true }).start();
  }, [open, translateY]);

  useEffect(() => {
    if (!open || !initialPrompt || consumedPrompt.current === initialPrompt) return;
    consumedPrompt.current = initialPrompt;
    const id = Date.now();
    setMessages((current) => [...current, { id, role: 'user', kind: 'text', text: initialPrompt }, createMovyaReply(initialPrompt, id + 1)]);
  }, [initialPrompt, open]);

  useEffect(() => {
    if (!recording) return;
    const interval = setInterval(() => setRecordingSeconds((current) => current + 1), 1000);
    return () => clearInterval(interval);
  }, [recording]);

  const createMovyaReply = (message: string, id: number): TextMessage => {
    const normalized = message.toLowerCase();
    if (normalized.includes('balance') || normalized.includes('cuánto dinero')) return { id, role: 'movya', kind: 'text', text: 'Tu balance total de demostración es $1,629.24. Puedo mostrarte el detalle de cada activo si quieres.' };
    if (normalized.includes('cambia') || normalized.includes('cambio')) return { id, role: 'movya', kind: 'text', text: 'Claro. Dime qué activo quieres entregar, cuál quieres recibir y el monto. Después te mostraré la cotización antes de confirmar.' };
    if (normalized.includes('contacto')) return { id, role: 'movya', kind: 'text', text: 'Puedo ayudarte. Dime el nombre y luego comparte su correo de Movya o su dirección Stellar pública.' };
    if (normalized.includes('recibir') || normalized.includes('compartir')) return { id, role: 'movya', kind: 'text', text: 'Puedes recibir por Stellar usando tu QR o tu dirección pública. Puedo ayudarte a copiarla o compartirla.' };
    return { id, role: 'movya', kind: 'text', text: 'Perfecto. Dime el token, el monto y el destinatario. Prepararé el envío y te mostraré un resumen antes de confirmar.' };
  };

  const parseSendRequest = (message: string): TransactionDetails | null => {
    const match = message.match(/env[ií]a(?:r)?\s+\$?\s*(\d+(?:[.,]\d+)?)\s+([a-z0-9]+)\s+a\s+(.+)/i);
    if (!match) return null;
    return { amount: match[1].replace(',', '.'), token: match[2].toUpperCase(), recipient: match[3].trim() };
  };

  const finishTransaction = (transaction: TransactionDetails, baseId: number) => {
    setMessages((current) => [...current, { id: baseId, role: 'movya', kind: 'text', text: 'Preparando la transacción en Stellar Testnet…' }]);
    setTimeout(() => {
      setMessages((current) => [
        ...current,
        { id: baseId + 1, role: 'movya', kind: 'success', transaction, explorerUrl: 'https://stellar.expert/explorer/testnet' },
        { id: baseId + 2, role: 'movya', kind: 'text', text: '¿Deseas hacer algo más?' },
      ]);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 900);
  };

  const sendDirect = (message: string) => {
    const clean = message.trim();
    if (!clean) return;
    const id = Date.now();
    const normalized = clean.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    if (pendingTransaction) {
      if (/^(si|confirmar|confirmo|adelante)$/.test(normalized)) {
        const transaction = pendingTransaction;
        setPendingTransaction(null);
        setMessages((current) => [...current, { id, role: 'user', kind: 'text', text: clean }]);
        finishTransaction(transaction, id + 1);
      } else if (/^(no|cancelar|cancela)$/.test(normalized)) {
        setPendingTransaction(null);
        setMessages((current) => [...current, { id, role: 'user', kind: 'text', text: clean }, { id: id + 1, role: 'movya', kind: 'text', text: 'Transacción cancelada. No se movió ningún fondo. ¿Deseas hacer algo más?' }]);
      } else {
        setMessages((current) => [...current, { id, role: 'user', kind: 'text', text: clean }, { id: id + 1, role: 'movya', kind: 'text', text: 'Antes de continuar, responde Sí para confirmar o No para cancelar la transacción pendiente.' }]);
      }
      setText('');
      void Haptics.selectionAsync();
      return;
    }

    const transaction = parseSendRequest(clean);
    if (transaction) {
      setPendingTransaction(transaction);
      setMessages((current) => [...current, { id, role: 'user', kind: 'text', text: clean }, { id: id + 1, role: 'movya', kind: 'confirmation', transaction }]);
    } else {
      setMessages((current) => [...current, { id, role: 'user', kind: 'text', text: clean }, createMovyaReply(clean, id + 1)]);
    }
    setText('');
    void Haptics.selectionAsync();
  };

  const send = () => {
    const clean = text.trim();
    if (!clean) return;
    sendDirect(clean);
  };

  const startRecording = () => { setRecordingSeconds(0); setRecording(true); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); };
  const cancelRecording = () => { setRecording(false); setRecordingSeconds(0); };
  const sendVoice = () => {
    const duration = Math.max(recordingSeconds, 1);
    const id = Date.now();
    setMessages((current) => [...current, { id, role: 'user', kind: 'voice', duration }, createMovyaReply('Quiero hacer una operación', id + 1)]);
    setRecording(false); setRecordingSeconds(0);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <Animated.View pointerEvents={open ? 'auto' : 'none'} style={[styles.sheet, { transform: [{ translateY }] }]}>
      <AnimatedDashboardBackground />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <BlurView intensity={78} tint="light" style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeButton}><Ionicons name="chevron-down" size={24} color={colors.ink} /></Pressable>
          <View style={styles.identity}>
            <View style={styles.logoWrap}><Image source={require('../../assets/movya-logo.png')} style={styles.logo} /><View style={styles.statusDot} /></View>
            <View><Text style={styles.title}>Movya</Text><Text style={styles.status}>Asistente financiero · En línea</Text></View>
          </View>
          <Pressable style={styles.infoButton}><Ionicons name="information-circle-outline" size={22} color={colors.ink} /></Pressable>
        </BlurView>

        <ScrollView contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled" onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })} ref={scrollRef} showsVerticalScrollIndicator={false}>
          <Text style={styles.today}>HOY</Text>
          {messages.map((message) => message.role === 'movya' ? (
            <View key={message.id} style={styles.movyaGroup}>
              <View style={styles.senderRow}><Image source={require('../../assets/movya-logo.png')} style={styles.messageAvatar} /><Text style={styles.sender}>Movya</Text><View style={styles.aiBadge}><Ionicons name="sparkles" size={10} color={colors.brand} /><Text style={styles.aiText}>IA</Text></View></View>
              <BlurView intensity={72} tint="light" style={[styles.bubble, styles.movyaBubble]}>
                {message.kind === 'confirmation' ? (
                  <View>
                    <Text style={styles.messageText}>¿Confirmas la transacción de {message.transaction.amount} {message.transaction.token} a {message.transaction.recipient}?</Text>
                    <View style={styles.transactionSummary}>
                      <View style={styles.transactionRow}><Text style={styles.transactionLabel}>Enviar</Text><Text style={styles.transactionValue}>{message.transaction.amount} {message.transaction.token}</Text></View>
                      <View style={styles.transactionRow}><Text style={styles.transactionLabel}>A</Text><Text style={styles.transactionValue}>{message.transaction.recipient}</Text></View>
                      <View style={styles.transactionRow}><Text style={styles.transactionLabel}>Red</Text><Text style={styles.transactionValue}>Stellar · Testnet</Text></View>
                    </View>
                    <View style={styles.confirmActions}>
                      <Pressable onPress={() => sendDirect('No')} style={styles.noButton}><Text style={styles.noText}>No</Text></Pressable>
                      <Pressable onPress={() => sendDirect('Sí')} style={styles.yesButton}><Ionicons color="#FFFFFF" name="checkmark" size={15} /><Text style={styles.yesText}>Sí, confirmar</Text></Pressable>
                    </View>
                  </View>
                ) : message.kind === 'success' ? (
                  <View>
                    <View style={styles.successTitleRow}><View style={styles.successIcon}><Ionicons color="#FFFFFF" name="checkmark" size={17} /></View><Text style={styles.successTitle}>Transacción exitosa</Text></View>
                    <Text style={styles.messageText}>Se enviaron {message.transaction.amount} {message.transaction.token} a {message.transaction.recipient}.</Text>
                    <Pressable onPress={() => void Linking.openURL(message.explorerUrl)} style={styles.explorerLink}><Ionicons color={colors.brand} name="open-outline" size={16} /><Text style={styles.explorerText}>Ver en Stellar Expert · Testnet</Text></Pressable>
                    <Text style={styles.demoNotice}>Transacción demostrativa; no movió fondos reales.</Text>
                  </View>
                ) : <Text style={styles.messageText}>{message.text}</Text>}
                <Text style={styles.messageTime}>Ahora</Text>
              </BlurView>
            </View>
          ) : message.kind === 'voice' ? (
            <View key={message.id} style={styles.userGroup}>
              <Text style={styles.userSender}>Tú</Text>
              <LinearGradient colors={['#176BFF', '#064AAE']} end={{ x: 1, y: 1 }} style={[styles.bubble, styles.voiceBubble]}>
                <Pressable onPress={() => setPlayingVoiceId(playingVoiceId === message.id ? null : message.id)} style={styles.playButton}><Ionicons name={playingVoiceId === message.id ? 'pause' : 'play'} size={17} color={colors.brand} /></Pressable>
                <View style={styles.voiceWave}>{waveBars.map((height, index) => <View key={index} style={[styles.voiceBar, { height: playingVoiceId === message.id && index < 8 ? height + 3 : height }]} />)}</View>
                <Text style={styles.voiceDuration}>{formatDuration(message.duration)}</Text>
              </LinearGradient>
            </View>
          ) : (
            <View key={message.id} style={styles.userGroup}>
              <Text style={styles.userSender}>Tú</Text>
              <LinearGradient colors={['#176BFF', '#064AAE']} end={{ x: 1, y: 1 }} style={[styles.bubble, styles.userBubble]}><Text style={[styles.messageText, styles.userText]}>{message.text}</Text><Text style={styles.userTime}>Ahora</Text></LinearGradient>
            </View>
          ))}
          <View style={styles.suggestions}>{suggestions.map((suggestion) => <Pressable key={suggestion} onPress={() => sendDirect(suggestion)} style={styles.suggestion}><Ionicons name="sparkles-outline" size={14} color={colors.brand} /><Text style={styles.suggestionText}>{suggestion}</Text><Ionicons name="arrow-up-circle" size={15} color={colors.brand} /></Pressable>)}</View>
        </ScrollView>

        <BlurView intensity={88} tint="light" style={styles.composerArea}>
          {recording ? (
            <View style={styles.recordingComposer}>
              <Pressable onPress={cancelRecording} style={styles.cancelRecording}><Ionicons name="trash-outline" size={20} color="#C84B63" /></Pressable>
              <View style={styles.recordingStatus}><View style={styles.recordingDot} /><Text style={styles.recordingTime}>{formatDuration(recordingSeconds)}</Text><View style={styles.liveWave}>{waveBars.slice(0, 8).map((height, index) => <View key={index} style={[styles.liveBar, { height: Math.max(7, height - 5) }]} />)}</View></View>
              <Pressable onPress={sendVoice} style={styles.sendButton}><Ionicons name="arrow-up" size={20} color="#FFFFFF" /></Pressable>
            </View>
          ) : (
            <View style={styles.composer}>
              <Pressable style={styles.attachButton}><Ionicons name="add" size={22} color={colors.brand} /></Pressable>
              <TextInput multiline onChangeText={setText} onSubmitEditing={send} placeholder="Pregúntale algo a Movya…" placeholderTextColor={colors.muted} style={styles.input} value={text} />
              <Pressable onPress={text.trim() ? send : startRecording} style={[styles.sendButton, !text.trim() && styles.micButton]}><Ionicons name={text.trim() ? 'arrow-up' : 'mic'} size={20} color={text.trim() ? '#FFFFFF' : colors.brand} /></Pressable>
            </View>
          )}
          <View style={styles.securityRow}><Ionicons name="shield-checkmark-outline" size={12} color={colors.muted} /><Text style={styles.security}>Movya siempre pedirá tu confirmación.</Text></View>
        </BlurView>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, sheet: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 50, elevation: 20, overflow: 'hidden' },
  header: { minHeight: 76, width: '100%', borderBottomLeftRadius: 27, borderBottomRightRadius: 27, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden', borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.65)', backgroundColor: 'rgba(238,247,255,0.12)', shadowColor: colors.navy, shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 7 }, closeButton: { width: 42, height: 42, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.46)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.72)', alignItems: 'center', justifyContent: 'center' }, infoButton: { width: 42, height: 42, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.42)', alignItems: 'center', justifyContent: 'center' },
  identity: { flexDirection: 'row', alignItems: 'center' }, logoWrap: { width: 45, height: 45, marginRight: 9 }, logo: { width: 45, height: 45, resizeMode: 'contain' }, statusDot: { position: 'absolute', right: 0, bottom: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.positive, borderWidth: 2, borderColor: '#FFFFFF' }, title: { color: colors.ink, fontSize: 17, fontWeight: '900' }, status: { color: colors.muted, fontSize: 9, fontWeight: '700', marginTop: 3 },
  messages: { padding: 17, paddingBottom: 28 }, today: { alignSelf: 'center', color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginBottom: 18 }, movyaGroup: { alignItems: 'flex-start', marginBottom: 16 }, senderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, marginLeft: 3 }, messageAvatar: { width: 28, height: 28, resizeMode: 'contain', marginRight: 6 }, sender: { color: colors.ink, fontSize: 11, fontWeight: '800' }, aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.56)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3, marginLeft: 6 }, aiText: { color: colors.brand, fontSize: 8, fontWeight: '900' }, userGroup: { alignItems: 'flex-end', marginBottom: 15 }, userSender: { color: colors.muted, fontSize: 9, fontWeight: '800', marginRight: 4, marginBottom: 5 },
  bubble: { maxWidth: '84%', borderRadius: 22, paddingHorizontal: 15, paddingTop: 11, paddingBottom: 8, overflow: 'hidden' }, movyaBubble: { backgroundColor: 'rgba(248,252,255,0.86)', borderWidth: 1.5, borderColor: '#BBD6FF', borderTopLeftRadius: 7, shadowColor: colors.navy, shadowOpacity: 0.15, shadowRadius: 15, shadowOffset: { width: 0, height: 7 }, elevation: 4 }, userBubble: { borderTopRightRadius: 7, shadowColor: colors.navy, shadowOpacity: 0.2, shadowRadius: 13, shadowOffset: { width: 0, height: 6 }, elevation: 4 }, messageText: { color: colors.text, fontSize: 14, lineHeight: 20 }, userText: { color: '#FFFFFF' }, messageTime: { color: colors.muted, fontSize: 8, alignSelf: 'flex-end', marginTop: 5 }, userTime: { color: 'rgba(255,255,255,0.7)', fontSize: 8, alignSelf: 'flex-end', marginTop: 5 },
  transactionSummary: { marginTop: 11, padding: 11, borderRadius: 15, backgroundColor: '#EAF2FB', borderWidth: 1, borderColor: '#CDDDF0' }, transactionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }, transactionLabel: { color: colors.muted, fontSize: 10 }, transactionValue: { color: colors.ink, fontSize: 10, fontWeight: '800', marginLeft: 14 }, confirmActions: { flexDirection: 'row', gap: 8, marginTop: 11 }, noButton: { flex: 1, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E7EDF4' }, noText: { color: colors.text, fontSize: 11, fontWeight: '800' }, yesButton: { flex: 1.45, height: 38, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: colors.brand }, yesText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  successTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 9 }, successIcon: { width: 29, height: 29, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 8, backgroundColor: colors.positive }, successTitle: { color: colors.positive, fontSize: 13, fontWeight: '900' }, explorerLink: { minHeight: 39, flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 11, paddingHorizontal: 11, borderRadius: 13, backgroundColor: '#E8F1FF', borderWidth: 1, borderColor: '#C4D9F7' }, explorerText: { color: colors.brand, fontSize: 10, fontWeight: '800' }, demoNotice: { color: colors.muted, fontSize: 8, lineHeight: 12, marginTop: 7 },
  voiceBubble: { minWidth: 235, flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 11 }, playButton: { width: 35, height: 35, borderRadius: 13, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }, voiceWave: { flex: 1, height: 31, flexDirection: 'row', alignItems: 'center', gap: 3, marginHorizontal: 10 }, voiceBar: { width: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.82)' }, voiceDuration: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  suggestions: { gap: 8, marginTop: 6, alignItems: 'flex-start' }, suggestion: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(247,251,255,0.88)', borderWidth: 1.5, borderColor: '#B9D4FF', borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9, shadowColor: colors.navy, shadowOpacity: 0.11, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 }, suggestionText: { color: colors.brandDark, fontSize: 11, fontWeight: '700' },
  composerArea: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.4)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.78)' }, composer: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: 'rgba(255,255,255,0.63)', borderRadius: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.92)', padding: 7, minHeight: 57 }, attachButton: { width: 39, height: 39, borderRadius: 15, backgroundColor: 'rgba(232,241,255,0.88)', alignItems: 'center', justifyContent: 'center' }, input: { flex: 1, color: colors.ink, fontSize: 14, maxHeight: 100, paddingVertical: 10, paddingHorizontal: 9 }, sendButton: { width: 43, height: 43, borderRadius: 16, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', shadowColor: colors.brand, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }, micButton: { backgroundColor: 'rgba(232,241,255,0.9)' },
  recordingComposer: { height: 57, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: 'rgba(255,255,255,0.66)', borderRadius: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', padding: 7 }, cancelRecording: { width: 40, height: 40, borderRadius: 15, backgroundColor: '#FCEAF0', alignItems: 'center', justifyContent: 'center' }, recordingStatus: { flex: 1, flexDirection: 'row', alignItems: 'center' }, recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5536C', marginRight: 7 }, recordingTime: { color: colors.ink, fontSize: 12, fontWeight: '800' }, liveWave: { flex: 1, height: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }, liveBar: { width: 3, borderRadius: 2, backgroundColor: colors.brand }, securityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 8 }, security: { color: colors.muted, fontSize: 9 },
});
