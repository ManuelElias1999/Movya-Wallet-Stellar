export const tabOrder = ['home', 'activity', 'contacts', 'account'] as const;
export type NavigationTab = typeof tabOrder[number];
export function tabForPath(path: string): NavigationTab | undefined {
  const pathname = path.split('?')[0].replace(/\/$/, '') || '/';
  return ({ '/': 'home', '/(tabs)': 'home', '/activity': 'activity', '/contacts': 'contacts', '/settings': 'account' } as Record<string, NavigationTab>)[pathname];
}
export function displayName(metadata?: Record<string, unknown>) {
  const value = metadata?.display_name;
  return typeof value === 'string' && value.trim() ? value.trim() : 'Usuario';
}
export function formatEnteredAmount(value: string) {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return value;
  const [whole, fraction = ''] = normalized.split('.');
  const cleanWhole = whole.replace(/^0+(?=\d)/, '');
  const cleanFraction = fraction.replace(/0+$/, '');
  return cleanFraction ? `${cleanWhole}.${cleanFraction}` : cleanWhole;
}
export function formatReceivedAmount(value: string) {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{0,7})?$/.test(normalized)) return value;
  const [whole, fraction = ''] = normalized.split('.');
  const padded = fraction.padEnd(7, '0');
  const units = BigInt(whole || '0') * 10_000_000n + BigInt(padded || '0');
  const cents = (units + 50_000n) / 100_000n;
  return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
}
export function formatXlmBalance(balances?: { assetCode: string; balance: string }[], locale = 'es-BO') {
  const balance = balances?.find(item => item.assetCode === 'XLM')?.balance ?? '0';
  if (!/^\d+(\.\d{1,7})?$/.test(balance)) return '0 XLM';
  const [whole, fraction = ''] = balance.split('.');
  const decimals = fraction.replace(/0+$/, '');
  // The app supports Spanish and English. Format the decimal string directly:
  // Expo Go/Hermes may not provide Intl.formatToParts or BigInt locale methods.
  // Keeping strings also preserves all seven Stellar decimal places.
  const english = /^en(?:-|$)/i.test(locale);
  const separator = english ? '.' : ',';
  const grouped = whole.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, english ? ',' : '.');
  return `${grouped}${decimals ? `${separator}${decimals}` : ''} XLM`;
}
export function paymentDescription(received: boolean, address: string, contacts: { address?: string; name: string }[]) {
  const contact = contacts.find(item => item.address === address);
  const shortAddress = `${address.slice(0, 5)}…${address.slice(-4)}`;
  return {
    title: `${received ? 'Recibiste dinero de' : 'Enviaste dinero a'}${contact ? ` ${contact.name}` : ''}`,
    detail: shortAddress,
  };
}
