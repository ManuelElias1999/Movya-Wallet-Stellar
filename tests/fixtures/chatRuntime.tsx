import { createElement, useImperativeHandle } from 'react';
import type { PaymentReview } from '../../src/services/stellar/payments';
export const calls = { prepare: [] as any[], submit: [] as any[], resolve: [] as string[], close: 0, swaps: [] as any[], swapSubmits: [] as any[], ai: [] as string[] };
export const wallet = { publicKey: 'GSENDER', account: null, oualiAddress: '', refresh: async () => {}, sign: async () => 'signed-xdr' };
export const contacts = [{ id: 'prueba', name: 'Prueba', handle: 'prueba@example.com', email: 'prueba@example.com', address: 'GPRUEBA' }];
export const useTestnetWallet = () => wallet;
export const useContacts = () => ({ contacts, persistent: true, loading: false, error: '' });
export const useAuth = () => ({ user: { user_metadata: { name: 'Manuel' } } });
export const useLanguage = () => ({ t: (value: string) => value, locale: 'es-BO' });
export const interpretChatWithAi = async (message: string) => {
  calls.ai.push(message);
  if (message === 'Mándale cinco USDC a Prueba') return { kind: 'send', amount: '5', token: 'USDC', from: null, to: null, recipient: 'Prueba', reply: null };
  return { kind: 'unknown', amount: null, token: null, from: null, to: null, recipient: null, reply: 'Necesito un poco más de información.' };
};
const host = (name: string) => function Host(props: any) { return createElement(name, props); };
export const Text = host('NativeText');
export const TextInput = host('NativeTextInput');
export const Pressable = host('NativePressable');
export const View = host('NativeView');
export const BlurView = host('BlurView');
export const LinearGradient = host('LinearGradient');
export const MovyaLogo = host('MovyaLogo');
export const Ionicons = host('Icon');
export const StatusBar = host('StatusBar');
export const KeyboardAvoidingView = host('KeyboardAvoidingView');
export const ActivityIndicator = host('ActivityIndicator');
export function ScrollView({ ref, ...props }: any) {
  useImperativeHandle(ref, () => ({ scrollToEnd() {} }), []);
  return createElement('ScrollView', props);
}
export const StyleSheet = { create: (value: any) => value };
export const Platform = { OS: 'ios' };
export const Dimensions = { get: () => ({ height: 800 }) };
export const Easing = { out() {}, inOut() {}, cubic() {} };
export const Animated = { Value: class { constructor(value: number) {} }, View, timing: () => ({ start() {} }) };
export const Keyboard = { dismiss() {} };
export const BackHandler = { addEventListener: () => ({ remove() {} }) };
export const Linking = { openURL: async () => {} };
export const useSafeAreaInsets = () => ({ top: 44, bottom: 34 });
export const selectionAsync = async () => {};
export const notificationAsync = async () => {};
export const impactAsync = async () => {};
export const ImpactFeedbackStyle = { Light: 'light' };
export const NotificationFeedbackType = { Success: 'success' };
export const assetBalance = () => undefined;
export const validateAddress = (value: string) => { if (!value.startsWith('G')) throw new Error('Invalid address'); };
export const contactDestination = async (contact: typeof contacts[number]) => { calls.resolve.push(contact.id); return contact.address; };
export const preparePayment = async (input: any): Promise<PaymentReview> => {
  calls.prepare.push(input);
  return { ...input, amount: `${input.amount}.0000000`, fee: '0.0000100', hash: 'a'.repeat(64), xdr: 'review-xdr', expiresAt: 9999999999 };
};
export const submitPayment = async (review: PaymentReview) => { calls.submit.push(review); return { hash: review.hash, explorerUrl: `https://stellar.expert/explorer/testnet/tx/${review.hash}` }; };
export const checkSubmission = async () => null;
export class SubmissionUnknownError extends Error {}
// This fixture never sends a network transaction; service tests cover Horizon validation.

export const USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
export const prepareSwap = async (input: any) => {
  calls.swaps.push(input);
  return { ...input, amount: input.amount, swapAmount: '49.7500000', appFee: '0.2500000', estimated: '44.0000000', minimum: '43.7800000', fee: '0.0000200', slippageBps: 50, appFeeBps: 50, treasury: 'GB4PASUU4VUFIREIQS2Y4QUJW7NZLYGDCRQQVSCUY4BC5OXNXMVXGTWB', path: [], expiresAt: Math.floor(Date.now() / 1000) + 60, hash: 'b'.repeat(64), xdr: 'swap-xdr' };
};
export const submitSwap = async (review: any) => { calls.swapSubmits.push(review); return { hash: review.hash, explorerUrl: `https://stellar.expert/explorer/testnet/tx/${review.hash}` }; };
export const readSwapSpendable = async () => ({ XLM: '97.4999900', USDC: '10.0000000' });
export const SafeAreaView = host('SafeAreaView');
export const Modal = (props: any) => props.visible ? createElement('Modal', props) : null;
export const PressableScale = Pressable;
export const PageHeader = host('PageHeader');
export const InternalScreenBackground = host('InternalScreenBackground');
export const MovyaContextHelp = host('MovyaContextHelp');
export const TokenIcon = host('TokenIcon');
export const TokenSelector = host('TokenSelector');
