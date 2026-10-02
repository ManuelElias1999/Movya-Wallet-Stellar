import { Keypair, Networks, Transaction } from '@stellar/stellar-sdk/base';
import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { assertTestnet, readTestnetAccount, validateAddress, type TestnetAccount } from '@/services/stellar/payments';

const STORAGE_KEY = 'movya.testnet.wallet.v1';
type StoredWallet = { secret: string; oualiAddress: string };
type WalletContext = {
  publicKey: string | null; oualiAddress: string; account: TestnetAccount | null;
  loading: boolean; error: string | null; initialized: boolean;
  create: () => Promise<void>; refresh: () => Promise<void>;
  saveOuali: (address: string) => Promise<void>; sign: (xdr: string) => Promise<string>;
};
const Context = createContext<WalletContext | null>(null);

export function TestnetWalletProvider({ children }: { children: ReactNode }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [oualiAddress, setOualiAddress] = useState('');
  const [account, setAccount] = useState<TestnetAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const webWallet = useRef<StoredWallet | null>(null);
  const createLock = useRef(false);
  const generation = useRef(0);

  const readStored = useCallback(async (): Promise<StoredWallet | null> => {
    if (Platform.OS === 'web') return webWallet.current;
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    return raw ? JSON.parse(raw) as StoredWallet : null;
  }, []);
  const writeStored = useCallback(async (wallet: StoredWallet) => {
    if (Platform.OS === 'web') webWallet.current = wallet;
    else await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(wallet), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  }, []);

  useEffect(() => {
    let active = true;
    void readStored().then((wallet) => {
      if (wallet && active) { setPublicKey(Keypair.fromSecret(wallet.secret).publicKey()); setOualiAddress(wallet.oualiAddress ?? ''); }
    }).catch(() => { if (active) setError('No se pudo abrir la wallet guardada. No crearemos otra encima de ella.'); })
      .finally(() => { if (active) setInitialized(true); });
    return () => { active = false; };
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
    if (!initialized || createLock.current) return;
    createLock.current = true;
    try {
      if (await readStored()) throw new Error('Ya tienes una wallet de pruebas en este dispositivo.');
      const keypair = Keypair.random();
      await writeStored({ secret: keypair.secret(), oualiAddress: '' });
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
    const stored = await readStored();
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
