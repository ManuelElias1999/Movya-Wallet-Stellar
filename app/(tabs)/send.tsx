import { Pressable, Text, TextInput } from '@/i18n/primitives';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Linking, Modal, Platform, Keyboard, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageHeader } from '@/components/PageHeader';
import { InternalScreenBackground } from '@/components/InternalScreenBackground';
import { MovyaContextHelp } from '@/components/MovyaContextHelp';
import { PressableScale } from '@/components/PressableScale';
import { StellarNetworkBadge } from '@/components/StellarNetworkBadge';
import { TokenSelector } from '@/components/TokenSelector';
import { TokenIcon } from '@/components/TokenIcon';
import { PaymentReviewSheet } from '@/components/PaymentReviewSheet';
import { useTestnetWallet } from '@/context/TestnetWalletContext';
import { assetBalance, preparePayment, type PaymentAsset, type PaymentReceipt, type PaymentReview } from '@/services/stellar/payments';
import { useContacts } from '@/context/ContactsContext';
import { resolveContactWithConfirmation } from '@/components/confirmContactAddress';
import { isPositiveTransferAmount, looksLikeStellarPublicKey, sanitizeStellarAddressInput, sanitizeTransferAmountInput, shortenStellarAddress } from '@/services/transferPresentation';
import { colors, radius } from '@/theme/tokens';

export default function SendScreen() {
  const params = useLocalSearchParams<{ contact?: string; contactId?: string; address?: string; amount?: string; token?: string }>();
  const wallet = useTestnetWallet();
  const saved = useContacts();
  const { contacts } = saved;
  const router = useRouter();
  const lock = useRef(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState('');
  const [review, setReview] = useState<PaymentReview | null>(null);
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const initialContact = useMemo(() => contacts.find((item) => item.name === params.contact), [params.contact, contacts]);
  const [selectedContactId, setSelectedContactId] = useState(params.contactId ?? initialContact?.id ?? '');
  const [address, setAddress] = useState(() => sanitizeStellarAddressInput(params.address ?? ''));
  const [token, setToken] = useState<PaymentAsset>(params.token === 'XLM' ? 'XLM' : 'USDC');
  const [amount, setAmount] = useState(() => sanitizeTransferAmountInput(params.amount ?? ''));
  const [contactsOpen, setContactsOpen] = useState(false);
  const [tokensOpen, setTokensOpen] = useState(false);
  const selected = contacts.find((item) => item.id === selectedContactId);
  const amountReady = isPositiveTransferAmount(amount);
  const recipientReady = Boolean(selected || looksLikeStellarPublicKey(address));
  const ready = Boolean(wallet.publicKey && wallet.account && amountReady && recipientReady && !preparing && !receipt && !wallet.loading);
  const balance = wallet.account ? assetBalance(wallet.account, token)?.balance ?? '0' : '—';
  const recipientPreview = selected?.name ?? (recipientReady ? shortenStellarAddress(address) : 'Aún no seleccionado');
  const tokenColors: Record<string, string> = { USDC: '#2775CA', XLM: colors.navy, EURC: '#6857E5', AQUA: '#00A6A6' };

  const pickContact = (id: string) => {
    setSelectedContactId(id);
    setAddress('');
    setError('');
    setContactsOpen(false);
  };

  const editAmount = (value: string) => {
    setAmount(sanitizeTransferAmountInput(value));
    setError('');
  };

  const editAddress = (value: string) => {
    setSelectedContactId('');
    setAddress(sanitizeStellarAddressInput(value));
    setError('');
  };

  const reviewPayment = async () => {
    if (lock.current || !wallet.publicKey) return;
    lock.current = true; setPreparing(true); setError('');
    try {
      const destination = selected ? saved.persistent ? await resolveContactWithConfirmation(selected, () => void saved.refresh()) : selected.name === 'Ouali' ? wallet.oualiAddress : selected.address ?? '' : address.trim();
      if (selected && !destination) throw new Error('Este contacto todavía no tiene una dirección vinculada. Guarda su dirección en Contactos o pega una dirección.');
      const next = await preparePayment({ source: wallet.publicKey, destination, amount, asset: token });
      setReview(next);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'No se pudo preparar el envío.'); }
    finally { lock.current = false; setPreparing(false); }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <InternalScreenBackground />
      <PageHeader subtitle="Revisarás todo antes de confirmar" title="Enviar" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <View style={styles.networkBadge}><StellarNetworkBadge label="Todos los envíos se realizan en Stellar · Testnet" /></View>
          {!wallet.publicKey || !wallet.account ? <PressableScale onPress={() => router.push('/testnet-wallet')} style={styles.summary}><Text style={styles.summaryTitle}>Configurar mi wallet de pruebas →</Text></PressableScale> : null}
          <View style={styles.sectionLabel}><View style={styles.stepBadge}><Text translate={false} style={styles.stepText}>1</Text></View><Text style={styles.label}>Monto</Text></View>
          <View style={styles.amountCard}>
            <Text style={styles.currency}>{token === 'USDC' ? '$' : ''}</Text>
            <TextInput keyboardType="decimal-pad" onChangeText={editAmount} placeholder="0.00" placeholderTextColor="#A7B2C5" style={styles.amountInput} value={amount} />
            <PressableScale onPress={() => setTokensOpen(true)} pressedScale={0.94} style={styles.tokenPill}>
              <View style={styles.tokenDot}><TokenIcon code={token} color={tokenColors[token]} size={23} /></View>
              <View style={styles.tokenPillCopy}><Text style={styles.tokenPillLabel}>TOKEN</Text><Text style={styles.tokenText}>{token}</Text></View>
              <Ionicons name="chevron-down" size={15} color={colors.brand} />
            </PressableScale>
          </View>
          {amount && !amountReady ? <Text style={styles.validationHint}>Ingresa un monto mayor a 0 con hasta 7 decimales.</Text> : null}
          <View style={styles.balanceRow}><Text style={styles.balance}>Balance de Testnet: {wallet.loading ? 'Actualizando…' : `${balance} ${token}`}</Text><Pressable onPress={() => void wallet.refresh()}><Text style={styles.max}>Actualizar</Text></Pressable></View>

          <View style={styles.sectionLabel}><View style={styles.stepBadge}><Text translate={false} style={styles.stepText}>2</Text></View><Text style={styles.label}>Destinatario</Text></View>
          {selected ? (
            <View style={styles.selectedContact}>
              <View style={[styles.avatar, { backgroundColor: selected.color }]}><Text translate={false} style={styles.avatarText}>{selected.initials}</Text></View>
              <View style={styles.contactCopy}><Text translate={false} style={styles.contactName}>{selected.name}</Text><Text translate={false} style={styles.handle}>{selected.handle}</Text></View>
              <Pressable onPress={() => { setSelectedContactId(''); setError(''); }} style={styles.clear}><Ionicons name="close" size={18} color={colors.muted} /></Pressable>
            </View>
          ) : (
            <View style={styles.recipientRow}>
              <View style={styles.addressBox}>
                <Ionicons name="wallet-outline" size={19} color={colors.muted} />
                <TextInput returnKeyType="done" submitBehavior="blurAndSubmit" onSubmitEditing={Keyboard.dismiss} autoCapitalize="characters" autoCorrect={false} onChangeText={editAddress} placeholder="Pegar dirección G..." placeholderTextColor={colors.muted} style={styles.addressInput} value={address} />
                {address ? <Pressable accessibilityLabel="Borrar dirección" onPress={() => editAddress('')} style={styles.addressClear}><Ionicons name="close-circle" size={19} color={colors.muted} /></Pressable> : null}
              </View>
              <PressableScale onPress={() => setContactsOpen(true)} pressedScale={0.94} style={styles.contactsButton}><Ionicons name="people" size={21} color={colors.brand} /><Text style={styles.contactsText}>Contactos</Text></PressableScale>
            </View>
          )}
          {!selected && address && !recipientReady ? <Text style={styles.validationHint}>La dirección debe comenzar con G y tener 56 caracteres.</Text> : null}
          {selected ? <Pressable onPress={() => setContactsOpen(true)}><Text style={styles.changeContact}>Cambiar contacto</Text></Pressable> : <Text style={styles.help}>Puedes pegar una dirección o elegir una persona guardada.</Text>}

          {!receipt ? <View style={styles.previewCard}>
            <View style={styles.previewHeader}><View><Text style={styles.previewEyebrow}>RESUMEN DEL ENVÍO</Text><Text style={styles.previewTitle}>Todo listo para revisar</Text></View><View style={[styles.summaryIcon, { backgroundColor: token === 'USDC' ? '#E8F1FF' : '#EEF0F4' }]}><Ionicons name="shield-checkmark-outline" size={21} color={token === 'USDC' ? colors.brand : colors.navy} /></View></View>
            <View style={styles.previewAmountRow}><Text translate={false} style={styles.previewAmount}>{amountReady ? amount : '0'}</Text><View style={styles.previewToken}><TokenIcon code={token} color={tokenColors[token]} size={20} /><Text translate={false} style={styles.previewTokenText}>{token}</Text></View></View>
            <View style={styles.previewDivider} />
            <View style={styles.previewDetail}><Text style={styles.previewLabel}>Para</Text><Text translate={false} numberOfLines={1} style={[styles.previewValue, !recipientReady && styles.previewPending]}>{recipientPreview}</Text></View>
            <View style={styles.previewDetail}><Text style={styles.previewLabel}>Red</Text><Text style={styles.previewValue}>Stellar Testnet</Text></View>
          </View> : null}

          {error || wallet.error ? <Text accessibilityLiveRegion="polite" style={{ color: '#B52D42', marginTop: 16, fontSize: 12, lineHeight: 18 }}>{error || wallet.error}</Text> : null}
          {receipt ? <View style={styles.summary}><View style={styles.summaryCopy}><Text style={styles.summaryTitle}>Transferencia confirmada en Testnet</Text><Text translate={false} selectable style={styles.summaryText}>{receipt.hash}</Text><PressableScale onPress={() => void Linking.openURL(receipt.explorerUrl)}><Text style={styles.changeContact}>Ver comprobante en Stellar Expert</Text></PressableScale><PressableScale onPress={() => { setReceipt(null); setAmount(''); setError(''); }}><Text style={styles.changeContact}>Hacer otro envío</Text></PressableScale></View></View> : null}
          <PressableScale disabled={!ready} onPress={() => void reviewPayment()} style={[styles.primaryButton, !ready && styles.disabled]}><Text style={styles.primaryText}>{preparing ? 'Verificando…' : 'Revisar envío'}</Text></PressableScale>
          <View style={styles.contextHelp}>
            <MovyaContextHelp
              actionPrompt={`Quiero enviar ${amount || 'un monto'} de ${token}. Ayúdame a elegir el destinatario y preparar el envío.`}
              explanationSteps={[
                'Escoge XLM o USDC de Testnet.',
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
          {!contacts.length ? <Pressable onPress={() => { setContactsOpen(false); router.push('/contacts'); }}><Text style={styles.help}>Agrega tu primer contacto →</Text></Pressable> : null}
          {contacts.map((contact) => (
            <Pressable key={contact.id} onPress={() => pickContact(contact.id)} style={styles.contactRow}>
              <View style={[styles.avatar, { backgroundColor: contact.color }]}><Text translate={false} style={styles.avatarText}>{contact.initials}</Text></View>
              <View style={styles.contactCopy}><Text translate={false} style={styles.contactName}>{contact.name}</Text><Text translate={false} style={styles.handle}>{contact.handle}</Text></View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      </Modal>

      <Modal animationType="slide" onRequestClose={() => setTokensOpen(false)} transparent visible={tokensOpen}>
        <Pressable onPress={() => setTokensOpen(false)} style={styles.backdrop} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} /><Text style={styles.sheetTitle}>Elegir activo</Text>
          <TokenSelector options={['USDC', 'XLM']} onChange={(value) => { setToken(value as PaymentAsset); setError(''); setTokensOpen(false); }} value={token} />
        </View>
      </Modal>
      {review ? <PaymentReviewSheet key={review.hash} review={review} onClose={() => setReview(null)} onSuccess={(result) => { setReceipt(result); setReview(null); }} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#D8E1EB' }, flex: { flex: 1 }, content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, paddingBottom: 40 },
  networkBadge: { marginTop: 14 },
  contextHelp: { marginTop: 24 },
  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, marginBottom: 10 }, stepBadge: { width: 23, height: 23, borderRadius: 8, backgroundColor: '#E3EEFF', alignItems: 'center', justifyContent: 'center' }, stepText: { color: colors.brand, fontSize: 11, fontWeight: '900' }, label: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  amountCard: { height: 78, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(247,251,255,0.9)', borderRadius: 22, borderWidth: 1.5, borderColor: '#B9D3F4', paddingLeft: 15, paddingRight: 10, shadowColor: colors.navy, shadowOpacity: 0.16, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 5 }, currency: { width: 20, color: colors.muted, fontSize: 25, fontWeight: '700' }, amountInput: { flex: 1, minWidth: 0, color: colors.ink, fontSize: 30, fontWeight: '800', marginLeft: 1, paddingHorizontal: 0 },
  tokenPill: { width: 112, flexShrink: 0, height: 50, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(229,240,255,0.96)', borderWidth: 1, borderColor: '#BCD5F5', borderRadius: 17, paddingHorizontal: 9, shadowColor: colors.brandDark, shadowOpacity: 0.1, shadowRadius: 7, shadowOffset: { width: 0, height: 4 }, elevation: 2 }, tokenDot: { width: 23, height: 23, marginRight: 7 }, tokenPillCopy: { flex: 1 }, tokenPillLabel: { color: colors.muted, fontSize: 8, fontWeight: '800' }, tokenText: { color: colors.brandDark, fontSize: 12, fontWeight: '800', marginTop: 1 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }, balance: { color: colors.muted, fontSize: 11 }, max: { color: colors.brand, fontSize: 11, fontWeight: '800' },
  validationHint: { color: '#B52D42', fontSize: 10, lineHeight: 15, marginTop: 7 },
  recipientRow: { flexDirection: 'row', gap: 9 }, addressBox: { flex: 1, height: 62, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFDFB', borderRadius: 18, borderWidth: 1.5, borderColor: '#D9D1E7', paddingHorizontal: 13, shadowColor: colors.navy, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 }, addressInput: { flex: 1, color: colors.ink, fontSize: 13, marginLeft: 8 }, addressClear: { width: 30, height: 36, alignItems: 'center', justifyContent: 'center' },
  contactsButton: { width: 88, height: 58, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E3EEFF', borderRadius: 18, borderWidth: 1, borderColor: colors.brandIce, shadowColor: colors.navy, shadowOpacity: 0.1, shadowRadius: 9, shadowOffset: { width: 0, height: 5 }, elevation: 2 }, contactsText: { color: colors.brand, fontSize: 9, fontWeight: '800', marginTop: 3 }, help: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 8 }, changeContact: { color: colors.brand, fontSize: 11, fontWeight: '800', marginTop: 9 },
  selectedContact: { height: 66, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.brandIce, borderRadius: 19, paddingHorizontal: 12 }, avatar: { width: 43, height: 43, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: colors.ink, fontSize: 12, fontWeight: '800' }, contactCopy: { flex: 1, marginLeft: 11 }, contactName: { color: colors.ink, fontSize: 14, fontWeight: '700' }, handle: { color: colors.muted, fontSize: 11, marginTop: 3 }, clear: { width: 34, height: 34, borderRadius: 13, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  summary: { flexDirection: 'row', alignItems: 'center', marginTop: 28, padding: 15, backgroundColor: 'rgba(255,255,255,0.84)', borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.92)', shadowColor: colors.navy, shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 }, summaryIcon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, summaryCopy: { flex: 1, marginLeft: 11 }, summaryTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' }, summaryText: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  previewCard: { marginTop: 26, padding: 17, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 22, borderWidth: 1, borderColor: '#DCE8F6', shadowColor: colors.navy, shadowOpacity: 0.11, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 3 }, previewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, previewEyebrow: { color: colors.brand, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 }, previewTitle: { color: colors.ink, fontSize: 14, fontWeight: '800', marginTop: 4 }, previewAmountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 }, previewAmount: { color: colors.ink, fontSize: 30, fontWeight: '900' }, previewToken: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#EDF5FF', borderRadius: 14, paddingHorizontal: 11, paddingVertical: 8 }, previewTokenText: { color: colors.brandDark, fontSize: 12, fontWeight: '900' }, previewDivider: { height: 1, backgroundColor: colors.border, marginVertical: 15 }, previewDetail: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginTop: 6 }, previewLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' }, previewValue: { flex: 1, textAlign: 'right', color: colors.ink, fontSize: 11, fontWeight: '800' }, previewPending: { color: colors.muted, fontWeight: '600' },
  primaryButton: { height: 56, borderRadius: 18, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginTop: 25, shadowColor: colors.brandDark, shadowOpacity: 0.24, shadowRadius: 13, shadowOffset: { width: 0, height: 7 }, elevation: 4 }, disabled: { backgroundColor: '#BAC5D5', shadowOpacity: 0.05 }, primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  backdrop: { flex: 1, backgroundColor: 'rgba(5,16,35,0.38)' }, sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 22, paddingBottom: 30 }, sheetHandle: { width: 42, height: 5, borderRadius: 3, backgroundColor: '#D4DBE6', alignSelf: 'center', marginBottom: 16 }, sheetTitle: { color: colors.ink, fontSize: 19, fontWeight: '800', textAlign: 'center', marginBottom: 16 }, contactRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border },
});
