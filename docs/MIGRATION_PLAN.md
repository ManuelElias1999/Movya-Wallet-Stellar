# Movya Wallet: Stacks to Stellar

This repository is a clean migration of the Movya product, not a mechanical chain replacement.

## Reused product concepts

- Simple onboarding for Web2 users
- Contacts and human-readable recipients
- Portfolio and activity views
- Conversational actions through Ask Movya
- Explicit confirmation before transaction submission

## Replaced blockchain components

| Stacks implementation | Stellar implementation |
| --- | --- |
| Stacks API and Stacks.js | Horizon API and Stellar SDK |
| STX and SIP-010 balances | XLM and Stellar assets |
| Stacks sponsored transactions | Stellar fee-bump transactions / sponsored reserves |
| Stacks transfer builder | Stellar payment operation builder |
| Stacks transaction history | Horizon payments and operations |
| Stacks swap integrations | Stellar DEX path payments (phase 2) |

## Delivery phases

### Phase 1 — Foundation

- Expo Router application shell
- New visual system and primary navigation
- Horizon read layer for balances and payments
- Testnet-only configuration

### Phase 2 — Wallet and payments

Implemented for developer Testnet use: locally generated native keys in SecureStore, temporary in-memory web keys, Friendbot activation, USDC trustline creation, XLM/USDC payment review and local signing, Horizon submission, real receipts and history. See [TESTNET_PAYMENTS.md](TESTNET_PAYMENTS.md).

Production account ownership/recovery, fee sponsorship, and mainnet release remain pending.

- Decide embedded-wallet custody and recovery model
- Secure key management or approved wallet provider
- XLM and USDC trustline support
- Build, simulate, confirm, sign, and submit payments
- Fee sponsorship through a backend fee-bump service

### Phase 3 — Agent and contacts

- Port the reusable intent parser from the Stacks backend
- Resolve recipients through verified contacts
- Generate unsigned transaction intents
- Require an explicit in-app confirmation
- Enrich activity with contact names and descriptions

### Phase 4 — Swaps and production hardening

- Strict-send and strict-receive path payments
- Slippage and quote expiration controls
- Recovery, biometrics, rate limits, monitoring, and audits
- Mainnet release process

## Security rules

- Never place secret keys in `EXPO_PUBLIC_*` variables.
- Never send a wallet secret to the AI agent or backend logs.
- The agent produces intents; the wallet layer validates and signs them.
- Mainnet stays disabled until the signing and recovery model is reviewed.

## Email and contacts implementation (October 2026)

Supabase Auth, private contact CRUD, exact verified-email resolution and encrypted Testnet wallet backups are implemented. Activation requires a project, the SQL migration and public environment values; see [BACKEND_SETUP.md](BACKEND_SETUP.md). The dashboard includes separate XLM/Friendbot and USDC/Circle funding buttons. USDC uses the public faucet with its manual CAPTCHA step. Production recovery and sponsorship remain pending.
