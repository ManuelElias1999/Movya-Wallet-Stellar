import { sha1 } from '@noble/hashes/legacy.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { Buffer } from 'buffer';

// With v3, Supabase Auth only ever sees the derived login secret, so its
// leaked-password protection cannot judge the real password. This check runs
// on the device instead, using Have I Been Pwned's k-anonymity range API: only
// the first 5 characters of the password's SHA-1 leave the phone.
// Network problems do not block registration (fail open).
export async function assertPasswordNotLeaked(password: string, fetcher: typeof fetch = fetch) {
  const hash = bytesToHex(sha1(Uint8Array.from(Buffer.from(password, 'utf8')))).toUpperCase();
  const prefix = hash.slice(0, 5), suffix = hash.slice(5);
  let body: string;
  try {
    const response = await fetcher(`https://api.pwnedpasswords.com/range/${prefix}`, { headers: { 'Add-Padding': 'true' }, signal: AbortSignal.timeout(8_000) });
    if (!response.ok) return;
    body = await response.text();
  } catch { return; }
  const leaked = body.split('\n').some(line => {
    const [candidate, count] = line.trim().split(':');
    return candidate === suffix && Number(count) > 0;
  });
  if (leaked) throw new Error('Esta contraseña aparece en filtraciones públicas de datos. Elige otra que no uses en ningún otro sitio.');
}
