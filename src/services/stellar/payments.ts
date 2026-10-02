import { Account, Asset, Keypair, Networks, Operation, StrKey, Transaction, TransactionBuilder } from '@stellar/stellar-sdk/base';

export const TESTNET_HORIZON = 'https://horizon-testnet.stellar.org';
export const USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
export type PaymentAsset = 'XLM' | 'USDC';
export type LocalSigner = (xdr: string) => Promise<string>;
export type Balance = { asset_type: string; asset_code?: string; asset_issuer?: string; balance: string; limit?: string; is_authorized?: boolean; selling_liabilities?: string; buying_liabilities?: string };
export type TestnetAccount = { account_id: string; sequence: string; balances: Balance[]; subentry_count: number; num_sponsoring?: number; num_sponsored?: number };
export type PaymentReview = Readonly<{ source: string; destination: string; amount: string; asset: PaymentAsset; issuer?: string; fee: string; xdr: string; hash: string; expiresAt: number }>;
export type PaymentReceipt = { hash: string; explorerUrl: string };

export class SubmissionUnknownError extends Error {
  constructor(public readonly hash: string) { super('La red no confirmó el resultado. Verifica el estado antes de hacer otro envío.'); }
}

export function assertTestnet() {
  if ((process.env.EXPO_PUBLIC_STELLAR_NETWORK ?? 'testnet') !== 'testnet' ||
      (process.env.EXPO_PUBLIC_STELLAR_HORIZON_URL ?? TESTNET_HORIZON).replace(/\/$/, '') !== TESTNET_HORIZON) {
    throw new Error('Las transferencias están habilitadas únicamente en Stellar Testnet.');
  }
}

export function validateAddress(address: string) {
  if (!StrKey.isValidEd25519PublicKey(address)) throw new Error('Pega una dirección pública Stellar válida que empiece con G.');
}

export function units(value: string): bigint {
  if (!/^\d+(\.\d{1,7})?$/.test(value)) throw new Error('Usa un monto válido con hasta 7 decimales.');
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 10_000_000n + BigInt(fraction.padEnd(7, '0'));
}

export function formatUnits(value: bigint): string {
  return `${value / 10_000_000n}.${(value % 10_000_000n).toString().padStart(7, '0')}`;
}

export function normalizeAmount(raw: string): string {
  const value = raw.trim().replace(',', '.');
  const amount = units(value);
  if (amount <= 0n || amount > 9_223_372_036_854_775_807n) throw new Error('El monto debe ser positivo y estar dentro del límite de Stellar.');
  return formatUnits(amount);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  assertTestnet();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(`${TESTNET_HORIZON}${path}`, { ...init, signal: controller.signal });
    if (!response.ok) {
      const error = new Error(response.status === 404 ? 'La cuenta no está activada en Stellar Testnet.' : 'No se pudo completar la operación en Stellar.');
      Object.assign(error, { status: response.status, payload: await response.json().catch(() => null) });
      throw error;
    }
    return await response.json() as T;
  } finally { clearTimeout(timeout); }
}

export async function readTestnetAccount(publicKey: string) {
  validateAddress(publicKey);
  return request<TestnetAccount>(`/accounts/${publicKey}`);
}

export type PaymentRecord = { id: string; transaction_hash: string; from: string; to: string; amount: string; asset_type: string; asset_code?: string; asset_issuer?: string; created_at: string; type: string; transaction_successful: boolean };
export async function getPaymentHistory(publicKey: string) {
  validateAddress(publicKey);
  const result = await request<{ _embedded: { records: PaymentRecord[] } }>(`/accounts/${publicKey}/payments?order=desc&limit=20`);
  return result._embedded.records.filter((record) => record.type === 'payment' && record.transaction_successful);
}

export function assetBalance(account: TestnetAccount, asset: PaymentAsset) {
  return account.balances.find((b) => asset === 'XLM' ? b.asset_type === 'native' : b.asset_code === 'USDC' && b.asset_issuer === USDC_ISSUER);
}

async function costs(account: TestnetAccount) {
  const [stats, ledgers] = await Promise.all([
    request<{ fee_charged: { p95: string }; last_ledger_base_fee: string }>('/fee_stats'),
    request<{ _embedded: { records: { base_reserve_in_stroops: number }[] } }>('/ledgers?order=desc&limit=1'),
  ]);
  const fee = BigInt(stats.fee_charged.p95) > BigInt(stats.last_ledger_base_fee) ? BigInt(stats.fee_charged.p95) : BigInt(stats.last_ledger_base_fee);
  const baseReserve = BigInt(ledgers._embedded.records[0].base_reserve_in_stroops);
  const reserve = BigInt(2 + account.subentry_count + (account.num_sponsoring ?? 0) - (account.num_sponsored ?? 0)) * baseReserve;
  return { fee, reserve, baseReserve };
}

function available(balance?: Balance) {
  return balance ? units(balance.balance) - units(balance.selling_liabilities ?? '0') : 0n;
}

export async function preparePayment(input: { source: string; destination: string; amount: string; asset: PaymentAsset }): Promise<PaymentReview> {
  assertTestnet();
  validateAddress(input.source); validateAddress(input.destination);
  if (!['XLM', 'USDC'].includes(input.asset)) throw new Error('Por ahora puedes enviar XLM o USDC.');
  if (input.source === input.destination) throw new Error('Elige una cuenta diferente a la tuya.');
  const amount = normalizeAmount(input.amount);
  const [sender, receiver] = await Promise.all([readTestnetAccount(input.source), readTestnetAccount(input.destination)]);
  const { fee, reserve } = await costs(sender);
  const nativeAvailable = available(assetBalance(sender, 'XLM')) - reserve - fee;
  if (nativeAvailable < (input.asset === 'XLM' ? units(amount) : 0n)) throw new Error('Necesitas más XLM disponibles para el monto, la reserva y la comisión.');
  if (input.asset === 'USDC') {
    const from = assetBalance(sender, 'USDC'), to = assetBalance(receiver, 'USDC');
    if (!from || !to) throw new Error('Ambas cuentas deben habilitar USDC de Testnet antes del envío.');
    if (!from.is_authorized || !to.is_authorized) throw new Error('La cuenta no está autorizada para usar este USDC.');
    if (available(from) < units(amount)) throw new Error('No tienes suficiente USDC de Testnet disponible.');
    if (units(to.limit ?? '0') - units(to.balance) - units(to.buying_liabilities ?? '0') < units(amount)) throw new Error('La cuenta destinataria no tiene capacidad para recibir ese monto.');
  }
  const expiresAt = Math.floor(Date.now() / 1000) + 180;
  const transaction = new TransactionBuilder(new Account(sender.account_id, sender.sequence), { fee: fee.toString(), networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.payment({ destination: input.destination, amount, asset: input.asset === 'XLM' ? Asset.native() : new Asset('USDC', USDC_ISSUER) }))
    .setTimebounds(0, expiresAt).build();
  return Object.freeze({ source: input.source, destination: input.destination, amount, asset: input.asset, issuer: input.asset === 'USDC' ? USDC_ISSUER : undefined, fee: formatUnits(fee), xdr: transaction.toXDR(), hash: transactionHash(transaction), expiresAt });
}

export function validateReview(review: PaymentReview) {
  const transaction = new Transaction(review.xdr, Networks.TESTNET);
  const operation = transaction.operations[0];
  if (transactionHash(transaction) !== review.hash || transaction.source !== review.source || transaction.signatures.length || transaction.operations.length !== 1 ||
      operation.type !== 'payment' || operation.source || operation.destination !== review.destination || operation.amount !== review.amount ||
      operation.asset.code !== review.asset || operation.asset.issuer !== review.issuer || transaction.fee !== units(review.fee).toString() ||
      Number(transaction.timeBounds?.maxTime) !== review.expiresAt || !transaction.timeBounds || transaction.timeBounds.minTime !== '0') {
    throw new Error('Los detalles del envío cambiaron. Revisa la operación de nuevo.');
  }
  if (review.expiresAt <= Math.floor(Date.now() / 1000)) throw new Error('La confirmación expiró. Revisa el envío de nuevo.');
  return transaction;
}

export function transactionHash(transaction: Transaction) { return Array.from(transaction.hash(), (byte) => byte.toString(16).padStart(2, '0')).join(''); }

function receipt(hash: string): PaymentReceipt { return { hash, explorerUrl: `https://stellar.expert/explorer/testnet/tx/${hash}` }; }

async function broadcast(xdr: string, hash: string): Promise<PaymentReceipt> {
  try {
    const result = await request<{ hash: string; successful: boolean }>('/transactions', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `tx=${encodeURIComponent(xdr)}` });
    if (!result.successful || result.hash !== hash) throw new SubmissionUnknownError(hash);
    return receipt(result.hash);
  } catch (error) {
    const failure = error as { status?: number; payload?: { extras?: { result_codes?: { transaction: string; operations?: string[] } } } };
    if (failure.status === 400 && failure.payload?.extras?.result_codes) {
      const codes = failure.payload.extras.result_codes;
      if (codes.transaction === 'tx_bad_seq') throw new Error('La cuenta cambió. Actualiza y revisa el envío de nuevo.');
      throw new Error(`Stellar rechazó la operación: ${codes.operations?.join(', ') || codes.transaction}.`);
    }
    throw new SubmissionUnknownError(hash);
  }
}

export async function submitPayment(review: PaymentReview, sign: LocalSigner) {
  assertTestnet();
  validateReview(review);
  const signedXdr = await sign(review.xdr);
  const signed = new Transaction(signedXdr, Networks.TESTNET);
  if (transactionHash(signed) !== review.hash || signed.signatures.length !== 1 || !Keypair.fromPublicKey(review.source).verify(signed.hash(), signed.signatures[0].signature)) throw new Error('La firma no corresponde a la operación revisada.');
  return broadcast(signedXdr, review.hash);
}

export async function checkSubmission(hash: string): Promise<PaymentReceipt | null> {
  if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error('Identificador de transacción inválido.');
  try {
    const result = await request<{ successful: boolean; hash: string }>(`/transactions/${hash}`);
    if (!result.successful) throw new Error('La transacción falló en Stellar.');
    if (result.hash !== hash) throw new Error('La respuesta no corresponde a esta transacción.');
    return receipt(result.hash);
  } catch (error) { if ((error as { status?: number }).status === 404) return null; throw error; }
}

export async function fundTestnetAccount(publicKey: string) {
  assertTestnet(); validateAddress(publicKey);
  const response = await fetch(`https://friendbot.stellar.org?addr=${publicKey}`, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error('No se pudo solicitar XLM de prueba. Actualiza el balance y vuelve a intentar si la cuenta sigue sin activar.');
}

export async function enableUSDC(publicKey: string, sign: LocalSigner) {
  const account = await readTestnetAccount(publicKey);
  if (assetBalance(account, 'USDC')) return;
  const { fee, reserve, baseReserve } = await costs(account);
  if (available(assetBalance(account, 'XLM')) < reserve + baseReserve + fee) throw new Error('Solicita XLM de prueba antes de habilitar USDC.');
  const tx = new TransactionBuilder(new Account(account.account_id, account.sequence), { fee: fee.toString(), networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.changeTrust({ asset: new Asset('USDC', USDC_ISSUER) })).setTimeout(180).build();
  const signed = new Transaction(await sign(tx.toXDR()), Networks.TESTNET);
  if (transactionHash(signed) !== transactionHash(tx) || signed.signatures.length !== 1 || !Keypair.fromPublicKey(publicKey).verify(signed.hash(), signed.signatures[0].signature)) throw new Error('La firma no corresponde a la operación.');
  return broadcast(signed.toXDR(), transactionHash(tx));
}
