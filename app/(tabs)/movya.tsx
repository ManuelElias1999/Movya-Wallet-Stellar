import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BrandMark } from '@/components/BrandMark';
import { Screen } from '@/components/Screen';
import { colors, radius } from '@/theme/tokens';

const prompts = ['Send 20 USDC to Camila', 'Show my balance', 'Swap XLM to USDC'];

export default function MovyaScreen() {
  const [message, setMessage] = useState('');

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <Screen scroll={false}>
        <View style={styles.header}>
          <View style={styles.logo}><BrandMark size={25} color="#FFFFFF" /></View>
          <View>
            <Text style={styles.title}>Ask Movya</Text>
            <View style={styles.onlineRow}><View style={styles.onlineDot} /><Text style={styles.online}>Ready to help</Text></View>
          </View>
        </View>

        <View style={styles.hero}>
          <View style={styles.sparkle}><Ionicons name="sparkles" color={colors.brand} size={24} /></View>
          <Text style={styles.heroTitle}>What would you like to do?</Text>
          <Text style={styles.heroText}>Use simple words. Movya will explain and confirm every action before anything is sent.</Text>
        </View>

        <View style={styles.prompts}>
          {prompts.map((prompt) => (
            <Pressable key={prompt} onPress={() => setMessage(prompt)} style={styles.prompt}>
              <Text style={styles.promptText}>{prompt}</Text>
              <Ionicons name="arrow-forward" color={colors.brand} size={17} />
            </Pressable>
          ))}
        </View>

        <View style={styles.spacer} />
        <View style={styles.composer}>
          <TextInput multiline onChangeText={setMessage} placeholder="Ask Movya anything…" placeholderTextColor={colors.muted} style={styles.input} value={message} />
          <Pressable disabled={!message.trim()} style={[styles.send, !message.trim() && styles.sendDisabled]}>
            <Ionicons name="arrow-up" color="#FFFFFF" size={20} />
          </Pressable>
        </View>
        <Text style={styles.disclaimer}>Movya never executes a transaction without your confirmation.</Text>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 44, height: 44, borderRadius: 16, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  title: { color: colors.ink, fontSize: 20, fontWeight: '800' },
  onlineRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.positive, marginRight: 5 },
  online: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  hero: { alignItems: 'center', marginTop: 54, paddingHorizontal: 18 },
  sparkle: { width: 58, height: 58, borderRadius: 21, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroTitle: { color: colors.ink, fontSize: 24, fontWeight: '800', letterSpacing: -0.6, textAlign: 'center' },
  heroText: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 9 },
  prompts: { gap: 10, marginTop: 28 },
  prompt: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 16, height: 51 },
  promptText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  spacer: { flex: 1 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: 7, paddingLeft: 15, minHeight: 58 },
  input: { flex: 1, color: colors.ink, fontSize: 15, maxHeight: 96, paddingVertical: 9 },
  send: { width: 43, height: 43, borderRadius: 16, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { backgroundColor: '#B9C2D2' },
  disclaimer: { color: colors.muted, fontSize: 10, textAlign: 'center', marginTop: 9 },
});
