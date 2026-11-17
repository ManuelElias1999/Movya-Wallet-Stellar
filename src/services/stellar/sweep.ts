import { Account, Asset, Keypair, Networks, Operation, Transaction, TransactionBuilder } from '@stellar/stellar-sdk/base';
import { accountCosts, assertTestnet, assetBalance, availableBalance, broadcastTransaction, formatUnits, readTestnetAccount, transactionHash, units, USDC_ISSUER, validateAddress, type LocalSigner, type TestnetAccount } from './payments';
import { signerWeight, thresholds } from './signers';

// Emergency transfer ("mover todo a una wallet nueva"): when rotation is not
// possible or the account configuration looks damaged, everything moves to a
// brand-new wallet created on this device. The address changes.
export const SWEEP_STARTING_BALANCE = '3'; // base account + USDC trustline + fees

export type PreparedSweep = { xdr: string; hash: string; merge: boolean; movesUsdc: boolean; from: string; to: string };

export function buildSweep(account: TestnetAccount, to: string, costs: { fee: bigint; reserve: bigint; baseReserve: bigint }, deviceSigner: string) {
  const usdc = assetBalance(account, 'USDC');
  const t = thresholds(account);
  // accountMerge needs the high threshold; with a recovery kit the device key
  // cannot reach it, so the old account keeps its minimum reserve instead.
  const merge = signerWeight(account, deviceSigner) >= Math.max(1, t.high);
  const builder = new TransactionBuilder(new Account(account.account_id, account.sequence), { fee: costs.fee.toString(), networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.createAccount({ destination: to, startingBalance: SWEEP_STARTING_BALANCE }));
  let ops = 1;
  if (usdc) {
    builder.addOperation(Operation.changeTrust({ asset: new Asset('USDC', USDC_ISSUER), source: to })); ops++;
    const amount = availableBalance(usdc);
    if (amount > 0n) { builder.addOperation(Operation.payment({ destination: to, asset: new Asset('USDC', USDC_ISSUER), amount: formatUnits(amount) })); ops++; }
    builder.addOperation(Operation.changeTrust({ asset: new Asset('USDC', USDC_ISSUER), limit: '0' })); ops++;
  }
  const totalFee = costs.fee * BigInt(ops + 1); // + the final merge or XLM payment
  const xlm = availableBalance(assetBalance(account, 'XLM'));
  if (merge) builder.addOperation(Operation.accountMerge({ destination: to }));
  else {
    const reserveAfter = costs.reserve - (usdc ? costs.baseReserve : 0n);
    const rest = xlm - units(SWEEP_STARTING_BALANCE) - reserveAfter - totalFee;
    if (rest > 0n) builder.addOperation(Operation.payment({ destination: to, asset: Asset.native(), amount: formatUnits(rest) }));
  }
  if (xlm < units(SWEEP_STARTING_BALANCE) + totalFee + (merge ? 0n : costs.reserve)) throw new Error('No hay suficiente XLM para crear la wallet nueva y pagar las comisiones.');
  return { tx: builder.setTimeout(180).build(), merge, movesUsdc: Boolean(usdc) };
}

export async function prepareSweep(accountId: string, deviceSigner: string, to: string): Promise<PreparedSweep> {
  assertTestnet(); validateAddress(accountId); validateAddress(to);
  if (to === accountId) throw new Error('La wallet nueva debe ser distinta.');
  const account = await readTestnetAccount(accountId);
  const usdc = assetBalance(account, 'USDC');
  if (usdc && units(usdc.balance) > 0n && !usdc.is_authorized) throw new Error('Tu USDC no está autorizado para moverse.');
  const { tx, merge, movesUsdc } = buildSweep(account, to, await accountCosts(account), deviceSigner);
  return { xdr: tx.toXDR(), hash: transactionHash(tx), merge, movesUsdc, from: accountId, to };
}

// The device key signs (biometrics, sweep policy); the new key adds its
// signature only when it opens its own USDC line.
export async function submitSweep(prepared: PreparedSweep, sign: LocalSigner, newWallet: Keypair) {
  if (newWallet.publicKey() !== prepared.to) throw new Error('La wallet nueva no coincide.');
  const signed = new Transaction(await sign(prepared.xdr), Networks.TESTNET);
  if (transactionHash(signed) !== prepared.hash || signed.signatures.length !== 1) throw new Error('La firma no corresponde a la transferencia revisada.');
  if (prepared.movesUsdc) signed.sign(newWallet);
  return broadcastTransaction(signed.toXDR(), prepared.hash);
}
