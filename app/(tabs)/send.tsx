import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageHeader } from '@/components/PageHeader';
import { TokenSelector } from '@/components/TokenSelector';
import { demoContacts } from '@/data/demo';
import { colors, radius } from '@/theme/tokens';

export default function SendScreen() {
  const params = useLocalSearchParams<{ contact?: string }>();
  const initialContact = useMemo(() => demoContacts.find((item) => item.name === params.contact), [params.contact]);
  const [mode, setMode] = useState<'contact' | 'address'>(initialContact ? 'contact' : 'contact');
  const [contactId, setContactId] = useState(initialContact?.id ?? '');
  const [address, setAddress] = useState('');
  const [token, setToken] = useState('USDC');
  const [amount, setAmount] = useState('');
  const selected = demoContacts.find((item) => item.id === contactId);
  const ready = Boolean(amount && (mode === 'address' ? address.trim() : selected));

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <PageHeader subtitle="Revisarás todo antes de confirmar" title="Enviar dinero" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.segment}>
            <Pressable onPress={() => setMode('contact')} style={[styles.segmentItem, mode === 'contact' && styles.segmentActive]}><Text style={[styles.segmentText, mode === 'contact' && styles.segmentTextActive]}>Contacto</Text></Pressable>
            <Pressable onPress={() => setMode('address')} style={[styles.segmentItem, mode === 'address' && styles.segmentActive]}><Text style={[styles.segmentText, mode === 'address' && styles.segmentTextActive]}>Dirección</Text></Pressable>
          </View>

          {mode === 'contact' ? (
            <View style={styles.section}>
              <Text style={styles.label}>¿A quién?</Text>
              <View style={styles.contacts}>
                {demoContacts.map((contact) => (
                  <Pressable key={contact.id} onPress={() => setContactId(contact.id)} style={[styles.contact, contactId === contact.id && styles.contactActive]}>
                    <View style={[styles.avatar, { backgroundColor: contact.color }]}><Text style={styles.avatarText}>{contact.initials}</Text></View>
                    <View style={styles.contactCopy}><Text style={styles.contactName}>{contact.name}</Text><Text style={styles.handle}>{contact.handle}</Text></View>
                    <Ionicons name={contactId === contact.id ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={contactId === contact.id ? colors.brand : colors.muted} />
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.label}>Dirección de destino</Text>
              <TextInput autoCapitalize="characters" onChangeText={setAddress} placeholder="G..." placeholderTextColor={colors.muted} style={styles.addressInput} value={address} />
              <Text style={styles.help}>Pega la dirección de la cuenta Stellar que recibirá el dinero.</Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.label}>¿Qué quieres enviar?</Text>
            <TokenSelector onChange={setToken} value={token} />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Monto</Text>
            <View style={styles.amountBox}>
              <Text style={styles.currency}>$</Text>
              <TextInput keyboardType="decimal-pad" onChangeText={setAmount} placeholder="0.00" placeholderTextColor="#A7B2C5" style={styles.amountInput} value={amount} />
              <Text style={styles.tokenCode}>{token}</Text>
            </View>
            <Text style={styles.balance}>Disponible: {token === 'USDC' ? '$1,240.00' : '862.41 XLM'}</Text>
          </View>

          <Pressable disabled={!ready} onPress={() => Alert.alert('Vista previa', 'En la siguiente fase aparecerá la confirmación antes de firmar la operación.')} style={[styles.primaryButton, !ready && styles.disabled]}>
            <Text style={styles.primaryText}>Continuar</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 }, content: { padding: 20, paddingBottom: 40 },
  segment: { flexDirection: 'row', backgroundColor: '#E8EDF5', borderRadius: 16, padding: 4 },
  segmentItem: { flex: 1, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 13 }, segmentActive: { backgroundColor: colors.surface },
  segmentText: { color: colors.muted, fontWeight: '700', fontSize: 13 }, segmentTextActive: { color: colors.ink },
  section: { marginTop: 26 }, label: { color: colors.ink, fontSize: 15, fontWeight: '800', marginBottom: 11 }, contacts: { gap: 9 },
  contact: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12 }, contactActive: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  avatar: { width: 43, height: 43, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  contactCopy: { flex: 1, marginLeft: 11 }, contactName: { color: colors.ink, fontSize: 14, fontWeight: '700' }, handle: { color: colors.muted, fontSize: 11, marginTop: 3 },
  addressInput: { height: 58, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 18, paddingHorizontal: 16, color: colors.ink, fontSize: 14 }, help: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 8 },
  amountBox: { height: 88, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 22, paddingHorizontal: 18 },
  currency: { color: colors.muted, fontSize: 28, fontWeight: '700' }, amountInput: { flex: 1, color: colors.ink, fontSize: 35, fontWeight: '800', marginLeft: 5 }, tokenCode: { color: colors.brand, fontSize: 13, fontWeight: '800' }, balance: { color: colors.muted, fontSize: 11, marginTop: 8 },
  primaryButton: { height: 56, borderRadius: 18, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginTop: 30 }, disabled: { backgroundColor: '#BAC5D5' }, primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
