import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedMovyaLogo } from '@/components/AnimatedMovyaLogo';
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
      <BlurView intensity={78} tint="dark" style={[styles.bar, Platform.OS === 'web' ? webGlass : null]}> 
        <LinearGradient colors={['rgba(31,80,135,0.8)', 'rgba(60,127,150,0.64)']} end={{ x: 1, y: 0 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
        <NavItem active={active === 'home'} icon="home-outline" label="Inicio" onPress={() => router.replace('/(tabs)')} />
        <NavItem active={active === 'activity'} icon="stats-chart-outline" label="Actividad" onPress={() => router.replace('/activity')} />
        <View style={styles.centerSlot}>
          <PressableScale accessibilityLabel="Abrir chat con Movya" onPress={openMovya} pressedScale={0.91} style={styles.movyaButton}>
            <AnimatedMovyaLogo size={42} />
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
        <Ionicons color={active ? '#FFFFFF' : 'rgba(255,255,255,0.7)'} name={icon} size={21} />
      </View>
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </PressableScale>
  );
}

const webGlass = { backdropFilter: 'blur(28px) saturate(160%)', WebkitBackdropFilter: 'blur(28px) saturate(160%)' } as const;

const styles = StyleSheet.create({
  shell: { position: 'absolute', left: 12, right: 12, bottom: 8, zIndex: 40, backgroundColor: 'transparent', shadowColor: '#00123F', shadowOpacity: 0.24, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 16 },
  bar: { height: 76, width: '100%', maxWidth: 720, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 5, overflow: 'hidden', backgroundColor: 'rgba(42,92,137,0.32)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.34)', borderRadius: 999 },
  item: { width: 61, height: 62, alignItems: 'center', justifyContent: 'center' }, iconWrap: { width: 36, height: 31, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, iconWrapActive: { backgroundColor: 'rgba(255,255,255,0.13)' }, label: { color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: '700', marginTop: 2 }, labelActive: { color: '#FFFFFF', fontWeight: '900' },
  centerSlot: { width: 62, height: 64, alignItems: 'center', justifyContent: 'flex-end' }, movyaButton: { position: 'absolute', top: 1, width: 45, height: 45, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)' }, movyaLabel: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', marginBottom: 1 },
});
