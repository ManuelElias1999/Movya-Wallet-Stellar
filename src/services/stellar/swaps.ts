import { Account, Asset, Keypair, Networks, Operation, Transaction, TransactionBuilder } from '@stellar/stellar-sdk/base';
import { accountCosts, assertTestnet, assetBalance, availableBalance, broadcastTransaction, formatUnits, horizonRequest, normalizeAmount, readTestnetAccount, transactionHash, units, USDC_ISSUER, validateAddress, type LocalSigner, type PaymentAsset, type TestnetAccount } from './payments';

export const SWAP_SLIPPAGE_BPS = 50; // 0.5% maximum price movement.
export const MOVYA_SWAP_FEE_BPS = 50; // 0.5% of the entered source amount.
export const MOVYA_TREASURY = 'GB4PASUU4VUFIREIQS2Y4QUJW7NZLYGDCRQQVSCUY4BC5OXNXMVXGTWB';
export type SwapInput = { source: string; amount: string; from: PaymentAsset; to: PaymentAsset };
export type SwapReview = Readonly<SwapInput & {
  swapAmount: string; appFee: string;
  estimated: string; minimum: string; fee: string; slippageBps: number; appFeeBps: number;
  expiresAt: number; path: readonly string[]; treasury: string; xdr: string; hash: string;
}>;
type HorizonAsset = { asset_type: string; asset_code?: string; asset_issuer?: string };
type PathRecord = { source_asset_type: string; source_asset_code?: string; source_asset_issuer?: string; source_amount: string; destination_asset_type: string; destination_asset_code?: string; destination_asset_issuer?: string; destination_amount: string; path: HorizonAsset[] };
type Quote = { estimated: string; minimum: string; path: Asset[] };
const supported = (code: string): code is PaymentAsset => code === 'XLM' || code === 'USDC';
const asset = (code: PaymentAsset) => code === 'XLM' ? Asset.native() : new Asset('USDC', USDC_ISSUER);
const encodedAsset = (value: Asset) => value.isNative() ? 'native' : `${value.code}:${value.issuer}`;
const parseAsset = (value: HorizonAsset) => {
  if (value.asset_type === 'native') return Asset.native();
  if (!['credit_alphanum4', 'credit_alphanum12'].includes(value.asset_type) || !value.asset_code || !value.asset_issuer) throw new Error('La ruta de cambio recibida no es válida.');
  return new Asset(value.asset_code, value.asset_issuer);
};
const decodeAsset = (value: string) => value === 'native' ? Asset.native() : new Asset(value.split(':')[0], value.split(':')[1]);
const positive = (value: bigint) => value > 0n ? value : 0n;
const samePath = (operation: { path: Asset[] }, values: readonly string[]) => operation.path.length === values.length && operation.path.every((value, index) => value.equals(decodeAsset(values[index])));

export function swapSpendable(account: TestnetAccount, maximumNetworkFee: bigint, reserve: bigint) {
  const xlm = availableBalance(assetBalance(account, 'XLM')) - reserve - maximumNetworkFee;
  const usdc = assetBalance(account, 'USDC');
  return { XLM: formatUnits(positive(xlm)), USDC: formatUnits(xlm < 0n || !usdc?.is_authorized ? 0n : positive(availableBalance(usdc))) };
}
export async function readSwapSpendable(source: string) {
  assertTestnet();
  const account = await readTestnetAccount(source);
  const { fee, reserve } = await accountCosts(account);
  return swapSpendable(account, fee * 2n, reserve);
}
export function swapMinimum(estimated: string) {
  return formatUnits(units(estimated) * BigInt(10_000 - SWAP_SLIPPAGE_BPS) / 10_000n);
}
export function splitSwapAmount(amount: string) {
  const gross = units(normalizeAmount(amount));
  const appFee = gross * BigInt(MOVYA_SWAP_FEE_BPS) / 10_000n;
  const swap = gross - appFee;
  if (appFee <= 0n || swap <= 0n) throw new Error('El monto es demasiado pequeño para aplicar la comisión de Movya.');
  return { appFee: formatUnits(appFee), swapAmount: formatUnits(swap) };
}

async function quoteStrictSend(send: Asset, amount: string, receive: Asset): Promise<Quote> {
  const params = new URLSearchParams({ source_asset_type: send.isNative() ? 'native' : 'credit_alphanum4', source_amount: amount, destination_assets: encodedAsset(receive) });
  if (!send.isNative()) { params.set('source_asset_code', send.code); params.set('source_asset_issuer', send.issuer!); }
  const response = await horizonRequest<{ _embedded: { records: PathRecord[] } }>(`/paths/strict-send?${params}`);
  const records = response._embedded.records.filter(record => {
    try {
      return parseAsset({ asset_type: record.source_asset_type, asset_code: record.source_asset_code, asset_issuer: record.source_asset_issuer }).equals(send)
        && parseAsset({ asset_type: record.destination_asset_type, asset_code: record.destination_asset_code, asset_issuer: record.destination_asset_issuer }).equals(receive)
        && normalizeAmount(record.source_amount) === amount && units(normalizeAmount(record.destination_amount)) > 0n
        && Array.isArray(record.path) && record.path.length <= 5 && record.path.every(value => Boolean(parseAsset(value)));
    } catch { return false; }
  });
  records.sort((a, b) => units(a.destination_amount) > units(b.destination_amount) ? -1 : units(a.destination_amount) < units(b.destination_amount) ? 1 : 0);
  const best = records[0];
  if (!best) throw new Error('No hay liquidez suficiente en Stellar Testnet para este cambio y su comisión. Prueba con un monto menor o más tarde.');
  const estimated = normalizeAmount(best.destination_amount);
  const minimum = swapMinimum(estimated);
  if (units(minimum) <= 0n) throw new Error('El monto recibido es demasiado pequeño. Prueba con un monto mayor.');
  return { estimated, minimum, path: best.path.map(parseAsset) };
}

export async function prepareSwap(input: SwapInput): Promise<SwapReview> {
  assertTestnet(); validateAddress(input.source); validateAddress(MOVYA_TREASURY);
  if (!supported(input.from) || !supported(input.to) || input.from === input.to) throw new Error('Elige XLM y USDC como activos diferentes para el cambio.');
  const amount = normalizeAmount(input.amount);
  const { appFee, swapAmount } = splitSwapAmount(amount);
  const [account, treasury] = await Promise.all([readTestnetAccount(input.source), readTestnetAccount(MOVYA_TREASURY)]);
  if (treasury.account_id !== MOVYA_TREASURY) throw new Error('La wallet de Movya no está disponible en Stellar Testnet.');
  const { fee: baseFee, reserve } = await accountCosts(account);
  const maximumNetworkFee = baseFee * 2n;
  if (availableBalance(assetBalance(account, 'XLM')) < reserve + maximumNetworkFee) throw new Error('Necesitas más XLM para mantener la reserva y pagar la comisión de red.');
  const usdc = assetBalance(account, 'USDC');
  if (!usdc) throw new Error('Habilita USDC desde Inicio antes de cambiar entre XLM y USDC.');
  if (!usdc.is_authorized) throw new Error('La cuenta no está autorizada para usar este USDC.');
  const treasuryUsdc = assetBalance(treasury, 'USDC');
  if (input.from === 'USDC') {
    if (!treasuryUsdc || !treasuryUsdc.is_authorized) throw new Error('La wallet de Movya todavía no tiene habilitado el USDC correcto en Testnet.');
    if (units(treasuryUsdc.limit ?? '0') - units(treasuryUsdc.balance) - units(treasuryUsdc.buying_liabilities ?? '0') < units(appFee)) throw new Error('La wallet de Movya no tiene capacidad para recibir la comisión en USDC.');
  }
  if (units(amount) > units(swapSpendable(account, maximumNetworkFee, reserve)[input.from])) throw new Error('El monto supera tu saldo disponible para cambiar.');
  const send = asset(input.from), receive = asset(input.to);
  const mainQuote = await quoteStrictSend(send, swapAmount, receive);
  if (input.to === 'USDC' && units(usdc.limit ?? '0') - units(usdc.balance) - units(usdc.buying_liabilities ?? '0') < units(mainQuote.estimated)) throw new Error('Tu cuenta no tiene capacidad para recibir ese monto de USDC.');
  const expiresAt = Math.floor(Date.now() / 1000) + 60;
  const transaction = new TransactionBuilder(new Account(account.account_id, account.sequence), { fee: baseFee.toString(), networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.payment({ destination: MOVYA_TREASURY, asset: send, amount: appFee }))
    .addOperation(Operation.pathPaymentStrictSend({ sendAsset: send, sendAmount: swapAmount, destination: input.source, destAsset: receive, destMin: mainQuote.minimum, path: mainQuote.path }))
    .setTimebounds(0, expiresAt).build();
  return Object.freeze({ ...input, amount, swapAmount, appFee,
    estimated: mainQuote.estimated, minimum: mainQuote.minimum, fee: formatUnits(BigInt(transaction.fee)), slippageBps: SWAP_SLIPPAGE_BPS,
    appFeeBps: MOVYA_SWAP_FEE_BPS, expiresAt, path: Object.freeze(mainQuote.path.map(encodedAsset)),
    treasury: MOVYA_TREASURY, xdr: transaction.toXDR(), hash: transactionHash(transaction) });
}

function validFeeOperation(operation: Transaction['operations'][number], review: SwapReview) {
  return operation.type === 'payment' && !operation.source && operation.destination === MOVYA_TREASURY
    && operation.asset.equals(asset(review.from)) && operation.amount === review.appFee;
}

export function validateSwapReview(review: SwapReview) {
  assertTestnet();
  if (!supported(review.from) || !supported(review.to) || review.from === review.to || review.treasury !== MOVYA_TREASURY) throw new Error('Los activos o la wallet de comisión del cambio no son válidos.');
  const split = splitSwapAmount(review.amount);
  const transaction = new Transaction(review.xdr, Networks.TESTNET);
  const feeOperation = transaction.operations[0], swapOperation = transaction.operations[1];
  if (transactionHash(transaction) !== review.hash || transaction.source !== review.source || transaction.signatures.length || transaction.operations.length !== 2
    || transaction.memo.type !== 'none' || split.appFee !== review.appFee || split.swapAmount !== review.swapAmount || review.appFeeBps !== MOVYA_SWAP_FEE_BPS
    || !validFeeOperation(feeOperation, review)
    || swapOperation.type !== 'pathPaymentStrictSend' || swapOperation.source || swapOperation.destination !== review.source
    || !swapOperation.sendAsset.equals(asset(review.from)) || !swapOperation.destAsset.equals(asset(review.to)) || swapOperation.sendAmount !== review.swapAmount || swapOperation.destMin !== review.minimum
    || review.slippageBps !== SWAP_SLIPPAGE_BPS || swapMinimum(normalizeAmount(review.estimated)) !== review.minimum || units(review.minimum) <= 0n
    || !samePath(swapOperation, review.path) || transaction.fee !== units(review.fee).toString()
    || !transaction.timeBounds || transaction.timeBounds.minTime !== '0' || Number(transaction.timeBounds.maxTime) !== review.expiresAt) {
    throw new Error('Los detalles del cambio cambiaron. Solicita otra cotización.');
  }
  if (review.expiresAt <= Math.floor(Date.now() / 1000)) throw new Error('La cotización expiró. Solicita otra antes de confirmar.');
  return transaction;
}

export async function submitSwap(review: SwapReview, sign: LocalSigner) {
  validateSwapReview(review);
  const signed = new Transaction(await sign(review.xdr), Networks.TESTNET);
  if (transactionHash(signed) !== review.hash || signed.signatures.length !== 1 || !Keypair.fromPublicKey(review.source).verify(signed.hash(), signed.signatures[0].signature)) throw new Error('La firma no corresponde al cambio revisado.');
  return broadcastTransaction(signed.toXDR(), review.hash);
}
