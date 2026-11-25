export function accessSteps(newAccount: boolean, backupAcknowledged: boolean) {
  return { needsBackup: newAccount && !backupAcknowledged, needsOnboarding: newAccount };
}

export function accountAccessSteps(input: {
  previousOwner: string | null; owner: string; currentNeedsBackup: boolean; currentNeedsOnboarding: boolean;
  newAccount: boolean; backupAcknowledged: boolean;
}) {
  const next = accessSteps(input.newAccount, input.backupAcknowledged);
  const sameAccount = input.previousOwner === input.owner;
  return {
    needsBackup: sameAccount ? input.currentNeedsBackup || !input.backupAcknowledged || next.needsBackup : !input.backupAcknowledged || next.needsBackup,
    needsOnboarding: sameAccount ? input.currentNeedsOnboarding || next.needsOnboarding : next.needsOnboarding,
  };
}
