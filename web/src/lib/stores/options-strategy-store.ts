import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  OptionLeg,
  OptionContract,
  StrategyCalculation,
  StrategyTemplate,
  StrategyCalculationRequest,
  getMidPrice,
} from '../types/options';

type OptionsStrategyState = {
  // Position info
  symbol: string;
  underlyingPrice: number;
  expirationDate: string;

  // Strategy
  selectedTemplate: StrategyTemplate | null;
  legs: OptionLeg[];

  // Calculation results
  calculation: StrategyCalculation | null;

  // Loading state
  isCalculating: boolean;
  error: string | null;

  // Chart settings
  priceRangePct: number;
  numPoints: number;
  volatility: number;
  riskFreeRate: number;
  showGreeks: boolean;

  // Symbol & underlying actions
  setSymbol: (symbol: string) => void;
  setUnderlyingPrice: (price: number) => void;
  setExpirationDate: (date: string) => void;

  // Strategy template actions
  selectTemplate: (template: StrategyTemplate | null) => void;

  // Leg management
  addLeg: (leg: OptionLeg) => void;
  addLegFromContract: (contract: OptionContract, action: 'buy' | 'sell', quantity?: number) => void;
  updateLeg: (index: number, updates: Partial<OptionLeg>) => void;
  removeLeg: (index: number) => void;
  clearLegs: () => void;

  // Calculation
  calculate: () => Promise<void>;

  // Settings
  setPriceRangePct: (pct: number) => void;
  setVolatility: (vol: number) => void;
  setRiskFreeRate: (rate: number) => void;
  setShowGreeks: (show: boolean) => void;

  // Reset
  reset: () => void;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const initialState = {
  symbol: 'SPY',
  underlyingPrice: 0,
  expirationDate: '',
  selectedTemplate: null as StrategyTemplate | null,
  legs: [] as OptionLeg[],
  calculation: null as StrategyCalculation | null,
  isCalculating: false,
  error: null as string | null,
  priceRangePct: 0.20,
  numPoints: 100,
  volatility: 0.30,
  riskFreeRate: 0.05,
  showGreeks: false,
};

export const useOptionsStrategyStore = create<OptionsStrategyState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Symbol & underlying actions
      setSymbol: (symbol) =>
        set({ symbol: symbol.toUpperCase() }),

      setUnderlyingPrice: (price) =>
        set({ underlyingPrice: price }),

      setExpirationDate: (date) =>
        set({ expirationDate: date }),

      // Strategy template actions
      selectTemplate: (template) => {
        set({ selectedTemplate: template });

        // Clear legs when changing template
        if (template !== get().selectedTemplate) {
          set({ legs: [], calculation: null });
        }
      },

      // Leg management
      addLeg: (leg) =>
        set((state) => ({
          legs: [...state.legs, leg],
          calculation: null, // Invalidate calculation
        })),

      addLegFromContract: (contract, action, quantity = 1) => {
        const midPrice = getMidPrice(contract);
        if (midPrice === null) {
          set({ error: 'Cannot determine premium for contract' });
          return;
        }

        const leg: OptionLeg = {
          strike: contract.strike_price,
          option_type: contract.option_type,
          action,
          quantity,
          premium: midPrice,
          contract,
        };

        set((state) => ({
          legs: [...state.legs, leg],
          calculation: null,
          // Update expiration and underlying price from contract
          expirationDate: state.expirationDate || contract.expiration_date,
          underlyingPrice: contract.underlying_price || state.underlyingPrice,
        }));
      },

      updateLeg: (index, updates) =>
        set((state) => ({
          legs: state.legs.map((leg, i) =>
            i === index ? { ...leg, ...updates } : leg
          ),
          calculation: null,
        })),

      removeLeg: (index) =>
        set((state) => ({
          legs: state.legs.filter((_, i) => i !== index),
          calculation: null,
        })),

      clearLegs: () =>
        set({ legs: [], calculation: null }),

      // Calculation
      calculate: async () => {
        const state = get();

        if (state.legs.length === 0) {
          set({ error: 'Add at least one leg to calculate' });
          return;
        }

        if (!state.expirationDate) {
          set({ error: 'Select an expiration date' });
          return;
        }

        if (state.underlyingPrice <= 0) {
          set({ error: 'Enter a valid underlying price' });
          return;
        }

        set({ isCalculating: true, error: null });

        try {
          const request: StrategyCalculationRequest = {
            symbol: state.symbol,
            underlying_price: state.underlyingPrice,
            legs: state.legs.map((leg) => ({
              strike: leg.strike,
              option_type: leg.option_type,
              action: leg.action,
              quantity: leg.quantity,
              premium: leg.premium,
            })),
            expiration_date: state.expirationDate,
            volatility: state.volatility,
            risk_free_rate: state.riskFreeRate,
            price_range_pct: state.priceRangePct,
            num_points: state.numPoints,
          };

          const response = await fetch(`${API_BASE}/api/options/strategy/calculate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `HTTP ${response.status}`);
          }

          const calculation: StrategyCalculation = await response.json();

          set({
            calculation,
            isCalculating: false,
            error: null,
          });
        } catch (error) {
          console.error('Strategy calculation failed:', error);
          set({
            isCalculating: false,
            error: error instanceof Error ? error.message : 'Calculation failed',
          });
        }
      },

      // Settings
      setPriceRangePct: (pct) =>
        set({ priceRangePct: pct, calculation: null }),

      setVolatility: (vol) =>
        set({ volatility: vol, calculation: null }),

      setRiskFreeRate: (rate) =>
        set({ riskFreeRate: rate, calculation: null }),

      setShowGreeks: (show) =>
        set({ showGreeks: show }),

      // Reset
      reset: () => set(initialState),
    }),
    {
      name: 'deepstack-options-strategy-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Persist settings but not calculation results
        symbol: state.symbol,
        priceRangePct: state.priceRangePct,
        volatility: state.volatility,
        riskFreeRate: state.riskFreeRate,
        showGreeks: state.showGreeks,
      }),
    }
  )
);

// Helper to create legs for strategy templates
export function createLegsForTemplate(
  template: StrategyTemplate,
  strikePrice: number,
  premium: number,
  spreadWidth: number = 5
): OptionLeg[] {
  switch (template) {
    case 'long_call':
      return [{ strike: strikePrice, option_type: 'call', action: 'buy', quantity: 1, premium }];

    case 'short_call':
      return [{ strike: strikePrice, option_type: 'call', action: 'sell', quantity: 1, premium }];

    case 'long_put':
      return [{ strike: strikePrice, option_type: 'put', action: 'buy', quantity: 1, premium }];

    case 'short_put':
      return [{ strike: strikePrice, option_type: 'put', action: 'sell', quantity: 1, premium }];

    case 'bull_call_spread':
      return [
        { strike: strikePrice, option_type: 'call', action: 'buy', quantity: 1, premium },
        { strike: strikePrice + spreadWidth, option_type: 'call', action: 'sell', quantity: 1, premium: premium * 0.6 },
      ];

    case 'bear_put_spread':
      return [
        { strike: strikePrice, option_type: 'put', action: 'buy', quantity: 1, premium },
        { strike: strikePrice - spreadWidth, option_type: 'put', action: 'sell', quantity: 1, premium: premium * 0.6 },
      ];

    case 'bull_put_spread':
      return [
        { strike: strikePrice - spreadWidth, option_type: 'put', action: 'buy', quantity: 1, premium: premium * 0.4 },
        { strike: strikePrice, option_type: 'put', action: 'sell', quantity: 1, premium },
      ];

    case 'bear_call_spread':
      return [
        { strike: strikePrice, option_type: 'call', action: 'sell', quantity: 1, premium },
        { strike: strikePrice + spreadWidth, option_type: 'call', action: 'buy', quantity: 1, premium: premium * 0.4 },
      ];

    case 'iron_condor':
      return [
        { strike: strikePrice - spreadWidth * 2, option_type: 'put', action: 'buy', quantity: 1, premium: premium * 0.2 },
        { strike: strikePrice - spreadWidth, option_type: 'put', action: 'sell', quantity: 1, premium: premium * 0.5 },
        { strike: strikePrice + spreadWidth, option_type: 'call', action: 'sell', quantity: 1, premium: premium * 0.5 },
        { strike: strikePrice + spreadWidth * 2, option_type: 'call', action: 'buy', quantity: 1, premium: premium * 0.2 },
      ];

    case 'iron_butterfly':
      return [
        { strike: strikePrice - spreadWidth, option_type: 'put', action: 'buy', quantity: 1, premium: premium * 0.3 },
        { strike: strikePrice, option_type: 'put', action: 'sell', quantity: 1, premium: premium * 0.8 },
        { strike: strikePrice, option_type: 'call', action: 'sell', quantity: 1, premium: premium * 0.8 },
        { strike: strikePrice + spreadWidth, option_type: 'call', action: 'buy', quantity: 1, premium: premium * 0.3 },
      ];

    case 'long_straddle':
      return [
        { strike: strikePrice, option_type: 'call', action: 'buy', quantity: 1, premium },
        { strike: strikePrice, option_type: 'put', action: 'buy', quantity: 1, premium },
      ];

    case 'short_straddle':
      return [
        { strike: strikePrice, option_type: 'call', action: 'sell', quantity: 1, premium },
        { strike: strikePrice, option_type: 'put', action: 'sell', quantity: 1, premium },
      ];

    case 'long_strangle':
      return [
        { strike: strikePrice + spreadWidth, option_type: 'call', action: 'buy', quantity: 1, premium: premium * 0.6 },
        { strike: strikePrice - spreadWidth, option_type: 'put', action: 'buy', quantity: 1, premium: premium * 0.6 },
      ];

    case 'short_strangle':
      return [
        { strike: strikePrice + spreadWidth, option_type: 'call', action: 'sell', quantity: 1, premium: premium * 0.6 },
        { strike: strikePrice - spreadWidth, option_type: 'put', action: 'sell', quantity: 1, premium: premium * 0.6 },
      ];

    default:
      return [];
  }
}
