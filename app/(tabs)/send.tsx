import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageHeader } from '@/components/PageHeader';
import { TokenSelector } from '@/components/TokenSelector';
import { demoContacts } from '@/data/demo';
import { colors, radius } from '@/theme/tokens';

export default function SendScreen() {
  const params = useLocalSearchParams<{ contact?: string }>();
  const initialContact = useMemo(() => demoContacts.find((item) => item.name === params.contact), [params.contact]);
  const [selectedContactId, setSelectedContactId] = useState(initialContact?.id ?? '');
  const [address, setAddress] = useState('');
  const [token, setToken] = useState('USDC');
  const [amount, setAmount] = useState('');
  const [contactsOpen, setContactsOpen] = useState(false);
  const [tokensOpen, setTokensOpen] = useState(false);
  const selected = demoContacts.find((item) => item.id === selectedContactId);
  const ready = Boolean(amount && (selected || address.trim()));

  const pickContact = (id: string) => {
    setSelectedContactId(id);
    setAddress('');
    setContactsOpen(false);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <PageHeader subtitle="Revisarás todo antes de confirmar" title="Enviar" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Monto</Text>
          <View style={styles.amountCard}>
            <Text style={styles.currency}>{token === 'USDC' ? '$' : ''}</Text>
            <TextInput autoFocus keyboardType="decimal-pad" onChangeText={setAmount} placeholder="0.00" placeholderTextColor="#A7B2C5" style={styles.amountInput} value={amount} />
            <Pressable onPress={() => setTokensOpen(true)} style={styles.tokenPill}>
              <View style={[styles.tokenDot, token === 'USDC' ? styles.usdc : styles.xlm]} />
              <Text style={styles.tokenText}>{token}</Text>
              <Ionicons name="chevron-down" size={15} color={colors.brand} />
            </Pressable>
          </View>
          <View style={styles.balanceRow}><Text style={styles.balance}>Disponible: {token === 'USDC' ? '$1,240.00' : '862.41 XLM'}</Text><Pressable onPress={() => setAmount(token === 'USDC' ? '1240.00' : '862.41')}><Text style={styles.max}>Usar máximo</Text></Pressable></View>

          <Text style={styles.label}>Destinatario</Text>
          {selected ? (
            <View style={styles.selectedContact}>
              <View style={[styles.avatar, { backgroundColor: selected.color }]}><Text style={styles.avatarText}>{selected.initials}</Text></View>
              <View style={styles.contactCopy}><Text style={styles.contactName}>{selected.name}</Text><Text style={styles.handle}>{selected.handle}</Text></View>
              <Pressable onPress={() => setSelectedContactId('')} style={styles.clear}><Ionicons name="close" size={18} color={colors.muted} /></Pressable>
            </View>
          ) : (
            <View style={styles.recipientRow}>
              <View style={styles.addressBox}>
                <Ionicons name="wallet-outline" size={19} color={colors.muted} />
                <TextInput autoCapitalize="characters" onChangeText={setAddress} placeholder="Pegar dirección G..." placeholderTextColor={colors.muted} style={styles.addressInput} value={address} />
              </View>
              <Pressable onPress={() => setContactsOpen(true)} style={styles.contactsButton}><Ionicons name="people" size={21} color={colors.brand} /><Text style={styles.contactsText}>Contactos</Text></Pressable>
            </View>
          )}
          {selected ? <Pressable onPress={() => setContactsOpen(true)}><Text style={styles.changeContact}>Cambiar contacto</Text></Pressable> : <Text style={styles.help}>Puedes pegar una dirección o elegir una persona guardada.</Text>}

          <View style={styles.summary}>
            <View style={[styles.summaryIcon, { backgroundColor: token === 'USDC' ? '#E8F1FF' : '#EEF0F4' }]}><Ionicons name="shield-checkmark-outline" size={21} color={token === 'USDC' ? colors.brand : colors.navy} /></View>
            <View style={styles.summaryCopy}><Text style={styles.summaryTitle}>Envío protegido</Text><Text style={styles.summaryText}>Verificarás destinatario, monto y activo antes de continuar.</Text></View>
          </View>

          <Pressable disabled={!ready} onPress={() => Alert.alert('Vista previa', 'En la siguiente fase aparecerá la confirmación antes de firmar la operación.')} style={[styles.primaryButton, !ready && styles.disabled]}><Text style={styles.primaryText}>Revisar envío</Text></Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal animationType="slide" onRequestClose={() => setContactsOpen(false)} transparent visible={contactsOpen}>
        <Pressable onPress={() => setContactsOpen(false)} style={styles.backdrop} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} /><Text style={styles.sheetTitle}>Elegir contacto</Text>
          {demoContacts.map((contact) => (
            <Pressable key={contact.id} onPress={() => pickContact(contact.id)} style={styles.contactRow}>
              <View style={[styles.avatar, { backgroundColor: contact.color }]}><Text style={styles.avatarText}>{contact.initials}</Text></View>
              <View style={styles.contactCopy}><Text style={styles.contactName}>{contact.name}</Text><Text style={styles.handle}>{contact.handle}</Text></View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      </Modal>

      <Modal animationType="slide" onRequestClose={() => setTokensOpen(false)} transparent visible={tokensOpen}>
        <Pressable onPress={() => setTokensOpen(false)} style={styles.backdrop} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} /><Text style={styles.sheetTitle}>Elegir activo</Text>
          <TokenSelector onChange={(value) => { setToken(value); setTokensOpen(false); }} value={token} />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 }, content: { padding: 20, paddingBottom: 40 },
  label: { color: colors.ink, fontSize: 15, fontWeight: '800', marginTop: 20, marginBottom: 10 },
  amountCard: { height: 104, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 24, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 18 }, currency: { color: colors.muted, fontSize: 31, fontWeight: '700' }, amountInput: { flex: 1, color: colors.ink, fontSize: 40, fontWeight: '800', marginLeft: 3 },
  tokenPill: { height: 42, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.brandSoft, borderRadius: 15, paddingHorizontal: 10 }, tokenDot: { width: 22, height: 22, borderRadius: 8, marginRight: 7 }, usdc: { backgroundColor: '#2775CA' }, xlm: { backgroundColor: colors.navy }, tokenText: { color: colors.brandDark, fontSize: 12, fontWeight: '800', marginRight: 4 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }, balance: { color: colors.muted, fontSize: 11 }, max: { color: colors.brand, fontSize: 11, fontWeight: '800' },
  recipientRow: { flexDirection: 'row', gap: 9 }, addressBox: { flex: 1, height: 58, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 13 }, addressInput: { flex: 1, color: colors.ink, fontSize: 13, marginLeft: 8 },
  contactsButton: { width: 88, height: 58, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brandSoft, borderRadius: 18, borderWidth: 1, borderColor: colors.brandIce }, contactsText: { color: colors.brand, fontSize: 9, fontWeight: '800', marginTop: 3 }, help: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 8 }, changeContact: { color: colors.brand, fontSize: 11, fontWeight: '800', marginTop: 9 },
  selectedContact: { height: 66, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.brandIce, borderRadius: 19, paddingHorizontal: 12 }, avatar: { width: 43, height: 43, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: colors.ink, fontSize: 12, fontWeight: '800' }, contactCopy: { flex: 1, marginLeft: 11 }, contactName: { color: colors.ink, fontSize: 14, fontWeight: '700' }, handle: { color: colors.muted, fontSize: 11, marginTop: 3 }, clear: { width: 34, height: 34, borderRadius: 13, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  summary: { flexDirection: 'row', alignItems: 'center', marginTop: 28, padding: 15, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }, summaryIcon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, summaryCopy: { flex: 1, marginLeft: 11 }, summaryTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' }, summaryText: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  primaryButton: { height: 56, borderRadius: 18, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginTop: 25 }, disabled: { backgroundColor: '#BAC5D5' }, primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  backdrop: { flex: 1, backgroundColor: 'rgba(5,16,35,0.38)' }, sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 22, paddingBottom: 30 }, sheetHandle: { width: 42, height: 5, borderRadius: 3, backgroundColor: '#D4DBE6', alignSelf: 'center', marginBottom: 16 }, sheetTitle: { color: colors.ink, fontSize: 19, fontWeight: '800', textAlign: 'center', marginBottom: 16 }, contactRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border },
});
