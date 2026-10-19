import { Account, Keypair, Networks, Operation, Transaction, TransactionBuilder } from '@stellar/stellar-sdk/base';
import { accountCosts, assertTestnet, assetBalance, availableBalance, broadcastTransaction, readTestnetAccount, transactionHash, validateAddress, type LocalSigner, type TestnetAccount } from './payments';
import { assertRecoveryCanRotate, recoveryState, signersToRevoke } from './signers';
import { DEVICE_SIGNER_WEIGHT, RECOVERY_SIGNER_WEIGHT, THRESHOLDS } from './signingPolicy';

export type PreparedRecoverySetup = { xdr: string; hash: string };

async function assertCanAffordSigner(account: TestnetAccount) {
  const { fee, reserve, baseReserve } = await accountCosts(account);
  // A new signer adds one base reserve to the account minimum.
  if (availableBalance(assetBalance(account, 'XLM')) < reserve + baseReserve + fee) throw new Error('Necesitas un poco más de XLM para registrar otra clave en tu cuenta.');
  return fee;
}

// Adds the recovery-kit key (weight 2) and sets thresholds 1/1/2. Signed by
// the device key once, while it is still the only signer.
export async function prepareRecoverySetup(accountId: string, devicePublicKey: string, recoveryPublicKey: string): Promise<PreparedRecoverySetup> {
  assertTestnet(); validateAddress(accountId); validateAddress(recoveryPublicKey);
  if (recoveryPublicKey === devicePublicKey) throw new Error('El kit de recuperación debe ser una clave distinta.');
  const account = await readTestnetAccount(accountId);
  if (devicePublicKey !== accountId) throw new Error('Esta cuenta ya usa claves rotadas; su kit de recuperación ya está configurado.');
  const state = recoveryState(account, devicePublicKey);
  if (state.kind === 'protected') throw new Error('Tu cuenta ya tiene un kit de recuperación.');
  if (state.kind === 'unexpected') throw new Error('Tu cuenta tiene claves que Movya no configuró. Revisa la cuenta antes de continuar.');
  const fee = await assertCanAffordSigner(account);
  const tx = new TransactionBuilder(new Account(account.account_id, account.sequence), { fee: fee.toString(), networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.setOptions({
      signer: { ed25519PublicKey: recoveryPublicKey, weight: RECOVERY_SIGNER_WEIGHT },
      masterWeight: DEVICE_SIGNER_WEIGHT, lowThreshold: THRESHOLDS.low, medThreshold: THRESHOLDS.medium, highThreshold: THRESHOLDS.high,
    })).setTimeout(180).build();
  return { xdr: tx.toXDR(), hash: transactionHash(tx) };
}

export async function submitRecoverySetup(prepared: PreparedRecoverySetup, sign: LocalSigner, devicePublicKey: string) {
  const signed = new Transaction(await sign(prepared.xdr), Networks.TESTNET);
  if (transactionHash(signed) !== prepared.hash || signed.signatures.length !== 1 || !Keypair.fromPublicKey(devicePublicKey).verify(signed.hash(), signed.signatures[0].signature)) throw new Error('La firma no corresponde a la operación revisada.');
  return broadcastTransaction(signed.toXDR(), prepared.hash);
}

// Built and signed with the recovery-kit key on a trusted device: authorizes
// the new device key and disables every other device key (including the
// original account key, via master weight 0). Thresholds stay 1/1/2.
export function buildRotation(account: TestnetAccount, recoveryPublicKey: string, newDevicePublicKey: string, fee: bigint) {
  const builder = new TransactionBuilder(new Account(account.account_id, account.sequence), { fee: fee.toString(), networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.setOptions({ signer: { ed25519PublicKey: newDevicePublicKey, weight: DEVICE_SIGNER_WEIGHT } }));
  for (const revoked of signersToRevoke(account, recoveryPublicKey, newDevicePublicKey)) {
    builder.addOperation(revoked.master ? Operation.setOptions({ masterWeight: 0 }) : Operation.setOptions({ signer: { ed25519PublicKey: revoked.key, weight: 0 } }));
  }
  return builder.setTimeout(180).build();
}

export async function rotateDeviceKey(accountId: string, recovery: Keypair, newDevicePublicKey: string) {
  assertTestnet(); validateAddress(accountId); validateAddress(newDevicePublicKey);
  const account = await readTestnetAccount(accountId);
  assertRecoveryCanRotate(account, recovery.publicKey());
  const fee = await assertCanAffordSigner(account);
  const tx = buildRotation(account, recovery.publicKey(), newDevicePublicKey, fee);
  tx.sign(recovery);
  return broadcastTransaction(tx.toXDR(), transactionHash(tx));
}
