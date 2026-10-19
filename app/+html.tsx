import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Web shell. In production builds a Content Security Policy limits scripts to
// Movya's own bundle and network calls to the services the wallet uses, so an
// injected script cannot load code or send keys elsewhere. Styles need
// 'unsafe-inline' because React Native Web injects them at runtime.
// Set EXPO_PUBLIC_WEB_CSP=off only to debug a blocked resource.
const supabase = (() => { try { return new URL(process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').origin; } catch { return ''; } })();
const policy = [
  "default-src 'self'",
  // Expo Router emits this exact, constant hydration marker inline. A hash
  // allows only that marker without opening script-src to all inline code.
  "script-src 'self' 'sha256-67fhrP0+BkBqmgGGXTtgiVO/9EQs3QruYNU/7fnRkI8='",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${supabase} https://horizon-testnet.stellar.org https://friendbot.stellar.org https://api.pwnedpasswords.com`.replace(/\s+/g, ' '),
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');
const enabled = process.env.NODE_ENV === 'production' && process.env.EXPO_PUBLIC_WEB_CSP !== 'off';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        {enabled ? <meta httpEquiv="Content-Security-Policy" content={policy} /> : null}
        <meta name="referrer" content="no-referrer" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
