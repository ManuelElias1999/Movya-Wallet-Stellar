// Address-poisoning and new-recipient checks shown on every payment review.
// Attackers send dust from addresses that share the first and last characters
// of a real counterparty, hoping the victim copies the wrong one from history.
export type KnownRecipient = { address: string; label: string };
export type RecipientRisk = {
  isNew: boolean;                 // never paid and not a saved contact
  lookalike?: KnownRecipient;     // different address that looks like a known one
  large: boolean;                 // large amount or a big share of the balance
  needsExtraConfirmation: boolean;
};

export const LARGE_AMOUNT = { XLM: 100, USDC: 50 } as const;
const PREFIX = 4; // "G" + 3 characters: what most wallets show when abbreviating
const SUFFIX = 4;

export function looksAlike(a: string, b: string) {
  if (a === b) return false;
  return a.slice(0, PREFIX) === b.slice(0, PREFIX) || a.slice(-SUFFIX) === b.slice(-SUFFIX);
}

export function assessRecipient(input: { destination: string; known: KnownRecipient[]; amount: string; asset: 'XLM' | 'USDC'; balance?: string }): RecipientRisk {
  const isNew = !input.known.some(entry => entry.address === input.destination);
  const lookalike = input.known.find(entry => looksAlike(entry.address, input.destination));
  const amount = Number(input.amount), balance = Number(input.balance ?? 'NaN');
  const large = amount >= LARGE_AMOUNT[input.asset] || (balance > 0 && amount >= balance / 2);
  return { isNew, ...(lookalike ? { lookalike } : {}), large, needsExtraConfirmation: Boolean(lookalike) || (isNew && large) };
}

// "GABC DEFG HIJK …": easier to compare in full than a truncated address.
export function groupAddress(address: string) {
  return address.replace(/(.{4})/g, '$1 ').trim();
}
