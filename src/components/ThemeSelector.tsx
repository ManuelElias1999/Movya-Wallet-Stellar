import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Pressable, Text } from '@/i18n/primitives';
import { useTheme, useThemedStyles } from '@/theme/Theme';
import type { ThemeColors, ThemeMode } from '@/theme/tokens';

const options = [
  { mode: 'light', label: 'Claro', icon: 'sunny-outline' },
  { mode: 'dark', label: 'Oscuro', icon: 'moon-outline' },
] as const;

export function ThemeSelector() {
  const { styles, colors, mode, setMode } = useThemedStyles(createStyles);
  return <View accessibilityRole="radiogroup" accessibilityLabel="Apariencia" style={styles.selector}>
    {options.map(option => <Pressable key={option.mode} accessibilityRole="radio" accessibilityLabel={`Modo ${option.label.toLowerCase()}`} accessibilityState={{ checked: mode === option.mode }} onPress={() => setMode(option.mode)} style={[styles.option, mode === option.mode && styles.selected]}>
      <Ionicons name={option.icon} size={17} color={mode === option.mode ? colors.brandDark : colors.muted} />
      <Text style={[styles.label, mode === option.mode && styles.selectedLabel]}>{option.label}</Text>
    </Pressable>)}
  </View>;
}

export function ThemeToggle() {
  const { colors, mode, setMode } = useTheme();
  const next: ThemeMode = mode === 'dark' ? 'light' : 'dark';
  return <Pressable accessibilityRole="button" accessibilityLabel={next === 'light' ? 'Activar modo claro' : 'Activar modo oscuro'} onPress={() => setMode(next)} style={[toggleStyle, { backgroundColor: colors.surfaceElevated }]}>
    <Ionicons name={next === 'light' ? 'sunny-outline' : 'moon-outline'} size={21} color={colors.ink} />
  </Pressable>;
}

const toggleStyle = { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' } as const;
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  selector: { flexDirection: 'row', gap: 4, backgroundColor: colors.background, padding: 4, borderRadius: 16, borderWidth: 1, borderColor: colors.border, marginTop: 12 },
  option: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12 },
  selected: { backgroundColor: colors.brandSoft }, label: { color: colors.muted, fontSize: 13, fontWeight: '700' }, selectedLabel: { color: colors.brandDark },
});
