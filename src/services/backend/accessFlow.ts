export function accessSteps(newAccount: boolean, backupAcknowledged: boolean) {
  return { needsBackup: newAccount && !backupAcknowledged, needsOnboarding: newAccount };
}
