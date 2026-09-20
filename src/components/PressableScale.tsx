import * as Haptics from 'expo-haptics';
import { useRef, type PropsWithChildren } from 'react';
import { Animated, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

type PressableScaleProps = PropsWithChildren<Omit<PressableProps, 'style'>> & {
  style?: StyleProp<ViewStyle>;
  pressedScale?: number;
  haptic?: boolean;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PressableScale({ children, style, pressedScale = 0.97, haptic = true, disabled, onPressIn, onPressOut, ...props }: PressableScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={(event) => {
        Animated.spring(scale, { toValue: pressedScale, speed: 42, bounciness: 0, useNativeDriver: true }).start();
        if (haptic && !disabled) void Haptics.selectionAsync();
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        Animated.spring(scale, { toValue: 1, speed: 28, bounciness: 7, useNativeDriver: true }).start();
        onPressOut?.(event);
      }}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}
