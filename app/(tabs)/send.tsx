import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageHeader } from '@/components/PageHeader';
import { InternalScreenBackground } from '@/components/InternalScreenBackground';
import { MovyaContextHelp } from '@/components/MovyaContextHelp';
import { PressableScale } from '@/components/PressableScale';
import { StellarNetworkBadge } from '@/components/StellarNetworkBadge';
import { TokenSelector } from '@/components/TokenSelector';
import { TokenIcon } from '@/components/TokenIcon';
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
  const balances: Record<string, string> = { USDC: '$1,240.00', XLM: '862.41 XLM', EURC: '92.00 EURC', AQUA: '4,800 AQUA' };
  const tokenColors: Record<string, string> = { USDC: '#2775CA', XLM: colors.navy, EURC: '#6857E5', AQUA: '#00A6A6' };

  const pickContact = (id: string) => {
    setSelectedContactId(id);
    setAddress('');
    setContactsOpen(false);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <InternalScreenBackground />
      <PageHeader subtitle="Revisarás todo antes de confirmar" title="Enviar" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.networkBadge}><StellarNetworkBadge label="Todos los envíos se realizan en Stellar · Testnet" /></View>
          <Text style={styles.label}>Monto</Text>
          <View style={styles.amountCard}>
            <Text style={styles.currency}>{token === 'USDC' ? '$' : ''}</Text>
            <TextInput keyboardType="decimal-pad" onChangeText={setAmount} placeholder="0.00" placeholderTextColor="#A7B2C5" style={styles.amountInput} value={amount} />
            <PressableScale onPress={() => setTokensOpen(true)} pressedScale={0.94} style={styles.tokenPill}>
              <View style={styles.tokenDot}><TokenIcon code={token} color={tokenColors[token]} size={23} /></View>
              <View style={styles.tokenPillCopy}><Text style={styles.tokenPillLabel}>TOKEN</Text><Text style={styles.tokenText}>{token}</Text></View>
              <Ionicons name="chevron-down" size={15} color={colors.brand} />
            </PressableScale>
          </View>
          <View style={styles.balanceRow}><Text style={styles.balance}>Disponible: {balances[token]}</Text><Pressable onPress={() => setAmount(token === 'USDC' ? '1240.00' : token === 'XLM' ? '862.41' : token === 'EURC' ? '92.00' : '4800')}><Text style={styles.max}>Usar máximo</Text></Pressable></View>

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
              <PressableScale onPress={() => setContactsOpen(true)} pressedScale={0.94} style={styles.contactsButton}><Ionicons name="people" size={21} color={colors.brand} /><Text style={styles.contactsText}>Contactos</Text></PressableScale>
            </View>
          )}
          {selected ? <Pressable onPress={() => setContactsOpen(true)}><Text style={styles.changeContact}>Cambiar contacto</Text></Pressable> : <Text style={styles.help}>Puedes pegar una dirección o elegir una persona guardada.</Text>}

          <View style={styles.summary}>
            <View style={[styles.summaryIcon, { backgroundColor: token === 'USDC' ? '#E8F1FF' : '#EEF0F4' }]}><Ionicons name="shield-checkmark-outline" size={21} color={token === 'USDC' ? colors.brand : colors.navy} /></View>
            <View style={styles.summaryCopy}><Text style={styles.summaryTitle}>Envío protegido en Stellar</Text><Text style={styles.summaryText}>Verificarás destinatario, monto, activo y red antes de continuar.</Text></View>
          </View>

          <PressableScale disabled={!ready} onPress={() => Alert.alert('Vista previa', 'En la siguiente fase aparecerá la confirmación antes de firmar la operación.')} style={[styles.primaryButton, !ready && styles.disabled]}><Text style={styles.primaryText}>Revisar envío</Text></PressableScale>
          <View style={styles.contextHelp}>
            <MovyaContextHelp
              actionPrompt={`Quiero enviar ${amount || 'un monto'} de ${token}. Ayúdame a elegir el destinatario y preparar el envío.`}
              explanationSteps={[
                'Escoge el token que quieres enviar: USDC, XLM, EURC o AQUA.',
                'Escribe el monto y revisa que tengas balance suficiente.',
                'Pega la dirección Stellar del destinatario. Empieza con la letra G; por ejemplo: GABCD…9XYZ.',
                'También puedes pulsar Contactos y elegir una persona guardada. Antes de enviar verás una confirmación final.',
              ]}
              explanationTitle="Cómo enviar dinero"
              question="¿Necesitas ayuda para completar el envío?"
            />
          </View>
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
  safeArea: { flex: 1, backgroundColor: '#D8E1EB' }, flex: { flex: 1 }, content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, paddingBottom: 40 },
  networkBadge: { marginTop: 14 },
  contextHelp: { marginTop: 24 },
  label: { color: colors.ink, fontSize: 15, fontWeight: '800', marginTop: 20, marginBottom: 10 },
  amountCard: { height: 78, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(247,251,255,0.9)', borderRadius: 22, borderWidth: 1.5, borderColor: '#B9D3F4', paddingLeft: 15, paddingRight: 10, shadowColor: colors.navy, shadowOpacity: 0.16, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 5 }, currency: { width: 20, color: colors.muted, fontSize: 25, fontWeight: '700' }, amountInput: { flex: 1, minWidth: 0, color: colors.ink, fontSize: 30, fontWeight: '800', marginLeft: 1, paddingHorizontal: 0 },
  tokenPill: { width: 112, flexShrink: 0, height: 50, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(229,240,255,0.96)', borderWidth: 1, borderColor: '#BCD5F5', borderRadius: 17, paddingHorizontal: 9, shadowColor: colors.brandDark, shadowOpacity: 0.1, shadowRadius: 7, shadowOffset: { width: 0, height: 4 }, elevation: 2 }, tokenDot: { width: 23, height: 23, marginRight: 7 }, tokenPillCopy: { flex: 1 }, tokenPillLabel: { color: colors.muted, fontSize: 8, fontWeight: '800' }, tokenText: { color: colors.brandDark, fontSize: 12, fontWeight: '800', marginTop: 1 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }, balance: { color: colors.muted, fontSize: 11 }, max: { color: colors.brand, fontSize: 11, fontWeight: '800' },
  recipientRow: { flexDirection: 'row', gap: 9 }, addressBox: { flex: 1, height: 62, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFDFB', borderRadius: 18, borderWidth: 1.5, borderColor: '#D9D1E7', paddingHorizontal: 13, shadowColor: colors.navy, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 }, addressInput: { flex: 1, color: colors.ink, fontSize: 13, marginLeft: 8 },
  contactsButton: { width: 88, height: 58, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E3EEFF', borderRadius: 18, borderWidth: 1, borderColor: colors.brandIce, shadowColor: colors.navy, shadowOpacity: 0.1, shadowRadius: 9, shadowOffset: { width: 0, height: 5 }, elevation: 2 }, contactsText: { color: colors.brand, fontSize: 9, fontWeight: '800', marginTop: 3 }, help: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 8 }, changeContact: { color: colors.brand, fontSize: 11, fontWeight: '800', marginTop: 9 },
  selectedContact: { height: 66, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.brandIce, borderRadius: 19, paddingHorizontal: 12 }, avatar: { width: 43, height: 43, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: colors.ink, fontSize: 12, fontWeight: '800' }, contactCopy: { flex: 1, marginLeft: 11 }, contactName: { color: colors.ink, fontSize: 14, fontWeight: '700' }, handle: { color: colors.muted, fontSize: 11, marginTop: 3 }, clear: { width: 34, height: 34, borderRadius: 13, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  summary: { flexDirection: 'row', alignItems: 'center', marginTop: 28, padding: 15, backgroundColor: 'rgba(255,255,255,0.84)', borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.92)', shadowColor: colors.navy, shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 }, summaryIcon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, summaryCopy: { flex: 1, marginLeft: 11 }, summaryTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' }, summaryText: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  primaryButton: { height: 56, borderRadius: 18, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginTop: 25, shadowColor: colors.brandDark, shadowOpacity: 0.24, shadowRadius: 13, shadowOffset: { width: 0, height: 7 }, elevation: 4 }, disabled: { backgroundColor: '#BAC5D5', shadowOpacity: 0.05 }, primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  backdrop: { flex: 1, backgroundColor: 'rgba(5,16,35,0.38)' }, sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 22, paddingBottom: 30 }, sheetHandle: { width: 42, height: 5, borderRadius: 3, backgroundColor: '#D4DBE6', alignSelf: 'center', marginBottom: 16 }, sheetTitle: { color: colors.ink, fontSize: 19, fontWeight: '800', textAlign: 'center', marginBottom: 16 }, contactRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border },
});
