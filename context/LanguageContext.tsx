/**
 * Language Context - Manages app localization
 * Persists preference in AsyncStorage
 * Supports: Czech (cz), English (en), German (de), Polish (pl)
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';
import { Language, Translations, translations, defaultLanguage } from '../constants/translations';

interface LanguageContextType {
  language: Language;
  t: Translations;
  setLanguage: (language: Language) => void;
  availableLanguages: { code: Language; name: string; nativeName: string }[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = '@zaspot_language';

// Available languages with their display names
const availableLanguages: { code: Language; name: string; nativeName: string }[] = [
  { code: 'cz', name: 'Czech', nativeName: 'Čeština' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
];

// Get device language and map to supported language
const getDeviceLanguage = (): Language => {
  let deviceLang = 'en';

  try {
    if (Platform.OS === 'ios') {
      deviceLang = NativeModules.SettingsManager?.settings?.AppleLocale ||
                   NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] ||
                   'en';
    } else {
      deviceLang = NativeModules.I18nManager?.localeIdentifier || 'en';
    }
  } catch {
    deviceLang = 'en';
  }

  // Extract language code (e.g., 'cs_CZ' -> 'cs')
  const langCode = deviceLang.split('_')[0].toLowerCase();

  // Map to our supported languages
  const languageMap: Record<string, Language> = {
    'cs': 'cz',
    'cz': 'cz',
    'en': 'en',
    'de': 'de',
    'pl': 'pl',
  };

  return languageMap[langCode] || defaultLanguage;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(defaultLanguage);
  const [isLoaded, setIsLoaded] = useState(false);

  const t = translations[language];

  // Load saved language preference
  useEffect(() => {
    loadLanguagePreference();
  }, []);

  // Save language preference when it changes
  useEffect(() => {
    if (isLoaded) {
      saveLanguagePreference(language);
    }
  }, [language, isLoaded]);

  const loadLanguagePreference = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (savedLanguage && translations[savedLanguage as Language]) {
        setLanguageState(savedLanguage as Language);
      } else {
        // Use device language as default
        const deviceLang = getDeviceLanguage();
        setLanguageState(deviceLang);
      }
    } catch (error) {
      console.error('Failed to load language preference:', error);
      setLanguageState(defaultLanguage);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveLanguagePreference = async (newLanguage: Language) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, newLanguage);
    } catch (error) {
      console.error('Failed to save language preference:', error);
    }
  };

  const setLanguage = (newLanguage: Language) => {
    if (translations[newLanguage]) {
      setLanguageState(newLanguage);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, t, setLanguage, availableLanguages }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Shorthand hook for just translations
export function useTranslations() {
  const { t } = useLanguage();
  return t;
}
