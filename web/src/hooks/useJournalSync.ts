'use client';

import { useEffect, useState, useCallback } from 'react';
import { useJournalStore, type JournalEntry } from '@/lib/stores/journal-store';
import {
  fetchJournalEntries,
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  subscribeToJournalEntries,
} from '@/lib/supabase/journal';
import { isSupabaseConfigured } from '@/lib/supabase';

/**
 * Hook that syncs journal entries with Supabase.
 * Falls back to localStorage when Supabase is not configured or user is not authenticated.
 */
export function useJournalSync() {
  const store = useJournalStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(isSupabaseConfigured());

  // Load entries from Supabase on mount
  useEffect(() => {
    async function loadEntries() {
      if (!isSupabaseConfigured()) {
        setIsOnline(false);
        setIsLoading(false);
        return;
      }

      try {
        const entries = await fetchJournalEntries();
        if (entries.length > 0) {
          // Replace local entries with remote ones
          useJournalStore.setState({ entries });
        }
        setIsOnline(true);
        setError(null);
      } catch (err) {
        console.error('Failed to load journal entries:', err);
        setError('Failed to load entries. Using local data.');
        setIsOnline(false);
      } finally {
        setIsLoading(false);
      }
    }

    loadEntries();
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const unsubscribe = subscribeToJournalEntries(async () => {
      try {
        const entries = await fetchJournalEntries();
        useJournalStore.setState({ entries });
      } catch (err) {
        console.error('Failed to sync journal entries:', err);
      }
    });

    return unsubscribe;
  }, []);

  // Wrapped addEntry that syncs to Supabase
  const addEntry = useCallback(async (
    entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<JournalEntry> => {
    if (!isOnline) {
      // Fallback to local store
      return store.addEntry(entry);
    }

    try {
      const newEntry = await createJournalEntry(entry);
      // Update local store
      useJournalStore.setState((state) => ({
        entries: [newEntry, ...state.entries],
      }));
      return newEntry;
    } catch (err) {
      console.error('Failed to create journal entry:', err);
      // Fallback to local
      return store.addEntry(entry);
    }
  }, [isOnline, store]);

  // Wrapped updateEntry that syncs to Supabase
  const updateEntry = useCallback(async (
    id: string,
    updates: Partial<JournalEntry>
  ): Promise<void> => {
    if (!isOnline) {
      store.updateEntry(id, updates);
      return;
    }

    try {
      await updateJournalEntry(id, updates);
      // Update local store
      useJournalStore.setState((state) => ({
        entries: state.entries.map((e) =>
          e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e
        ),
      }));
    } catch (err) {
      console.error('Failed to update journal entry:', err);
      // Fallback to local
      store.updateEntry(id, updates);
    }
  }, [isOnline, store]);

  // Wrapped deleteEntry that syncs to Supabase
  const deleteEntry = useCallback(async (id: string): Promise<void> => {
    if (!isOnline) {
      store.deleteEntry(id);
      return;
    }

    try {
      await deleteJournalEntry(id);
      // Update local store
      useJournalStore.setState((state) => ({
        entries: state.entries.filter((e) => e.id !== id),
      }));
    } catch (err) {
      console.error('Failed to delete journal entry:', err);
      // Fallback to local
      store.deleteEntry(id);
    }
  }, [isOnline, store]);

  return {
    entries: store.entries,
    addEntry,
    updateEntry,
    deleteEntry,
    getEntryById: store.getEntryById,
    getEntriesBySymbol: store.getEntriesBySymbol,
    isLoading,
    isOnline,
    error,
  };
}
