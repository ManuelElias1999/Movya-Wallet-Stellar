import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/PressableScale';
import { colors } from '@/theme/tokens';

type NavigationTab = 'home' | 'activity' | 'contacts' | 'account';
type BottomNavigationProps = { active: NavigationTab; onMovyaPress?: () => void };

export function BottomNavigation({ active, onMovyaPress }: BottomNavigationProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 10);

  const openMovya = () => {
    if (onMovyaPress) onMovyaPress();
    else router.push('/movya');
  };

  return (
    <View style={[styles.shell, { paddingBottom: bottomPadding }]}>
      <BlurView intensity={88} tint="light" style={[styles.bar, Platform.OS === 'web' ? webGlass : null]}>
        <NavItem active={active === 'home'} icon="home-outline" label="Inicio" onPress={() => router.replace('/(tabs)')} />
        <NavItem active={active === 'activity'} icon="stats-chart-outline" label="Actividad" onPress={() => router.replace('/activity')} />
        <View style={styles.centerSlot}>
          <PressableScale accessibilityLabel="Abrir chat con Movya" onPress={openMovya} pressedScale={0.91} style={styles.movyaButton}>
            <View style={styles.movyaGlow} />
            <Image source={require('../../assets/movya-logo.png')} style={styles.movyaLogo} />
          </PressableScale>
          <Text style={styles.movyaLabel}>Movya</Text>
        </View>
        <NavItem active={active === 'contacts'} icon="people-outline" label="Contactos" onPress={() => router.replace('/contacts')} />
        <NavItem active={active === 'account'} icon="person-outline" label="Cuenta" onPress={() => router.replace('/settings')} />
      </BlurView>
    </View>
  );
}

type NavItemProps = { active: boolean; icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void };

function NavItem({ active, icon, label, onPress }: NavItemProps) {
  return (
    <PressableScale haptic={false} onPress={onPress} pressedScale={0.9} style={styles.item}>
      <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
        <Ionicons color={active ? colors.brand : '#8290A4'} name={icon} size={21} />
      </View>
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </PressableScale>
  );
}

const webGlass = { backdropFilter: 'blur(25px) saturate(170%)', WebkitBackdropFilter: 'blur(25px) saturate(170%)' } as const;

const styles = StyleSheet.create({
  shell: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 40, backgroundColor: 'rgba(255,255,255,0.72)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.9)', shadowColor: colors.navy, shadowOpacity: 0.14, shadowRadius: 20, shadowOffset: { width: 0, height: -8 }, elevation: 16 },
  bar: { height: 69, width: '100%', maxWidth: 760, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 6, overflow: 'visible', backgroundColor: 'rgba(250,252,255,0.5)' },
  item: { width: 62, height: 58, alignItems: 'center', justifyContent: 'center' }, iconWrap: { width: 34, height: 29, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, iconWrapActive: { backgroundColor: '#E4F0FF' }, label: { color: '#8290A4', fontSize: 9, fontWeight: '700', marginTop: 2 }, labelActive: { color: colors.brand, fontWeight: '900' },
  centerSlot: { width: 70, height: 70, alignItems: 'center', justifyContent: 'flex-end' }, movyaButton: { position: 'absolute', top: -31, width: 70, height: 70, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FBFF', borderWidth: 4, borderColor: colors.brand, shadowColor: colors.brandDark, shadowOpacity: 0.38, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 14 }, movyaGlow: { position: 'absolute', width: 59, height: 59, borderRadius: 20, backgroundColor: '#D9E9FF', borderWidth: 1, borderColor: '#FFFFFF' }, movyaLogo: { width: 56, height: 56, resizeMode: 'contain' }, movyaLabel: { color: colors.brandDark, fontSize: 9, fontWeight: '900', marginBottom: 4 },
});
