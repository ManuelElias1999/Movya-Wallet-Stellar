# Email accounts and persistent contacts (Stellar Testnet)

## Activate the backend

The code is implemented; a Supabase project must be configured before email registration is live. Without both public environment values, the app offers **Continuar con mi wallet de pruebas** and retains the existing developer wallet. It does not pretend to register users.

1. Create a Supabase project dedicated to Movya Testnet.
2. In its **SQL Editor**, run `supabase/migrations/20261002010000_accounts_contacts.sql` once. This creates profiles, encrypted wallet backups, contacts, row-level security policies, and the two RPCs.
3. In **Authentication**, enable Email/password, keep email confirmation enabled, and require passwords of at least 12 characters.
4. In **Email Templates → Confirm signup**, include the code in the template:

   ```html
   <h2>Confirma tu correo en Movya</h2>
   <p>Escribe este código en la app:</p>
   <p><strong>{{ .Token }}</strong></p>
   <p>Si no solicitaste esta cuenta, ignora este correo.</p>
   ```

   The app verifies the signup OTP directly; no Expo Go deep-link redirect is required. The default confirmation link also works: confirm the email, then return to the app and sign in.
5. For initial tests, use an email belonging to the Supabase project's team. To register other people, configure custom SMTP in Authentication. Supabase's default email service restricts recipients to project team members and has a small rate limit. Keep SMTP credentials in Supabase settings, never in Expo.
6. Copy the **Project URL** and **publishable key** from **Connect** into your existing `.env`:

   ```dotenv
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

   A legacy anon key also works. Never use a `service_role` JWT or `sb_secret_*` key. Do not overwrite the existing Stellar configuration.
7. Restart Metro with `npx expo start --go --clear`.

## User flow

- Register with name, email and a password of at least 12 characters.
- If a developer wallet already exists on the device, explicitly select **Vincular mi wallet de pruebas anterior** to keep its address and funds. This option only applies when the user has no existing account wallet. The original developer wallet remains untouched.
- Enter the email code. After verification, the app authenticates the password, creates or restores the wallet, and opens the onboarding. A Stellar public key exists immediately; use **Pedir fondos en XLM** to activate it on the network.
- Returning native users retain their session and device wallet. After logout, or on another device, login with the same email/password decrypts the existing backup and restores the same address. Web private keys remain in memory; on a reload the app asks for the password to unlock them.
- Add a contact by a complete Stellar address (checksum verified) or a verified Movya email. Unknown/unverified emails are rejected. Duplicate addresses are rejected per owner.
- Favorite, rename, search and delete contacts. Send and chat use the same saved list. `Envía 0.1 XLM a Juan` opens the real review screen when Juan is saved. Duplicate names require choosing a contact. Email destinations are resolved again before review.
- **Pedir fondos en XLM** calls Friendbot and refreshes the balance. Friendbot determines eligibility; it is not an unlimited refill service.
- **Pedir fondos en USDC** enables the official USDC trustline if needed (requires XLM for reserve/fee), copies the address, and opens Circle's faucet. Choose **USDC → Stellar Testnet**, paste the address and complete Circle's request. Circle uses CAPTCHA and rate limits, so this button does not claim automatic token delivery. Refresh the balance after returning.

## Data and security boundaries

Supabase Auth handles passwords and session tokens. Native session tokens and private keys use Expo SecureStore, scoped by user. Long auth sessions are chunked into Keychain items with an atomic manifest. Web session tokens use browser storage; the secret is never stored in browser storage.

The backup is encrypted locally with AES-256-GCM and PBKDF2-SHA256 (600,000 iterations, fresh 16-byte salt and 12-byte nonce). Authenticated data binds it to the user ID, public key, version and Testnet. No plaintext Stellar secret is stored in the database. Supabase Auth receives the login password over HTTPS; this password-based prototype trusts the authentication provider and is not a provider-independent recovery design.

Backups are immutable through the client API. The registration RPC validates the authenticated, verified user and returns the existing record on retries, including races between devices. Failure to read or decrypt an existing backup never creates a replacement wallet. Profiles, contacts and backup reads are restricted by owner using RLS; exact verified-email lookup returns only the public address, never a list or a backup. Email lookup should gain server-side rate limiting before a public rollout.

This is a Testnet prototype, not a production wallet. Password reset/change and recovery after losing the original password are not implemented: resetting the Supabase password alone will not decrypt the existing wallet backup. Do not reset passwords on funded accounts without a wallet recovery design. Production account recovery, passkeys, abuse protection, sponsorship and independent security review remain future work.

## Validation

`npm test` runs real Postgres SQL via PGlite for migrations, RLS, verified-email lookup, contact CRUD and immutable wallet registration. It also checks encryption integrity, wrong passwords/owners, restoring the same address across devices, linking a legacy wallet, and failure without replacement. Existing payment tests remain included.

`npm run typecheck` and `npx expo export --platform ios --platform web` validate compilation. Hosted Supabase email delivery, real login and iPhone interaction require the configured project and manual verification; local database tests do not claim to cover those services.

Manual acceptance: register two verified users, request XLM, add one by email, send 0.1 XLM, verify the ledger receipt, rename/favorite the contact, logout/login and check the same address/contact, then sign in on another device. Never use mainnet funds.

References: [Supabase React Native Auth](https://supabase.com/docs/guides/auth/quickstarts/react-native), [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security), [Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [Circle faucet](https://faucet.circle.com/).
