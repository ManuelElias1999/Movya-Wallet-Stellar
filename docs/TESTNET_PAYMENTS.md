# Testnet payments

Movya can now prepare, locally sign, and submit classic Stellar XLM and USDC payments. This is a developer Testnet wallet; production onboarding, recovery, sponsorship, and swaps remain future milestones.

## Try it on your iPhone

1. Update `main`, run `npm install`, and start `npx expo start --go --clear`.
2. Open **Cuenta → Wallet de Testnet**.
3. Select **Crear wallet de Testnet**, then **Solicitar XLM de prueba**. Friendbot activates the generated account with test XLM.
4. Select **Habilitar USDC**. This submits a locally signed trustline transaction.
5. Select **Obtener USDC de prueba**. Your public address is copied and the [Circle faucet](https://faucet.circle.com/) opens. Choose **USDC / Stellar Testnet**, paste the address, and complete the faucet request. Return to Movya and refresh the balance.
6. Prepare a second Testnet account, on another device or in a temporary web session. Activate it and enable the same USDC trustline. Copy that account's public address.
7. Save the second address as **Ouali** in the Testnet wallet screen, or paste it directly in **Enviar**.
8. Send a small amount such as **1 USDC**. Review the amount, complete destination, network, issuer, and XLM fee. Select **Confirmar y enviar**.
9. The confirmed result contains the real transaction hash and a link to that exact transaction in Stellar Expert. The receiving account's balance and the payment history reflect the operation.

XLM transfers can be tested after step 3 without obtaining USDC. Recipients must already have active Testnet accounts. With the backend configured, verified Movya emails resolve to saved account addresses and contacts persist across sessions. Without it, the Ouali mapping remains an explicitly saved public Testnet address. See [backend setup](BACKEND_SETUP.md).

## Chat

With a Testnet wallet active, `Envía 1 USDC a Ouali` opens the real payment screen with the amount and recipient filled in. The payment screen verifies the account, trustline, balance, and fee, then asks for confirmation before signing. The onboarding tutorial remains a simulated educational flow.

## Network and asset boundaries

- All mutations use `https://horizon-testnet.stellar.org` and `Networks.TESTNET`. Mainnet and custom Horizon configuration are rejected.
- The supported USDC issuer is `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`, documented in [Stellar's trustline guide](https://developers.stellar.org/docs/build/guides/basics/verify-trustlines).
- USDC is identified by both code and issuer. An unrelated asset called USDC cannot satisfy the balance or recipient checks.
- Amounts, reserves, fees, trustline limits, and liabilities are compared with integer arithmetic at seven decimal places.
- The sender must retain enough XLM for the ledger's current base reserve and the network fee. Both USDC trustlines must be authorized, with enough spendable balance and receiving capacity.
- The review fixes the transaction XDR and expires after three minutes. Submission verifies that the signed transaction matches the reviewed hash and source signature.
- After an uncertain response, the review offers **Verificar estado** instead of resubmitting automatically. Keep that screen open until the result is resolved; durable recovery of pending transfers across app restarts is not implemented yet.

## Key storage

Native keys are generated on the device and stored in Expo SecureStore with `WHEN_UNLOCKED_THIS_DEVICE_ONLY`. They are not sent to an agent, server, faucet, logs, or `EXPO_PUBLIC_*` variables. With email accounts enabled, a locally encrypted wallet backup is also stored in Supabase. The plaintext secret is not stored in the database; see [backend setup](BACKEND_SETUP.md) for the authentication-provider trust boundary.

On web, the secret stays only in memory. Refreshing the page destroys the in-memory key. Email users can reopen their existing backup using their account password; developer wallets without a backend remain temporary. Registered users can reveal their mnemonic (new wallets) or private key under Cuenta → Respaldo y claves after password verification. Existing unseeded wallets retain their private key and do not acquire a new mnemonic. In-app import and production account recovery are not implemented yet. Use only test tokens.

## Validation

Verified on October 1, 2026 with disposable accounts using the same payment service as the app:

| Asset | Amount | Confirmed transaction | Result |
| --- | --- | --- | --- |
| XLM | 1 | [71b4c3a](https://stellar.expert/explorer/testnet/tx/71b4c3ab5434ea5f37d7f389b866a534a0e9a9c863109088aa4340c9be73c9ce) | Recipient balance increased by exactly 1 XLM |
| USDC | 1 | [2e0d585](https://stellar.expert/explorer/testnet/tx/2e0d585dec14d2698399b86b97f787e7e97d5fac431c8b30b1eb7b36bcd2f397) | Verified issuer; recipient balance increased by exactly 1 USDC |

```bash
npm run typecheck
npm test
npx expo export --platform ios --platform web
npm run test:testnet
npm run test:testnet -- --usdc
```

The smoke test generates two disposable accounts in memory, funds them through Friendbot, sends one XLM using the same payment service, and verifies the destination balance increase. It prints only the public receipt, never secret keys. It uses the public network and is intentionally separate from offline CI.

The optional `--usdc` smoke test also creates the verified-issuer USDC trustlines, acquires two test USDC through existing Testnet DEX liquidity (spending at most ten test XLM), transfers one USDC with the payment service, and verifies the recipient's exact balance increase. This fixture setup does not enable swaps in the application and depends on available Testnet liquidity.

USDC unit tests cover the configured issuer, both trustlines, authorization, liabilities, limits, reserve/fee checks, review integrity, signatures, and submission outcomes. For manual app testing, obtain USDC from Circle's faucet.
