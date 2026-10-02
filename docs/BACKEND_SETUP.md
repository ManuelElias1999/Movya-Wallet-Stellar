# Email accounts and persistent contacts (Stellar Testnet)

## Activate the backend

The code is implemented; a Supabase project must be configured before email registration is live. Without both public environment values, the app offers **Continuar con mi wallet de pruebas** and retains the existing developer wallet. It does not pretend to register users.

1. Create a Supabase project dedicated to Movya Testnet.
2. In its **SQL Editor**, run the SQL migrations in order: `supabase/migrations/20261002010000_accounts_contacts.sql`, then `supabase/migrations/20261002020000_recovery_words.sql`. If the first migration was already applied, run only the second. This creates profiles, encrypted wallet backups, contacts, row-level security policies, and the two RPCs.
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

For a private Testnet session without SMTP, you may temporarily disable **Confirm email**. Supabase then auto-confirms new users and Movya goes straight to wallet creation. Such an email has not been proven to belong to the registrant: email contacts are only test identities in this mode. Enable confirmation and configure SMTP before admitting real users. In the current hosted dashboard, editing the confirmation template may require custom SMTP first.

## User flow

- Register with name, email and a password of at least 12 characters.
- A new account gets its own wallet automatically. There is no option to link the separate developer wallet. Existing account wallets keep their address and funds.
- Enter the email code. After verification, the app authenticates the password, creates or restores the wallet, and opens the backup step. New wallets have 12 BIP39 English words. The backup step and Movya guide belong to account creation; subsequent login, session restoration and login on another device go straight to the dashboard. The guide can be completed or skipped and is not replayed after login. Confirm your password to view them, save them in order, and continue to the tutorial; you can also defer the reminder until later. A Stellar public key exists immediately; use **Pedir fondos en XLM** to activate it on the network.
- In **Cuenta → Seguridad → Respaldo y claves**, confirm your password to view the phrase or the Stellar private key (S...). The screen hides its contents after a minute, on navigation and when the app leaves the foreground. Native capture prevention and iOS app-switcher protection are requested before disclosure. Web cannot block operating-system screenshots. Both reveal actions use the same button color. After password verification, explicit copy buttons copy the entire phrase in its original order or the private key, including during signup. Clipboard cleanup is best effort after 60 seconds and only clears the matching value, never newer clipboard text.
- Wallets generated before mnemonic support keep their existing address and private key. They have no 12-word phrase and the app says so; it never fabricates words for an unrelated address.
- Returning native users retain their session and device wallet. Native logout removes the session and locks all wallet operations, while keeping the per-user wallet in protected device storage. After Supabase validates login credentials, an exact backup fingerprint and matching public address allow that device to reuse its verified local wallet without repeating PBKDF2. An older local wallet without the fingerprint is decrypted once to establish it. Another device decrypts the backup to restore the same address and words. Web private keys remain in memory, are removed on logout, and require password-based recovery on reload.
- Registration/login keeps the original email and password form visible while showing loading progress and disabling repeated submission. It does not switch to a second password-only form after Supabase signs in. The backup and protected-storage reads run together, and the opened wallet is passed directly to Auth rather than read again. You can cancel and retry with the same account. Requests have a 30-second deadline and the whole access attempt has a two-minute deadline. Cancellation stops pending network requests and prevents a late recovery result from opening the wallet. A server registration that already committed remains immutable and is recovered on retry. The first registration reuses its just-encrypted material only if the server returns the exact same backup; a concurrent winner or a backup without a verified local cache is decrypted with all 600,000 PBKDF2 rounds intact. WebCrypto accelerates key derivation where available; Expo Go uses the portable implementation. First creation and recovery on a new device can still take time in Expo Go.
- The home and portfolio summaries display the actual native XLM balance, without a fabricated USD valuation. The redundant funding disclaimer and Wallet de Testnet entry are removed from Settings; network badges still identify Testnet.
- The bottom menu highlights the active section with a solid light pill and filled icon. Moving right through the menu enters from the right; moving back uses the reverse transition (native UIKit pop on iOS). Tapping the active tab does not remount it.
- Contact creation/edit sheets resize around the keyboard, scroll their contents, keep buttons tappable, and include explicit keyboard dismissal. Login, send, swap and backup forms also support keyboard dismissal.
- Payment history matches the counterparty’s complete address to saved contacts in either direction, follows contact renames, and retains shortened addresses for unknown parties. The chat greeting uses the signed-in display name.
- Add a contact by a complete Stellar address (checksum verified) or a verified Movya email. Unknown/unverified emails are rejected. Duplicate addresses are rejected per owner.
- Favorite, rename, search and delete contacts. Send and chat use the same saved list. `Envía 0.1 XLM a Juan` opens the real review screen when Juan is saved. Duplicate names require choosing a contact. Email destinations are resolved again before review.
- **Pedir fondos en XLM** calls Friendbot and refreshes the balance. Friendbot determines eligibility; it is not an unlimited refill service.
- **Pedir fondos en USDC** enables the official USDC trustline if needed (requires XLM for reserve/fee), copies the address, and opens Circle's faucet. Choose **USDC → Stellar Testnet**, paste the address and complete Circle's request. Circle uses CAPTCHA and rate limits, so this button does not claim automatic token delivery. Refresh the balance after returning.

## Data and security boundaries

Supabase Auth handles passwords and session tokens. Native session tokens and private keys use Expo SecureStore, scoped by user. Long auth sessions are chunked into Keychain items with an atomic manifest. Web session tokens use browser storage; the secret is never stored in browser storage.

The backup is encrypted locally with AES-256-GCM and PBKDF2-SHA256 (600,000 iterations, fresh 16-byte salt and 12-byte nonce). Authenticated data binds it to the user ID, public key, version and Testnet. New version-2 backups encrypt both the secret and mnemonic. Legacy version-1 backups remain readable and immutable. No plaintext Stellar secret or mnemonic is stored in the database. Supabase Auth receives the login password over HTTPS; this password-based prototype trusts the authentication provider and is not a provider-independent recovery design.

Backups are immutable through the client API. The registration RPC validates the authenticated, verified user and returns the existing record on retries, including races between devices. Failure to read or decrypt an existing backup never creates a replacement wallet. Profiles, contacts and backup reads are restricted by owner using RLS; exact verified-email lookup returns only the public address, never a list or a backup. Email lookup should gain server-side rate limiting before a public rollout.

This is a Testnet prototype, not a production wallet. In-app password reset/change and importing a saved phrase/private key after losing the original password are not implemented: resetting the Supabase password alone will not decrypt the existing wallet backup. A separately saved mnemonic or private key can restore the address in a compatible external Stellar wallet. Account-0 derivation is BIP39 (empty passphrase) plus SLIP-0010 ed25519 at `m/44'/148'/0'`, following SEP-0005. Do not use these Testnet keys for mainnet funds. Production account recovery, passkeys, abuse protection, sponsorship and independent security review remain future work.

## Validation

`npm test` runs real Postgres SQL via PGlite for migrations, RLS, verified-email lookup, contact CRUD and immutable wallet registration. It also checks encryption integrity, wrong passwords/owners, restoring the same address across devices, legacy backup compatibility, and failure without replacement. Additional tests verify the official SEP-0005 vector, 12-word round trips, encrypted mnemonic recovery, and password/owner verification before secret disclosure. Cache tests cover retaining the same words/address, upgrading old local entries, changed backups/owners/addresses, and cancellation. Both key-derivation engines are compared with Node's PBKDF2 at 600,000 rounds using a Unicode password. Access-flow, contact-history, greeting, XLM summary, navigation-direction and clipboard cleanup/account-change tests cover these UX changes. Existing payment tests remain included.

`npm run typecheck` and `npx expo export --platform ios --platform web` validate compilation. Hosted Supabase email delivery, real login and iPhone interaction require the configured project and manual verification; local database tests do not claim to cover those services.

Manual acceptance: register two verified users, request XLM, add one by email, send 0.1 XLM, verify the ledger receipt, rename/favorite the contact, logout/login and check the same address/contact, then sign in on another device and verify the same words and address. On the iPhone, manually verify hiding when leaving the screen/backgrounding and native capture prevention. Never use mainnet funds.

References: [Supabase React Native Auth](https://supabase.com/docs/guides/auth/quickstarts/react-native), [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security), [Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [Circle faucet](https://faucet.circle.com/).
