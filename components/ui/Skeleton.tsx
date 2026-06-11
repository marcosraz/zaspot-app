/**
 * Skeleton — shimmer loading placeholder.
 *
 * Replaces bare ActivityIndicators with content-shaped blocks that breathe
 * (opacity loop), so loading screens keep the final layout's silhouette and
 * feel intentional instead of empty.
 */
import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  /** Base color — pass theme surfaceSecondary so it works in dark mode. */
  color?: string;
}

export default function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
  color = 'rgba(128,128,128,0.18)',
}: SkeletonProps) {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true // reverse → smooth breathe instead of hard reset
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: color },
        animatedStyle,
        style,
      ]}
    />
  );
}
