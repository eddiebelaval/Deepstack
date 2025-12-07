import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type EmotionType =
    | 'confident'
    | 'anxious'
    | 'greedy'
    | 'fearful'
    | 'fomo'
    | 'regret'
    | 'relief'
    | 'neutral'
    | 'excited'
    | 'frustrated';

export interface JournalEntry {
    id: string;
    createdAt: string;
    updatedAt: string;

    // Trade details
    symbol: string;
    tradeDate: string;
    direction: 'long' | 'short';
    entryPrice: number;
    exitPrice?: number;
    quantity: number;
    pnl?: number;
    pnlPercent?: number;

    // Emotional tracking
    emotionAtEntry: EmotionType;
    emotionAtExit?: EmotionType;

    // Reflection (TipTap HTML content)
    notes: string;
    lessonsLearned?: string;

    // Links
    thesisId?: string; // Link to Thesis Engine
    screenshotUrls?: string[];
}

interface JournalStore {
    entries: JournalEntry[];

    // Actions
    addEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>) => JournalEntry;
    updateEntry: (id: string, updates: Partial<JournalEntry>) => void;
    deleteEntry: (id: string) => void;
    getEntryById: (id: string) => JournalEntry | undefined;
    getEntriesBySymbol: (symbol: string) => JournalEntry[];
}

export const useJournalStore = create<JournalStore>()(
    persist(
        (set, get) => ({
            entries: [],

            addEntry: (entry) => {
                const now = new Date().toISOString();
                const newEntry: JournalEntry = {
                    ...entry,
                    id: `journal-${Date.now()}`,
                    createdAt: now,
                    updatedAt: now,
                };
                set((state) => ({ entries: [newEntry, ...state.entries] }));
                return newEntry;
            },

            updateEntry: (id, updates) => {
                set((state) => ({
                    entries: state.entries.map((e) =>
                        e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e
                    ),
                }));
            },

            deleteEntry: (id) => {
                set((state) => ({ entries: state.entries.filter((e) => e.id !== id) }));
            },

            getEntryById: (id) => get().entries.find((e) => e.id === id),

            getEntriesBySymbol: (symbol) =>
                get().entries.filter((e) => e.symbol.toUpperCase() === symbol.toUpperCase()),
        }),
        {
            name: 'deepstack-journal-storage',
        }
    )
);
