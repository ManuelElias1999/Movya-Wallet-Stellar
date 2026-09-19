const DEFAULT_HORIZON_URL = 'https://horizon-testnet.stellar.org';

export const env = {
  network: process.env.EXPO_PUBLIC_STELLAR_NETWORK ?? 'testnet',
  horizonUrl:
    process.env.EXPO_PUBLIC_STELLAR_HORIZON_URL ?? DEFAULT_HORIZON_URL,
  demoAccount: process.env.EXPO_PUBLIC_DEMO_ACCOUNT ?? '',
} as const;

if (env.network !== 'testnet') {
  console.warn('Movya v0.1 is configured and tested for Stellar Testnet only.');
}
