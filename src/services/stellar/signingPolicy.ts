// Last line of defense before a device key signs anything. Payments, swaps and
// trustlines are validated against the reviewed details upstream; this policy
// independently refuses every transaction shape Movya does not offer, so a
// future feature, a chat assistant or a deep link that reaches the signer with
// an arbitrary XDR cannot authorize, for example, a new signer, an account
// merge or a long-lived transaction. No SDK imports: the checks work on the
// fields of a decoded @stellar/stellar-sdk Transaction and are tested directly.

export type AssetLike = { code: string; issuer?: string; isNative?: () => boolean };
export type OperationLike = { type: string; source?: string } & Record<string, unknown>;
export type TransactionLike = {
  source: string; fee: string; operations: OperationLike[]; signatures: unknown[];
  timeBounds?: { minTime: string; maxTime: string }; memo?: { type: string };
};
export type SigningKind = 'payment' | 'swap' | 'trustline' | 'recovery-setup';
export type SigningPolicy = {
  account: string; usdcIssuer: string; treasury: string;
  now?: number; recoverySigner?: string;
};

export const MAX_SIGNED_FEE_STROOPS = 1_000_000n; // 0.1 XLM: far above Testnet fees, far below a drain.
export const MAX_SIGNED_LIFETIME_SECONDS = 600;
export const RECOVERY_SIGNER_WEIGHT = 2;
export const DEVICE_SIGNER_WEIGHT = 1;
export const THRESHOLDS = { low: 1, medium: 1, high: 2 } as const;

const refuse = (detail: string): never => { throw new Error(`Movya no firmará esta operación: ${detail}.`); };
const native = (asset: AssetLike) => asset.isNative ? asset.isNative() : asset.code === 'XLM' && !asset.issuer;
const supported = (asset: unknown, issuer: string): asset is AssetLike => {
  const value = asset as AssetLike | undefined;
  return Boolean(value && (native(value) || (value.code === 'USDC' && value.issuer === issuer)));
};
const same = (a: AssetLike, b: AssetLike) => native(a) ? native(b) : !native(b) && a.code === b.code && a.issuer === b.issuer;
const allowedKeys = (operation: OperationLike, keys: string[]) =>
  Object.entries(operation).every(([key, value]) => keys.includes(key) || value === undefined);

export function classifyTransaction(tx: TransactionLike, policy: SigningPolicy): SigningKind {
  const now = policy.now ?? Math.floor(Date.now() / 1000);
  if (tx.source !== policy.account) refuse('la cuenta de origen no es tu wallet');
  if (tx.signatures.length) refuse('la transacción ya trae firmas');
  if (tx.memo && tx.memo.type !== 'none') refuse('contiene un memo no revisado');
  if (!/^\d+$/.test(tx.fee) || BigInt(tx.fee) > MAX_SIGNED_FEE_STROOPS) refuse('la comisión de red es demasiado alta');
  const maxTime = Number(tx.timeBounds?.maxTime ?? 0);
  if (!tx.timeBounds || !maxTime || maxTime > now + MAX_SIGNED_LIFETIME_SECONDS) refuse('no tiene una expiración corta');
  if (tx.operations.some(operation => operation.source !== undefined && operation.source !== policy.account)) refuse('una operación usa otra cuenta');
  const ops = tx.operations;

  if (ops.length === 1 && ops[0].type === 'payment') {
    const op = ops[0];
    if (!supported(op.asset, policy.usdcIssuer)) refuse('el activo no está habilitado');
    if (typeof op.destination !== 'string' || op.destination === policy.account) refuse('el destino no es válido');
    return 'payment';
  }
  if (ops.length === 2 && ops[0].type === 'payment' && ops[1].type === 'pathPaymentStrictSend') {
    const [fee, swap] = ops;
    if (fee.destination !== policy.treasury) refuse('la comisión no va a la wallet de Movya');
    if (swap.destination !== policy.account) refuse('el cambio no regresa a tu wallet');
    if (!supported(fee.asset, policy.usdcIssuer) || !supported(swap.sendAsset, policy.usdcIssuer) || !supported(swap.destAsset, policy.usdcIssuer)) refuse('el activo no está habilitado');
    if (!same(fee.asset as AssetLike, swap.sendAsset as AssetLike) || same(swap.sendAsset as AssetLike, swap.destAsset as AssetLike)) refuse('los activos del cambio no coinciden');
    return 'swap';
  }
  if (ops.length === 1 && ops[0].type === 'changeTrust') {
    const line = ops[0].line as AssetLike | undefined;
    if (!line || native(line) || line.code !== 'USDC' || line.issuer !== policy.usdcIssuer) refuse('la línea de confianza no es USDC verificado');
    if (ops[0].limit === '0' || ops[0].limit === '0.0000000') refuse('eliminaría tu línea de USDC');
    return 'trustline';
  }
  if (ops.length === 1 && ops[0].type === 'setOptions') {
    const op = ops[0];
    const signer = op.signer as { ed25519PublicKey?: string; weight?: number } | undefined;
    if (!policy.recoverySigner) refuse('cambia los firmantes de la cuenta');
    if (!allowedKeys(op, ['type', 'source', 'signer', 'masterWeight', 'lowThreshold', 'medThreshold', 'highThreshold'])) refuse('cambia opciones no permitidas de la cuenta');
    if (!signer || signer.ed25519PublicKey !== policy.recoverySigner || signer.weight !== RECOVERY_SIGNER_WEIGHT) refuse('el firmante de recuperación no coincide');
    if (op.masterWeight !== DEVICE_SIGNER_WEIGHT || op.lowThreshold !== THRESHOLDS.low || op.medThreshold !== THRESHOLDS.medium || op.highThreshold !== THRESHOLDS.high) refuse('los umbrales no son los esperados');
    return 'recovery-setup';
  }
  return refuse('Movya no ofrece este tipo de transacción');
}
