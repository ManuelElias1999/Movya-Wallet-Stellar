import type { ThemeColors } from '@/theme/tokens';
import { useThemedStyles } from '@/theme/Theme';
import { StyleSheet, View } from 'react-native';
import { Pressable, Text } from '@/i18n/primitives';
import { useLanguage } from '@/i18n/Language';

export function LanguageSelector() {
  const { styles } = useThemedStyles(createStyles);
  const { language, setLanguage } = useLanguage();
  return <View style={styles.row} accessibilityRole="radiogroup">
    {(['es', 'en'] as const).map(value => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={value === 'es' ? 'Español' : 'English'} accessibilityState={{ checked: language === value }} onPress={() => setLanguage(value)} style={[styles.button, language === value && styles.selected]}>
      <Text translate={false} style={[styles.label, language === value && styles.selectedLabel]}>{value === 'es' ? 'Español' : 'English'}</Text>
    </Pressable>)}
  </View>;
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  row: { flexDirection: 'row', borderRadius: 16, backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border, padding: 3, marginVertical: 12 },
  button: { flex: 1, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 }, selected: { backgroundColor: '#214CB4' }, label: { color: colors.muted, fontWeight: '800', fontSize: 12 }, selectedLabel: { color: '#FFFFFF' },
});
