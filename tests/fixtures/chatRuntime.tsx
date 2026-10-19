import { createElement, useImperativeHandle } from 'react';
import type { PaymentReview } from '../../src/services/stellar/payments';
export const calls = { prepare: [] as any[], submit: [] as any[], resolve: [] as string[], close: 0 };
export const wallet = { publicKey: 'GSENDER', account: null, oualiAddress: '', refresh: async () => {}, sign: async () => 'signed-xdr' };
export const contacts = [{ id: 'prueba', name: 'Prueba', handle: 'prueba@example.com', email: 'prueba@example.com', address: 'GPRUEBA' }];
export const useTestnetWallet = () => wallet;
export const useContacts = () => ({ contacts, persistent: true, loading: false, error: '' });
export const useAuth = () => ({ user: { user_metadata: { name: 'Manuel' } } });
export const useLanguage = () => ({ t: (value: string) => value });
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
// This fixture never sends a network transaction; service tests cover Horizon validation.
