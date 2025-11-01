import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { GitHubUser } from '@/lib/github';
import { useAuth } from './AuthContext';

interface FavoritesState {
  favorites: GitHubUser[];
  isFavorite: (userId: number) => boolean;
  addFavorite: (user: GitHubUser) => void;
  removeFavorite: (userId: number) => void;
  toggleFavorite: (user: GitHubUser) => void;
  clearFavorites: () => void;
}

const FavoritesContext = createContext<FavoritesState | undefined>(undefined);

const FAVORITES_STORAGE_PREFIX = 'partnergrid_favorites_user_';

interface FavoritesProviderProps {
  children: ReactNode;
}

export function FavoritesProvider({ children }: FavoritesProviderProps) {
  const [favorites, setFavorites] = useState<GitHubUser[]>([]);
  const { user } = useAuth();

  // Get user-specific storage key
  const getFavoritesStorageKey = () => {
    if (!user) return null;
    return `${FAVORITES_STORAGE_PREFIX}${user.id}`;
  };

  // Load favorites from localStorage when user changes
  useEffect(() => {
    const storageKey = getFavoritesStorageKey();
    if (!storageKey) {
      setFavorites([]);
      return;
    }

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsedFavorites = JSON.parse(stored);
        setFavorites(parsedFavorites);
      } else {
        setFavorites([]);
      }
    } catch (error) {
      console.error('Failed to load favorites from localStorage:', error);
      setFavorites([]);
    }
  }, [user]);

  // Save favorites to localStorage whenever it changes
  useEffect(() => {
    const storageKey = getFavoritesStorageKey();
    if (!storageKey) return;

    try {
      localStorage.setItem(storageKey, JSON.stringify(favorites));
    } catch (error) {
      console.error('Failed to save favorites to localStorage:', error);
    }
  }, [favorites, user]);

  const isFavorite = (userId: number): boolean => {
    return favorites.some(user => user.id === userId);
  };

  const addFavorite = (user: GitHubUser) => {
    setFavorites(prev => {
      // Check if user is already in favorites
      if (prev.some(fav => fav.id === user.id)) {
        return prev;
      }
      return [...prev, user];
    });
  };

  const removeFavorite = (userId: number) => {
    setFavorites(prev => prev.filter(user => user.id !== userId));
  };

  const toggleFavorite = (user: GitHubUser) => {
    if (isFavorite(user.id)) {
      removeFavorite(user.id);
    } else {
      addFavorite(user);
    }
  };

  const clearFavorites = () => {
    setFavorites([]);
  };

  const value: FavoritesState = {
    favorites,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    clearFavorites
  };

  return (
    <FavoritesContext.Provider value={value}>
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

export type { FavoritesState };