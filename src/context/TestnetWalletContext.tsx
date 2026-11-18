import { Keypair, Networks, Transaction } from '@stellar/stellar-sdk/base';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { useAuth } from './AuthContext';
import { readPendingSweep, readWallet, readWalletMeta, removeWallet, updateWalletMeta, writeWallet, type WalletMeta } from '@/services/backend/storage';
import { DeviceRevokedError, touchDevice } from '@/services/backend/devices';
import { createRecoveryWallet } from '@/services/stellar/recovery';
import { assertTestnet, readTestnetAccount, transactionHash, USDC_ISSUER, validateAddress, validateReview, type PaymentReview, type TestnetAccount } from '@/services/stellar/payments';
import { MOVYA_TREASURY, validateSwapReview, type SwapReview } from '@/services/stellar/swaps';
import type { PreparedSweep } from '@/services/stellar/sweep';
import type { PreparedRecoverySetup } from '@/services/stellar/signerTransactions';
import { classifyTransaction, type TransactionLike } from '@/services/stellar/signingPolicy';
import { assertDeviceCanSign } from '@/services/stellar/signers';

type WalletContext = {
  // publicKey is the Stellar account (funds). signerPublicKey is this
  // device's key; they differ only after a key rotation.
  publicKey: string | null; signerPublicKey: string | null; biometric: boolean; oualiAddress: string; account: TestnetAccount | null;
  loading: boolean; error: string | null; initialized: boolean;
  create: () => Promise<void>; refresh: () => Promise<void>;
  // Re-reads the local wallet after it changed (restore, rotation, emergency transfer).
  reload: () => Promise<void>;
  saveOuali: (address: string) => Promise<void>;
  // Callers pass the immutable review the person saw, never an arbitrary XDR.
  signPayment: (review: PaymentReview) => Promise<string>;
  signSwap: (review: SwapReview) => Promise<string>;
  signTrustline: (xdr: string) => Promise<string>;
  signRecoverySetup: (prepared: PreparedRecoverySetup, recoveryPublicKey: string) => Promise<string>;
  // The destination must also match the pending wallet stored by this flow.
  signSweep: (prepared: PreparedSweep) => Promise<string>;
};
const Context = createContext<WalletContext | null>(null);

export function TestnetWalletProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const userId = auth.user?.id;
  const signingScope = auth.configured ? auth.ready ? userId : null : 'developer';
  const currentScope = useRef(signingScope);
  currentScope.current = signingScope;
  const [meta, setMeta] = useState<WalletMeta | null>(null);
  const [account, setAccount] = useState<TestnetAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createLock = useRef(false);
  const generation = useRef(0);
  const publicKey = meta?.accountId ?? null;

  const readMeta = useCallback(async (): Promise<WalletMeta | null> => {
    if (auth.configured && (!userId || !auth.ready)) return null;
    return readWalletMeta(userId);
  }, [userId, auth.configured, auth.ready]);

  useEffect(() => {
    let active = true;
    generation.current++;
    setMeta(null); setAccount(null); setError(null); setInitialized(false); setLoading(false);
    void readMeta().then(next => { if (active) setMeta(next); })
      .catch(() => { if (active) setError('No se pudo abrir la wallet guardada. No crearemos otra encima de ella.'); })
      .finally(() => { if (active) setInitialized(true); });
    return () => { active = false; generation.current++; };
  }, [readMeta]);

  const refresh = useCallback(async () => {
    if (!publicKey) return;
    const current = ++generation.current;
    setLoading(true); setError(null);
    try {
      const next = await readTestnetAccount(publicKey);
      if (current === generation.current) setAccount(next);
    } catch (failure) {
      if (current === generation.current) { setAccount(null); setError(failure instanceof Error ? failure.message : 'No se pudo leer el balance.'); }
    } finally { if (current === generation.current) setLoading(false); }
  }, [publicKey]);
  useEffect(() => { void refresh(); }, [refresh]);

  const create = async () => {
    assertTestnet();
    if (auth.configured) throw new Error('Ingresa con tu correo para crear o recuperar tu wallet.');
    if (!initialized || createLock.current) return;
    createLock.current = true;
    try {
      if (await readMeta()) throw new Error('Ya tienes una wallet de pruebas en este dispositivo.');
      const material = createRecoveryWallet();
      setMeta(await writeWallet({ ...material, oualiAddress: '' }, userId));
      setError(null);
    } finally { createLock.current = false; }
  };

  const saveOuali = async (address: string) => {
    const clean = address.trim(); validateAddress(clean);
    if (clean === publicKey) throw new Error('Usa una cuenta diferente a la tuya para Ouali.');
    await readTestnetAccount(clean);
    if (!await readMeta()) throw new Error('Crea tu wallet de pruebas primero.');
    setMeta(await updateWalletMeta({ oualiAddress: clean }, userId));
  };

  const signWith = async (xdr: string, extra: { recoverySigner?: string; sweepTo?: string; expectedHash?: string } = {}) => {
    assertTestnet();
    // The web build has no protected key storage; it can be made view-only.
    if (Platform.OS === 'web' && process.env.EXPO_PUBLIC_WEB_SIGNING !== 'on') throw new Error('En la versión web solo puedes consultar. Usa la app para enviar.');
    const scope = currentScope.current;
    if (!scope) throw new Error('Ingresa para abrir tu wallet antes de confirmar.');
    const stored = await readMeta();
    if (!stored) throw new Error('Crea una wallet de Testnet antes de confirmar.');
    if (auth.configured && stored.protection !== 'biometric') throw new Error('Este dispositivo no puede proteger firmas con Face ID, Touch ID o huella. Por seguridad úsalo solo para consultar y firma desde un dispositivo compatible.');
    const transaction = new Transaction(xdr, Networks.TESTNET);
    if (extra.expectedHash && transactionHash(transaction) !== extra.expectedHash) throw new Error('La operación ya no coincide con la revisión confirmada.');
    classifyTransaction(transaction as unknown as TransactionLike, { account: stored.accountId, usdcIssuer: USDC_ISSUER, treasury: MOVYA_TREASURY, ...extra });
    if (auth.configured) {
      if (!userId) throw new Error('La sesión cambió. Vuelve a ingresar.');
      try { await touchDevice(userId); }
      catch (failure) {
        if (failure instanceof DeviceRevokedError) {
          await removeWallet(userId).catch(() => undefined);
          await auth.logout().catch(() => undefined);
        }
        throw failure;
      }
    }
    // A key rotated out from another device must stop here, before biometrics.
    assertDeviceCanSign(await readTestnetAccount(stored.accountId), stored.signerPublicKey);
    if (scope !== currentScope.current) throw new Error('La sesión cambió. Revisa el envío nuevamente.');
    const wallet = await readWallet(userId).catch(() => null); // biometric prompt
    if (!wallet) throw new Error('No se confirmó tu identidad. La operación no se firmó.');
    if (scope !== currentScope.current) throw new Error('La sesión cambió. Revisa el envío nuevamente.');
    const keypair = Keypair.fromSecret(wallet.secret);
    if (keypair.publicKey() !== stored.signerPublicKey) throw new Error('La operación no corresponde a esta wallet.');
    transaction.sign(keypair);
    return transaction.toXDR();
  };

  return <Context.Provider value={{
    publicKey, signerPublicKey: meta?.signerPublicKey ?? null, biometric: meta?.protection === 'biometric',
    oualiAddress: meta?.oualiAddress ?? '', account, loading, error, initialized, create, refresh, saveOuali,
    reload: async () => { setMeta(await readMeta()); },
    signPayment: review => { validateReview(review); return signWith(review.xdr, { expectedHash: review.hash }); },
    signSwap: review => { validateSwapReview(review); return signWith(review.xdr, { expectedHash: review.hash }); },
    signTrustline: xdr => signWith(xdr),
    signRecoverySetup: (prepared, recoverySigner) => signWith(prepared.xdr, { recoverySigner, expectedHash: prepared.hash }),
    signSweep: async prepared => {
      if (!userId) throw new Error('Ingresa antes de realizar una transferencia de emergencia.');
      const pending = await readPendingSweep(userId);
      if (!pending || pending.from !== prepared.from || Keypair.fromSecret(pending.secret).publicKey() !== prepared.to || pending.hash !== prepared.hash) {
        throw new Error('La wallet nueva no coincide con la transferencia de emergencia guardada.');
      }
      return signWith(prepared.xdr, { sweepTo: prepared.to, expectedHash: prepared.hash });
    },
  }}>{children}</Context.Provider>;
}

export function useTestnetWallet() {
  const value = useContext(Context);
  if (!value) throw new Error('TestnetWalletProvider no está disponible.');
  return value;
}
