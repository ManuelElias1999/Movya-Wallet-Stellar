import { Keypair, Networks, Transaction } from '@stellar/stellar-sdk/base';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { readWallet, writeWallet, type StoredWallet } from '@/services/backend/storage';
import { createRecoveryWallet } from '@/services/stellar/recovery';

import { assertTestnet, readTestnetAccount, validateAddress, type TestnetAccount } from '@/services/stellar/payments';

type WalletContext = {
  publicKey: string | null; oualiAddress: string; account: TestnetAccount | null;
  loading: boolean; error: string | null; initialized: boolean;
  create: () => Promise<void>; refresh: () => Promise<void>;
  saveOuali: (address: string) => Promise<void>; sign: (xdr: string) => Promise<string>;
};
const Context = createContext<WalletContext | null>(null);

export function TestnetWalletProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const userId = auth.user?.id;
  const signingScope = auth.configured ? auth.ready ? userId : null : 'developer';
  const currentScope = useRef(signingScope);
  currentScope.current = signingScope;
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [oualiAddress, setOualiAddress] = useState('');
  const [account, setAccount] = useState<TestnetAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createLock = useRef(false);
  const generation = useRef(0);

  const readStored = useCallback(async (): Promise<StoredWallet | null> => {
    if (auth.configured && (!userId || !auth.ready)) return null;
    return readWallet(userId);
  }, [userId, auth.configured, auth.ready]);
  const writeStored = useCallback(async (wallet: StoredWallet) => {
    await writeWallet(wallet, userId);
  }, [userId]);

  useEffect(() => {
    let active = true;
    generation.current++;
    setPublicKey(null); setAccount(null); setOualiAddress(''); setError(null); setInitialized(false); setLoading(false);
    void readStored().then((wallet) => {
      if (wallet && active) { setPublicKey(Keypair.fromSecret(wallet.secret).publicKey()); setOualiAddress(wallet.oualiAddress ?? ''); }
    }).catch(() => { if (active) setError('No se pudo abrir la wallet guardada. No crearemos otra encima de ella.'); })
      .finally(() => { if (active) setInitialized(true); });
    return () => { active = false; generation.current++; };
  }, [readStored]);

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
      if (await readStored()) throw new Error('Ya tienes una wallet de pruebas en este dispositivo.');
      const material = createRecoveryWallet();
      const keypair = Keypair.fromSecret(material.secret);
      await writeStored({ ...material, oualiAddress: '' });
      setPublicKey(keypair.publicKey()); setError(null);
    } finally { createLock.current = false; }
  };

  const saveOuali = async (address: string) => {
    const clean = address.trim(); validateAddress(clean);
    if (clean === publicKey) throw new Error('Usa una cuenta diferente a la tuya para Ouali.');
    await readTestnetAccount(clean);
    const stored = await readStored();
    if (!stored) throw new Error('Crea tu wallet de pruebas primero.');
    await writeStored({ ...stored, oualiAddress: clean }); setOualiAddress(clean);
  };

  const sign = async (xdr: string) => {
    assertTestnet();
    const scope = currentScope.current;
    if (!scope) throw new Error('Ingresa para abrir tu wallet antes de confirmar.');
    const stored = await readStored();
    if (scope !== currentScope.current) throw new Error('La sesión cambió. Revisa el envío nuevamente.');
    if (!stored) throw new Error('Crea una wallet de Testnet antes de confirmar.');
    const keypair = Keypair.fromSecret(stored.secret);
    const transaction = new Transaction(xdr, Networks.TESTNET);
    if (transaction.source !== keypair.publicKey() || transaction.signatures.length) throw new Error('La operación no corresponde a esta wallet.');
    transaction.sign(keypair);
    return transaction.toXDR();
  };

  return <Context.Provider value={{ publicKey, oualiAddress, account, loading, error, initialized, create, refresh, saveOuali, sign }}>{children}</Context.Provider>;
}

export function useTestnetWallet() {
  const value = useContext(Context);
  if (!value) throw new Error('TestnetWalletProvider no está disponible.');
  return value;
}
