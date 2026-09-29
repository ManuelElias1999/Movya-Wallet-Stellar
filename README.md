# Movya Wallet — Stellar

Movya is a mobile wallet designed to make stablecoin payments feel as simple as sending a message. This repository contains the Stellar migration and the new visual foundation for the product.

## Current scope

- React Native + Expo Router
- Premium banking-style Home with fixed header and animated account card
- Send, receive (QR), exchange, contact management, and history prototypes
- Full-screen animated Movya chat experience
- Stellar Testnet configuration
- Horizon read service for account balances and recent payments
- Demo data when no public testnet account is configured
- Migration and security plan

Transaction signing is intentionally not enabled yet. The custody and recovery model must be chosen before private-key functionality is added.

## Run locally

```bash
npm install
cp .env.example .env
npm run start
```

To load a real testnet account, set its public key only:

```bash
EXPO_PUBLIC_DEMO_ACCOUNT=G...
```

Never place a Stellar secret key in an `EXPO_PUBLIC_*` variable.

## Useful commands

```bash
npm run typecheck
npm run ios
npm run android
npm run web
```

See [`docs/MIGRATION_PLAN.md`](docs/MIGRATION_PLAN.md) for the Stacks-to-Stellar roadmap.
