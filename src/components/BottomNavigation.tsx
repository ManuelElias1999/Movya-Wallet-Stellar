import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedMovyaLogo } from '@/components/AnimatedMovyaLogo';
import { PressableScale } from '@/components/PressableScale';
import { NavigationGlass } from '@/components/NavigationGlass';
import { colors } from '@/theme/tokens';

import { type NavigationTab } from '@/services/presentation';
type BottomNavigationProps = { active: NavigationTab; onMovyaPress?: () => void };

export function BottomNavigation({ active, onMovyaPress }: BottomNavigationProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 10);

  const navigate = (target: NavigationTab) => {
    if (target === active) return;
    const routes = { home: '/(tabs)', activity: '/activity', contacts: '/contacts', account: '/settings' } as const;
    router.replace(routes[target]);
  };
  const openMovya = () => {
    if (onMovyaPress) onMovyaPress();
    else router.push('/movya');
  };

  return (
    <View style={[styles.shell, { paddingBottom: bottomPadding }]}> 
      <NavigationGlass style={styles.bar}>
        <NavItem active={active === 'home'} icon="home-outline" label="Inicio" onPress={() => navigate('home')} />
        <NavItem active={active === 'activity'} icon="stats-chart-outline" label="Actividad" onPress={() => navigate('activity')} />
        <View style={styles.centerSlot}>
          <PressableScale accessibilityLabel="Abrir chat con Movya" onPress={openMovya} pressedScale={0.91} style={styles.movyaButton}>
            <AnimatedMovyaLogo size={42} />
          </PressableScale>
          <Text style={styles.movyaLabel}>Movya</Text>
        </View>
        <NavItem active={active === 'contacts'} icon="people-outline" label="Contactos" onPress={() => navigate('contacts')} />
        <NavItem active={active === 'account'} icon="person-outline" label="Cuenta" onPress={() => navigate('account')} />
      </NavigationGlass>
    </View>
  );
}

type NavItemProps = { active: boolean; icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void };

function NavItem({ active, icon, label, onPress }: NavItemProps) {
  return (
    <PressableScale haptic={false} onPress={onPress} pressedScale={0.9} accessibilityRole="tab" accessibilityState={{ selected: active }} style={[styles.item, active && styles.itemActive]}>
      <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
        <Ionicons color={active ? colors.brandDark : 'rgba(255,255,255,0.7)'} name={active ? icon.replace('-outline', '') as keyof typeof Ionicons.glyphMap : icon} size={21} />
      </View>
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  shell: { position: 'absolute', left: 12, right: 12, bottom: 8, zIndex: 40, backgroundColor: 'transparent', shadowColor: '#00123F', shadowOpacity: 0.24, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 16 },
  bar: { height: 76, width: '100%', maxWidth: 720, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 5, borderRadius: 999 },
  item: { width: 61, height: 62, alignItems: 'center', justifyContent: 'center' }, iconWrap: { width: 36, height: 31, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, itemActive: { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#CDE4FF' }, iconWrapActive: { backgroundColor: '#E8F2FF' }, label: { color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: '700', marginTop: 2 }, labelActive: { color: colors.brandDark, fontWeight: '900' },
  centerSlot: { width: 62, height: 64, alignItems: 'center', justifyContent: 'flex-end' }, movyaButton: { position: 'absolute', top: 1, width: 45, height: 45, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)' }, movyaLabel: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', marginBottom: 1 },
});
