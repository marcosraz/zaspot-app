/**
 * Favorite Button - Heart icon to toggle station favorites
 * Animated with scale effect on press
 */

import React, { useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  Animated,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFavorites } from '../context/FavoritesContext';
import { Colors } from '../constants/colors';

interface FavoriteButtonProps {
  stationId: string;
  size?: number;
  style?: ViewStyle;
  activeColor?: string;
  inactiveColor?: string;
}

export default function FavoriteButton({
  stationId,
  size = 24,
  style,
  activeColor = Colors.brand.accentGreen,
  inactiveColor = '#999',
}: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const isActive = isFavorite(stationId);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Animate on favorite change
  useEffect(() => {
    if (isActive) {
      // Pop animation when favorited
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.3,
          tension: 300,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 200,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isActive]);

  const handlePress = () => {
    toggleFavorite(stationId);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[styles.container, style]}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Ionicons
          name={isActive ? 'heart' : 'heart-outline'}
          size={size}
          color={isActive ? activeColor : inactiveColor}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 4,
  },
});
