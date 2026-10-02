export type NativePasswordKey = (password: Uint8Array, salt: Uint8Array, iterations: number) => Promise<Uint8Array>;
// Metro selects the .native implementation on iOS/Android. Web and Node keep
// WebCrypto/the portable implementation without importing React Native.
export const nativePasswordKey: NativePasswordKey | null = null;
