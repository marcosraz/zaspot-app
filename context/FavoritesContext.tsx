/**
 * Favorites Context - Manages favorite charging stations
 * Persists favorite station IDs in AsyncStorage
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface FavoritesContextType {
  favorites: string[];
  isFavorite: (stationId: string) => boolean;
  addFavorite: (stationId: string) => void;
  removeFavorite: (stationId: string) => void;
  toggleFavorite: (stationId: string) => void;
  clearFavorites: () => void;
  isLoaded: boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

const FAVORITES_STORAGE_KEY = '@zaspot_favorites';

interface FavoritesProviderProps {
  children: ReactNode;
}

export function FavoritesProvider({ children }: FavoritesProviderProps) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoritesSet, setFavoritesSet] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved favorites on mount
  useEffect(() => {
    loadFavorites();
  }, []);

  // Save favorites whenever they change
  useEffect(() => {
    if (isLoaded) {
      saveFavorites(favorites);
    }
  }, [favorites, isLoaded]);

  // Keep Set in sync with array
  useEffect(() => {
    setFavoritesSet(new Set(favorites));
  }, [favorites]);

  const loadFavorites = async () => {
    try {
      const saved = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setFavorites(parsed);
        }
      }
    } catch (error) {
      console.error('Failed to load favorites:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveFavorites = async (newFavorites: string[]) => {
    try {
      await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(newFavorites));
    } catch (error) {
      console.error('Failed to save favorites:', error);
    }
  };

  const isFavorite = useCallback((stationId: string): boolean => {
    return favoritesSet.has(stationId);
  }, [favoritesSet]);

  const addFavorite = useCallback((stationId: string) => {
    setFavorites(prev => {
      if (prev.includes(stationId)) return prev;
      return [...prev, stationId];
    });
  }, []);

  const removeFavorite = useCallback((stationId: string) => {
    setFavorites(prev => prev.filter(id => id !== stationId));
  }, []);

  const toggleFavorite = useCallback((stationId: string) => {
    setFavorites(prev => {
      if (prev.includes(stationId)) {
        return prev.filter(id => id !== stationId);
      }
      return [...prev, stationId];
    });
  }, []);

  const clearFavorites = useCallback(() => {
    setFavorites([]);
  }, []);

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        isFavorite,
        addFavorite,
        removeFavorite,
        toggleFavorite,
        clearFavorites,
        isLoaded,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}
