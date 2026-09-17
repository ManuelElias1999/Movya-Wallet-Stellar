import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '@/theme/tokens';

type Message = { id: number; role: 'movya' | 'user'; text: string };
type MovyaChatSheetProps = { open: boolean; onClose: () => void };

const screenHeight = Dimensions.get('window').height;
const suggestions = ['¿Cuánto dinero tengo?', 'Transfiere $20 a Camila', 'Muéstrame mis movimientos'];

export function MovyaChatSheet({ open, onClose }: MovyaChatSheetProps) {
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const inputRef = useRef<TextInput>(null);
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: 'movya', text: 'Hola, Manuel. ¿Qué quieres hacer con tu dinero hoy?' },
  ]);

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: open ? 0 : screenHeight,
      duration: open ? 420 : 360,
      easing: open ? Easing.out(Easing.cubic) : Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      if (open) inputRef.current?.focus();
    });
  }, [open, translateY]);

  const send = () => {
    const clean = text.trim();
    if (!clean) return;
    setMessages((current) => [
      ...current,
      { id: Date.now(), role: 'user', text: clean },
      { id: Date.now() + 1, role: 'movya', text: 'Entendido. Antes de hacer cualquier movimiento, te mostraré un resumen para que lo confirmes.' },
    ]);
    setText('');
  };

  return (
    <Animated.View pointerEvents={open ? 'auto' : 'none'} style={[styles.sheet, { transform: [{ translateY }] }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="chevron-down" size={24} color={colors.ink} />
          </Pressable>
          <View style={styles.identity}>
            <Image source={require('../../assets/movya-logo.png')} style={styles.logo} />
            <View>
              <Text style={styles.title}>Movya</Text>
              <Text style={styles.status}>En línea</Text>
            </View>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled">
          <Text style={styles.today}>HOY</Text>
          {messages.map((message) => (
            <View key={message.id} style={[styles.bubble, message.role === 'user' ? styles.userBubble : styles.movyaBubble]}>
              <Text style={[styles.messageText, message.role === 'user' && styles.userText]}>{message.text}</Text>
            </View>
          ))}
          <View style={styles.suggestions}>
            {suggestions.map((suggestion) => (
              <Pressable key={suggestion} onPress={() => setText(suggestion)} style={styles.suggestion}>
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <View style={styles.composerArea}>
          <View style={styles.composer}>
            <TextInput ref={inputRef} multiline onChangeText={setText} onSubmitEditing={send} placeholder="Escríbele a Movya…" placeholderTextColor={colors.muted} style={styles.input} value={text} />
            <Pressable disabled={!text.trim()} onPress={send} style={[styles.sendButton, !text.trim() && styles.sendDisabled]}>
              <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
          <Text style={styles.security}>Movya te pedirá confirmación antes de mover dinero.</Text>
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sheet: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#F3F7FC', zIndex: 50, elevation: 20 },
  header: { height: 72, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  closeButton: { width: 42, height: 42, borderRadius: 15, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  identity: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 42, height: 42, resizeMode: 'contain', marginRight: 9 },
  title: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  status: { color: colors.positive, fontSize: 11, fontWeight: '600', marginTop: 2 },
  headerSpacer: { width: 42 },
  messages: { padding: 18, paddingBottom: 28 },
  today: { alignSelf: 'center', color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginBottom: 20 },
  bubble: { maxWidth: '82%', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 12, marginBottom: 10 },
  movyaBubble: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderTopLeftRadius: 7 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: colors.brand, borderTopRightRadius: 7 },
  messageText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  userText: { color: '#FFFFFF' },
  suggestions: { gap: 9, marginTop: 10, alignItems: 'flex-start' },
  suggestion: { backgroundColor: colors.brandSoft, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  suggestionText: { color: colors.brandDark, fontSize: 12, fontWeight: '700' },
  composerArea: { backgroundColor: colors.surface, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1, borderTopColor: colors.border },
  composer: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: colors.background, borderRadius: 24, borderWidth: 1, borderColor: colors.border, padding: 7, paddingLeft: 15, minHeight: 56 },
  input: { flex: 1, color: colors.ink, fontSize: 15, maxHeight: 100, paddingVertical: 9 },
  sendButton: { width: 42, height: 42, borderRadius: 16, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { backgroundColor: '#B9C4D5' },
  security: { color: colors.muted, fontSize: 10, textAlign: 'center', marginTop: 8 },
});
