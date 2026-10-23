import { Pressable, Text, TextInput } from '@/i18n/primitives';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, Animated, BackHandler, Dimensions, Easing, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme/tokens';
import { MovyaLogo } from '@/components/MovyaLogo';
import { useAuth } from '@/context/AuthContext';
import { displayName, formatAssetBalance, formatEnteredAmount, formatReceivedAmount, paymentDescription } from '@/services/presentation';
import { useContacts } from '@/context/ContactsContext';
import { useTestnetWallet } from '@/context/TestnetWalletContext';
import { assetBalance, checkSubmission, preparePayment, SubmissionUnknownError, submitPayment, validateAddress } from '@/services/stellar/payments';
import { resolveContactWithConfirmation } from '@/components/confirmContactAddress';
import { createChatPaymentFlow, matchChatContacts } from '@/services/chatPayment';
import { assertNotDuplicate, recordPayment } from '@/services/security/duplicateGuard';
import { ChatPaymentCard } from '@/components/ChatPaymentCard';
import { SwapReviewCard } from '@/components/SwapReviewCard';
import { useSwapFlow } from '@/context/useSwapFlow';
import { swapBlocked } from '@/services/swapFlow';
import type { PaymentAsset } from '@/services/stellar/payments';
import { useLanguage } from '@/i18n/Language';
import { chatTopic, isChainedTransactionRequest, parseActivityLimit, parseChainedSwapSendRequest, parseContactChatRequest, parseSendRequest, parseSwapRequest } from '@/services/chatIntent';
import { interpretChatWithAi } from '@/services/backend/ai';
import { getActivityHistory, type StellarActivity } from '@/services/stellar/activity';
import { verifiedContactAddress } from '@/services/backend/contacts';

type TextMessage = { id: number; role: 'movya' | 'user'; kind: 'text'; text: string };
type VoiceMessage = { id: number; role: 'user'; kind: 'voice'; duration: number };
type Message = TextMessage | VoiceMessage;
type MovyaChatSheetProps = { open: boolean; onClose: () => void; initialPrompt?: string };
type ChainedTransfer = { phase: 'swapping' | 'preparing-send' | 'send'; recipient: string };

const screenHeight = Dimensions.get('window').height;
const suggestions = ['¿Cuánto dinero tengo?', 'Envía 1 USDC a Prueba', 'Cambia 50 XLM a USDC'];
const waveBars = [11, 18, 25, 15, 29, 21, 13, 24, 18, 28, 16, 23, 12, 19];
const formatDuration = (seconds: number) => `0:${String(seconds).padStart(2, '0')}`;
const normalizeName = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

function activityLine(activity: StellarActivity, publicKey: string, contacts: { name: string; address?: string }[], locale: string) {
  if (activity.kind === 'swap') {
    return `Cambiaste ${formatEnteredAmount(activity.sourceAmount)} ${activity.fromAsset} por ${formatReceivedAmount(activity.destinationAmount)} ${activity.toAsset} · ${new Date(activity.createdAt).toLocaleString(locale)}`;
  }
  const payment = activity.payment;
  const received = payment.to === publicKey;
  const other = received ? payment.from : payment.to;
  const description = paymentDescription(received, other, contacts);
  const amount = received ? formatReceivedAmount(payment.amount) : formatEnteredAmount(payment.amount);
  const asset = payment.asset_type === 'native' ? 'XLM' : payment.asset_code ?? 'activo';
  return `${description.title} · ${received ? '+' : '-'}${amount} ${asset} · ${new Date(payment.created_at).toLocaleString(locale)}`;
}

export function MovyaChatSheet({ open, onClose, initialPrompt }: MovyaChatSheetProps) {
  const { t, locale } = useLanguage();
  const wallet = useTestnetWallet();
  const auth = useAuth();
  const { flow: swapFlow, state: swapState } = useSwapFlow();
  const name = displayName(auth.user?.user_metadata).split(/\s+/)[0];
  const saved = useContacts();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const scrollRef = useRef<ScrollView | null>(null);
  const consumedPrompt = useRef('');
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [playingVoiceId, setPlayingVoiceId] = useState<number | null>(null);
  const [suggestionsVisible, setSuggestionsVisible] = useState(true);
  const [interpreting, setInterpreting] = useState(false);
  const [contactDraft, setContactDraft] = useState<{ phase: 'name' } | { phase: 'identifier'; name: string } | null>(null);
  const [chainedTransfer, setChainedTransfer] = useState<ChainedTransfer | null>(null);
  const lastLocalContext = useRef<'contacts' | 'activity' | null>(null);
  const interpretationRevision = useRef(0);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: 'movya', kind: 'text', text: `Hola, ${name}. Puedo ayudarte a enviar, recibir o cambiar dinero en Stellar. Prueba escribiendo: “Envía 20 USDC a Ouali”.` },
  ]);

  useEffect(() => {
    Animated.timing(translateY, { toValue: open ? 0 : screenHeight, duration: open ? 440 : 350, easing: open ? Easing.out(Easing.cubic) : Easing.inOut(Easing.cubic), useNativeDriver: true }).start();
  }, [open, translateY]);

  useEffect(() => {
    if (!recording) return;
    const interval = setInterval(() => setRecordingSeconds((current) => current + 1), 1000);
    return () => clearInterval(interval);
  }, [recording]);

  const createMovyaReply = (message: string, id: number): TextMessage => {
    const topic = chatTopic(message);
    if (topic === 'balance') return { id, role: 'movya', kind: 'text', text: wallet.publicKey ? wallet.account ? `En Testnet tienes ${formatAssetBalance(assetBalance(wallet.account, 'USDC')?.balance ?? '0', locale, 2)} USDC y ${formatAssetBalance(assetBalance(wallet.account, 'XLM')?.balance ?? '0', locale, 2)} XLM. Son tokens de prueba.` : 'Solicita XLM desde Inicio y actualiza tu saldo.' : 'Tu balance total de demostración es $1,629.24. Puedo mostrarte el detalle de cada activo si quieres.' };
    if (topic === 'swap') return { id, role: 'movya', kind: 'text', text: 'Claro. Dime qué activo quieres entregar, cuál quieres recibir y el monto. Después te mostraré la cotización antes de confirmar.' };
    if (topic === 'contact') {
      const request = parseContactChatRequest(message);
      if (request?.kind === 'count') return { id, role: 'movya', kind: 'text', text: `Tienes ${saved.contacts.length} contacto${saved.contacts.length === 1 ? '' : 's'} guardado${saved.contacts.length === 1 ? '' : 's'}.` };
      if (request?.kind === 'list') {
        const names = saved.contacts.map(contact => contact.name);
        return { id, role: 'movya', kind: 'text', text: names.length ? `Tus contactos son: ${names.join(', ')}.` : 'Todavía no tienes contactos guardados.' };
      }
      if (request?.kind === 'address') {
        const matches = saved.contacts.filter(contact => normalizeName(contact.name) === normalizeName(request.name));
        if (!matches.length) return { id, role: 'movya', kind: 'text', text: `No encontré un contacto llamado ${request.name}.` };
        if (matches.length > 1) return { id, role: 'movya', kind: 'text', text: `Tienes más de un contacto llamado ${request.name}. Revísalos en Contactos para elegir el correcto.` };
        return { id, role: 'movya', kind: 'text', text: `Estoy verificando la dirección guardada de ${matches[0].name}.` };
      }
      return { id, role: 'movya', kind: 'text', text: 'Puedo ayudarte. Dime el nombre y luego comparte su correo de Movya o su dirección Stellar pública.' };
    }
    if (topic === 'receive') return { id, role: 'movya', kind: 'text', text: 'Puedes recibir por Stellar usando tu QR o tu dirección pública. Puedo ayudarte a copiarla o compartirla.' };
    return { id, role: 'movya', kind: 'text', text: 'Perfecto. Dime el token, el monto y el destinatario. Prepararé el envío y te mostraré un resumen antes de confirmar.' };
  };

  const createAiReply = (kind: 'balance' | 'receive' | 'contact' | 'help' | 'unknown', reply: string | null, id: number) => {
    if (kind === 'balance') return createMovyaReply('balance', id);
    if (kind === 'receive') return createMovyaReply('recibir', id);
    if (kind === 'contact') return createMovyaReply('contacto', id);
    return { id, role: 'movya', kind: 'text', text: reply ?? 'No entendí completamente. Puedes pedirme consultar tu saldo, enviar XLM o USDC, recibir dinero o hacer un cambio.' } as TextMessage;
  };

  const latest = useRef({ wallet, saved });
  latest.current = { wallet, saved };
  const [flow] = useState(() => createChatPaymentFlow({
    source: () => latest.current.wallet.publicKey,
    resolve: async (request, contactId) => {
      const { wallet: currentWallet, saved: currentSaved } = latest.current;
      if (currentSaved.loading) throw new Error('Tus contactos se están cargando. Inténtalo en unos segundos.');
      if (currentSaved.error) throw new Error(currentSaved.error);
      const matches = matchChatContacts(currentSaved.contacts, request.recipient);
      if (!contactId && matches.length > 1) return { choices: matches.map(({ id, name, handle }) => ({ id, name, handle })) };
      const contact = contactId ? matches.find(c => c.id === contactId) : matches[0];
      if (contactId && !contact) throw new Error('El contacto cambió. Escribe el envío de nuevo.');
      if (contact) {
        const destination = currentSaved.persistent ? await resolveContactWithConfirmation(contact, () => void currentSaved.refresh()) : contact.name === 'Ouali' ? currentWallet.oualiAddress : contact.address ?? '';
        validateAddress(destination);
        return { destination, name: contact.name };
      }
      const destination = request.recipient.trim();
      try { validateAddress(destination); }
      catch { throw new Error('No encontré ese contacto. Usa su nombre guardado, correo o dirección Stellar.'); }
      return { destination, name: destination };
    },
    prepare: preparePayment,
    submit: async review => {
      assertNotDuplicate(review);
      try { const receipt = await submitPayment(review, () => latest.current.wallet.signPayment(review), latest.current.wallet.signerPublicKey ?? undefined); recordPayment(review); return receipt; }
      catch (error) { if (error instanceof SubmissionUnknownError) recordPayment(review); throw error; }
    },
    check: checkSubmission,
    refresh: () => latest.current.wallet.refresh(),
  }));
  const payment = useSyncExternalStore(flow.subscribe, flow.get, flow.get);
  const paymentBusy = interpreting || ['preparing', 'submitting', 'unknown'].includes(payment.phase) || swapBlocked(swapState) || swapState.phase === 'quoting';
  const closeChat = () => {
    if (['submitting', 'unknown'].includes(flow.get().phase) || swapBlocked(swapFlow.get())) return;
    Keyboard.dismiss(); onClose();
  };
  useEffect(() => {
    if (!open) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { closeChat(); return true; });
    return () => subscription.remove();
  }, [open, onClose, flow, swapFlow]);

  useEffect(() => {
    if (!open || chainedTransfer?.phase !== 'swapping' || swapState.phase !== 'success' || !swapState.review || !swapState.receipt) return;
    if (wallet.publicKey !== swapState.review.source) {
      setChainedTransfer(null);
      setMessages(current => [...current, { id: Date.now(), role: 'movya', kind: 'text', text: 'La cuenta activa cambió después del swap. Por seguridad no prepararé el envío.' }]);
      return;
    }
    const receivedAmount = swapState.receipt.receivedAmount;
    if (!receivedAmount) {
      setChainedTransfer(null);
      setMessages(current => [...current, { id: Date.now(), role: 'movya', kind: 'text', text: 'El cambio se confirmó, pero todavía no pude verificar el monto exacto recibido. Por seguridad no prepararé el envío automáticamente. Actualiza Actividad y vuelve a intentarlo.' }]);
      setSuggestionsVisible(true);
      return;
    }
    let active = true;
    const recipient = chainedTransfer.recipient;
    setChainedTransfer({ phase: 'preparing-send', recipient });
    setMessages(current => [...current, { id: Date.now(), role: 'movya', kind: 'text', text: `Cambio realizado. Ahora prepararé el envío de ${formatEnteredAmount(receivedAmount)} ${swapState.review!.to} a ${recipient} para que lo revises y confirmes.` }]);
    void flow.start({ amount: receivedAmount, token: swapState.review.to, recipient }).then(() => {
      if (active) setChainedTransfer({ phase: 'send', recipient });
    });
    return () => { active = false; };
  }, [open, chainedTransfer?.phase, chainedTransfer?.recipient, swapState.phase, swapState.review, swapState.receipt, wallet.publicKey, flow]);

  useEffect(() => {
    if (chainedTransfer?.phase === 'send' && payment.phase === 'success') setChainedTransfer(null);
  }, [chainedTransfer?.phase, payment.phase]);

  const sendDirect = async (message: string) => {
    const clean = message.trim();
    if (!clean) return;
    const id = Date.now();
    const normalized = clean.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const command = normalized.replace(/[.,!?¡¿]/g, ' ').replace(/\s+/g, ' ').trim();
    const confirms = /^(si|confirmar|confirmo|si confirmar|si confirmo|adelante|yes|confirm|go ahead)$/.test(command);
    let pending = flow.get();
    let pendingSwap = swapFlow.get();
    const completedChain = pending.phase === 'success' && pendingSwap.phase === 'success';
    if (pending.phase === 'success' || pending.phase === 'error') { flow.clear(); pending = flow.get(); }
    if (pendingSwap.phase === 'success' && (!chainedTransfer || completedChain)) {
      swapFlow.clear();
      setChainedTransfer(null);
      pendingSwap = swapFlow.get();
    }
    setSuggestionsVisible(false);
    setMessages(current => [...current, { id, role: 'user', kind: 'text', text: clean }]);
    setText('');
    if (pendingSwap.phase === 'error') {
      if (/^(actualiza|actualizar|refresca|refrescar)( la)? cotizacion$/.test(command) && pendingSwap.input) {
        void swapFlow.requote();
      } else if (confirms) {
        setMessages(current => [...current, { id: id + 1, role: 'movya', kind: 'text', text: 'Esa cotización fue invalidada y ya no se puede confirmar. Pulsa “Actualizar cotización” para preparar una nueva.' }]);
      } else {
        swapFlow.clear();
      }
      if (/^(actualiza|actualizar|refresca|refrescar)( la)? cotizacion$/.test(command) || confirms) return;
      pendingSwap = swapFlow.get();
    }
    if (['preparing', 'submitting', 'unknown'].includes(pending.phase) || swapBlocked(pendingSwap) || pendingSwap.phase === 'quoting') return;
    if (pendingSwap.phase === 'review') {
      if (confirms) void swapFlow.confirm();
      else if (/^(no|cancelar|cancela|cancel)$/.test(normalized)) {
        swapFlow.clear();
        setChainedTransfer(null);
        setSuggestionsVisible(true);
        setMessages(current => [...current, { id: id + 1, role: 'movya', kind: 'text', text: 'Cambio cancelado. No se movió ningún fondo.' }]);
      } else setMessages(current => [...current, { id: id + 1, role: 'movya', kind: 'text', text: 'Responde Sí para confirmar el cambio o No para cancelarlo.' }]);
      return;
    }
    if (pending.phase === 'review' || pending.phase === 'choosing') {
      if (confirms && pending.phase === 'review') {
        void flow.confirm();
      } else if (/^(no|cancelar|cancela|cancel)$/.test(normalized)) {
        flow.cancel();
        setChainedTransfer(null);
        setSuggestionsVisible(true);
        setMessages(current => [...current, { id: id + 1, role: 'movya', kind: 'text', text: 'Transacción cancelada. No se movió ningún fondo. ¿Deseas hacer algo más?' }]);
      } else {
        const pendingDescription = pending.phase === 'review'
          ? `Ya tienes una orden pendiente de ${formatEnteredAmount(pending.review?.amount ?? pending.request?.amount ?? '0')} ${pending.request?.token ?? ''} para ${pending.recipient ?? pending.request?.recipient ?? 'el destinatario indicado'}. Confírmala o cancélala antes de preparar otra orden.`
          : 'Elige un contacto de la lista o escribe No para cancelar.';
        setMessages(current => [...current, { id: id + 1, role: 'movya', kind: 'text', text: pendingDescription }]);
      }
      return;
    }

    const chained = parseChainedSwapSendRequest(clean);
    const swap = parseSwapRequest(clean);
    const transaction = parseSendRequest(clean);
    const contactRequest = parseContactChatRequest(clean);
    const localTopic = chatTopic(clean);
    const activityFollowUp = lastLocalContext.current === 'activity' && /ultim(?:a|as|o|os)\s+\d{1,2}/.test(command);
    const contactListFollowUp = lastLocalContext.current === 'contacts' && /^(quienes|cuales|listalos|listalas|muestramelos|muestramelas)$/.test(command);
    const startsNewTask = Boolean(chained || swap || transaction || contactRequest || activityFollowUp || contactListFollowUp || ['balance', 'activity', 'receive'].includes(localTopic));

    if (contactListFollowUp) {
      setContactDraft(null);
      const names = saved.contacts.map(contact => contact.name);
      setMessages(current => [...current, { id: id + 1, role: 'movya', kind: 'text', text: names.length ? `Tus contactos son: ${names.join(', ')}.` : 'Todavía no tienes contactos guardados.' }]);
      setSuggestionsVisible(true);
      return;
    }

    if (contactDraft && startsNewTask) setContactDraft(null);
    else if (contactDraft) {
      if (/^(cancelar|cancela|cancel)$/.test(command)) {
        setContactDraft(null);
        setMessages(current => [...current, { id: id + 1, role: 'movya', kind: 'text', text: 'Registro de contacto cancelado.' }]);
        return;
      }
      if (contactDraft.phase === 'name') {
        if (clean.length > 80 || /@/.test(clean)) {
          setMessages(current => [...current, { id: id + 1, role: 'movya', kind: 'text', text: 'Escribe primero un nombre de hasta 80 caracteres.' }]);
        } else {
          setContactDraft({ phase: 'identifier', name: clean });
          setMessages(current => [...current, { id: id + 1, role: 'movya', kind: 'text', text: `Perfecto. Envíame el correo de Movya o la dirección Stellar pública de ${clean}.` }]);
        }
        return;
      }
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
      let isAddress = false;
      try { validateAddress(clean); isAddress = true; } catch { /* The reply below asks for a valid identifier. */ }
      if (!isEmail && !isAddress) {
        setMessages(current => [...current, { id: id + 1, role: 'movya', kind: 'text', text: `Ese dato no parece un correo ni una dirección Stellar. Envíame uno válido para ${contactDraft.name}.` }]);
        return;
      }
      setInterpreting(true);
      try {
        const added = await saved.add({ name: contactDraft.name, identifier: clean, type: isEmail ? 'email' : 'address' });
        setContactDraft(null);
        setMessages(current => [...current, { id: id + 1, role: 'movya', kind: 'text', text: `Listo, guardé a ${added.name} en tus contactos.` }]);
        setSuggestionsVisible(true);
      } catch (error) {
        setMessages(current => [...current, { id: id + 1, role: 'movya', kind: 'text', text: error instanceof Error ? error.message : 'No pude guardar el contacto.' }]);
      } finally { setInterpreting(false); }
      return;
    }

    if (contactRequest?.kind === 'address') {
      const matches = saved.contacts.filter(contact => normalizeName(contact.name) === normalizeName(contactRequest.name));
      if (!matches.length) {
        setMessages(current => [...current, { id: id + 1, role: 'movya', kind: 'text', text: `No encontré un contacto llamado ${contactRequest.name}.` }]);
      } else if (matches.length > 1) {
        setMessages(current => [...current, { id: id + 1, role: 'movya', kind: 'text', text: `Tienes más de un contacto llamado ${contactRequest.name}. Revísalos en Contactos para elegir el correcto.` }]);
      } else {
        setInterpreting(true);
        try {
          const address = await verifiedContactAddress(matches[0]);
          setMessages(current => [...current, { id: id + 1, role: 'movya', kind: 'text', text: `La dirección Stellar verificada de ${matches[0].name} es:\n${address}` }]);
        } catch (error) {
          setMessages(current => [...current, { id: id + 1, role: 'movya', kind: 'text', text: error instanceof Error ? error.message : 'No pude consultar la dirección verificada.' }]);
        } finally { setInterpreting(false); }
      }
      setSuggestionsVisible(true);
      return;
    }
    if (contactRequest?.kind === 'list') {
      const names = saved.contacts.map(contact => contact.name);
      setMessages(current => [...current, { id: id + 1, role: 'movya', kind: 'text', text: names.length ? `Tus contactos son: ${names.join(', ')}.` : 'Todavía no tienes contactos guardados.' }]);
      lastLocalContext.current = 'contacts';
      setSuggestionsVisible(true);
      return;
    }
    if (contactRequest?.kind === 'add') {
      if (!saved.persistent) {
        setMessages(current => [...current, { id: id + 1, role: 'movya', kind: 'text', text: 'Ingresa con tu correo para guardar contactos.' }]);
      } else if (contactRequest.name) {
        setContactDraft({ phase: 'identifier', name: contactRequest.name });
        setMessages(current => [...current, { id: id + 1, role: 'movya', kind: 'text', text: `Perfecto. Envíame el correo de Movya o la dirección Stellar pública de ${contactRequest.name}.` }]);
      } else {
        setContactDraft({ phase: 'name' });
        setMessages(current => [...current, { id: id + 1, role: 'movya', kind: 'text', text: '¿Cómo se llama el nuevo contacto?' }]);
      }
      return;
    }

    if (chained) {
      setChainedTransfer({ phase: 'swapping', recipient: chained.recipient });
      flow.clear();
      void swapFlow.start({ source: wallet.publicKey ?? '', amount: chained.amount, from: chained.from, to: chained.to });
      void Haptics.selectionAsync();
      return;
    }
    if (isChainedTransactionRequest(clean)) {
      setMessages(current => [...current, { id: id + 1, role: 'movya', kind: 'text', text: 'Entiendo que quieres hacer un cambio y después un envío, pero falta algún dato. Escríbelo así: “Cambia 1 USDC a XLM y después envía ese monto a Aya”.' }]);
      setSuggestionsVisible(true);
      return;
    }
    if (swap) {
      setChainedTransfer(null);
      void swapFlow.start({ source: wallet.publicKey ?? '', amount: swap.amount, from: swap.from as PaymentAsset, to: swap.to as PaymentAsset });
      void Haptics.selectionAsync();
      return;
    }
    if (transaction) {
      setChainedTransfer(null);
      swapFlow.clear();
      void flow.start(transaction);
      void Haptics.selectionAsync();
      return;
    }

    if (localTopic === 'activity' || activityFollowUp) {
      if (!wallet.publicKey) {
        setMessages(current => [...current, { id: id + 1, role: 'movya', kind: 'text', text: 'Abre tu wallet para consultar sus operaciones.' }]);
        return;
      }
      setInterpreting(true);
      try {
        const limit = parseActivityLimit(clean);
        const activities = (await getActivityHistory(wallet.publicKey)).slice(0, limit);
        const reply = activities.length
          ? `Tus últimas ${activities.length} operaciones son:\n${activities.map((activity, index) => `${index + 1}. ${activityLine(activity, wallet.publicKey!, saved.contacts, locale)}`).join('\n')}`
          : 'Todavía no tienes operaciones en esta wallet.';
        setMessages(current => [...current, { id: id + 1, role: 'movya', kind: 'text', text: reply }]);
        lastLocalContext.current = 'activity';
        setSuggestionsVisible(true);
      } catch {
        setMessages(current => [...current, { id: id + 1, role: 'movya', kind: 'text', text: 'No pude consultar tus operaciones ahora. Inténtalo otra vez o abre Actividad.' }]);
      } finally { setInterpreting(false); }
      return;
    }
    if (localTopic === 'balance' || localTopic === 'receive' || localTopic === 'contact') {
      setMessages(current => [...current, createMovyaReply(clean, id + 1)]);
      if (localTopic === 'contact' && contactRequest?.kind === 'count') lastLocalContext.current = 'contacts';
      setSuggestionsVisible(true);
      void Haptics.selectionAsync();
      return;
    }

    const revision = ++interpretationRevision.current;
    const history = messages.slice(-8).map(item => ({ role: item.role === 'user' ? 'user' as const : 'assistant' as const, content: item.kind === 'text' ? item.text : `[Mensaje de voz de ${item.duration} segundos]` }));
    setInterpreting(true);
    try {
      const intent = await interpretChatWithAi(clean, history, locale);
      if (revision !== interpretationRevision.current || !open) return;
      if (intent.kind === 'send') {
        setChainedTransfer(null);
        swapFlow.clear();
        void flow.start({ amount: intent.amount!, token: intent.token!, recipient: intent.recipient! });
      } else if (intent.kind === 'swap') {
        setChainedTransfer(null);
        void swapFlow.start({ source: wallet.publicKey ?? '', amount: intent.amount!, from: intent.from!, to: intent.to! });
      } else {
        setMessages(current => [...current, createAiReply(intent.kind as 'balance' | 'receive' | 'contact' | 'help' | 'unknown', intent.reply, id + 1)]);
        setSuggestionsVisible(true);
      }
    } catch {
      if (revision === interpretationRevision.current && open) {
        setMessages(current => [...current, createMovyaReply(clean, id + 1)]);
        setSuggestionsVisible(true);
      }
    } finally {
      if (revision === interpretationRevision.current) setInterpreting(false);
    }
    void Haptics.selectionAsync();
  };

  useEffect(() => {
    if (!open || !initialPrompt || consumedPrompt.current === initialPrompt) return;
    consumedPrompt.current = initialPrompt;
    const id = Date.now();
    setSuggestionsVisible(false);
    const swap = parseSwapRequest(initialPrompt);
    if (swap) {
      setMessages(current => [...current, { id, role: 'user', kind: 'text', text: t(initialPrompt) }]);
      void swapFlow.start({ source: wallet.publicKey ?? '', amount: swap.amount, from: swap.from as PaymentAsset, to: swap.to as PaymentAsset });
      return;
    }
    const request = parseSendRequest(initialPrompt);
    if (request) {
      setMessages(current => [...current, { id, role: 'user', kind: 'text', text: t(initialPrompt) }]);
      void flow.start(request);
    } else {
      setMessages((current) => [...current, { id, role: 'user', kind: 'text', text: t(initialPrompt) }, createMovyaReply(initialPrompt, id + 1)]);
      setSuggestionsVisible(true);
    }
  }, [initialPrompt, open, t, flow, swapFlow]);

  useEffect(() => {
    if (payment.phase === 'success' || (swapState.phase === 'success' && !chainedTransfer)) setSuggestionsVisible(true);
  }, [payment.phase, swapState.phase, chainedTransfer]);

  const send = () => {
    const clean = text.trim();
    if (!clean) return;
    void sendDirect(clean);
  };

  const startRecording = () => { setRecordingSeconds(0); setRecording(true); void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); };
  const cancelRecording = () => { setRecording(false); setRecordingSeconds(0); };
  const sendVoice = () => {
    const duration = Math.max(recordingSeconds, 1);
    const id = Date.now();
    setMessages((current) => [...current, { id, role: 'user', kind: 'voice', duration }, createMovyaReply('Quiero hacer una operación', id + 1)]);
    setSuggestionsVisible(false);
    setRecording(false); setRecordingSeconds(0);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <>
    {open ? <StatusBar style="dark" /> : null}
    <Animated.View pointerEvents={open ? 'auto' : 'none'} style={[styles.sheet, { transform: [{ translateY }] }]}> 
      <View style={styles.chatBackdrop} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <BlurView intensity={78} tint="light" style={[styles.header, { minHeight: 76 + insets.top, paddingTop: insets.top }]}>
          <Pressable accessibilityLabel="Cerrar chat" accessibilityState={{ disabled: (['submitting', 'unknown'].includes(payment.phase) || swapBlocked(swapState)) }} disabled={(['submitting', 'unknown'].includes(payment.phase) || swapBlocked(swapState))} onPress={closeChat} style={styles.closeButton}><Ionicons name="chevron-down" size={24} color={colors.ink} /></Pressable>
          <View style={styles.identity}>
            <View style={styles.logoWrap}><MovyaLogo size={45} /><View style={styles.statusDot} /></View>
            <View><Text style={styles.title}>Movya</Text><Text style={styles.status}>Asistente financiero · En línea</Text></View>
          </View>
          <View style={{ width: 42, height: 42 }} />
        </BlurView>

        <ScrollView contentContainerStyle={styles.messages} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })} ref={scrollRef} showsVerticalScrollIndicator={false}>
          <Text style={styles.today}>HOY</Text>
          {messages.map((message) => message.role === 'movya' ? (
            <View key={message.id} style={styles.movyaGroup}>
              <View style={styles.senderRow}><MovyaLogo size={28} style={{ marginRight: 6 }} /><Text style={styles.sender}>Movya</Text><View style={styles.aiBadge}><Ionicons name="sparkles" size={10} color={colors.brand} /><Text style={styles.aiText}>IA</Text></View></View>
              <BlurView intensity={72} tint="light" style={[styles.bubble, styles.movyaBubble]}>
                <Text style={styles.messageText}>{message.text}</Text>
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
              <LinearGradient colors={['#176BFF', '#064AAE']} end={{ x: 1, y: 1 }} style={[styles.bubble, styles.userBubble]}><Text translate={false} style={[styles.messageText, styles.userText]}>{message.text}</Text><Text style={styles.userTime}>Ahora</Text></LinearGradient>
            </View>
          ))}
          {interpreting ? <View style={styles.movyaGroup}><View style={styles.senderRow}><MovyaLogo size={28} style={{ marginRight: 6 }} /><Text style={styles.sender}>Movya</Text><View style={styles.aiBadge}><Ionicons name="sparkles" size={10} color={colors.brand} /><Text style={styles.aiText}>IA</Text></View></View><BlurView intensity={72} tint="light" style={[styles.bubble, styles.movyaBubble, styles.thinkingBubble]}><ActivityIndicator color={colors.brand} size="small" /><Text style={styles.thinkingText}>Entendiendo tu mensaje…</Text></BlurView></View> : null}
          <SwapReviewCard state={swapState} flow={swapFlow} onCancel={() => { setChainedTransfer(null); setSuggestionsVisible(true); }} />
          <ChatPaymentCard state={payment} flow={flow} onCancel={() => { setChainedTransfer(null); setSuggestionsVisible(true); }} />
          {suggestionsVisible ? <View style={styles.suggestions}>{suggestions.map((suggestion) => <Pressable key={suggestion} disabled={paymentBusy} accessibilityState={{ disabled: paymentBusy }} onPress={() => void sendDirect(t(suggestion))} style={styles.suggestion}><Ionicons name="sparkles-outline" size={14} color={colors.brand} /><Text style={styles.suggestionText}>{suggestion}</Text><Ionicons name="arrow-up-circle" size={15} color={colors.brand} /></Pressable>)}</View> : null}
        </ScrollView>

        <BlurView intensity={88} tint="light" style={[styles.composerArea, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {recording ? (
            <View style={styles.recordingComposer}>
              <Pressable onPress={cancelRecording} style={styles.cancelRecording}><Ionicons name="trash-outline" size={20} color="#C84B63" /></Pressable>
              <View style={styles.recordingStatus}><View style={styles.recordingDot} /><Text style={styles.recordingTime}>{formatDuration(recordingSeconds)}</Text><View style={styles.liveWave}>{waveBars.slice(0, 8).map((height, index) => <View key={index} style={[styles.liveBar, { height: Math.max(7, height - 5) }]} />)}</View></View>
              <Pressable onPress={sendVoice} style={styles.sendButton}><Ionicons name="arrow-up" size={20} color="#FFFFFF" /></Pressable>
            </View>
          ) : (
            <View style={styles.composer}>
              <Pressable style={styles.attachButton}><Ionicons name="add" size={22} color={colors.brand} /></Pressable>
              <TextInput editable={!paymentBusy} multiline returnKeyType="done" submitBehavior="blurAndSubmit" onChangeText={setText} onSubmitEditing={Keyboard.dismiss} placeholder="Pregúntale algo a Movya…" placeholderTextColor={colors.muted} style={styles.input} value={text} />
              <Pressable disabled={paymentBusy} accessibilityState={{ disabled: paymentBusy }} onPress={text.trim() ? send : startRecording} style={[styles.sendButton, !text.trim() && styles.micButton]}><Ionicons name={text.trim() ? 'arrow-up' : 'mic'} size={20} color={text.trim() ? '#FFFFFF' : colors.brand} /></Pressable>
            </View>
          )}
          <View style={styles.securityRow}><Ionicons name="shield-checkmark-outline" size={12} color={colors.muted} /><Text style={styles.security}>Movya siempre pedirá tu confirmación.</Text></View>
        </BlurView>
      </KeyboardAvoidingView>
    </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, sheet: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 50, elevation: 20, overflow: 'hidden', backgroundColor: '#E5EDF5' }, chatBackdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#E5EDF5' },
  header: { minHeight: 76, width: '100%', borderBottomLeftRadius: 27, borderBottomRightRadius: 27, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden', borderBottomWidth: 1, borderColor: '#C2D2E2', backgroundColor: 'rgba(250,252,255,0.86)', shadowColor: colors.navy, shadowOpacity: 0.13, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 7 }, closeButton: { width: 42, height: 42, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CCD9E6', alignItems: 'center', justifyContent: 'center' }, infoButton: { width: 42, height: 42, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CCD9E6', alignItems: 'center', justifyContent: 'center' },
  identity: { flexDirection: 'row', alignItems: 'center' }, logoWrap: { width: 45, height: 45, marginRight: 9 }, logo: { width: 45, height: 45, resizeMode: 'contain' }, statusDot: { position: 'absolute', right: 0, bottom: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.positive, borderWidth: 2, borderColor: '#FFFFFF' }, title: { color: colors.ink, fontSize: 17, fontWeight: '900' }, status: { color: colors.muted, fontSize: 9, fontWeight: '700', marginTop: 3 },
  messages: { padding: 17, paddingBottom: 28 }, today: { alignSelf: 'center', color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginBottom: 18 }, movyaGroup: { alignItems: 'flex-start', marginBottom: 16 }, senderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, marginLeft: 3 }, messageAvatar: { width: 28, height: 28, resizeMode: 'contain', marginRight: 6 }, sender: { color: colors.ink, fontSize: 11, fontWeight: '800' }, aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.56)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3, marginLeft: 6 }, aiText: { color: colors.brand, fontSize: 8, fontWeight: '900' }, userGroup: { alignItems: 'flex-end', marginBottom: 15 }, userSender: { color: colors.muted, fontSize: 9, fontWeight: '800', marginRight: 4, marginBottom: 5 },
  thinkingBubble: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 13 }, thinkingText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  bubble: { maxWidth: '84%', borderRadius: 22, paddingHorizontal: 15, paddingTop: 11, paddingBottom: 8, overflow: 'hidden' }, movyaBubble: { backgroundColor: 'rgba(248,252,255,0.86)', borderWidth: 1.5, borderColor: '#BBD6FF', borderTopLeftRadius: 7, shadowColor: colors.navy, shadowOpacity: 0.15, shadowRadius: 15, shadowOffset: { width: 0, height: 7 }, elevation: 4 }, userBubble: { borderTopRightRadius: 7, shadowColor: colors.navy, shadowOpacity: 0.2, shadowRadius: 13, shadowOffset: { width: 0, height: 6 }, elevation: 4 }, messageText: { color: colors.text, fontSize: 14, lineHeight: 20 }, userText: { color: '#FFFFFF' }, messageTime: { color: colors.muted, fontSize: 8, alignSelf: 'flex-end', marginTop: 5 }, userTime: { color: 'rgba(255,255,255,0.7)', fontSize: 8, alignSelf: 'flex-end', marginTop: 5 },
  voiceBubble: { minWidth: 235, flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 11 }, playButton: { width: 35, height: 35, borderRadius: 13, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }, voiceWave: { flex: 1, height: 31, flexDirection: 'row', alignItems: 'center', gap: 3, marginHorizontal: 10 }, voiceBar: { width: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.82)' }, voiceDuration: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  suggestions: { gap: 8, marginTop: 6, alignItems: 'flex-start' }, suggestion: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(247,251,255,0.88)', borderWidth: 1.5, borderColor: '#B9D4FF', borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9, shadowColor: colors.navy, shadowOpacity: 0.11, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 }, suggestionText: { color: colors.brandDark, fontSize: 11, fontWeight: '700' },
  composerArea: { paddingHorizontal: 14, paddingTop: 11, paddingBottom: 12, overflow: 'hidden', backgroundColor: 'rgba(248,251,254,0.96)', borderTopWidth: 1, borderTopColor: '#BCCDDD', shadowColor: colors.navy, shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: -5 } }, composer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 25, borderWidth: 1.5, borderColor: '#B6CBE0', padding: 7, minHeight: 57, shadowColor: colors.navy, shadowOpacity: 0.09, shadowRadius: 9, shadowOffset: { width: 0, height: 4 } }, attachButton: { width: 43, height: 43, borderRadius: 15, backgroundColor: '#E7F0FA', alignItems: 'center', justifyContent: 'center' }, input: { flex: 1, color: colors.ink, fontSize: 14, lineHeight: 20, minHeight: 43, maxHeight: 100, textAlignVertical: 'center', includeFontPadding: false, paddingVertical: 10, paddingHorizontal: 9 }, sendButton: { width: 43, height: 43, borderRadius: 16, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', shadowColor: colors.brand, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }, micButton: { backgroundColor: '#E7F0FA' },
  recordingComposer: { height: 57, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: 'rgba(255,255,255,0.66)', borderRadius: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)', padding: 7 }, cancelRecording: { width: 40, height: 40, borderRadius: 15, backgroundColor: '#FCEAF0', alignItems: 'center', justifyContent: 'center' }, recordingStatus: { flex: 1, flexDirection: 'row', alignItems: 'center' }, recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5536C', marginRight: 7 }, recordingTime: { color: colors.ink, fontSize: 12, fontWeight: '800' }, liveWave: { flex: 1, height: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }, liveBar: { width: 3, borderRadius: 2, backgroundColor: colors.brand }, securityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 8 }, security: { color: colors.muted, fontSize: 9 },
});
