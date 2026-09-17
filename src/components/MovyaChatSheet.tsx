import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { StellarNetworkBadge } from '@/components/StellarNetworkBadge';
import { colors } from '@/theme/tokens';

type TextMessage = { id: number; role: 'movya' | 'user'; kind: 'text'; text: string };
type VoiceMessage = { id: number; role: 'user'; kind: 'voice'; duration: number };
type Message = TextMessage | VoiceMessage;
type MovyaChatSheetProps = { open: boolean; onClose: () => void; initialPrompt?: string };

const screenHeight = Dimensions.get('window').height;
const suggestions = ['¿Cuánto dinero tengo?', 'Envía $20 a Camila', 'Cambia 50 XLM a USDC'];
const waveBars = [11, 18, 25, 15, 29, 21, 13, 24, 18, 28, 16, 23, 12, 19];
const formatDuration = (seconds: number) => `0:${String(seconds).padStart(2, '0')}`;

export function MovyaChatSheet({ open, onClose, initialPrompt }: MovyaChatSheetProps) {
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const consumedPrompt = useRef('');
  const [text, setText] = useState(initialPrompt ?? '');
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [playingVoiceId, setPlayingVoiceId] = useState<number | null>(null);
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

  const sendDirect = (message: string) => {
    const clean = message.trim();
    if (!clean) return;
    const id = Date.now();
    setMessages((current) => [...current, { id, role: 'user', kind: 'text', text: clean }, createMovyaReply(clean, id + 1)]);
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
      <LinearGradient colors={['#DDEBFF', '#EEE7FF', '#DFF6F4', '#EDF4FF']} locations={[0, 0.36, 0.7, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.glowOne} /><View style={styles.glowTwo} /><View style={styles.glowThree} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <BlurView intensity={78} tint="light" style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeButton}><Ionicons name="chevron-down" size={24} color={colors.ink} /></Pressable>
          <View style={styles.identity}>
            <View style={styles.logoWrap}><Image source={require('../../assets/movya-logo.png')} style={styles.logo} /><View style={styles.statusDot} /></View>
            <View><Text style={styles.title}>Movya</Text><Text style={styles.status}>Asistente financiero · En línea</Text></View>
          </View>
          <Pressable style={styles.infoButton}><Ionicons name="information-circle-outline" size={22} color={colors.ink} /></Pressable>
        </BlurView>

        <ScrollView contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.networkWrap}><StellarNetworkBadge label="Powered by Stellar" /></View>
          <Text style={styles.today}>HOY</Text>
          {messages.map((message) => message.role === 'movya' ? (
            <View key={message.id} style={styles.movyaGroup}>
              <View style={styles.senderRow}><Image source={require('../../assets/movya-logo.png')} style={styles.messageAvatar} /><Text style={styles.sender}>Movya</Text><View style={styles.aiBadge}><Ionicons name="sparkles" size={10} color={colors.brand} /><Text style={styles.aiText}>IA</Text></View></View>
              <BlurView intensity={72} tint="light" style={[styles.bubble, styles.movyaBubble]}><Text style={styles.messageText}>{message.kind === 'text' ? message.text : ''}</Text><Text style={styles.messageTime}>Ahora</Text></BlurView>
            </View>
          ) : message.kind === 'voice' ? (
            <View key={message.id} style={styles.userGroup}>
              <Text style={styles.userSender}>Tú</Text>
              <LinearGradient colors={['#176BFF', '#6857E5']} end={{ x: 1, y: 1 }} style={[styles.bubble, styles.voiceBubble]}>
                <Pressable onPress={() => setPlayingVoiceId(playingVoiceId === message.id ? null : message.id)} style={styles.playButton}><Ionicons name={playingVoiceId === message.id ? 'pause' : 'play'} size={17} color={colors.brand} /></Pressable>
                <View style={styles.voiceWave}>{waveBars.map((height, index) => <View key={index} style={[styles.voiceBar, { height: playingVoiceId === message.id && index < 8 ? height + 3 : height }]} />)}</View>
                <Text style={styles.voiceDuration}>{formatDuration(message.duration)}</Text>
              </LinearGradient>
            </View>
          ) : (
            <View key={message.id} style={styles.userGroup}>
              <Text style={styles.userSender}>Tú</Text>
              <LinearGradient colors={['#176BFF', '#6857E5']} end={{ x: 1, y: 1 }} style={[styles.bubble, styles.userBubble]}><Text style={[styles.messageText, styles.userText]}>{message.text}</Text><Text style={styles.userTime}>Ahora</Text></LinearGradient>
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
  glowOne: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(58,132,255,0.22)', right: -90, top: 95 }, glowTwo: { position: 'absolute', width: 230, height: 230, borderRadius: 115, backgroundColor: 'rgba(143,96,255,0.19)', left: -100, top: 330 }, glowThree: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(0,188,180,0.15)', right: -80, bottom: 70 },
  header: { minHeight: 76, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.7)', backgroundColor: 'rgba(255,255,255,0.34)' }, closeButton: { width: 42, height: 42, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.58)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center' }, infoButton: { width: 42, height: 42, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.42)', alignItems: 'center', justifyContent: 'center' },
  identity: { flexDirection: 'row', alignItems: 'center' }, logoWrap: { width: 45, height: 45, marginRight: 9 }, logo: { width: 45, height: 45, resizeMode: 'contain' }, statusDot: { position: 'absolute', right: 0, bottom: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.positive, borderWidth: 2, borderColor: '#FFFFFF' }, title: { color: colors.ink, fontSize: 17, fontWeight: '900' }, status: { color: colors.muted, fontSize: 9, fontWeight: '700', marginTop: 3 },
  messages: { padding: 17, paddingBottom: 28 }, networkWrap: { alignItems: 'center', marginBottom: 12 }, today: { alignSelf: 'center', color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginBottom: 18 }, movyaGroup: { alignItems: 'flex-start', marginBottom: 16 }, senderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, marginLeft: 3 }, messageAvatar: { width: 28, height: 28, resizeMode: 'contain', marginRight: 6 }, sender: { color: colors.ink, fontSize: 11, fontWeight: '800' }, aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.56)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3, marginLeft: 6 }, aiText: { color: colors.brand, fontSize: 8, fontWeight: '900' }, userGroup: { alignItems: 'flex-end', marginBottom: 15 }, userSender: { color: colors.muted, fontSize: 9, fontWeight: '800', marginRight: 4, marginBottom: 5 },
  bubble: { maxWidth: '84%', borderRadius: 22, paddingHorizontal: 15, paddingTop: 11, paddingBottom: 8, overflow: 'hidden' }, movyaBubble: { backgroundColor: 'rgba(255,255,255,0.58)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', borderTopLeftRadius: 7, shadowColor: colors.navy, shadowOpacity: 0.08, shadowRadius: 13, shadowOffset: { width: 0, height: 6 } }, userBubble: { borderTopRightRadius: 7 }, messageText: { color: colors.text, fontSize: 14, lineHeight: 20 }, userText: { color: '#FFFFFF' }, messageTime: { color: colors.muted, fontSize: 8, alignSelf: 'flex-end', marginTop: 5 }, userTime: { color: 'rgba(255,255,255,0.7)', fontSize: 8, alignSelf: 'flex-end', marginTop: 5 },
  voiceBubble: { minWidth: 235, flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 11 }, playButton: { width: 35, height: 35, borderRadius: 13, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }, voiceWave: { flex: 1, height: 31, flexDirection: 'row', alignItems: 'center', gap: 3, marginHorizontal: 10 }, voiceBar: { width: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.82)' }, voiceDuration: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  suggestions: { gap: 8, marginTop: 6, alignItems: 'flex-start' }, suggestion: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(255,255,255,0.53)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.82)', borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9 }, suggestionText: { color: colors.brandDark, fontSize: 11, fontWeight: '700' },
  composerArea: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.4)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.78)' }, composer: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: 'rgba(255,255,255,0.63)', borderRadius: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.92)', padding: 7, minHeight: 57 }, attachButton: { width: 39, height: 39, borderRadius: 15, backgroundColor: 'rgba(232,241,255,0.88)', alignItems: 'center', justifyContent: 'center' }, input: { flex: 1, color: colors.ink, fontSize: 14, maxHeight: 100, paddingVertical: 10, paddingHorizontal: 9 }, sendButton: { width: 43, height: 43, borderRadius: 16, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', shadowColor: colors.brand, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }, micButton: { backgroundColor: 'rgba(232,241,255,0.9)' },
  recordingComposer: { height: 57, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: 'rgba(255,255,255,0.66)', borderRadius: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', padding: 7 }, cancelRecording: { width: 40, height: 40, borderRadius: 15, backgroundColor: '#FCEAF0', alignItems: 'center', justifyContent: 'center' }, recordingStatus: { flex: 1, flexDirection: 'row', alignItems: 'center' }, recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5536C', marginRight: 7 }, recordingTime: { color: colors.ink, fontSize: 12, fontWeight: '800' }, liveWave: { flex: 1, height: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }, liveBar: { width: 3, borderRadius: 2, backgroundColor: colors.brand }, securityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 8 }, security: { color: colors.muted, fontSize: 9 },
});
