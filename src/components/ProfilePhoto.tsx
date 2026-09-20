import { Image, StyleSheet, View } from 'react-native';

type ProfilePhotoProps = { size?: number };

export function ProfilePhoto({ size = 40 }: ProfilePhotoProps) {
  return (
    <View style={[styles.frame, { width: size, height: size, borderRadius: size / 2 }]}>
      <Image
        resizeMode="cover"
        source={require('../../assets/manuel-profile.jpg')}
        style={{ position: 'absolute', width: size * 2.8, height: size * 2.8, left: size * -0.9, top: size * -0.6 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', backgroundColor: '#D8E8F6', borderWidth: 1, borderColor: 'rgba(255,255,255,0.72)' },
});
