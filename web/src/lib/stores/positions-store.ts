'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Position type
export type Position = {
  id: string;
  symbol: string;
  shares: number;
  avgCost: number;
  currentPrice?: number;
  side: 'long' | 'short';
  openDate: string;
  notes?: string;
};

// Computed position with P&L calculations
export type PositionWithPnL = Position & {
  marketValue: number;
  costBasis: number;
  pnl: number;
  pnlPercent: number;
};

// Store state interface
interface PositionsState {
  positions: Position[];

  // Actions
  addPosition: (position: Omit<Position, 'id'>) => void;
  updatePosition: (id: string, updates: Partial<Position>) => void;
  removePosition: (id: string) => void;
  updatePrice: (symbol: string, price: number) => void;
  clearAllPositions: () => void;
}

// Generate unique ID for new positions
const generatePositionId = () => `pos-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Default mock positions for demo
const DEFAULT_POSITIONS: Position[] = [
  {
    id: 'demo-aapl',
    symbol: 'AAPL',
    shares: 100,
    avgCost: 178.50,
    currentPrice: 193.42,
    side: 'long',
    openDate: '2024-06-15',
    notes: 'Core tech holding',
  },
  {
    id: 'demo-nvda',
    symbol: 'NVDA',
    shares: 50,
    avgCost: 475.00,
    currentPrice: 138.25,
    side: 'long',
    openDate: '2024-03-10',
    notes: 'AI/GPU play - post split',
  },
  {
    id: 'demo-tsla',
    symbol: 'TSLA',
    shares: 25,
    avgCost: 245.00,
    currentPrice: 352.75,
    side: 'long',
    openDate: '2024-08-22',
    notes: 'EV momentum trade',
  },
];

// Zustand store with persist middleware
export const usePositionsStore = create<PositionsState>()(
  persist(
    (set, get) => ({
      positions: DEFAULT_POSITIONS,

      addPosition: (position) => {
        const newPosition: Position = {
          ...position,
          id: generatePositionId(),
        };
        set((state) => ({
          positions: [...state.positions, newPosition],
        }));
      },

      updatePosition: (id, updates) => {
        set((state) => ({
          positions: state.positions.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }));
      },

      removePosition: (id) => {
        set((state) => ({
          positions: state.positions.filter((p) => p.id !== id),
        }));
      },

      updatePrice: (symbol, price) => {
        set((state) => ({
          positions: state.positions.map((p) =>
            p.symbol === symbol ? { ...p, currentPrice: price } : p
          ),
        }));
      },

      clearAllPositions: () => {
        set({ positions: [] });
      },
    }),
    {
      name: 'deepstack-positions',
      version: 1,
    }
  )
);

// ============================================================================
// Selectors / Computed Values
// ============================================================================

/**
 * Calculate P&L for a single position
 */
export const calculatePositionPnL = (position: Position): PositionWithPnL => {
  const currentPrice = position.currentPrice ?? position.avgCost;
  const marketValue = position.shares * currentPrice;
  const costBasis = position.shares * position.avgCost;

  // For shorts: profit when price goes down
  const pnl = position.side === 'long'
    ? marketValue - costBasis
    : costBasis - marketValue;

  const pnlPercent = costBasis !== 0 ? (pnl / costBasis) * 100 : 0;

  return {
    ...position,
    marketValue,
    costBasis,
    pnl,
    pnlPercent,
  };
};

/**
 * Get all positions with P&L calculations
 */
export const selectPositionsWithPnL = (state: PositionsState): PositionWithPnL[] => {
  return state.positions.map(calculatePositionPnL);
};

/**
 * Get total portfolio market value
 */
export const selectTotalPortfolioValue = (state: PositionsState): number => {
  return state.positions.reduce((total, position) => {
    const currentPrice = position.currentPrice ?? position.avgCost;
    return total + position.shares * currentPrice;
  }, 0);
};

/**
 * Get total cost basis
 */
export const selectTotalCostBasis = (state: PositionsState): number => {
  return state.positions.reduce((total, position) => {
    return total + position.shares * position.avgCost;
  }, 0);
};

/**
 * Get total P&L across all positions
 */
export const selectTotalPnL = (state: PositionsState): number => {
  return state.positions.reduce((total, position) => {
    const positionWithPnL = calculatePositionPnL(position);
    return total + positionWithPnL.pnl;
  }, 0);
};

/**
 * Get total P&L percentage
 */
export const selectTotalPnLPercent = (state: PositionsState): number => {
  const totalCostBasis = selectTotalCostBasis(state);
  const totalPnL = selectTotalPnL(state);
  return totalCostBasis !== 0 ? (totalPnL / totalCostBasis) * 100 : 0;
};

/**
 * Get position by ID
 */
export const selectPositionById = (state: PositionsState, id: string): Position | undefined => {
  return state.positions.find((p) => p.id === id);
};

/**
 * Get positions by symbol
 */
export const selectPositionsBySymbol = (state: PositionsState, symbol: string): Position[] => {
  return state.positions.filter((p) => p.symbol.toUpperCase() === symbol.toUpperCase());
};

/**
 * Get long positions only
 */
export const selectLongPositions = (state: PositionsState): Position[] => {
  return state.positions.filter((p) => p.side === 'long');
};

/**
 * Get short positions only
 */
export const selectShortPositions = (state: PositionsState): Position[] => {
  return state.positions.filter((p) => p.side === 'short');
};

/**
 * Get portfolio summary stats
 */
export const selectPortfolioSummary = (state: PositionsState) => {
  const positionsWithPnL = selectPositionsWithPnL(state);
  const totalValue = selectTotalPortfolioValue(state);
  const totalCostBasis = selectTotalCostBasis(state);
  const totalPnL = selectTotalPnL(state);
  const totalPnLPercent = selectTotalPnLPercent(state);

  const winners = positionsWithPnL.filter((p) => p.pnl > 0);
  const losers = positionsWithPnL.filter((p) => p.pnl < 0);

  return {
    totalValue,
    totalCostBasis,
    totalPnL,
    totalPnLPercent,
    positionCount: state.positions.length,
    winnerCount: winners.length,
    loserCount: losers.length,
    longCount: selectLongPositions(state).length,
    shortCount: selectShortPositions(state).length,
  };
};

// ============================================================================
// Hook helpers for common selector patterns
// ============================================================================

/**
 * Hook to get positions with computed P&L
 */
export const usePositionsWithPnL = () => {
  return usePositionsStore((state) => selectPositionsWithPnL(state));
};

/**
 * Hook to get portfolio summary
 */
export const usePortfolioSummary = () => {
  return usePositionsStore((state) => selectPortfolioSummary(state));
};

/**
 * Hook to get total portfolio value
 */
export const useTotalPortfolioValue = () => {
  return usePositionsStore((state) => selectTotalPortfolioValue(state));
};

/**
 * Hook to get total P&L
 */
export const useTotalPnL = () => {
  return usePositionsStore((state) => selectTotalPnL(state));
};
