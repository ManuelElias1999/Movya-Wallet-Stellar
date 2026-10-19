import assert from 'node:assert/strict';
import { Keypair, Networks, Transaction } from '@stellar/stellar-sdk/base';
import { assetBalance, enableUSDC, formatUnits, fundTestnetAccount, horizonRequest, readTestnetAccount, units } from '../src/services/stellar/payments';
import { MOVYA_TREASURY, prepareSwap, submitSwap } from '../src/services/stellar/swaps';

// Disposable Testnet wallet only. Secrets never leave process memory or appear in logs.
async function main() {
  const key = Keypair.random();
  const source = key.publicKey();
  const sign = async (xdr: string) => { const tx = new Transaction(xdr, Networks.TESTNET); tx.sign(key); return tx.toXDR(); };
  await fundTestnetAccount(source);
  await enableUSDC(source, sign);
  for (const from of ['XLM', 'USDC'] as const) {
    const to = from === 'XLM' ? 'USDC' : 'XLM';
    const [before, treasuryBefore] = await Promise.all([readTestnetAccount(source), readTestnetAccount(MOVYA_TREASURY)]);
    const amount = from === 'XLM' ? '50' : assetBalance(before, 'USDC')!.balance;
    const review = await prepareSwap({ source, amount, from, to });
    const receipt = await submitSwap(review, sign);
    const [after, treasuryAfter, confirmed] = await Promise.all([readTestnetAccount(source), readTestnetAccount(MOVYA_TREASURY), horizonRequest<{ fee_charged: string }>(`/transactions/${receipt.hash}`)]);
    const chargedFee = BigInt(confirmed.fee_charged);
    assert.ok(chargedFee <= units(review.fee));
    const spent = units(assetBalance(before, from)!.balance) - units(assetBalance(after, from)!.balance);
    const received = units(assetBalance(after, to)!.balance) - units(assetBalance(before, to)!.balance);
    const treasuryReceived = units(assetBalance(treasuryAfter, from)!.balance) - units(assetBalance(treasuryBefore, from)!.balance);
    assert.equal(spent, units(review.amount) + (from === 'XLM' ? chargedFee : 0n));
    assert.ok(received >= units(review.minimum) - (to === 'XLM' ? chargedFee : 0n));
    assert.equal(treasuryReceived, units(review.appFee));
    console.log(JSON.stringify({ network: 'testnet', from, to, amount: review.amount, swapAmount: review.swapAmount, movyaFee: review.appFee, estimated: review.estimated, minimum: review.minimum, maximumNetworkFee: review.fee, chargedNetworkFee: formatUnits(chargedFee), treasury: MOVYA_TREASURY, ...receipt, balancesVerified: true }));
  }
}
void main().catch(error => { console.error(error instanceof Error ? error.message : 'Testnet swap failed'); process.exitCode = 1; });
