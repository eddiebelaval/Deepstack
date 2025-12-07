/**
 * Validation utilities for DeepStack
 */

// Valid stock symbol pattern (1-5 uppercase letters, optional class suffix)
const STOCK_SYMBOL_REGEX = /^[A-Z]{1,5}(\.[A-Z])?$/;

// Valid options symbol pattern (OCC format)
const OPTIONS_SYMBOL_REGEX = /^[A-Z]{1,6}\d{6}[CP]\d{8}$/;

// Valid crypto symbol pattern
const CRYPTO_SYMBOL_REGEX = /^[A-Z]{2,10}(USD|USDT|BTC|ETH)?$/;

// Common invalid/test symbols to reject
const INVALID_SYMBOLS = new Set([
  'TEST', 'FAKE', 'NULL', 'UNDEFINED', 'NAN', 'ERROR',
  'XXX', 'ZZZ', 'AAA', 'BBB',
]);

// Known valid major symbols (for quick validation)
const KNOWN_SYMBOLS = new Set([
  // Major indices ETFs
  'SPY', 'QQQ', 'DIA', 'IWM', 'VIX', 'VXX',
  // Mega caps
  'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'NVDA', 'META', 'TSLA',
  'BRK.A', 'BRK.B', 'V', 'JNJ', 'WMT', 'JPM', 'MA', 'PG', 'UNH',
  'HD', 'DIS', 'PYPL', 'NFLX', 'ADBE', 'CRM', 'INTC', 'AMD', 'CSCO',
  // Popular trading symbols
  'GME', 'AMC', 'PLTR', 'NIO', 'RIVN', 'LCID', 'SOFI', 'HOOD',
  'COIN', 'MARA', 'RIOT', 'SQ', 'SHOP', 'RBLX', 'SNAP', 'UBER',
  // Crypto (when supported)
  'BTCUSD', 'ETHUSD', 'BTC', 'ETH',
]);

export interface ValidationResult {
  isValid: boolean;
  normalizedSymbol: string;
  error?: string;
  symbolType?: 'stock' | 'etf' | 'crypto' | 'options';
}

/**
 * Validate and normalize a stock symbol
 */
export function validateSymbol(input: string): ValidationResult {
  // Normalize input
  const symbol = input.trim().toUpperCase();

  // Check for empty
  if (!symbol) {
    return {
      isValid: false,
      normalizedSymbol: '',
      error: 'Symbol is required',
    };
  }

  // Check length
  if (symbol.length > 10) {
    return {
      isValid: false,
      normalizedSymbol: symbol,
      error: 'Symbol is too long',
    };
  }

  // Check for invalid test symbols
  if (INVALID_SYMBOLS.has(symbol)) {
    return {
      isValid: false,
      normalizedSymbol: symbol,
      error: 'Invalid symbol',
    };
  }

  // Check if it's a known symbol (quick pass)
  if (KNOWN_SYMBOLS.has(symbol)) {
    return {
      isValid: true,
      normalizedSymbol: symbol,
      symbolType: symbol.includes('USD') ? 'crypto' : 'stock',
    };
  }

  // Check stock symbol pattern
  if (STOCK_SYMBOL_REGEX.test(symbol)) {
    return {
      isValid: true,
      normalizedSymbol: symbol,
      symbolType: 'stock',
    };
  }

  // Check crypto pattern
  if (CRYPTO_SYMBOL_REGEX.test(symbol)) {
    return {
      isValid: true,
      normalizedSymbol: symbol,
      symbolType: 'crypto',
    };
  }

  // Check options pattern
  if (OPTIONS_SYMBOL_REGEX.test(symbol)) {
    return {
      isValid: true,
      normalizedSymbol: symbol,
      symbolType: 'options',
    };
  }

  return {
    isValid: false,
    normalizedSymbol: symbol,
    error: 'Invalid symbol format',
  };
}

/**
 * Quick check if symbol is valid (boolean only)
 */
export function isValidSymbol(symbol: string): boolean {
  return validateSymbol(symbol).isValid;
}

/**
 * Normalize symbol to uppercase, trimmed
 */
export function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

/**
 * Validate quantity for trading
 */
export function validateQuantity(
  quantity: number,
  options: { min?: number; max?: number } = {}
): { isValid: boolean; error?: string } {
  const { min = 1, max = 100000 } = options;

  if (!Number.isFinite(quantity)) {
    return { isValid: false, error: 'Invalid quantity' };
  }

  if (!Number.isInteger(quantity)) {
    return { isValid: false, error: 'Quantity must be a whole number' };
  }

  if (quantity < min) {
    return { isValid: false, error: `Minimum quantity is ${min}` };
  }

  if (quantity > max) {
    return { isValid: false, error: `Maximum quantity is ${max}` };
  }

  return { isValid: true };
}

/**
 * Validate price for trading
 */
export function validatePrice(
  price: number,
  options: { min?: number; max?: number } = {}
): { isValid: boolean; error?: string } {
  const { min = 0.01, max = 1000000 } = options;

  if (!Number.isFinite(price)) {
    return { isValid: false, error: 'Invalid price' };
  }

  if (price < min) {
    return { isValid: false, error: `Minimum price is $${min}` };
  }

  if (price > max) {
    return { isValid: false, error: `Price exceeds maximum` };
  }

  return { isValid: true };
}
