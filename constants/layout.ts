/**
 * Layout constants for consistent spacing and sizing
 */

import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const Layout = {
  window: {
    width,
    height,
  },

  // Spacing scale (4px base)
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  // Border radius
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },

  // Font sizes
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },

  // Tab bar
  tabBar: {
    height: 80,
    iconSize: 24,
  },

  // Header
  header: {
    height: 56,
  },

  // Card dimensions
  card: {
    padding: 16,
    margin: 8,
  },

  // Map
  map: {
    defaultZoom: 12,
    markerSize: 40,
    clusterSize: 50,
  },
} as const;
