import { Keypair, Networks, Transaction } from '@stellar/stellar-sdk/base';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { readWallet, readWalletMeta, updateWalletMeta, writeWallet, type WalletMeta } from '@/services/backend/storage';
import { createRecoveryWallet } from '@/services/stellar/recovery';
import { assertTestnet, readTestnetAccount, USDC_ISSUER, validateAddress, type TestnetAccount } from '@/services/stellar/payments';
import { MOVYA_TREASURY } from '@/services/stellar/swaps';
import { classifyTransaction, type TransactionLike } from '@/services/stellar/signingPolicy';
import { assertDeviceCanSign } from '@/services/stellar/signers';

type WalletContext = {
  // publicKey is the Stellar account (funds). signerPublicKey is this
  // device's key; they differ only after a key rotation.
  publicKey: string | null; signerPublicKey: string | null; biometric: boolean; oualiAddress: string; account: TestnetAccount | null;
  loading: boolean; error: string | null; initialized: boolean;
  create: () => Promise<void>; refresh: () => Promise<void>;
  saveOuali: (address: string) => Promise<void>;
  // Signs only transaction shapes Movya offers (see signingPolicy.ts), only
  // while this device key is active on-chain, and only after biometrics.
  sign: (xdr: string) => Promise<string>;
  signRecoverySetup: (xdr: string, recoveryPublicKey: string) => Promise<string>;
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

  const signWith = async (xdr: string, recoverySigner?: string) => {
    assertTestnet();
    const scope = currentScope.current;
    if (!scope) throw new Error('Ingresa para abrir tu wallet antes de confirmar.');
    const stored = await readMeta();
    if (!stored) throw new Error('Crea una wallet de Testnet antes de confirmar.');
    const transaction = new Transaction(xdr, Networks.TESTNET);
    classifyTransaction(transaction as unknown as TransactionLike, { account: stored.accountId, usdcIssuer: USDC_ISSUER, treasury: MOVYA_TREASURY, recoverySigner });
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
    sign: xdr => signWith(xdr), signRecoverySetup: (xdr, recoveryPublicKey) => signWith(xdr, recoveryPublicKey),
  }}>{children}</Context.Provider>;
}

export function useTestnetWallet() {
  const value = useContext(Context);
  if (!value) throw new Error('TestnetWalletProvider no está disponible.');
  return value;
}
