import { requireBackend } from './client';

export type WelcomeFundingAsset = 'XLM' | 'USDC';
export type WelcomeFundingResult = { status: 'funded' | 'processing' | 'not_eligible'; asset: WelcomeFundingAsset; hash?: string };

async function functionError(error: unknown) {
  const context = (error as { context?: Response } | null)?.context;
  if (!context || typeof context.json !== 'function') return { code: '', message: '' };
  const payload = await context.json().catch(() => null) as { code?: unknown; error?: unknown } | null;
  return {
    code: typeof payload?.code === 'string' ? payload.code : '',
    message: typeof payload?.error === 'string' ? payload.error : '',
  };
}

export async function requestWelcomeFunding(asset: WelcomeFundingAsset, publicKey: string): Promise<WelcomeFundingResult> {
  const result = await requireBackend().functions.invoke('testnet-welcome-funding', {
    body: { action: asset, publicKey },
  });
  if (result.error) {
    const details = await functionError(result.error);
    if (details.code === 'not_eligible') return { status: 'not_eligible', asset };
    if (['submission_unknown', 'sequence_conflict', 'account_not_ready', 'trustline_required'].includes(details.code)) {
      return { status: 'processing', asset };
    }
    throw new Error(details.message || 'No pudimos entregar los fondos de prueba. Vuelve a intentarlo.');
  }
  const data = result.data as { status?: unknown; asset?: unknown; hash?: unknown } | null;
  if ((data?.status !== 'funded' && data?.status !== 'processing') || data.asset !== asset) {
    throw new Error('El backend devolvió un estado de fondos inválido.');
  }
  return {
    status: data.status,
    asset,
    ...(typeof data.hash === 'string' ? { hash: data.hash } : {}),
  };
}
