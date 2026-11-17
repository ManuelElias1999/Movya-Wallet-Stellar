# Movya security model

Movya is a self-custodial wallet: keys are created and used on the device. Supabase stores profiles, contacts and an **encrypted** backup it cannot open. This document describes the protections added on the `security` branch, their limits and the configuration they need. It is not an audit; an external audit is still required before Mainnet.

## 1. Pinned contact addresses

- When a contact is added, the address resolved on the device is pinned in SecureStore (one item per contact, per account).
- A payment to a saved contact uses **only** the pinned address. The contact row and the email directory are consulted to *detect* a change, never to choose the destination.
- Any difference stops the payment and shows the saved and new address. Nothing changes without an explicit tap.
- Contacts without a local pin (new device, contacts saved before this change) require confirming the full address before the first payment.
- Code: `src/services/backend/contactPins.ts`, `contactPinStore.ts`, `src/components/confirmContactAddress.ts`. Tests: `tests/contact-pins.test.ts`.

## 2. Biometrics and automatic lock

- The local wallet is split: metadata (account, signer public key, flags) and the **secret** (key and words). The secret is stored with `requireAuthentication`, so every signature and every backup reveal shows Face ID / Touch ID / fingerprint.
- Existing wallets are migrated on first read; the key leaves the plain metadata item.
- If biometrics change or the prompt is dismissed at sign-in, the wallet opens from the encrypted backup with the password.
- Devices without biometrics keep an unprotected item (reported in Seguridad); the app lock and password are the protection there.
- Cold start never opens the wallet by itself. The app locks after 30 s in the background or 5 min without touches.
- Code: `walletStore.ts`, `storage.ts`, `src/services/security/appLock.ts`, `AuthContext.tsx`. Tests: `wallet-store.test.ts`, `app-lock.test.ts`.

## 3. Restricted signer

The device key signs only the transaction shapes Movya offers, independently of the upstream review checks:

| Allowed | Shape |
|---|---|
| Payment | 1 `payment`, XLM or verified USDC, to another account |
| Swap | `payment` fee to the Movya treasury + `pathPaymentStrictSend` back to the same account |
| Trustline | 1 `changeTrust` for verified USDC, never limit 0 |
| Recovery setup | 1 `setOptions` with exactly the kit key (weight 2), master weight 1, thresholds 1/1/2 |

Also required: source = the wallet's account, no prior signatures, no memo, fee ≤ 0.1 XLM, expiration ≤ 10 minutes. Before the biometric prompt the signer checks on-chain that this device key is still active. Code: `signingPolicy.ts`, `TestnetWalletContext.tsx`. Tests: `signing-policy.test.ts`, `signing-policy-sdk.test.ts`.

## 4. Email discovery

- Each person can turn off "Encontrarme por correo" (Seguridad).
- `resolve_movya_email` allows 30 different emails per account per rolling day; repeating a known email (saved contacts are re-checked before each payment) is not counted. Only an md5 of the normalized email is stored.

## 5. Backup v3: separate login and encryption keys

```
password ─PBKDF2-SHA256 (600k, per-account salt)─▶ master ─HKDF "movya/v3/login"──▶ login secret → Supabase Auth
                                                          └HKDF "movya/v3/backup"─▶ backup key  → never leaves the device
```

- Supabase Auth receives only the login secret (`Mv3!` + 64 hex). Capturing it allows signing in, not decrypting the backup without guessing the password offline. HKDF does not strengthen a weak password; the slow KDF and the 12-character minimum do.
- The salt is fetched before sign-in from `movya_login_params`. Unknown emails get a stable fake salt, so the endpoint does not reveal whether an account exists. Salts are immutable once set.
- Because Supabase no longer sees the real password, the leaked-password check runs on the device (Have I Been Pwned range API, 5-character SHA-1 prefix; fails open offline).
- **Migration** of existing accounts happens after a successful legacy sign-in: claim salt → encrypt v3 → stage → download and decrypt → promote → change the Supabase password to the login secret. The typed password opens the active backup at every step, so an interruption never locks anyone out; the next sign-in finishes it. The previous backup is kept in `previous_backup`.
- Sign-in tries v3 first and falls back to the legacy password.

## 6. Restore with 12 words

A password reset by email restores account access but not the backup. "Recuperar acceso" accepts the wallet's own 12 words (restores the same key and re-encrypts it as v3 with the current password) or the recovery kit (next section).

## 7. Recovery kit and key rotation

| Signer | Weight |
|---|---|
| Device key | 1 |
| Recovery kit (12 separate words, on paper only) | 2 |

Thresholds: low 1, medium 1, high 2. The phone can pay and swap but cannot add or remove signers. From another device, the kit authorizes a new device key and disables every other device key (`setOptions`, master weight 0). The new key's backup is staged before the on-chain rotation and promoted after it; a failed rotation changes nothing.

**Limitation:** a thief who has the unlocked phone *and* passes its biometrics can still pay out the balance before the owner reacts. Rotation stops further use; it cannot undo payments. Spending limits or delays need a Soroban smart wallet (future stage).

## 8. Payment review: new and look-alike recipients

- Every review shows the full destination address.
- A recipient that is neither a saved contact nor a previous payee is marked as new.
- An address that shares the first 4 or last 4 characters with a known one (address poisoning) shows both addresses in groups of four.
- Look-alike addresses, and large payments (≥ 100 XLM, ≥ 50 USDC or half the balance) to new recipients, need a second deliberate tap.
- An identical payment (same source, destination, amount and asset) within 2 minutes is stopped; retrying the same transaction is always allowed.
- Pins record when each contact address was verified.

## 9. Movya PIN

Optional 6-digit PIN that unlocks the app. It never encrypts or opens the key: signing still needs biometrics. Waits grow after 5 failures (30 s → 1 h); after 10 the PIN is erased and the password is required. Stored as a PBKDF2 hash. On a compromised phone the local counter could be reset, which is why the PIN alone never reaches the key.

## 10. Devices and sessions

- Each installation registers a random device id (`devices` table). The Security screen lists devices with first and last access.
- A device can be revoked, or all other devices at once (also ends their Supabase sessions). A revoked device signs out and erases its local wallet the next time it reaches the server.
- New devices trigger a "new sign-in" alert on the others.
- Rotating with the recovery kit revokes every other device automatically.
- Revoking a session never invalidates a key already copied off a phone; rotation does.

## 11. Two-step verification (TOTP)

- Optional factor through Supabase Auth MFA, enrolled with a QR code.
- Sign-in, unlock with password and restore ask for the 6-digit code when enabled.
- The database refuses backup replacement, device revocation, discoverability changes, contact-backup writes and wallet replacement without an `aal2` session (`movya_private.assert_sensitive_session`).
- Revealing the backup checks the password against the encrypted backup instead of signing in again.

## 12. Encrypted contact backup

- A third HKDF output (`movya/v3/contacts`) encrypts the verified contact addresses in `contact_backups`, separately from the wallet backup.
- Writes are compare-and-swap on a version number; each copy links the hash of the previous one.
- A device remembers the last version it saw and refuses older or altered copies (partial rollback protection: a brand-new device can only trust what it receives).
- On a new device, pins are restored from this backup, so contacts verified elsewhere do not need confirming again.

## 13. Emergency transfer

When rotation is impossible or the account configuration looks damaged, "Mover todo a una wallet nueva" creates a wallet with new words (written down and confirmed first), then in one transaction: creates it, opens its USDC line, moves USDC, closes the old line and merges the old account (or, if a recovery kit prevents the device from merging, pays out XLM and leaves the minimum reserve). The account then points to the new wallet (`replace_wallet_account`, at most once every 7 days, previous address kept). The new key waits behind biometrics until the switch completes, and an interrupted transfer is finished at the next sign-in. The signer accepts this shape only towards the wallet created in that flow.

## 14. Web

- Production builds ship a Content Security Policy: scripts only from the app's origin, network only to Supabase, Horizon Testnet, Friendbot and the leaked-password API, no plugins, no form posts.
- `EXPO_PUBLIC_WEB_SIGNING=off` makes the web build view-only.
- Keys on web live only in memory; sessions in `localStorage`.

## Backup format versions

| Version | Payload | Key | KDF |
|---|---|---|---|
| 1 | secret | PBKDF2-SHA256(password, random salt) | 600,000 iterations |
| 2 | secret + words | same as v1 | 600,000 iterations |
| 3 | secret + words (+ account after rotation) | HKDF-SHA256(PBKDF2(password, account salt), "movya/v3/backup") | 600,000 iterations |

All versions use AES-256-GCM with a random 96-bit nonce and AAD `movya:testnet:v{version}:{user}:{account}`. The table keeps `created_at`, `updated_at`, `previous_backup` and, after an emergency transfer, `previous_public_key`.

## Supabase configuration checklist

- Auth → Email: confirmations enabled.
- Auth → Rate limits: keep defaults or stricter for sign-in, sign-up and OTP.
- Auth → Sessions: set a time-box / inactivity timeout and short JWT expiry.
- Auth → Secure password change: enabled (Movya changes the password right after sign-in).
- Auth → Multi-factor: enable TOTP.
- Run `supabase/migrations/20261019010000_devices_contacts_mfa.sql`.
- Run `supabase/migrations/20261019000000_security_hardening.sql`.

## Network provider

Horizon's synchronous submit only reports success once the transaction is in a ledger; an uncertain result is never retried blindly but checked by hash, and identical payments are blocked for 2 minutes. There is no second public Testnet Horizon without API keys, so a fallback provider is left for Mainnet configuration.

## Not covered yet

- External security audit, penetration test and bug bounty.
- Argon2id instead of PBKDF2.
- Soroban smart wallet with spending limits, delays and session keys.
- A second network provider and response comparison.
- Email alerts for new sign-ins (in-app alerts exist).
- Organisational items: GitHub branch protection and 2FA, domain lock and DNSSEC, separate Testnet/Mainnet projects and keys, incident response process and security contact.
