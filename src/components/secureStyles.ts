import { StyleSheet } from 'react-native';
import { colors } from '@/theme/tokens';

// Shared look for the security screens (same as the backup screen).
export const secureStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, content: { padding: 20, maxWidth: 760, width: '100%', alignSelf: 'center' }, card: { padding: 20, backgroundColor: colors.surface, borderRadius: 24, marginBottom: 14 },
  icon: { width: 58, height: 58, borderRadius: 19, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }, title: { color: colors.ink, fontSize: 19, fontWeight: '800', lineHeight: 26 },
  subtitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  copy: { color: colors.text, fontSize: 13, lineHeight: 21, marginTop: 10 }, notice: { color: colors.brandDark, fontSize: 12, lineHeight: 20, padding: 14, backgroundColor: colors.brandSoft, borderRadius: 14, marginTop: 16 },
  warning: { color: colors.danger, fontSize: 12, lineHeight: 20, padding: 14, backgroundColor: colors.dangerSoft, borderRadius: 14, marginTop: 16 },
  label: { color: colors.ink, fontSize: 13, fontWeight: '700', marginTop: 18 }, hint: { color: colors.muted, fontSize: 11, marginTop: 6 },
  field: { minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: 14, marginTop: 10, flexDirection: 'row', alignItems: 'center', paddingRight: 4, paddingLeft: 4 }, input: { flex: 1, minWidth: 0, minHeight: 52, color: colors.ink, padding: 12 },
  button: { minHeight: 52, padding: 12, borderRadius: 16, backgroundColor: colors.brand, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 }, buttonText: { color: 'white', fontSize: 14, fontWeight: '800' },
  danger: { backgroundColor: '#C23A51' },
  secondary: { minHeight: 48, padding: 12, borderRadius: 16, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center', marginTop: 12 }, secondaryText: { color: colors.brandDark, fontSize: 13, fontWeight: '700' }, disabled: { opacity: 0.45 },
  words: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }, word: { width: '47%', minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9, padding: 10, backgroundColor: colors.surfaceSoft, borderRadius: 12 }, number: { fontSize: 11, color: colors.muted, width: 18 }, wordText: { fontSize: 14, color: colors.ink, fontWeight: '700' },
  mono: { fontSize: 13, lineHeight: 20, color: colors.ink, padding: 12, backgroundColor: colors.surfaceSoft, borderRadius: 12, marginTop: 10 },
});
