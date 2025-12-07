import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ThesisEntry {
    id: string;
    title: string;
    symbol: string;
    createdAt: string;
    updatedAt: string;
    status: 'drafting' | 'active' | 'validated' | 'invalidated' | 'archived';

    // Thesis details
    hypothesis: string;
    timeframe: string;
    entryTarget?: number;
    exitTarget?: number;
    stopLoss?: number;
    riskRewardRatio?: number;
    keyConditions: string[];

    // Validation tracking
    validationScore?: number; // 0-100
    validationNotes?: string;

    // Linked conversation (the AI chat that built the thesis)
    conversationId?: string;
}

interface ThesisStore {
    theses: ThesisEntry[];

    // Actions
    addThesis: (thesis: Omit<ThesisEntry, 'id' | 'createdAt' | 'updatedAt'>) => ThesisEntry;
    updateThesis: (id: string, updates: Partial<ThesisEntry>) => void;
    deleteThesis: (id: string) => void;
    getThesisById: (id: string) => ThesisEntry | undefined;
    getActiveTheses: () => ThesisEntry[];
}

export const useThesisStore = create<ThesisStore>()(
    persist(
        (set, get) => ({
            theses: [],

            addThesis: (thesis) => {
                const now = new Date().toISOString();
                const newThesis: ThesisEntry = {
                    ...thesis,
                    id: `thesis-${Date.now()}`,
                    createdAt: now,
                    updatedAt: now,
                };
                set((state) => ({ theses: [newThesis, ...state.theses] }));
                return newThesis;
            },

            updateThesis: (id, updates) => {
                set((state) => ({
                    theses: state.theses.map((t) =>
                        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
                    ),
                }));
            },

            deleteThesis: (id) => {
                set((state) => ({ theses: state.theses.filter((t) => t.id !== id) }));
            },

            getThesisById: (id) => get().theses.find((t) => t.id === id),

            getActiveTheses: () => get().theses.filter((t) => t.status === 'active'),
        }),
        {
            name: 'deepstack-thesis-storage',
        }
    )
);
