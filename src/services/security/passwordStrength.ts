// Local password rules. With backup v3 Supabase only sees a derived secret,
// so it can no longer judge the real password; these checks (and the leaked
// password check in backend/passwordPolicy.ts) run on the device instead.
// Lightweight on purpose: no new dependency in the wallet bundle.
const COMMON = [
  'password', 'contraseña', 'contrasena', 'qwerty', 'asdfgh', 'zxcvbn', 'iloveyou', 'admin', 'welcome', 'bienvenido',
  'letmein', 'monkey', 'dragon', 'football', 'futbol', 'baseball', 'princess', 'sunshine', 'master', 'shadow',
  'superman', 'batman', 'trustno1', 'movya', 'wallet', 'stellar', 'bitcoin', 'crypto', 'teamo', 'tequiero',
  'bolivia', 'mexico', 'argentina', 'colombia', 'peru', 'chile', 'america', 'jesus', 'cristo', 'dios',
];
const SEQUENCES = ['0123456789', 'abcdefghijklmnopqrstuvwxyz', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

export type PasswordCheck = { ok: boolean; problems: string[] };
export function checkPasswordStrength(password: string, context: { email?: string; name?: string } = {}): PasswordCheck {
  const problems: string[] = [];
  const lower = password.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (password.length < 12) problems.push('Usa al menos 12 caracteres.');
  if (new Set(password).size < 6) problems.push('Usa más caracteres distintos.');
  if (/(.)\1{3,}/.test(password)) problems.push('Evita repetir el mismo carácter.');
  const compact = lower.replace(/[^a-z0-9]/g, '');
  if (SEQUENCES.some(sequence => { for (let i = 0; i + 5 <= sequence.length; i++) if (compact.includes(sequence.slice(i, i + 5)) || compact.includes([...sequence.slice(i, i + 5)].reverse().join(''))) return true; return false; })) {
    problems.push('Evita secuencias como 12345, abcde o qwert.');
  }
  const stripped = compact.replace(/[0-9]+$/, '').replace(/^[0-9]+/, '');
  if (COMMON.some(word => stripped === word || (stripped.length - word.length < 4 && stripped.includes(word)))) problems.push('Es una contraseña demasiado común.');
  const personal = [context.email?.split('@')[0], ...(context.name ?? '').split(/\s+/)]
    .map(value => (value ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''))
    .filter(value => value.length >= 4);
  if (personal.some(value => compact.includes(value.replace(/[^a-z0-9]/g, '')))) problems.push('No uses tu nombre ni tu correo en la contraseña.');
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(rule => rule.test(password)).length;
  if (classes < 2 && password.length < 16) problems.push('Combina letras con números o símbolos, o usa una frase más larga.');
  return { ok: problems.length === 0, problems };
}
export function assertStrongPassword(password: string, confirmation: string, context: { email?: string; name?: string } = {}) {
  if (password !== confirmation) throw new Error('Las contraseñas no coinciden.');
  const check = checkPasswordStrength(password, context);
  if (!check.ok) throw new Error(check.problems[0]);
}
