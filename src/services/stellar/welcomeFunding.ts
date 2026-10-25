import { assetBalance, enableUSDC, readTestnetAccount, type LocalSigner, type TestnetAccount } from './payments';
import type { WelcomeFundingAsset, WelcomeFundingResult } from '../backend/testnetWelcomeFunding';

type Dependencies = {
  request: (asset: WelcomeFundingAsset, publicKey: string) => Promise<WelcomeFundingResult>;
  readAccount?: (publicKey: string) => Promise<TestnetAccount>;
  enableTrustline?: (publicKey: string, sign: LocalSigner, signerPublicKey: string) => Promise<unknown>;
  wait?: (milliseconds: number) => Promise<void>;
};

const pause = (milliseconds: number) => new Promise<void>(resolve => setTimeout(resolve, milliseconds));

async function waitForStep(asset: WelcomeFundingAsset, publicKey: string, dependencies: Dependencies) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const result = await dependencies.request(asset, publicKey);
    if (result.status !== 'processing') return result;
    await (dependencies.wait ?? pause)(1_200);
  }
  throw new Error('Stellar todavía está procesando tus fondos de bienvenida. Se reintentará cuando vuelvas a abrir Movya.');
}

async function waitForAccount(publicKey: string, dependencies: Dependencies) {
  const read = dependencies.readAccount ?? readTestnetAccount;
  let lastError: unknown;
  for (let attempt = 0; attempt < 8; attempt++) {
    try { return await read(publicKey); }
    catch (error) { lastError = error; await (dependencies.wait ?? pause)(700); }
  }
  throw lastError instanceof Error ? lastError : new Error('Stellar todavía no muestra la cuenta nueva.');
}

export async function runAutomaticWelcomeFunding(input: {
  publicKey: string;
  signerPublicKey: string;
  signTrustline: LocalSigner;
  refresh: () => Promise<void>;
}, dependencies: Dependencies) {
  const xlm = await waitForStep('XLM', input.publicKey, dependencies);
  if (xlm.status === 'not_eligible') return 'not_eligible' as const;

  const account = await waitForAccount(input.publicKey, dependencies);
  if (!assetBalance(account, 'USDC')) {
    await (dependencies.enableTrustline ?? enableUSDC)(input.publicKey, input.signTrustline, input.signerPublicKey);
  }

  const usdc = await waitForStep('USDC', input.publicKey, dependencies);
  if (usdc.status === 'not_eligible') throw new Error('La elegibilidad de los fondos cambió durante la activación.');
  await input.refresh();
  return 'funded' as const;
}
