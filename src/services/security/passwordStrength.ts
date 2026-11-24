// Local password rules. With backup v3 Supabase only sees a derived secret,
// so it can no longer judge the real password; these checks (and the leaked
// password check in backend/passwordPolicy.ts) run on the device instead.
// Keep the rules explicit and predictable so the UI can explain every failure.
export const MIN_PASSWORD_LENGTH = 10;

export type PasswordCheck = { ok: boolean; problems: string[] };
export function checkPasswordStrength(password: string, _context: { email?: string; name?: string } = {}): PasswordCheck {
  const problems: string[] = [];
  if (password.length < MIN_PASSWORD_LENGTH) problems.push(`Usa al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  if (!/[A-Z]/.test(password)) problems.push('Incluye al menos una letra mayúscula.');
  if (!/[a-z]/.test(password)) problems.push('Incluye al menos una letra minúscula.');
  if (!/[0-9]/.test(password)) problems.push('Incluye al menos un número.');
  if (!/[^A-Za-z0-9\s]/.test(password)) problems.push('Incluye al menos un carácter especial.');
  return { ok: problems.length === 0, problems };
}
export function assertStrongPassword(password: string, confirmation: string, context: { email?: string; name?: string } = {}) {
  if (password !== confirmation) throw new Error('Las contraseñas no coinciden.');
  const check = checkPasswordStrength(password, context);
  if (!check.ok) throw new Error(check.problems[0]);
}
