<div align="center">
  <img src="assets/movya-logo.png" alt="Movya Wallet logo" width="150" />

  # Movya Wallet

  **A smart, non-custodial Stellar wallet designed to make crypto payments feel as simple as sending a message.**

  <img src="assets/stellar-wordmark.png" alt="Powered by Stellar" width="170" />

  <br />

  ![Expo](https://img.shields.io/badge/Expo-57-000020?logo=expo&logoColor=white)
  ![React Native](https://img.shields.io/badge/React_Native-0.86-61DAFB?logo=react&logoColor=001A2B)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
  ![Stellar](https://img.shields.io/badge/Stellar-Testnet-111111?logo=stellar&logoColor=white)
</div>

---

## About Movya

Movya helps people interact with digital assets without needing to understand gas fees, complex addresses, or traditional blockchain flows. Its conversational assistant turns a simple instruction into a guided transaction that the user can review and confirm.

> **“Send 20 USDC to Ouali”** → review → confirm → transaction result.

The goal is to build a wallet that feels familiar to everyday users and can become an accessible entry point to Stellar in Latin America.

## Product highlights

- **Conversational payments:** prepare sends directly from the Movya chat.
- **Human-readable contacts:** use saved names instead of repeatedly handling wallet addresses.
- **Stellar portfolio:** view balances, tokens, and recent account activity.
- **Send, receive, and swap flows:** mobile-first experiences with clear confirmations.
- **Guided onboarding:** an interactive demo teaches the core wallet flow.
- **Testnet-ready integration:** Horizon services load public balances and payment history.
- **Responsive premium UI:** optimized for mobile, web, and modern iPhone safe areas.

## Current status

Movya currently provides the complete product interface, onboarding, portfolio experience, account reads, and conversational transaction demo on Stellar Testnet.

Transaction signing is intentionally not enabled yet. The custody, recovery, and authorization model must be finalized before private-key functionality is introduced.

## Built with

| Layer | Technology |
| --- | --- |
| Mobile and web | React Native + Expo |
| Navigation | Expo Router |
| Language | TypeScript |
| Network | Stellar Testnet |
| Blockchain data | Horizon API |
| Local security foundation | Expo Secure Store |

## Getting started

### Requirements

- Node.js 20 or newer
- npm
- Expo Go on a mobile device for native testing

### Installation

```bash
git clone https://github.com/ManuelElias1999/Movya-Wallet-Stellar.git
cd Movya-Wallet-Stellar
npm install
cp .env.example .env
```

### Environment

The app can run with local demo data. To read a real Stellar Testnet account, add its **public key only**:

```bash
EXPO_PUBLIC_DEMO_ACCOUNT=G...
```

Never place a Stellar secret key in an `EXPO_PUBLIC_*` variable or commit one to the repository.

### Run with Expo Go

```bash
npx expo start --go --clear
```

Connect the computer and phone to the same Wi-Fi network, then scan the QR code with Expo Go. If the local connection is unavailable, use:

```bash
npx expo start --go --tunnel --clear
```

### Other commands

```bash
npm run typecheck
npm run ios
npm run android
npm run web
```

## Demo flow

1. Create an account to open the guided onboarding.
2. Tap the Movya logo in the center of the bottom navigation.
3. Send the message: `Envía 20 USDC a Ouali`.
4. Review the transaction summary.
5. Confirm with **Sí** or cancel with **No**.
6. Movya displays the preparation state, success message, and Stellar explorer link.
7. The current transaction is a visual Testnet demo and does not move real funds.

## Project structure

```text
app/                    Expo Router screens and navigation
assets/                 Movya, Stellar, and token images
src/components/         Reusable UI and interaction components
src/config/             Environment configuration
src/data/               Demo portfolio, activity, and contacts
src/hooks/              Stellar account hooks
src/services/stellar/   Horizon service and Stellar types
src/theme/              Shared colors and design tokens
docs/                   Migration and security planning
```

## Roadmap

- Connect real Stellar transaction building and signing.
- Add the final non-custodial account and recovery model.
- Execute USDC transfers from the conversational assistant.
- Integrate swap liquidity and quotes.
- Add gas sponsorship and web2-friendly onboarding.
- Run user testing in Bolivia and Latin America.

## Documentation

See [`docs/MIGRATION_PLAN.md`](docs/MIGRATION_PLAN.md) for the migration roadmap, security boundaries, and next integration milestones.
