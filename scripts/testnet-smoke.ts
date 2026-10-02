import assert from 'node:assert/strict';
import { Account, Asset, Keypair, Networks, Operation, Transaction, TransactionBuilder } from '@stellar/stellar-sdk/base';
import { assetBalance, enableUSDC, fundTestnetAccount, preparePayment, readTestnetAccount, submitPayment, TESTNET_HORIZON, units, USDC_ISSUER } from '../src/services/stellar/payments';

async function main() {
// Disposable Testnet accounts. Secrets stay in process memory and are never logged.
const sender = Keypair.random();
const recipient = Keypair.random();
const signer = (keypair: Keypair) => async (xdr: string) => { const tx = new Transaction(xdr, Networks.TESTNET); tx.sign(keypair); return tx.toXDR(); };
console.log('Activating two disposable Stellar Testnet accounts…');
await fundTestnetAccount(sender.publicKey());
await fundTestnetAccount(recipient.publicKey());
const before = await readTestnetAccount(recipient.publicKey());
const review = await preparePayment({ source: sender.publicKey(), destination: recipient.publicKey(), amount: '1', asset: 'XLM' });
const receipt = await submitPayment(review, async (xdr) => {
  const transaction = new Transaction(xdr, Networks.TESTNET);
  transaction.sign(sender);
  return transaction.toXDR();
});
const after = await readTestnetAccount(recipient.publicKey());
assert.equal(units(assetBalance(after, 'XLM')!.balance) - units(assetBalance(before, 'XLM')!.balance), 10_000_000n);
console.log(JSON.stringify({ network: 'testnet', asset: 'XLM', amount: '1', hash: receipt.hash, explorerUrl: receipt.explorerUrl, balanceVerified: true }, null, 2));

if (process.argv.includes('--usdc')) {
  console.log('Enabling verified-issuer USDC on both disposable accounts…');
  await enableUSDC(sender.publicKey(), signer(sender));
  await enableUSDC(recipient.publicKey(), signer(recipient));
  // Acquire a small fixture balance through existing Testnet DEX liquidity.
  // This is test setup only; it does not enable swaps in the application.
  const source = await readTestnetAccount(sender.publicKey());
  const acquire = new TransactionBuilder(new Account(source.account_id, source.sequence), { fee: '10000', networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.pathPaymentStrictReceive({ sendAsset: Asset.native(), sendMax: '10', destination: sender.publicKey(), destAsset: new Asset('USDC', USDC_ISSUER), destAmount: '2', path: [] })).setTimeout(180).build();
  acquire.sign(sender);
  const funding = await fetch(`${TESTNET_HORIZON}/transactions`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `tx=${encodeURIComponent(acquire.toXDR())}`, signal: AbortSignal.timeout(30_000) });
  if (!funding.ok) throw new Error('Testnet USDC fixture acquisition failed. DEX liquidity is required for --usdc; use Circle for manual app testing.');
  const beforeUSDC = await readTestnetAccount(recipient.publicKey());
  const usdcReview = await preparePayment({ source: sender.publicKey(), destination: recipient.publicKey(), amount: '1', asset: 'USDC' });
  const usdcReceipt = await submitPayment(usdcReview, signer(sender));
  const afterUSDC = await readTestnetAccount(recipient.publicKey());
  assert.equal(units(assetBalance(afterUSDC, 'USDC')!.balance) - units(assetBalance(beforeUSDC, 'USDC')!.balance), 10_000_000n);
  console.log(JSON.stringify({ network: 'testnet', asset: 'USDC', issuer: USDC_ISSUER, amount: '1', hash: usdcReceipt.hash, explorerUrl: usdcReceipt.explorerUrl, balanceVerified: true }, null, 2));
}

}
void main().catch((error) => { console.error(error instanceof Error ? error.message : "Testnet smoke test failed"); process.exitCode = 1; });
