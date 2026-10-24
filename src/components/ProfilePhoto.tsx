import type { ThemeColors } from '@/theme/tokens';
import { useThemedStyles } from '@/theme/Theme';
import { Image, StyleSheet, View } from 'react-native';

type ProfilePhotoProps = { size?: number };

export function ProfilePhoto({ size = 40 }: ProfilePhotoProps) {
  const { styles } = useThemedStyles(createStyles);
  return (
    <View style={[styles.frame, { width: size, height: size, borderRadius: size / 2 }]}>
      <Image
        resizeMode="cover"
        source={require('../../assets/manuel-profile.jpg')}
        style={{ position: 'absolute', width: size * 2.8, height: size * 2.8, left: size * -0.9, top: size * -0.8 }}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  frame: { overflow: 'hidden', backgroundColor: colors.surfaceSoft, borderWidth: 1, borderColor: colors.border },
});
