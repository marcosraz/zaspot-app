/**
 * Theme Context - Manages dark/light mode
 * Persists preference in AsyncStorage
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, ThemeType, ColorScheme } from '../constants/colors';

interface ThemeContextType {
  theme: ThemeType;
  colors: ColorScheme;
  isDark: boolean;
  setTheme: (theme: ThemeType | 'system') => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@zaspot_theme';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [themePreference, setThemePreference] = useState<ThemeType | 'system'>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  // Determine actual theme based on preference
  const theme: ThemeType =
    themePreference === 'system'
      ? (systemColorScheme === 'dark' ? 'dark' : 'light')
      : themePreference;

  const colors = theme === 'dark' ? Colors.dark : Colors.light;
  const isDark = theme === 'dark';

  // Load saved theme preference
  useEffect(() => {
    loadThemePreference();
  }, []);

  // Save theme preference when it changes
  useEffect(() => {
    if (isLoaded) {
      saveThemePreference(themePreference);
    }
  }, [themePreference, isLoaded]);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme) {
        setThemePreference(savedTheme as ThemeType | 'system');
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveThemePreference = async (newTheme: ThemeType | 'system') => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  const setTheme = (newTheme: ThemeType | 'system') => {
    setThemePreference(newTheme);
  };

  const toggleTheme = () => {
    if (themePreference === 'system') {
      // If system, switch to opposite of current
      setThemePreference(isDark ? 'light' : 'dark');
    } else {
      setThemePreference(themePreference === 'dark' ? 'light' : 'dark');
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, colors, isDark, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
