import { requireOptionalNativeModule } from 'expo';
import { Buffer } from 'buffer';
import { Platform } from 'react-native';
import type { NativePasswordKey } from './nativePasswordKey';

type PasswordKeyModule = { deriveAsync(passwordBase64: string, saltBase64: string, iterations: number): Promise<string> };
// Optional lookup deliberately keeps Expo Go working. No dynamic import of a
// JSI library that expects an installed binary, and no global crypto override.
const nativeModule = Platform.OS === 'android' && Number(Platform.Version) < 26
  ? null : requireOptionalNativeModule<PasswordKeyModule>('MovyaPasswordKey');
export const nativePasswordKey: NativePasswordKey | null = nativeModule ? async (password, salt, iterations) => {
  const result = await nativeModule.deriveAsync(Buffer.from(password).toString('base64'), Buffer.from(salt).toString('base64'), iterations);
  if (!/^[a-f0-9]{64}$/.test(result)) throw new Error('No pudimos completar el cifrado de tu respaldo.');
  return Uint8Array.from(Buffer.from(result, 'hex'));
} : null;
