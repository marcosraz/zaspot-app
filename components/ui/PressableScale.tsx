/**
 * PressableScale — the app's standard "touchable card/button".
 *
 * Springs down to `scaleTo` while pressed and fires a light haptic tick on
 * press-in, so every card/button across the app shares one consistent,
 * modern touch feel. Drop-in replacement for TouchableOpacity (same
 * onPress/style/disabled props).
 */
import React, { useCallback } from 'react';
import { Pressable, StyleProp, ViewStyle, GestureResponderEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps {
  children: React.ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
  onLongPress?: (e: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  /** Pressed-state scale. 0.97 for large cards, 0.94 for small buttons. */
  scaleTo?: number;
  /** Set false for high-frequency taps where haptics would feel noisy. */
  haptic?: boolean;
  accessibilityRole?: 'button' | 'link';
  accessibilityLabel?: string;
}

export default function PressableScale({
  children,
  onPress,
  onLongPress,
  style,
  disabled,
  scaleTo = 0.97,
  haptic = true,
  accessibilityRole = 'button',
  accessibilityLabel,
}: PressableScaleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(scaleTo, { damping: 15, stiffness: 400 });
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [scale, scaleTo, haptic]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 350 });
  }, [scale]);

  return (
    <AnimatedPressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[animatedStyle, style]}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </AnimatedPressable>
  );
}
