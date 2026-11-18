import { requireBackend } from './client';

// Two-step verification (TOTP, for example Google Authenticator) through
// Supabase Auth MFA. Once a factor is verified, sign-in needs the 6-digit
// code, and the database refuses sensitive changes (backup replacement,
// device revocation, discoverability, contact backup) without it.
export class MfaRequiredError extends Error {
  constructor() { super('Escribe el código de 6 dígitos de tu app de autenticación.'); this.name = 'MfaRequiredError'; }
}
export const isMfaRequired = (error: unknown) => (error as { name?: string } | null)?.name === 'MfaRequiredError';

export async function verifiedTotpFactors() {
  const result = await requireBackend().auth.mfa.listFactors();
  if (result.error) throw result.error;
  return result.data.totp.filter(factor => factor.status === 'verified');
}
export async function verifiedTotpFactor() { return (await verifiedTotpFactors())[0] ?? null; }
export async function needsSecondFactor() {
  const result = await requireBackend().auth.mfa.getAuthenticatorAssuranceLevel();
  if (result.error) throw result.error;
  return result.data.nextLevel === 'aal2' && result.data.currentLevel !== 'aal2';
}
export async function completeSecondFactor(code: string) {
  if (!/^\d{6}$/.test(code.trim())) throw new Error('El código debe tener 6 números.');
  const factors = await verifiedTotpFactors();
  if (!factors.length) throw new Error('No encontramos tu verificación en dos pasos.');
  for (const factor of factors) {
    const result = await requireBackend().auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.trim() });
    if (!result.error) return;
  }
  throw new Error('El código no es correcto o ya expiró.');
}
export async function startTotpEnrollment() {
  const db = requireBackend();
  // Remove abandoned, unverified enrollments first.
  const existing = await db.auth.mfa.listFactors();
  if (!existing.error) for (const factor of existing.data.all) if (factor.status !== 'verified') await db.auth.mfa.unenroll({ factorId: factor.id });
  const verified = existing.error ? 0 : existing.data.totp.filter(factor => factor.status === 'verified').length;
  const result = await db.auth.mfa.enroll({ factorType: 'totp', friendlyName: verified ? `Movya respaldo ${verified + 1}` : 'Movya principal' });
  if (result.error) throw result.error;
  return { factorId: result.data.id, uri: result.data.totp.uri, secret: result.data.totp.secret };
}
export async function confirmTotpEnrollment(factorId: string, code: string) {
  if (!/^\d{6}$/.test(code.trim())) throw new Error('El código debe tener 6 números.');
  const result = await requireBackend().auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
  if (result.error) throw new Error('El código no es correcto. Revisa la hora de tu teléfono y vuelve a intentarlo.');
}
export async function disableTotp() {
  for (const factor of await verifiedTotpFactors()) {
    const result = await requireBackend().auth.mfa.unenroll({ factorId: factor.id });
    if (result.error) throw result.error;
  }
}
