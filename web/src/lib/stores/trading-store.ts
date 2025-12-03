import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Chart and indicator types
export type ChartType = 'candlestick' | 'line' | 'area';
export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';
export type IndicatorType = 'SMA' | 'EMA' | 'RSI' | 'MACD' | 'BOLLINGER';

export type IndicatorConfig = {
  id: string;
  type: IndicatorType;
  params: Record<string, number>;
  color: string;
  visible: boolean;
};

// Default indicator configurations
const DEFAULT_INDICATORS: Record<IndicatorType, Omit<IndicatorConfig, 'id'>> = {
  SMA: { type: 'SMA', params: { period: 20 }, color: '#3b82f6', visible: false },
  EMA: { type: 'EMA', params: { period: 12 }, color: '#8b5cf6', visible: false },
  RSI: { type: 'RSI', params: { period: 14 }, color: '#f59e0b', visible: false },
  MACD: { type: 'MACD', params: { fast: 12, slow: 26, signal: 9 }, color: '#22c55e', visible: false },
  BOLLINGER: { type: 'BOLLINGER', params: { period: 20, stdDev: 2 }, color: '#ec4899', visible: false },
};

type TradingState = {
  // Active symbol
  activeSymbol: string;

  // Chart settings
  chartType: ChartType;
  timeframe: Timeframe;

  // Indicators
  indicators: IndicatorConfig[];

  // Panel visibility
  showWatchlist: boolean;
  showOrderPanel: boolean;
  showChatPanel: boolean;

  // Actions
  setActiveSymbol: (symbol: string) => void;
  setChartType: (type: ChartType) => void;
  setTimeframe: (timeframe: Timeframe) => void;

  // Indicator actions
  addIndicator: (type: IndicatorType) => void;
  removeIndicator: (id: string) => void;
  toggleIndicator: (id: string) => void;
  updateIndicatorParams: (id: string, params: Record<string, number>) => void;
  updateIndicatorColor: (id: string, color: string) => void;

  // Panel toggles
  toggleWatchlist: () => void;
  toggleOrderPanel: () => void;
  toggleChatPanel: () => void;

  // Reset
  reset: () => void;
};

const initialState = {
  activeSymbol: 'SPY',
  chartType: 'candlestick' as ChartType,
  timeframe: '1d' as Timeframe,
  indicators: [] as IndicatorConfig[],
  showWatchlist: true,
  showOrderPanel: true,
  showChatPanel: true,
};

export const useTradingStore = create<TradingState>()(
  persist(
    (set) => ({
      ...initialState,

      setActiveSymbol: (activeSymbol) => set({ activeSymbol }),

      setChartType: (chartType) => set({ chartType }),

      setTimeframe: (timeframe) => set({ timeframe }),

      addIndicator: (type) =>
        set((state) => {
          // Check if indicator already exists
          const exists = state.indicators.some((ind) => ind.type === type);
          if (exists) return state;

          const defaultConfig = DEFAULT_INDICATORS[type];
          const newIndicator: IndicatorConfig = {
            id: `${type}-${Date.now()}`,
            ...defaultConfig,
            visible: true,
          };
          return { indicators: [...state.indicators, newIndicator] };
        }),

      removeIndicator: (id) =>
        set((state) => ({
          indicators: state.indicators.filter((ind) => ind.id !== id),
        })),

      toggleIndicator: (id) =>
        set((state) => ({
          indicators: state.indicators.map((ind) =>
            ind.id === id ? { ...ind, visible: !ind.visible } : ind
          ),
        })),

      updateIndicatorParams: (id, params) =>
        set((state) => ({
          indicators: state.indicators.map((ind) =>
            ind.id === id ? { ...ind, params: { ...ind.params, ...params } } : ind
          ),
        })),

      updateIndicatorColor: (id, color) =>
        set((state) => ({
          indicators: state.indicators.map((ind) =>
            ind.id === id ? { ...ind, color } : ind
          ),
        })),

      toggleWatchlist: () =>
        set((state) => ({ showWatchlist: !state.showWatchlist })),

      toggleOrderPanel: () =>
        set((state) => ({ showOrderPanel: !state.showOrderPanel })),

      toggleChatPanel: () =>
        set((state) => ({ showChatPanel: !state.showChatPanel })),

      reset: () => set(initialState),
    }),
    {
      name: 'deepstack-trading-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
