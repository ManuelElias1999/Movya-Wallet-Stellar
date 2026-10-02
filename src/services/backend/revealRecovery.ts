import { validateRecoveryMaterial, type RecoveryMaterial } from '../stellar/recovery';

// Authenticate before even reading a private key. Recheck the identity after
// async work so an account switch cannot reveal another user's material.
export async function revealRecovery(input: {
  owner: string; password: string; stillCurrent: () => boolean;
  authenticate: (password: string) => Promise<string>;
  read: () => Promise<RecoveryMaterial | null>;
}): Promise<RecoveryMaterial> {
  if (!input.password || !input.stillCurrent()) throw new Error('Confirma tu contraseña para ver el respaldo.');
  const verifiedOwner = await input.authenticate(input.password);
  if (verifiedOwner !== input.owner || !input.stillCurrent()) throw new Error('La sesión cambió. Vuelve a ingresar.');
  const material = await input.read();
  if (!material || !input.stillCurrent()) throw new Error('No se pudo abrir el respaldo de esta cuenta.');
  validateRecoveryMaterial(material);
  return { secret: material.secret, ...(material.mnemonic ? { mnemonic: material.mnemonic } : {}) };
}
