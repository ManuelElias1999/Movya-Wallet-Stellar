import assert from 'node:assert/strict';
import { Keypair, Networks, Transaction } from '@stellar/stellar-sdk/base';
import { assetBalance, enableUSDC, formatUnits, fundTestnetAccount, horizonRequest, readTestnetAccount, units } from '../src/services/stellar/payments';
import { prepareSwap, submitSwap } from '../src/services/stellar/swaps';

// Disposable Testnet wallet only. Secrets never leave process memory or appear in logs.
async function main() {
  const key = Keypair.random();
  const source = key.publicKey();
  const sign = async (xdr: string) => { const tx = new Transaction(xdr, Networks.TESTNET); tx.sign(key); return tx.toXDR(); };
  await fundTestnetAccount(source);
  await enableUSDC(source, sign);
  for (const from of ['XLM', 'USDC'] as const) {
    const to = from === 'XLM' ? 'USDC' : 'XLM';
    const before = await readTestnetAccount(source);
    const amount = from === 'XLM' ? '50' : assetBalance(before, 'USDC')!.balance;
    const review = await prepareSwap({ source, amount, from, to });
    const receipt = await submitSwap(review, sign);
    const [after, confirmed] = await Promise.all([readTestnetAccount(source), horizonRequest<{ fee_charged: string }>(`/transactions/${receipt.hash}`)]);
    const chargedFee = BigInt(confirmed.fee_charged);
    assert.ok(chargedFee <= units(review.fee));
    const spent = units(assetBalance(before, from)!.balance) - units(assetBalance(after, from)!.balance);
    const received = units(assetBalance(after, to)!.balance) - units(assetBalance(before, to)!.balance);
    assert.equal(spent, units(review.amount) + (from === 'XLM' ? chargedFee : 0n));
    assert.ok(received >= units(review.minimum) - (to === 'XLM' ? chargedFee : 0n));
    console.log(JSON.stringify({ network: 'testnet', from, to, amount: review.amount, estimated: review.estimated, minimum: review.minimum, maximumFee: review.fee, chargedFee: formatUnits(chargedFee), ...receipt, balancesVerified: true }));
  }
}
void main().catch(error => { console.error(error instanceof Error ? error.message : 'Testnet swap failed'); process.exitCode = 1; });
