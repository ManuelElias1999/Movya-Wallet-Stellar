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

## Roadmap

- Connect real Stellar transaction building and signing.
- Add the final non-custodial account and recovery model.
- Execute USDC transfers from the conversational assistant.
- Integrate swap liquidity and quotes.
- Add gas sponsorship and web2-friendly onboarding.
- Run user testing in Bolivia and Latin America.
