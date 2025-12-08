'use client';

import { useEffect, useState, useCallback } from 'react';
import { useThesisStore, type ThesisEntry } from '@/lib/stores/thesis-store';
import {
  fetchTheses,
  createThesis,
  updateThesis,
  deleteThesis,
  subscribeToTheses,
} from '@/lib/supabase/thesis';
import { isSupabaseConfigured } from '@/lib/supabase';

/**
 * Hook that syncs theses with Supabase.
 * Falls back to localStorage when Supabase is not configured or user is not authenticated.
 */
export function useThesisSync() {
  const store = useThesisStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(isSupabaseConfigured());

  // Load theses from Supabase on mount
  useEffect(() => {
    async function loadTheses() {
      if (!isSupabaseConfigured()) {
        setIsOnline(false);
        setIsLoading(false);
        return;
      }

      try {
        const theses = await fetchTheses();
        if (theses.length > 0) {
          // Replace local theses with remote ones
          useThesisStore.setState({ theses });
        }
        setIsOnline(true);
        setError(null);
      } catch (err) {
        console.error('Failed to load theses:', err);
        setError('Failed to load theses. Using local data.');
        setIsOnline(false);
      } finally {
        setIsLoading(false);
      }
    }

    loadTheses();
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const unsubscribe = subscribeToTheses(async () => {
      try {
        const theses = await fetchTheses();
        useThesisStore.setState({ theses });
      } catch (err) {
        console.error('Failed to sync theses:', err);
      }
    });

    return unsubscribe;
  }, []);

  // Wrapped addThesis that syncs to Supabase
  const addThesis = useCallback(async (
    thesis: Omit<ThesisEntry, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ThesisEntry> => {
    if (!isOnline) {
      // Fallback to local store
      return store.addThesis(thesis);
    }

    try {
      const newThesis = await createThesis(thesis);
      // Update local store
      useThesisStore.setState((state) => ({
        theses: [newThesis, ...state.theses],
      }));
      return newThesis;
    } catch (err) {
      console.error('Failed to create thesis:', err);
      // Fallback to local
      return store.addThesis(thesis);
    }
  }, [isOnline, store]);

  // Wrapped updateThesis that syncs to Supabase
  const updateThesisEntry = useCallback(async (
    id: string,
    updates: Partial<ThesisEntry>
  ): Promise<void> => {
    if (!isOnline) {
      store.updateThesis(id, updates);
      return;
    }

    try {
      await updateThesis(id, updates);
      // Update local store
      useThesisStore.setState((state) => ({
        theses: state.theses.map((t) =>
          t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
        ),
      }));
    } catch (err) {
      console.error('Failed to update thesis:', err);
      // Fallback to local
      store.updateThesis(id, updates);
    }
  }, [isOnline, store]);

  // Wrapped deleteThesis that syncs to Supabase
  const deleteThesisEntry = useCallback(async (id: string): Promise<void> => {
    if (!isOnline) {
      store.deleteThesis(id);
      return;
    }

    try {
      await deleteThesis(id);
      // Update local store
      useThesisStore.setState((state) => ({
        theses: state.theses.filter((t) => t.id !== id),
      }));
    } catch (err) {
      console.error('Failed to delete thesis:', err);
      // Fallback to local
      store.deleteThesis(id);
    }
  }, [isOnline, store]);

  // Get active theses only
  const getActiveTheses = useCallback(() => {
    return store.theses.filter((t) => t.status === 'active');
  }, [store.theses]);

  return {
    theses: store.theses,
    addThesis,
    updateThesis: updateThesisEntry,
    deleteThesis: deleteThesisEntry,
    getThesisById: store.getThesisById,
    getActiveTheses,
    isLoading,
    isOnline,
    error,
  };
}
