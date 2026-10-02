export const tabOrder = ['home', 'activity', 'contacts', 'account'] as const;
export type NavigationTab = typeof tabOrder[number];
export function tabDirection(from: NavigationTab, to: NavigationTab) {
  return tabOrder.indexOf(to) < tabOrder.indexOf(from) ? 'backward' : 'forward';
}
export function displayName(metadata?: Record<string, unknown>) {
  const value = metadata?.display_name;
  return typeof value === 'string' && value.trim() ? value.trim() : 'Usuario';
}
export function formatXlmBalance(balances?: { assetCode: string; balance: string }[]) {
  const balance = balances?.find(item => item.assetCode === 'XLM')?.balance ?? '0';
  if (!/^\d+(\.\d{1,7})?$/.test(balance)) return '0 XLM';
  const [whole, fraction = ''] = balance.split('.');
  const decimals = fraction.replace(/0+$/, '');
  return `${BigInt(whole).toLocaleString('es-BO')}${decimals ? `,${decimals}` : ''} XLM`;
}
export function paymentDescription(received: boolean, address: string, contacts: { address?: string; name: string }[]) {
  const contact = contacts.find(item => item.address === address);
  const shortAddress = `${address.slice(0, 5)}…${address.slice(-4)}`;
  return {
    title: `${received ? 'Recibiste dinero de' : 'Enviaste dinero a'}${contact ? ` ${contact.name}` : ''}`,
    detail: shortAddress,
  };
}
