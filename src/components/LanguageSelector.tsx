import { StyleSheet, View } from 'react-native';
import { Pressable, Text } from '@/i18n/primitives';
import { useLanguage } from '@/i18n/Language';
export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  return <View style={styles.row} accessibilityRole="tablist">
    {(['es', 'en'] as const).map(value => <Pressable key={value} accessibilityRole="tab" accessibilityLabel={value === 'es' ? 'Español' : 'English'} accessibilityState={{ selected: language === value }} onPress={() => setLanguage(value)} style={[styles.button, language === value && styles.selected]}>
      <Text translate={false} style={[styles.label, language === value && styles.selectedLabel]}>{value === 'es' ? 'ES' : 'EN'}</Text>
    </Pressable>)}
  </View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignSelf: 'flex-end', borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: '#B7CCE8', padding: 3, marginVertical: 8 },
  button: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 }, selected: { backgroundColor: '#214CB4' }, label: { color: '#244F7A', fontWeight: '800', fontSize: 12 }, selectedLabel: { color: '#FFFFFF' },
});
