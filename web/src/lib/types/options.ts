/**
 * Options Trading Types
 * TypeScript types matching the backend API models
 */

// ============== Enums ==============

export type OptionType = 'call' | 'put';
export type OptionAction = 'buy' | 'sell';
export type Moneyness = 'itm' | 'atm' | 'otm';
export type SortOrder = 'asc' | 'desc';
export type SortBy = 'volume' | 'open_interest' | 'delta' | 'iv' | 'dte' | 'bid_ask_spread';

// ============== Core Types ==============

export interface Greeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

export interface OptionContract {
  symbol: string;
  underlying_symbol: string;
  option_type: OptionType;
  strike_price: number;
  expiration_date: string;
  days_to_expiration: number;
  bid: number | null;
  ask: number | null;
  last_price: number | null;
  volume: number | null;
  open_interest: number | null;
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
  implied_volatility: number | null;
  bid_ask_spread: number | null;
  bid_ask_spread_pct: number | null;
  moneyness: Moneyness | null;
  underlying_price: number | null;
}

export interface OptionChain {
  underlying_symbol: string;
  underlying_price: number;
  contracts: OptionContract[];
  expirations: string[];
  timestamp: string;
}

// ============== Strategy Types ==============

export interface OptionLeg {
  strike: number;
  option_type: OptionType;
  action: OptionAction;
  quantity: number;
  premium: number;
  contract?: OptionContract;  // Full contract data if available
}

export interface PnLPoint {
  price: number;
  pnl: number;
}

export interface StrategyCalculation {
  pnl_at_expiration: PnLPoint[];
  pnl_current: PnLPoint[];
  greeks: Greeks;
  greeks_over_price: Array<{
    price: number;
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
  }>;
  max_profit: number;
  max_loss: number;
  breakeven_points: number[];
  risk_reward_ratio: number;
  net_debit_credit: number;
  strategy_name: string;
  probability_of_profit?: number;
}

// Strategy templates
export type StrategyTemplate =
  | 'long_call'
  | 'short_call'
  | 'long_put'
  | 'short_put'
  | 'bull_call_spread'
  | 'bear_call_spread'
  | 'bull_put_spread'
  | 'bear_put_spread'
  | 'iron_condor'
  | 'iron_butterfly'
  | 'long_straddle'
  | 'short_straddle'
  | 'long_strangle'
  | 'short_strangle'
  | 'custom';

export interface StrategyInfo {
  id: StrategyTemplate;
  name: string;
  description: string;
  legs: number;
  direction: 'bullish' | 'bearish' | 'neutral';
  maxProfit: 'limited' | 'unlimited';
  maxLoss: 'limited' | 'unlimited';
}

// ============== Screener Types ==============

export interface ScreenerFilters {
  underlying_symbols: string[];
  option_types?: OptionType[];
  min_dte: number;
  max_dte: number;
  min_volume: number;
  min_open_interest: number;
  min_delta?: number;
  max_delta?: number;
  min_theta?: number;
  max_theta?: number;
  min_vega?: number;
  max_vega?: number;
  min_iv?: number;
  max_iv?: number;
  max_bid_ask_spread_pct?: number;
  moneyness?: Moneyness[];
  sort_by: SortBy;
  sort_order: SortOrder;
  limit: number;
}

export interface ScreenerResponse {
  contracts: OptionContract[];
  total_count: number;
  filters_applied: ScreenerFilters;
}

// ============== API Request Types ==============

export interface ExpirationResponse {
  symbol: string;
  expirations: string[];
}

export interface StrategyCalculationRequest {
  symbol: string;
  underlying_price: number;
  legs: Array<{
    strike: number;
    option_type: OptionType;
    action: OptionAction;
    quantity: number;
    premium: number;
  }>;
  expiration_date: string;
  volatility?: number;
  risk_free_rate?: number;
  price_range_pct?: number;
  num_points?: number;
}

export interface GreeksCalculationRequest {
  underlying_price: number;
  strike: number;
  days_to_expiration: number;
  volatility?: number;
  risk_free_rate?: number;
  option_type?: OptionType;
}

// ============== UI State Types ==============

export interface ScreenerState {
  filters: ScreenerFilters;
  results: OptionContract[];
  isLoading: boolean;
  hasRun: boolean;
  error: string | null;
}

export interface StrategyBuilderState {
  symbol: string;
  underlyingPrice: number;
  legs: OptionLeg[];
  selectedTemplate: StrategyTemplate | null;
  calculation: StrategyCalculation | null;
  expirationDate: string;
  isCalculating: boolean;
  error: string | null;
}

// ============== Strategy Templates Data ==============

export const STRATEGY_TEMPLATES: StrategyInfo[] = [
  {
    id: 'long_call',
    name: 'Long Call',
    description: 'Bullish bet with limited loss, unlimited profit',
    legs: 1,
    direction: 'bullish',
    maxProfit: 'unlimited',
    maxLoss: 'limited',
  },
  {
    id: 'short_call',
    name: 'Short Call',
    description: 'Bearish/neutral, collect premium with unlimited risk',
    legs: 1,
    direction: 'bearish',
    maxProfit: 'limited',
    maxLoss: 'unlimited',
  },
  {
    id: 'long_put',
    name: 'Long Put',
    description: 'Bearish bet with limited loss, large profit potential',
    legs: 1,
    direction: 'bearish',
    maxProfit: 'limited',
    maxLoss: 'limited',
  },
  {
    id: 'short_put',
    name: 'Short Put',
    description: 'Bullish/neutral, collect premium with large risk',
    legs: 1,
    direction: 'bullish',
    maxProfit: 'limited',
    maxLoss: 'limited',
  },
  {
    id: 'bull_call_spread',
    name: 'Bull Call Spread',
    description: 'Moderately bullish with defined risk/reward',
    legs: 2,
    direction: 'bullish',
    maxProfit: 'limited',
    maxLoss: 'limited',
  },
  {
    id: 'bear_put_spread',
    name: 'Bear Put Spread',
    description: 'Moderately bearish with defined risk/reward',
    legs: 2,
    direction: 'bearish',
    maxProfit: 'limited',
    maxLoss: 'limited',
  },
  {
    id: 'iron_condor',
    name: 'Iron Condor',
    description: 'Profit from low volatility, collect premium',
    legs: 4,
    direction: 'neutral',
    maxProfit: 'limited',
    maxLoss: 'limited',
  },
  {
    id: 'iron_butterfly',
    name: 'Iron Butterfly',
    description: 'Profit from price staying at center strike',
    legs: 4,
    direction: 'neutral',
    maxProfit: 'limited',
    maxLoss: 'limited',
  },
  {
    id: 'long_straddle',
    name: 'Long Straddle',
    description: 'Profit from large move in either direction',
    legs: 2,
    direction: 'neutral',
    maxProfit: 'unlimited',
    maxLoss: 'limited',
  },
  {
    id: 'long_strangle',
    name: 'Long Strangle',
    description: 'Cheaper straddle, needs larger move',
    legs: 2,
    direction: 'neutral',
    maxProfit: 'unlimited',
    maxLoss: 'limited',
  },
  {
    id: 'custom',
    name: 'Custom Strategy',
    description: 'Build your own multi-leg strategy',
    legs: 0,
    direction: 'neutral',
    maxProfit: 'unlimited',
    maxLoss: 'unlimited',
  },
];

// ============== Default Values ==============

export const DEFAULT_SCREENER_FILTERS: ScreenerFilters = {
  underlying_symbols: ['SPY'],
  option_types: undefined,
  min_dte: 7,
  max_dte: 45,
  min_volume: 100,
  min_open_interest: 500,
  min_delta: undefined,
  max_delta: undefined,
  min_iv: undefined,
  max_iv: undefined,
  max_bid_ask_spread_pct: 10,
  moneyness: undefined,
  sort_by: 'volume',
  sort_order: 'desc',
  limit: 100,
};

// ============== Helper Functions ==============

export function formatStrike(strike: number): string {
  return `$${strike.toFixed(2)}`;
}

export function formatPremium(premium: number): string {
  return `$${(premium * 100).toFixed(0)}`;  // Convert to dollars per contract
}

export function formatDelta(delta: number | null): string {
  if (delta === null) return '--';
  return delta.toFixed(2);
}

export function formatIV(iv: number | null): string {
  if (iv === null) return '--';
  return `${(iv * 100).toFixed(1)}%`;
}

export function formatSpread(spreadPct: number | null): string {
  if (spreadPct === null) return '--';
  return `${spreadPct.toFixed(1)}%`;
}

export function getMidPrice(contract: OptionContract): number | null {
  if (contract.bid === null || contract.ask === null) return contract.last_price;
  return (contract.bid + contract.ask) / 2;
}

export function getMoneyessLabel(moneyness: Moneyness | null): string {
  if (!moneyness) return '--';
  switch (moneyness) {
    case 'itm': return 'ITM';
    case 'atm': return 'ATM';
    case 'otm': return 'OTM';
  }
}

export function getDirectionColor(direction: 'bullish' | 'bearish' | 'neutral'): string {
  switch (direction) {
    case 'bullish': return 'text-green-500';
    case 'bearish': return 'text-red-500';
    case 'neutral': return 'text-yellow-500';
  }
}
