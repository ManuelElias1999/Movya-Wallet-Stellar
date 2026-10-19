<div align="center">
  <img src="assets/movya-logo.png" alt="Movya Wallet mascot" width="160" />
  <h1>Movya Wallet</h1>
  <p><strong>One message. One transaction.</strong></p>
  <p>A conversational, non-custodial wallet bringing a familiar mobile banking experience to Stellar.</p>
  <p>
    <a href="https://movyawallet.com"><strong>Website</strong></a> ·
    <a href="https://movyawallet.com/#whitelist">Join the whitelist</a> ·
    <a href="https://www.instagram.com/movya_wallet/">Instagram</a> ·
    <a href="#quick-start">Run the app</a>
  </p>
  <img src="assets/stellar-wordmark.png" alt="Built on Stellar" width="170" />
  <br /><br />
  <a href="https://github.com/ManuelElias1999/Movya-Wallet-Stellar/actions/workflows/ci.yml"><img src="https://github.com/ManuelElias1999/Movya-Wallet-Stellar/actions/workflows/ci.yml/badge.svg?branch=main" alt="Validate Movya" /></a>
  <img src="https://img.shields.io/badge/Stellar-Testnet-111111?logo=stellar&amp;logoColor=white" alt="Stellar Testnet" />
  <img src="https://img.shields.io/badge/Expo-57-000020?logo=expo&amp;logoColor=white" alt="Expo SDK 57" />
  <img src="https://img.shields.io/badge/React_Native-0.86-61DAFB?logo=react&amp;logoColor=001A2B" alt="React Native 0.86" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&amp;logoColor=white" alt="TypeScript 5.9" />
  <img src="https://img.shields.io/badge/Supabase-Auth_%2B_Postgres-3ECF8E?logo=supabase&amp;logoColor=white" alt="Supabase Auth and PostgreSQL" />
</div>

## Why Movya exists

Sending money should not require learning an entirely new vocabulary. Addresses, signatures, network fees and unfamiliar wallet interfaces can keep people from trying blockchain, especially when their first impressions are confusion or fear of scams.

Movya starts with a familiar experience: create an account with email, save people as contacts, check a balance and say what you want to do. The wallet handles the blockchain steps while keeping the user in control of the final confirmation.

The project is informed by the barriers to adoption in Bolivia and Latin America, with a broader goal: make digital payments understandable to anyone, including people using Web3 for the first time. It is not limited to experienced crypto users, a particular age group or one region. The app supports Spanish and English, including basic chat commands in both languages. Choose Español or English in Settings → Language and region; the preference persists on the device and also applies to sign-in.

> **“Envía 20 USDC a Aya”** → resolve the saved contact → review the payment → confirm → view the Stellar receipt.

The long-term vision is a wallet that even our grandparents can use comfortably. The product is being refined through iterative design and feedback from different people.

## Website and early access

**[movyawallet.com](https://movyawallet.com)** is the public landing page, with an interactive product preview and an [early-access whitelist](https://movyawallet.com/#whitelist). Follow **[@movya_wallet](https://www.instagram.com/movya_wallet/)** for updates.

This repository contains the Expo wallet application. The marketing website is a separate experience: its conversation is scripted, illustrative balances are demo data, and no funds move there. Joining the whitelist does not create an in-app wallet account.

## Current status

**Movya is a working Stellar Testnet MVP under active development.** It supports email accounts, wallet creation and recovery, persistent contacts, and signed XLM/USDC payments. It is not a mainnet release or an audited production wallet. Use test tokens only.

| Area | Available now | Boundary |
| --- | --- | --- |
| Accounts | Email/password registration, login and session restoration with Supabase | Requires a configured Supabase project; email delivery depends on its Auth settings |
| Languages | Spanish/English UI, accessible labels, alerts, basic chat intents and persisted preference | User content and recovery material are never translated; unknown provider errors remain as returned |
| Personal wallet | Automatically generated wallet for each new account | Stellar Testnet only; funding activates the account on the network |
| Recovery | 12-word phrase for new wallets, encrypted backup, restoration of the same wallet on another device | Original account password required; no in-app phrase import or password-change/reset recovery flow |
| Payments | Review, local signing and submission of XLM and verified-issuer USDC transfers | Recipient must be active; USDC requires compatible, authorized trustlines and sufficient capacity |
| Receive | QR code, public address, copy and native share | For receiving tokens on Stellar Testnet |
| Contacts | Add by public address or registered email; search, rename, favorite and delete | Email lookup requires an exact verified account; no public directory |
| Balances and activity | Live Horizon balances, sent/received payments, saved contact names and explorer receipts | Main account balance is shown in XLM; no fabricated USD conversion |
| Funding | Friendbot XLM request; USDC trustline setup and Circle faucet shortcut | Circle's request is completed externally; token delivery is not automatic |
| Movya chat | Basic text intents, balance answers, contact selection and in-chat payment review, confirmation and receipts | Rule-based parser, not an integrated LLM; XLM/USDC signing uses the same validated payment service as Send |
| Onboarding and UI | First-registration guide, wallet forge animation, fixed bottom navigation and password visibility controls | Guide is simulated; visual and keyboard behavior still require device QA |
| Native acceleration | Local CommonCrypto/JCA module for backup key derivation outside JavaScript | Requires a compiled app; Expo Go uses the portable engine |
| Swaps and voice | Interface prototypes | Live swap quotes/execution and actual voice recording/transcription are not implemented |

Earlier wallets created without a mnemonic retain their original address and private key. Movya does not generate unrelated recovery words for an existing wallet.

## The user journey

1. **Create an account.** Enter a name, email and password of at least 12 characters. Verify the email if confirmation is enabled in Supabase.
2. **Let Movya prepare the wallet.** The mascot forges a wallet with a hammer, anvil and sparks while the app displays the actual operation stage and elapsed time. There is no simulated completion percentage.
3. **Save the backup.** Verify your password to reveal and copy the recovery phrase or private key. Tapping the acknowledgment before viewing the backup explains what to do first. The reminder can also be deferred to **Cuenta → Seguridad → Respaldo y claves**.
4. **Try the guide.** New registrations see an interactive tutorial that can be completed or skipped. Returning users go directly to the dashboard.
5. **Fund the account.** Use **Pedir fondos en XLM** and **Pedir fondos en USDC** below the main dashboard actions.
6. **Save someone.** Add a contact using a Stellar address or the exact email of another registered Movya user.
7. **Send a payment.** Use Send or a command such as `Envía 0.1 XLM a Aya`. Review the full recipient, amount, asset, network and fee before confirming.
8. **Check the result.** A confirmed payment returns its hash and a link to that specific transaction in Stellar Expert. Activity uses the saved contact's name when there is an address match.

For an initial USDC test, activate both accounts with XLM, enable their USDC trustlines, obtain test USDC from Circle and refresh the balance before sending. The funding button does not bypass faucet eligibility checks, CAPTCHA or rate limits.

## Architecture

| Layer | Implementation |
| --- | --- |
| iOS, Android and web app | Expo SDK 57, React Native 0.86, React 19 and TypeScript |
| Navigation and interface | Expo Router, React Native Animated, SVG, gradients, blur and safe-area handling |
| Accounts and database | Supabase Auth, PostgreSQL, row-level security and wallet registration RPCs |
| Wallet and transactions | Stellar SDK; transaction validation and signing on the client |
| Blockchain reads and submission | Stellar Testnet Horizon |
| Native storage | Expo SecureStore scoped to the account |
| Web key storage | In-memory wallet material; authenticated recovery after reload |
| Backup encryption | AES-256-GCM with PBKDF2-SHA256, 600,000 iterations |
| Key derivation engines | CommonCrypto on iOS, JCA on supported Android builds, WebCrypto where available, portable JavaScript fallback |
| Automated validation | Node test runner, PGlite/PostgreSQL checks, TypeScript, Expo exports and native compatibility vectors |

Supabase stores profiles, private contacts and encrypted wallet backups. The chat prepares an intent; the payment service validates it, and the device signs the reviewed transaction. Neither the assistant nor the database receives the plaintext wallet secret or recovery phrase.

This is the Stellar implementation of Movya. Earlier Stacks product concepts informed the migration; this repository does not provide a multichain wallet.

## Quick start

### Requirements

- Node.js **22.12+**; CI uses Node.js 24.
- npm.
- Expo Go to try the interface on a phone, or a browser for web.
- A Supabase project to test email registration, persistent contacts and backup recovery.
- Xcode/macOS for a compiled iOS app, or Android Studio/SDK for a compiled Android app.

### Install

~~~bash
git clone https://github.com/ManuelElias1999/Movya-Wallet-Stellar.git
cd Movya-Wallet-Stellar
npm ci
cp .env.example .env
~~~

The last command is for a fresh setup. Keep your existing `.env` when updating a working checkout.

### Configure the environment

~~~dotenv
EXPO_PUBLIC_STELLAR_NETWORK=testnet
EXPO_PUBLIC_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
EXPO_PUBLIC_DEMO_ACCOUNT=

EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
~~~

Use only the public Supabase publishable key (or the legacy anon key), never a service-role/secret key. `EXPO_PUBLIC_*` values are bundled into the client. Never put a wallet private key, recovery phrase or password in these variables.

`EXPO_PUBLIC_DEMO_ACCOUNT` is optional and accepts only a public Stellar address for portfolio reads. Without backend configuration, the app offers a separate developer/demo route; it does not create email accounts or persistent Supabase contacts.

### Set up Supabase

Run these migrations in order in your project's SQL Editor:

1. [`20261002010000_accounts_contacts.sql`](supabase/migrations/20261002010000_accounts_contacts.sql)
2. [`20261002020000_recovery_words.sql`](supabase/migrations/20261002020000_recovery_words.sql)

Enable email/password authentication and configure confirmation templates and SMTP for verified-email onboarding. For a private Testnet test without SMTP, confirmation can be temporarily disabled; those email identities have not been proven to belong to the registrant. Restore verification before a public rollout.

See the [backend setup guide](docs/BACKEND_SETUP.md) for Auth settings, permissions and recovery constraints.

### Open in Expo Go or on web

~~~bash
npx expo start --go --clear
~~~

Keep the phone and computer on the same network and scan the QR code. If the local connection is unavailable, use `npx expo start --go --tunnel --clear`. For web, run `npm run web`.

Expo Go supports the current app interface, including the forge animation. It does **not** include the custom native PBKDF2 module, so initial creation and restoration on a new device can still be slow.

### Use native backup acceleration

With the platform toolchain configured and a device connected:

~~~bash
# macOS with Xcode, CocoaPods and Apple signing configured as needed
npx expo run:ios --device

# Android Studio/SDK and a connected Android device
npx expo run:android --device
~~~

These commands build and install the app with the local module. Native source changes require rebuilding the binary. The module keeps the same encrypted backup format and work factor; it does not reduce protection to make signup faster. Actual creation time also depends on the device, authentication, network and storage, and must be measured on a real phone.

See [native wallet creation](docs/NATIVE_WALLET_CREATION.md) for device setup and compatibility checks. No real-device speed improvement is claimed as measured.

## Security and recovery boundaries

- **Testnet only.** Signing and submission reject mainnet and custom Horizon endpoints. Do not use production keys or funds.
- **Local signing.** Native wallet material is stored in account-scoped SecureStore. On web, private keys remain in memory rather than browser storage. Web authentication tokens are stored separately by the auth client.
- **Encrypted backups.** Fresh salts and nonces are used, and authenticated data binds each backup to its owner, public address, version and network. Database access is restricted by RLS; client wallet registration preserves an existing backup on retries.
- **Authentication trust.** The account password also derives the backup encryption key. Supabase Auth receives that password over HTTPS. This prototype trusts the authentication provider; it is not a provider-independent recovery design.
- **Password reset is not wallet recovery.** Resetting the Supabase password alone cannot decrypt the existing backup. In-app password change/reset and import of saved words/private keys are not implemented. A separately saved phrase or key can recover the address in a compatible external Stellar wallet.
- **Protected disclosure.** Viewing words or a private key requires password verification. Secrets are hidden on leaving the screen, backgrounding or after a minute. Native screen-capture protection is requested; web cannot block operating-system screenshots. Clipboard cleanup is best effort.
- **Explicit payment review.** The destination, asset issuer, amount, reserves, liabilities, trustline capacity and fee are checked before signing. Submission verifies the signed transaction against the reviewed hash and signature.
- **Uncertain submissions.** A network timeout leads to a status check rather than automatic resubmission. Durable recovery of pending transfers after app restarts remains pending.

The project has not completed an independent security audit. Production recovery, rate limiting, abuse protection, sponsorship and a mainnet release process remain future work. For issue reports, include reproduction steps and sanitized logs only; never include wallet secrets or personal account credentials.

## Validation

~~~bash
npm run typecheck
npm test
npx expo export --platform ios --platform web
~~~

CI runs the service/security tests, TypeScript checks and iOS/web exports. Coverage includes PostgreSQL migrations and RLS, contacts, immutable wallet registration, recovery ownership, encryption, cancellation, clipboard handling, payment validation, signatures and ambiguous network results.

A separate macOS job compiles the Swift/CommonCrypto helper and Kotlin/JCA helper against independent ASCII, Unicode/emoji and embedded-NUL PBKDF2 vectors. These checks do not constitute a complete iOS/Android application build or physical-device testing.

Optional live Testnet smoke tests:

~~~bash
npm run test:testnet
npm run test:testnet -- --usdc
~~~

The scripts create disposable in-memory accounts, request test XLM and verify a payment's exact recipient balance change. The USDC variant additionally needs Testnet DEX liquidity for fixture funding; this does not enable in-app swaps. These network-dependent checks are separate from offline CI. Historical Testnet receipts are linked in the [payment guide](docs/TESTNET_PAYMENTS.md); they are not evidence of a new live test on every commit.

Use the [device UX checklist](docs/UX_CHECKLIST.md) to verify onboarding, password visibility, keyboard behavior, the forge animation and recovery disclosure on real devices.

## Repository map

~~~text
app/                         Expo Router screens and protected navigation
assets/                      Movya mascot, Stellar branding and token images
src/components/              Chat, payment review, funding, history and shared UI
src/context/                 Authentication, account wallet and contacts state
src/config/                  Public environment and network configuration
src/data/                    Demo-only portfolio, activity and contact fixtures
src/hooks/                   Account data hooks
src/services/backend/        Auth integration, contacts, storage and encrypted recovery
src/services/stellar/        Horizon, recovery derivation and Testnet payments
src/theme/                   Shared design tokens
modules/movya-password-key/  Local Expo module: Swift/CommonCrypto and Kotlin/JCA
supabase/migrations/         Database schema, RLS and wallet registration RPCs
tests/                       Service, database, recovery, payment and native vectors
scripts/                     Disposable live Testnet smoke tests
docs/                        Setup, testing, UX and migration notes
~~~

## Next milestones

1. Complete physical-device QA and measure first-account creation with native acceleration.
2. Expand the assistant beyond fixed text patterns and add durable recovery of pending payments across app restarts.
3. Connect real swap quotes and execution with slippage and expiry controls.
4. Implement actual voice recording and transcription.
5. Design production recovery and safer authentication options, including password lifecycle handling.
6. Add fee/reserve sponsorship, email-lookup abuse protection and operational monitoring.
7. Continue usability testing with people new to Web3, then complete security review and mainnet readiness work.

These are planned milestones, not shipped features or dated delivery commitments.

## Documentation and contribution

| Guide | Purpose |
| --- | --- |
| [Backend setup](docs/BACKEND_SETUP.md) | Supabase, email accounts, RLS and recovery boundaries |
| [Testnet payments](docs/TESTNET_PAYMENTS.md) | Funding, asset checks, payment testing and historical receipts |
| [Native wallet creation](docs/NATIVE_WALLET_CREATION.md) | Compile the native key-derivation module and test on a device |
| [UX checklist](docs/UX_CHECKLIST.md) | Manual acceptance checks for navigation, forms and backup flows |
| [Migration plan](docs/MIGRATION_PLAN.md) | Background on the Stellar migration and integration phases |

For a proposed change, open an issue or pull request with the problem, expected behavior and relevant validation. Keep simulated features clearly labeled, preserve existing wallet addresses and backups, and include device/network context for UI or payment bugs. This README describes current behavior; older migration phases provide historical planning context.

Built by **Manuel Elías**. Follow the project and join early access at **[movyawallet.com](https://movyawallet.com)**.
