import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Counter for generating unique IDs
let tradeIdCounter = 0;

export interface TradeEntry {
    id: string;
    userId?: string;
    symbol: string;
    action: 'BUY' | 'SELL';
    quantity: number;
    price: number;
    orderType: 'MKT' | 'LMT' | 'STP';
    notes?: string;
    tags?: string[];
    pnl?: number;
    createdAt: string;
    updatedAt?: string; // trade_journal might not have updated_at, but good for local
}

interface TradesStore {
    trades: TradeEntry[];

    // Actions
    addTrade: (trade: Omit<TradeEntry, 'id' | 'createdAt' | 'updatedAt'>) => TradeEntry;
    updateTrade: (id: string, updates: Partial<TradeEntry>) => void;
    deleteTrade: (id: string) => void;
    getTradeById: (id: string) => TradeEntry | undefined;
    getTradesBySymbol: (symbol: string) => TradeEntry[];
}

export const useTradesStore = create<TradesStore>()(
    persist(
        (set, get) => ({
            trades: [],

            addTrade: (trade) => {
                const now = new Date().toISOString();
                tradeIdCounter += 1;
                const newTrade: TradeEntry = {
                    ...trade,
                    id: `trade-${Date.now()}-${tradeIdCounter}`, // Unique local ID
                    createdAt: now,
                    updatedAt: now,
                };
                set((state) => ({ trades: [...state.trades, newTrade] }));
                return newTrade;
            },

            updateTrade: (id, updates) => {
                set((state) => ({
                    trades: state.trades.map((t) =>
                        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
                    ),
                }));
            },

            deleteTrade: (id) => {
                set((state) => ({ trades: state.trades.filter((t) => t.id !== id) }));
            },

            getTradeById: (id) => get().trades.find((t) => t.id === id),

            getTradesBySymbol: (symbol) =>
                get().trades.filter((t) => t.symbol.toUpperCase() === symbol.toUpperCase()),
        }),
        {
            name: 'deepstack-trades-storage',
        }
    )
);
