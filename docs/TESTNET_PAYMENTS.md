# Testnet payments

Movya prepares, locally signs, and submits classic Stellar XLM and USDC payments. Email accounts, automatic wallet creation, encrypted recovery and persistent contacts are implemented with Supabase. This remains a Testnet MVP; production recovery and sponsorship remain future milestones. XLM/USDC swaps are connected to Stellar Testnet DEX liquidity.

## Try it on your iPhone

1. Update `main`, run `npm install`, and start `npx expo start --go --clear`.
2. With Supabase configured, register a Movya account, verify your email if required, and save or defer the backup. The wallet is created automatically; the developer-wallet entry is no longer in Settings. See [backend setup](BACKEND_SETUP.md).
3. From **Inicio**, select **Pedir fondos en XLM**. Friendbot activates the generated account with test XLM, subject to its eligibility rules.
4. Select **Pedir fondos en USDC**. This creates the verified-issuer trustline if needed, using a locally signed transaction and XLM for the reserve/fee.
5. Your public address is copied and the [Circle faucet](https://faucet.circle.com/) opens. Choose **USDC / Stellar Testnet**, paste the address, and complete the external request. Return to Movya and refresh the balance.
6. Prepare a second Testnet account, on another device or in a separate browser session. Activate it and enable the same USDC trustline. Copy that account's public address.
7. Save the second account in **Contactos** by its public address or exact verified Movya email, or paste the address directly in **Enviar**. The contact can be named **Ouali** for the command below.
8. Send a small amount such as **1 USDC**. Review the amount, complete destination, network, issuer, and XLM fee. Select **Confirmar y enviar**.
9. The confirmed result contains the real transaction hash and a link to that exact transaction in Stellar Expert. The receiving account's balance and the payment history reflect the operation.

XLM transfers can be tested after step 3 without obtaining USDC. Recipients must already have active Testnet accounts. With the backend configured, verified Movya emails resolve to saved account addresses and contacts persist across sessions. Without it, the Ouali mapping remains an explicitly saved public Testnet address. See [backend setup](BACKEND_SETUP.md).

## Chat

With a Testnet wallet active, `Envía 1 USDC a Ouali` (or `Send 1 USDC to Ouali`) stays in the chat. It resolves an exact saved name/email or a public Stellar address. Accents and case are ignored for names; duplicate names show contact choices inside the chat instead of guessing. Email contacts use the existing verified-address lookup again before review.

The same payment service as **Enviar** verifies accounts, trustlines, balances, receiving capacity, reserves and fees. The inline card shows the full destination/source, amount, network, USDC issuer and XLM fee. Press **Sí, confirmar** or type **Sí / Yes** to sign and submit; **No / Cancelar / Cancel** discards the pending review. No transaction is signed during preparation. The receipt shows the confirmed hash and exact explorer link inside the chat. The onboarding tutorial remains a separate simulated educational flow.

Rapid confirmations share one submission lock. A network-uncertain result keeps its hash and offers **Verificar estado**; new sends and closing the chat are blocked while submission or status resolution is pending. It never automatically broadcasts the payment again. Pending transfer recovery after an app restart is still a future milestone.

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

On web, the secret stays only in memory. Refreshing the page destroys the in-memory key. Email users can reopen their existing backup using their account password; developer wallets without a backend remain temporary. Registered users can reveal their mnemonic (new wallets) or private key under **Cuenta → Seguridad → Respaldo y claves** after password verification. Existing unseeded wallets retain their private key and do not acquire a new mnemonic. In-app import and production account recovery are not implemented yet. Use only test tokens.

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

The optional `--usdc` smoke test also creates the verified-issuer USDC trustlines, acquires two test USDC through existing Testnet DEX liquidity (spending at most ten test XLM), transfers one USDC with the payment service, and verifies the recipient's exact balance increase. This payment fixture depends on available Testnet liquidity; the dedicated swap test below exercises the app’s quote and execution service.

USDC unit tests cover the configured issuer, both trustlines, authorization, liabilities, limits, reserve/fee checks, review integrity, signatures, and submission outcomes. For manual app testing, obtain USDC from Circle's faucet.

Offline chat regression tests cover inline confirmation/cancellation in Spanish and English, both assets, exact contact resolution, duplicate names, missing wallets, session changes, double taps and uncertain submission checks. UI tests render the actual chat/card with mocked native/network boundaries; physical-device QA remains necessary.

## XLM ↔ USDC swaps

**Swap** now queries Horizon’s strict-send paths on Stellar Testnet, selects the highest valid output for the exact verified assets/amount, and constructs a same-wallet path payment. Only XLM and the configured Testnet USDC issuer are selectable. Both directions require an authorized USDC trustline and enough XLM for the reserve and maximum network fee.

- Enter an amount to obtain a quote automatically. Changing the amount or either asset immediately invalidates the old review; late responses cannot overwrite the new draft.
- **Saldo** shows the token balance; **Disponible** and **Máximo** exclude selling liabilities, the XLM reserve and the current maximum network fee. The swap service checks those amounts again when preparing the quote.
- Review the estimated amount, minimum received, maximum network fee, wallet, issuer and network before confirming. The limit is 0.5% below the quote, rounded down at seven decimals. Quotes expire after 60 seconds. A worse execution is rejected; Stellar can still charge its transaction fee for a rejected transaction.
- The fee shown is the maximum fee budget in the reviewed transaction; the network can charge less. No app fee is added. Pool costs, when applicable, are reflected in the routed quote.
- `Cambia 50 XLM a USDC` / `Swap 50 XLM for USDC` requests the same review in the chat. Confirm using its button or **Sí / Yes**; cancel with **No**. Neither preparation nor a suggestion signs a transaction.
- Insufficient liquidity is an explicit error. Testnet exchange rates depend on test liquidity and are not a market-price feed.
- A confirmed swap links to its exact transaction. Actual received amounts can vary above the reviewed minimum; the quote is labeled as an estimate. Uncertain submissions can only be checked, never automatically resent. Pending state does not survive a full app restart yet.

Run the dedicated test with disposable keys held only in memory:

```bash
node --import tsx scripts/testnet-swap-smoke.ts
```

It activates a disposable account, enables verified USDC, exchanges 50 XLM to USDC and exchanges the received USDC back to XLM. It verifies balance changes against actual charged fees and each protected minimum, and prints only public receipts. It requires Friendbot and live Testnet DEX liquidity. Offline tests additionally cover stale quotes, exact seven-decimal arithmetic, trustline capacity, tampered reviews/signatures, expiry, double confirmation and uncertain status checks. Native UI/network boundaries are mocked in component tests; the amount-field layout still requires a physical-device check.

Verified on October 18, 2026 (Bolivia), with a disposable wallet and the app’s swap service:

| Direction | Amount sent | Confirmed transaction | Check |
| --- | --- | --- | --- |
| XLM → USDC | 50 XLM | [5edd5cd3](https://stellar.expert/explorer/testnet/tx/5edd5cd33cdb74050ba5be51d2a1ec2566871ed7b6d0522d0b3dff13f0535768) | Exact debit and received balance above protected minimum |
| USDC → XLM | 44.2490034 USDC | [78ba3cf0](https://stellar.expert/explorer/testnet/tx/78ba3cf0de19fea26f6c5cd850425c781cc29f8dfe98b59fa3a324f1c2ef5780) | Exact debit and received balance above protected minimum after actual network fee |
