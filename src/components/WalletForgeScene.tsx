import { Animated, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { MovyaLogo } from './MovyaLogo';

export function WalletForgeScene({ strike, reduceMotion }: { strike: Animated.Value; reduceMotion: boolean }) {
  const { width: screenWidth } = useWindowDimensions();
  const width = Math.min(300, Math.max(200, screenWidth - 44));
  const scale = width / 300;
  const impact = strike.interpolate({ inputRange: [0, 0.5, 0.56, 0.64, 0.8, 1], outputRange: [0, 0, 1, 0.3, 0, 0] });
  const flight = strike.interpolate({ inputRange: [0.56, 0.82], outputRange: [0, 1], extrapolate: 'clamp' });
  const sparkOpacity = strike.interpolate({ inputRange: [0, 0.52, 0.56, 0.78, 0.9, 1], outputRange: [0, 0, 1, 0.4, 0, 0] });
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width, height: 236 * scale, marginTop: 16, marginBottom: 8 }}>
    <View style={[styles.canvas, { left: (width - 300) / 2, top: (236 * scale - 236) / 2, transform: [{ scale }] }]}>
      <View style={styles.halo} /><View style={styles.floor} />
      <Svg width={140} height={80} viewBox="0 0 155 89" style={styles.anvil}>
        <Path d="M0 9 H136 L154 27 H111 L94 44 V61 H116 V79 H29 V61 H52 V44 L31 31 H0 Z" fill="#234E7A" />
        <Path d="M0 9 H136 L154 27 H0 Z" fill="#729EBB" />
        <Rect x="26" y="78" width="97" height="11" rx="4" fill="#153653" />
      </Svg>
      <Animated.View collapsable={false} style={[styles.robot, { transform: [{ translateY: impact.interpolate({ inputRange: [0, 1], outputRange: [0, 1.2] }) }] }]}>
        <View style={styles.legLeft} /><View style={styles.legRight} />
        <View style={styles.apron}><View style={styles.apronStrap} /><View style={styles.apronPocket} /></View>
        {/* A tiny, non-collapsible pivot fixes the arm to the shoulder. The
            arm, hand and hammer rotate together, not around a distant center. */}
        <Animated.View collapsable={false} style={[styles.shoulder, { transform: [{ rotate: strike.interpolate({ inputRange: [0, 0.22, 0.42, 0.56, 0.64, 0.78, 1], outputRange: ['-12deg', '-28deg', '-28deg', '12deg', '-8deg', '-12deg', '-12deg'] }) }] }]}>
          <View style={styles.arm} /><View style={styles.handle} /><View style={styles.hand} />
          <View style={styles.hammerHead}><View style={styles.hammerShine} /></View>
        </Animated.View>
        <MovyaLogo size={116} style={styles.head} />
      </Animated.View>
      <Animated.View style={[styles.wallet, { transform: [{ scaleY: impact.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] }) }] }]}>
        <View style={styles.walletStitch} /><View style={styles.walletClasp}><View style={styles.walletDot} /></View>
      </Animated.View>
      {!reduceMotion ? [-2, -1, 1, 2].map((direction, i) => <Animated.View key={direction} style={[styles.spark, { opacity: sparkOpacity, transform: [
        { translateX: flight.interpolate({ inputRange: [0, 1], outputRange: [0, direction * 20] }) },
        { translateY: flight.interpolate({ inputRange: [0, 1], outputRange: [0, -32 - i * 7] }) },
        { rotate: `${direction * 28}deg` },
      ] }]} />) : null}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  canvas: { position: 'absolute', width: 300, height: 236, overflow: 'visible' },
  halo: { position: 'absolute', left: 36, top: 3, width: 224, height: 224, borderRadius: 112, backgroundColor: '#D4E7FF' }, floor: { position: 'absolute', left: 7, right: 7, bottom: 10, height: 12, borderRadius: 30, backgroundColor: '#B9CDE4' },
  anvil: { position: 'absolute', left: 152, top: 146, zIndex: 1 }, robot: { position: 'absolute', left: 22, top: 28, width: 116, height: 194, overflow: 'visible', zIndex: 2 }, head: { position: 'absolute', left: 0, top: 0, zIndex: 4 },
  apron: { position: 'absolute', left: 25, top: 93, width: 68, height: 75, borderRadius: 19, backgroundColor: '#BD7349', borderWidth: 3, borderColor: '#945635', zIndex: 1 }, apronStrap: { alignSelf: 'center', width: 31, height: 25, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, borderWidth: 2, borderColor: '#E1A474' }, apronPocket: { marginTop: 9, marginHorizontal: 12, height: 23, borderRadius: 7, borderWidth: 2, borderColor: '#E1A474' },
  legLeft: { position: 'absolute', bottom: 0, left: 26, width: 27, height: 27, borderRadius: 9, backgroundColor: '#153653' }, legRight: { position: 'absolute', bottom: 0, left: 67, width: 27, height: 27, borderRadius: 9, backgroundColor: '#153653' },
  shoulder: { position: 'absolute', left: 93, top: 116, width: 2, height: 2, overflow: 'visible', zIndex: 2 }, arm: { position: 'absolute', left: -5, top: -8, width: 72, height: 16, borderRadius: 8, backgroundColor: '#2481FB' }, handle: { position: 'absolute', left: 61, top: -48, width: 9, height: 58, borderRadius: 4, backgroundColor: '#945635' }, hand: { position: 'absolute', left: 55, top: -11, width: 21, height: 22, borderRadius: 10, backgroundColor: '#A8D3FF', borderWidth: 1, borderColor: '#4D6A87' }, hammerHead: { position: 'absolute', left: 45, top: -60, width: 44, height: 24, borderRadius: 6, backgroundColor: '#234E7A', borderWidth: 2, borderColor: '#153653' }, hammerShine: { height: 4, margin: 3, backgroundColor: '#8CB2CA', borderRadius: 2 },
  wallet: { position: 'absolute', left: 183, top: 124, width: 54, height: 30, borderRadius: 7, backgroundColor: '#277CFF', borderWidth: 2, borderColor: '#0755D8', zIndex: 3 }, walletStitch: { position: 'absolute', left: 4, top: 4, right: 4, bottom: 4, borderRadius: 3, borderWidth: 1, borderStyle: 'dashed', borderColor: '#98C6FF' }, walletClasp: { position: 'absolute', right: -4, top: 7, width: 19, height: 12, borderRadius: 4, backgroundColor: '#0755D8', justifyContent: 'center', alignItems: 'center' }, walletDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#F4C569' }, spark: { position: 'absolute', left: 201, top: 124, width: 3, height: 9, borderRadius: 2, backgroundColor: '#ECAB35', zIndex: 5 },
});
