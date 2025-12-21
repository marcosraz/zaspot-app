/**
 * ZAspot Brand Colors
 * Matching the web app color scheme
 */

export const Colors = {
  // Brand colors
  brand: {
    accentGreen: '#16A34A',
    accentGreenLight: '#22C55E',
    accentGreenDark: '#15803D',
  },

  // Light theme
  light: {
    background: '#F3F4F6',
    surface: '#FFFFFF',
    surfaceSecondary: '#E5E7EB',
    text: '#111827',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    border: '#D1D5DB',
    borderLight: '#E5E7EB',
    accent: '#16A34A',
    error: '#DC2626',
    warning: '#F59E0B',
    success: '#16A34A',
    info: '#3B82F6',
  },

  // Dark theme
  dark: {
    background: '#1A1A1A',
    surface: '#262626',
    surfaceSecondary: '#333333',
    text: '#E5E7EB',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#404040',
    borderLight: '#333333',
    accent: '#22C55E',
    error: '#EF4444',
    warning: '#FBBF24',
    success: '#22C55E',
    info: '#60A5FA',
  },

  // Spot price colors (for chart)
  spotPrice: {
    veryLow: '#16A34A',   // Green - sehr günstig
    low: '#22C55E',       // Light green - günstig
    medium: '#FBBF24',    // Yellow - normal
    high: '#F97316',      // Orange - teuer
    veryHigh: '#DC2626',  // Red - sehr teuer
  },

  // Map marker colors
  marker: {
    available: '#16A34A',
    occupied: '#F97316',
    offline: '#6B7280',
    selected: '#3B82F6',
  },
} as const;

export type ThemeType = 'light' | 'dark';
export type ColorScheme = typeof Colors.light | typeof Colors.dark;
