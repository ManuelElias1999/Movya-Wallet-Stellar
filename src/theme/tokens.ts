export const darkColors = {
  brand: '#4C8DFF',
  brandDark: '#9EC5FF',
  brandSoft: '#162B4D',
  brandIce: '#294A78',
  navy: '#020817',
  ink: '#F5F8FC',
  text: '#D9E2EE',
  muted: '#93A3B8',
  background: '#080D16',
  pageBackground: '#0A111C',
  surface: '#111A29',
  surfaceElevated: '#172235',
  surfaceSoft: '#142033',
  border: '#29384D',
  positive: '#3BD6A2',
  positiveSoft: '#102E29',
  warning: '#F1B35B',
  warningSoft: '#352818',
  danger: '#FF7C91',
  dangerSoft: '#351B24',
  chatBackground: '#0A101A',
  glassStart: 'rgba(15,35,64,0.97)',
  glassEnd: 'rgba(20,61,91,0.94)',
} as const;

export type ThemeColors = { [K in keyof typeof darkColors]: string };

export const lightColors: ThemeColors = {
  brand: '#176BFF', brandDark: '#073B8C', brandSoft: '#E8F1FF', brandIce: '#CFE2FF',
  navy: '#0B2348', ink: '#0B1830', text: '#21314D', muted: '#60708A',
  background: '#F5F7FB', pageBackground: '#EAF3FF', surface: '#FFFFFF',
  surfaceElevated: '#F0F4FA', surfaceSoft: '#EFF5FC', border: '#DCE6F2',
  positive: '#087F58', positiveSoft: '#E8F8F2', warning: '#9B5A08', warningSoft: '#FFF5E5',
  danger: '#B52D42', dangerSoft: '#FDECEF', chatBackground: '#E5EDF5',
  glassStart: 'rgba(24,86,153,0.96)', glassEnd: 'rgba(28,132,178,0.94)',
};

// Static artwork/data may use the default palette. UI subscribes through useTheme.
export const colors: ThemeColors = darkColors;
export type ThemeMode = 'light' | 'dark';
export const themeColors: Record<ThemeMode, ThemeColors> = { light: lightColors, dark: darkColors };

export const radius = {
  sm: 12,
  md: 18,
  lg: 26,
  pill: 999,
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
} as const;
