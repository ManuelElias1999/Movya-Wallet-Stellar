export function createUnlockedWalletSession<T>() {
  let current: { owner: string; value: T } | null = null;
  return {
    open(owner: string, value: T) { current = { owner, value }; },
    clear() { current = null; },
    read(owner: string | undefined, unlocked: boolean): T | null {
      return unlocked && owner && current?.owner === owner ? current.value : null;
    },
  };
}
