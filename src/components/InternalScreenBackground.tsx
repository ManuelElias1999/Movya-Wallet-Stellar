import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

export function InternalScreenBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={['#EAF2FF', '#F3EEFF', '#E4F7F5']}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.orb, styles.blueOrb]} />
      <View style={[styles.orb, styles.violetOrb]} />
      <View style={[styles.orb, styles.cyanOrb]} />
    </View>
  );
}

const styles = StyleSheet.create({
  orb: { position: 'absolute', borderRadius: 999, opacity: 0.32 },
  blueOrb: { width: 250, height: 250, backgroundColor: '#85B8FF', right: -100, top: 72 },
  violetOrb: { width: 210, height: 210, backgroundColor: '#C3A9FF', left: -105, top: 330 },
  cyanOrb: { width: 230, height: 230, backgroundColor: '#8DE3DB', right: -130, bottom: -45 },
});
