export type StellarAssetBalance = {
  assetCode: string;
  assetIssuer?: string;
  balance: string;
};

export type StellarAccountSnapshot = {
  publicKey: string;
  balances: StellarAssetBalance[];
  sequence: string;
};

export type StellarPayment = {
  id: string;
  from: string;
  to: string;
  amount: string;
  assetCode: string;
  createdAt: string;
};
