import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import { Account, Asset, Keypair, Networks, Operation, StrKey, Transaction, TransactionBuilder } from 'npm:@stellar/stellar-sdk@17.1.0/base';

type FundingAsset = 'XLM' | 'USDC';
type RequestBody = { action?: unknown; publicKey?: unknown };
type Claim = {
  claimed: boolean;
  status: 'pending' | 'processing' | 'complete';
  claim: string | null;
  signed_xdr: string | null;
  tx_hash: string | null;
  expires_at: string | null;
};
type HorizonAccount = {
  account_id: string;
  sequence: string;
  balances: Array<{
    asset_type: string;
    asset_code?: string;
    asset_issuer?: string;
    balance: string;
    limit?: string;
    buying_liabilities?: string;
    is_authorized?: boolean;
  }>;
};

const HORIZON = 'https://horizon-testnet.stellar.org';
const USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const XLM_AMOUNT = '5.0000000';
const USDC_AMOUNT = '10.0000000';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

class HttpError extends Error {
  constructor(public status: number, public code: string, message: string, public payload?: unknown) { super(message); }
}

function response(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

async function horizon<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const result = await fetch(`${HORIZON}${path}`, { cache: 'no-store', ...init, signal: controller.signal });
    const payload = await result.json().catch(() => null);
    if (!result.ok) throw new HttpError(result.status, 'stellar_error', 'Stellar rechazó la operación.', payload);
    return payload as T;
  } finally { clearTimeout(timeout); }
}

async function readAccount(publicKey: string) {
  try { return await horizon<HorizonAccount>(`/accounts/${publicKey}`); }
  catch (error) { if (error instanceof HttpError && error.status === 404) return null; throw error; }
}

async function readTransaction(hash: string) {
  try { return await horizon<{ hash: string; successful: boolean }>(`/transactions/${hash}`); }
  catch (error) { if (error instanceof HttpError && error.status === 404) return null; throw error; }
}

async function networkFee() {
  const stats = await horizon<{ fee_charged: { p95: string }; last_ledger_base_fee: string }>('/fee_stats');
  const reported = BigInt(stats.fee_charged.p95) > BigInt(stats.last_ledger_base_fee) ? BigInt(stats.fee_charged.p95) : BigInt(stats.last_ledger_base_fee);
  return (reported > 100_000n ? 100_000n : reported).toString();
}

function hashOf(transaction: Transaction) {
  return Array.from(transaction.hash(), byte => byte.toString(16).padStart(2, '0')).join('');
}

function units(value: string) {
  if (!/^\d+(\.\d{1,7})?$/.test(value)) throw new Error('Invalid Stellar amount');
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 10_000_000n + BigInt(fraction.padEnd(7, '0'));
}

function usdcBalance(account: HorizonAccount) {
  return account.balances.find(balance => balance.asset_code === 'USDC' && balance.asset_issuer === USDC_ISSUER);
}

function resultCode(error: unknown) {
  if (!(error instanceof HttpError) || error.status !== 400) return null;
  return (error.payload as { extras?: { result_codes?: { transaction?: string; operations?: string[] } } } | null)?.extras?.result_codes ?? null;
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return response(405, { code: 'method_not_allowed', error: 'Método no permitido.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const distributorSecret = Deno.env.get('STELLAR_TESTNET_DISTRIBUTOR_SECRET');
  if (!supabaseUrl || !publishableKey || !serviceRoleKey) return response(500, { code: 'backend_unavailable', error: 'El backend no está configurado.' });

  const authorization = request.headers.get('Authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) return response(401, { code: 'authentication_required', error: 'Debes iniciar sesión.' });
  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const userResult = await userClient.auth.getUser();
  if (userResult.error || !userResult.data.user) return response(401, { code: 'authentication_required', error: 'Debes iniciar sesión.' });
  if (!distributorSecret) return response(503, { code: 'distributor_unavailable', error: 'Los fondos de bienvenida todavía no están configurados.' });

  let asset: FundingAsset;
  let publicKey: string;
  try {
    const body = await request.json() as RequestBody;
    if (body.action !== 'XLM' && body.action !== 'USDC') throw new Error('Invalid asset');
    if (typeof body.publicKey !== 'string' || !StrKey.isValidEd25519PublicKey(body.publicKey)) throw new Error('Invalid public key');
    asset = body.action;
    publicKey = body.publicKey;
  } catch {
    return response(400, { code: 'invalid_request', error: 'Solicitud inválida.' });
  }

  let distributor: Keypair;
  try { distributor = Keypair.fromSecret(distributorSecret); }
  catch { return response(503, { code: 'distributor_unavailable', error: 'La cuenta de bienvenida no está configurada correctamente.' }); }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const owner = userResult.data.user.id;

  const release = async (claimToken: string, keepPrepared: boolean) => {
    await admin.rpc('release_testnet_welcome_funding', {
      funding_owner: owner, funding_public_key: publicKey, funding_asset: asset,
      claim_token: claimToken, keep_prepared: keepPrepared,
    });
  };

  for (let sequenceAttempt = 0; sequenceAttempt < 3; sequenceAttempt++) {
    const claimToken = crypto.randomUUID();
    const claimed = await admin.rpc('claim_testnet_welcome_funding', {
      funding_owner: owner, funding_public_key: publicKey, funding_asset: asset, claim_token: claimToken,
    });
    if (claimed.error) {
      console.error('Welcome funding claim failed', claimed.error.code);
      return response(503, { code: 'funding_unavailable', error: 'No pudimos preparar tus fondos de prueba.' });
    }
    const claim = claimed.data as Claim | null;
    if (!claim) return response(404, { code: 'not_eligible', error: 'Esta wallet no corresponde a una cuenta nueva.' });
    if (claim.status === 'complete') return response(200, { status: 'funded', asset, hash: claim.tx_hash });
    if (!claim.claimed || claim.claim !== claimToken) return response(202, { status: 'processing', asset });

    let preservePrepared = false;
    try {
      let signedXdr = claim.signed_xdr;
      let txHash = claim.tx_hash;
      const expiresAt = claim.expires_at ? Math.floor(new Date(claim.expires_at).getTime() / 1000) : 0;

      if (signedXdr && txHash) {
        preservePrepared = true;
        const existing = await readTransaction(txHash);
        if (existing?.successful && existing.hash === txHash) {
          const completed = await admin.rpc('complete_testnet_welcome_funding', {
            funding_owner: owner, funding_public_key: publicKey, funding_asset: asset,
            claim_token: claimToken, tx_hash: txHash,
          });
          if (completed.error || completed.data !== true) throw new Error('Could not complete funding record');
          return response(200, { status: 'funded', asset, hash: txHash });
        }
        if (expiresAt <= Math.floor(Date.now() / 1000)) {
          await release(claimToken, false);
          continue;
        }
      } else {
        const [source, destination, fee] = await Promise.all([
          readAccount(distributor.publicKey()), readAccount(publicKey), networkFee(),
        ]);
        if (!source) throw new HttpError(503, 'distributor_unfunded', 'La cuenta de bienvenida no tiene XLM de prueba.');
        const builder = new TransactionBuilder(new Account(source.account_id, source.sequence), { fee, networkPassphrase: Networks.TESTNET });

        if (asset === 'XLM') {
          if (destination) builder.addOperation(Operation.payment({ destination: publicKey, asset: Asset.native(), amount: XLM_AMOUNT }));
          else builder.addOperation(Operation.createAccount({ destination: publicKey, startingBalance: XLM_AMOUNT }));
        } else {
          if (!destination) throw new HttpError(409, 'account_not_ready', 'La cuenta todavía no está activa en Stellar.');
          const destinationTrustline = usdcBalance(destination);
          if (!destinationTrustline) throw new HttpError(409, 'trustline_required', 'La wallet todavía debe habilitar USDC.');
          if (destinationTrustline.is_authorized === false) throw new HttpError(409, 'trustline_unauthorized', 'La cuenta no está autorizada para recibir este USDC.');
          const sourceTrustline = usdcBalance(source);
          if (!sourceTrustline || sourceTrustline.is_authorized === false || units(sourceTrustline.balance) < units(USDC_AMOUNT)) {
            throw new HttpError(503, 'distributor_insufficient_usdc', 'La cuenta de bienvenida no tiene suficiente USDC de prueba.');
          }
          const remaining = units(destinationTrustline.limit ?? '0') - units(destinationTrustline.balance) - units(destinationTrustline.buying_liabilities ?? '0');
          if (remaining < units(USDC_AMOUNT)) throw new HttpError(409, 'trustline_limit', 'La trustline no tiene capacidad para recibir 10 USDC.');
          builder.addOperation(Operation.payment({ destination: publicKey, asset: new Asset('USDC', USDC_ISSUER), amount: USDC_AMOUNT }));
        }

        const transaction = builder.setTimeout(180).build();
        transaction.sign(distributor);
        signedXdr = transaction.toXDR();
        txHash = hashOf(transaction);
        const transactionExpiresAt = new Date(Number(transaction.timeBounds?.maxTime) * 1000).toISOString();
        const prepared = await admin.rpc('prepare_testnet_welcome_funding', {
          funding_owner: owner, funding_public_key: publicKey, funding_asset: asset,
          claim_token: claimToken, signed_xdr: signedXdr, tx_hash: txHash, expires_at: transactionExpiresAt,
        });
        if (prepared.error || prepared.data !== true) throw new Error('Could not persist prepared transaction');
        preservePrepared = true;
      }

      try {
        const submitted = await horizon<{ hash: string; successful: boolean }>('/transactions', {
          method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `tx=${encodeURIComponent(signedXdr)}`,
        });
        if (!submitted.successful || submitted.hash !== txHash) throw new Error('Unexpected Stellar response');
      } catch (error) {
        const confirmed = txHash ? await readTransaction(txHash).catch(() => null) : null;
        if (!confirmed?.successful || confirmed.hash !== txHash) {
          const codes = resultCode(error);
          if (codes?.transaction === 'tx_bad_seq' || codes?.operations?.includes('op_already_exists')) {
            await release(claimToken, false);
            continue;
          }
          const uncertain = !(error instanceof HttpError) || error.status >= 500;
          await release(claimToken, uncertain);
          if (uncertain) return response(503, { code: 'submission_unknown', error: 'Stellar todavía no confirmó los fondos. Movya volverá a comprobarlos.' });
          console.error('Welcome funding rejected', codes?.transaction ?? error.status);
          return response(503, { code: 'funding_rejected', error: 'Stellar rechazó los fondos de bienvenida.' });
        }
      }

      const completed = await admin.rpc('complete_testnet_welcome_funding', {
        funding_owner: owner, funding_public_key: publicKey, funding_asset: asset,
        claim_token: claimToken, tx_hash: txHash,
      });
      if (completed.error || completed.data !== true) throw new Error('Could not complete funding record');
      return response(200, { status: 'funded', asset, hash: txHash });
    } catch (error) {
      // Once an XDR has been persisted it may already have reached Stellar.
      // Preserve it even if recording completion fails, so the next request
      // checks the same hash instead of constructing a duplicate payment.
      await release(claimToken, preservePrepared);
      if (error instanceof HttpError) return response(error.status, { code: error.code, error: error.message });
      console.error('Welcome funding failed', error instanceof Error ? error.name : 'unknown');
      return response(503, { code: 'funding_unavailable', error: 'No pudimos completar tus fondos de prueba.' });
    }
  }

  return response(503, { code: 'sequence_conflict', error: 'La cuenta de bienvenida está ocupada. Movya volverá a intentarlo.' });
});
