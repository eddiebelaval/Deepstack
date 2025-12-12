/**
 * Market Categories Data Structure
 *
 * Defines category groupings for the market watcher tabs.
 * Each tab (market, crypto, etfs) has its own set of categories
 * with associated symbols and visual styling.
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface MarketCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  symbols: string[];
}

export interface CategoryGroup {
  tabId: 'market' | 'crypto' | 'etfs';
  categories: MarketCategory[];
}

// ============================================================================
// Color Constants
// ============================================================================

export const CATEGORY_COLORS = {
  blue: '#3b82f6',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  green: '#10b981',
  emerald: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
  pink: '#ec4899',
  violet: '#a855f7',
} as const;

// ============================================================================
// Market Tab Categories (Indices)
// ============================================================================

export const INDICES_CATEGORIES: MarketCategory[] = [
  {
    id: 'broad-market',
    name: 'Broad Market',
    description: 'Major US indexes',
    color: CATEGORY_COLORS.blue,
    symbols: ['SPY', 'VTI'],
  },
  {
    id: 'large-cap',
    name: 'Large Cap',
    description: 'Large capitalization indexes',
    color: CATEGORY_COLORS.purple,
    symbols: ['DIA', 'QQQ'],
  },
  {
    id: 'mid-cap',
    name: 'Mid Cap',
    description: 'Mid capitalization indexes',
    color: CATEGORY_COLORS.cyan,
    symbols: ['IJH', 'IWR'],
  },
  {
    id: 'small-cap',
    name: 'Small Cap',
    description: 'Small capitalization indexes',
    color: CATEGORY_COLORS.green,
    symbols: ['IWM', 'IJR'],
  },
  {
    id: 'sector-indices',
    name: 'Sector Indices',
    description: 'Sector-specific indexes',
    color: CATEGORY_COLORS.amber,
    symbols: ['SOXX', 'IYT'],
  },
  {
    id: 'volatility',
    name: 'Volatility',
    description: 'Volatility and safe-haven instruments',
    color: CATEGORY_COLORS.red,
    symbols: ['VIXY', 'TLT'],
  },
];

// ============================================================================
// Crypto Tab Categories
// ============================================================================

export const CRYPTO_CATEGORIES: MarketCategory[] = [
  {
    id: 'layer-1',
    name: 'Layer 1',
    description: 'Primary blockchain networks',
    color: CATEGORY_COLORS.amber,
    symbols: ['BTC/USD', 'ETH/USD', 'SOL/USD', 'AVAX/USD', 'ADA/USD'],
  },
  {
    id: 'layer-2',
    name: 'Layer 2',
    description: 'Scaling solutions',
    color: CATEGORY_COLORS.purple,
    symbols: ['MATIC/USD', 'OP/USD', 'ARB/USD'],
  },
  {
    id: 'defi',
    name: 'DeFi',
    description: 'Decentralized finance protocols',
    color: CATEGORY_COLORS.blue,
    symbols: ['UNI/USD', 'AAVE/USD', 'MKR/USD', 'CRV/USD', 'LDO/USD'],
  },
  {
    id: 'memes',
    name: 'Memes',
    description: 'Meme coins and community tokens',
    color: CATEGORY_COLORS.pink,
    symbols: ['DOGE/USD', 'SHIB/USD', 'PEPE/USD', 'BONK/USD'],
  },
  {
    id: 'stablecoins',
    name: 'Stablecoins',
    description: 'Fiat-pegged stablecoins',
    color: CATEGORY_COLORS.emerald,
    symbols: ['USDT/USD', 'USDC/USD', 'DAI/USD'],
  },
  {
    id: 'ai-infra',
    name: 'AI / Infra',
    description: 'AI and infrastructure tokens',
    color: CATEGORY_COLORS.cyan,
    symbols: ['LINK/USD', 'FET/USD', 'TAO/USD', 'RNDR/USD'],
  },
];

// ============================================================================
// ETF Tab Categories
// ============================================================================

export const ETF_CATEGORIES: MarketCategory[] = [
  {
    id: 'equity-us',
    name: 'Equity - US',
    description: 'US equity ETFs',
    color: CATEGORY_COLORS.blue,
    symbols: ['SPY', 'QQQ', 'IWM', 'DIA', 'VTI'],
  },
  {
    id: 'equity-intl',
    name: 'Equity - Intl',
    description: 'International equity ETFs',
    color: CATEGORY_COLORS.purple,
    symbols: ['EFA', 'EEM', 'VEU', 'IEFA'],
  },
  {
    id: 'fixed-income',
    name: 'Fixed Income',
    description: 'Bond and fixed income ETFs',
    color: CATEGORY_COLORS.emerald,
    symbols: ['TLT', 'BND', 'HYG', 'LQD', 'SHY'],
  },
  {
    id: 'commodity',
    name: 'Commodity',
    description: 'Commodity and precious metals ETFs',
    color: CATEGORY_COLORS.amber,
    symbols: ['GLD', 'SLV', 'USO', 'UNG', 'DBC'],
  },
  {
    id: 'real-estate',
    name: 'Real Estate',
    description: 'Real estate investment ETFs',
    color: CATEGORY_COLORS.pink,
    symbols: ['VNQ', 'IYR', 'XLRE'],
  },
  {
    id: 'sector',
    name: 'Sector',
    description: 'Sector-specific ETFs',
    color: CATEGORY_COLORS.cyan,
    symbols: ['XLF', 'XLE', 'XLK', 'XLV', 'XLI'],
  },
  {
    id: 'thematic',
    name: 'Thematic',
    description: 'Thematic and innovation ETFs',
    color: CATEGORY_COLORS.violet,
    symbols: ['ARKK', 'HACK', 'TAN', 'BOTZ'],
  },
  {
    id: 'leveraged-inverse',
    name: 'Leveraged / Inverse',
    description: 'Leveraged and inverse ETFs',
    color: CATEGORY_COLORS.red,
    symbols: ['TQQQ', 'SQQQ', 'SPXU', 'UVXY'],
  },
];

// ============================================================================
// Category Groups (for organized access)
// ============================================================================

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    tabId: 'market',
    categories: INDICES_CATEGORIES,
  },
  {
    tabId: 'crypto',
    categories: CRYPTO_CATEGORIES,
  },
  {
    tabId: 'etfs',
    categories: ETF_CATEGORIES,
  },
];

// ============================================================================
// Symbol Display Names
// ============================================================================

export const SYMBOL_DISPLAY_NAMES: Record<string, string> = {
  // ---- Broad Market / Large Cap ----
  SPY: 'S&P 500',
  VTI: 'Total Market',
  DIA: 'Dow Jones',
  QQQ: 'NASDAQ 100',

  // ---- Mid Cap ----
  IJH: 'S&P Mid-Cap 400',
  IWR: 'Russell Mid-Cap',

  // ---- Small Cap ----
  IWM: 'Russell 2000',
  IJR: 'S&P Small-Cap 600',

  // ---- Sector Indices ----
  SOXX: 'Semiconductors',
  IYT: 'Transportation',

  // ---- Volatility ----
  VIXY: 'Volatility',
  TLT: 'Treasury 20+ Yr',
  UVXY: 'Ultra VIX',

  // ---- Crypto: Layer 1 ----
  'BTC/USD': 'Bitcoin',
  'ETH/USD': 'Ethereum',
  'SOL/USD': 'Solana',
  'AVAX/USD': 'Avalanche',
  'ADA/USD': 'Cardano',

  // ---- Crypto: Layer 2 ----
  'MATIC/USD': 'Polygon',
  'OP/USD': 'Optimism',
  'ARB/USD': 'Arbitrum',

  // ---- Crypto: DeFi ----
  'UNI/USD': 'Uniswap',
  'AAVE/USD': 'Aave',
  'MKR/USD': 'Maker',
  'CRV/USD': 'Curve',
  'LDO/USD': 'Lido',

  // ---- Crypto: Memes ----
  'DOGE/USD': 'Dogecoin',
  'SHIB/USD': 'Shiba Inu',
  'PEPE/USD': 'Pepe',
  'BONK/USD': 'Bonk',

  // ---- Crypto: Stablecoins ----
  'USDT/USD': 'Tether',
  'USDC/USD': 'USD Coin',
  'DAI/USD': 'Dai',

  // ---- Crypto: AI / Infra ----
  'LINK/USD': 'Chainlink',
  'FET/USD': 'Fetch.ai',
  'TAO/USD': 'Bittensor',
  'RNDR/USD': 'Render',

  // ---- ETF: International ----
  EFA: 'EAFE',
  EEM: 'Emerging Markets',
  VEU: 'All-World ex-US',
  IEFA: 'Core MSCI EAFE',

  // ---- ETF: Fixed Income ----
  BND: 'Total Bond',
  HYG: 'High Yield Corp',
  LQD: 'Investment Grade',
  SHY: 'Treasury 1-3 Yr',

  // ---- ETF: Commodity ----
  GLD: 'Gold',
  SLV: 'Silver',
  USO: 'Crude Oil',
  UNG: 'Natural Gas',
  DBC: 'Commodities',

  // ---- ETF: Real Estate ----
  VNQ: 'Real Estate',
  IYR: 'US Real Estate',
  XLRE: 'Real Estate Select',

  // ---- ETF: Sector ----
  XLF: 'Financials',
  XLE: 'Energy',
  XLK: 'Technology',
  XLV: 'Healthcare',
  XLI: 'Industrials',

  // ---- ETF: Thematic ----
  ARKK: 'ARK Innovation',
  HACK: 'Cybersecurity',
  TAN: 'Solar',
  BOTZ: 'Robotics & AI',

  // ---- ETF: Leveraged / Inverse ----
  TQQQ: '3x NASDAQ',
  SQQQ: '-3x NASDAQ',
  SPXU: '-3x S&P 500',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all categories for a given tab
 * @param tabId - The tab identifier ('market', 'crypto', or 'etfs')
 * @returns Array of categories for the tab, or empty array if not found
 */
export function getCategoriesForTab(tabId: string): MarketCategory[] {
  switch (tabId) {
    case 'market':
      return INDICES_CATEGORIES;
    case 'crypto':
      return CRYPTO_CATEGORIES;
    case 'etfs':
      return ETF_CATEGORIES;
    default:
      return [];
  }
}

/**
 * Get a specific category by tab and category ID
 * @param tabId - The tab identifier
 * @param categoryId - The category ID
 * @returns The category if found, undefined otherwise
 */
export function getCategoryById(
  tabId: string,
  categoryId: string
): MarketCategory | undefined {
  const categories = getCategoriesForTab(tabId);
  return categories.find((cat) => cat.id === categoryId);
}

/**
 * Get symbols for a category by tab and index
 * @param tabId - The tab identifier
 * @param categoryIndex - The zero-based index of the category
 * @returns Array of symbols, or empty array if not found
 */
export function getSymbolsForCategory(
  tabId: string,
  categoryIndex: number
): string[] {
  const categories = getCategoriesForTab(tabId);
  if (categoryIndex >= 0 && categoryIndex < categories.length) {
    return categories[categoryIndex].symbols;
  }
  return [];
}

/**
 * Get the color for a category by tab and index
 * @param tabId - The tab identifier
 * @param categoryIndex - The zero-based index of the category
 * @returns The hex color string, or default gray if not found
 */
export function getCategoryColor(
  tabId: string,
  categoryIndex: number
): string {
  const categories = getCategoriesForTab(tabId);
  if (categoryIndex >= 0 && categoryIndex < categories.length) {
    return categories[categoryIndex].color;
  }
  return '#6b7280'; // gray-500 as fallback
}

/**
 * Get the display name for a symbol
 * @param symbol - The ticker symbol
 * @returns The display name, or the symbol itself if no mapping exists
 */
export function getSymbolDisplayName(symbol: string): string {
  return SYMBOL_DISPLAY_NAMES[symbol] || symbol;
}

/**
 * Get all symbols across all categories for a tab
 * @param tabId - The tab identifier
 * @returns Flat array of all symbols in the tab
 */
export function getAllSymbolsForTab(tabId: string): string[] {
  const categories = getCategoriesForTab(tabId);
  return categories.flatMap((cat) => cat.symbols);
}

/**
 * Find which category a symbol belongs to within a tab
 * @param tabId - The tab identifier
 * @param symbol - The ticker symbol to find
 * @returns The category containing the symbol, or undefined
 */
export function findCategoryForSymbol(
  tabId: string,
  symbol: string
): MarketCategory | undefined {
  const categories = getCategoriesForTab(tabId);
  return categories.find((cat) => cat.symbols.includes(symbol));
}
