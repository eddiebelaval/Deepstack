import { describe, it, expect } from 'vitest';
import {
  validateSymbol,
  isValidSymbol,
  normalizeSymbol,
  validateQuantity,
  validatePrice,
} from '../validation';

describe('validateSymbol', () => {
  describe('valid stock symbols', () => {
    it('validates major stock symbols', () => {
      const result = validateSymbol('AAPL');
      expect(result.isValid).toBe(true);
      expect(result.normalizedSymbol).toBe('AAPL');
      expect(result.symbolType).toBe('stock');
    });

    it('validates ETF symbols', () => {
      const result = validateSymbol('SPY');
      expect(result.isValid).toBe(true);
      expect(result.symbolType).toBe('stock');
    });

    it('validates symbols with class suffix (BRK.B)', () => {
      const result = validateSymbol('BRK.B');
      expect(result.isValid).toBe(true);
      expect(result.normalizedSymbol).toBe('BRK.B');
    });

    it('normalizes lowercase to uppercase', () => {
      const result = validateSymbol('msft');
      expect(result.isValid).toBe(true);
      expect(result.normalizedSymbol).toBe('MSFT');
    });

    it('trims whitespace', () => {
      const result = validateSymbol('  NVDA  ');
      expect(result.isValid).toBe(true);
      expect(result.normalizedSymbol).toBe('NVDA');
    });
  });

  describe('valid crypto symbols', () => {
    it('validates crypto with USD suffix', () => {
      const result = validateSymbol('BTCUSD');
      expect(result.isValid).toBe(true);
      expect(result.symbolType).toBe('crypto');
    });

    it('validates crypto with USDT suffix', () => {
      const result = validateSymbol('ETHUSDT');
      expect(result.isValid).toBe(true);
      expect(result.symbolType).toBe('crypto');
    });
  });

  describe('invalid symbols', () => {
    it('rejects empty string', () => {
      const result = validateSymbol('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Symbol is required');
    });

    it('rejects whitespace only', () => {
      const result = validateSymbol('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Symbol is required');
    });

    it('rejects symbols that are too long', () => {
      const result = validateSymbol('VERYLONGSYMBOL');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Symbol is too long');
    });

    it('rejects known test symbols', () => {
      expect(validateSymbol('TEST').isValid).toBe(false);
      expect(validateSymbol('FAKE').isValid).toBe(false);
      expect(validateSymbol('NULL').isValid).toBe(false);
    });

    it('rejects invalid format', () => {
      const result = validateSymbol('123');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid symbol format');
    });

    it('rejects symbols with numbers at start', () => {
      const result = validateSymbol('1AAA');
      expect(result.isValid).toBe(false);
    });
  });
});

describe('isValidSymbol', () => {
  it('returns true for valid symbols', () => {
    expect(isValidSymbol('AAPL')).toBe(true);
    expect(isValidSymbol('spy')).toBe(true);
  });

  it('returns false for invalid symbols', () => {
    expect(isValidSymbol('')).toBe(false);
    expect(isValidSymbol('TEST')).toBe(false);
  });
});

describe('normalizeSymbol', () => {
  it('converts to uppercase', () => {
    expect(normalizeSymbol('aapl')).toBe('AAPL');
  });

  it('trims whitespace', () => {
    expect(normalizeSymbol('  MSFT  ')).toBe('MSFT');
  });

  it('handles mixed case', () => {
    expect(normalizeSymbol('GoOgL')).toBe('GOOGL');
  });
});

describe('validateQuantity', () => {
  describe('valid quantities', () => {
    it('accepts positive integers', () => {
      expect(validateQuantity(1).isValid).toBe(true);
      expect(validateQuantity(100).isValid).toBe(true);
      expect(validateQuantity(10000).isValid).toBe(true);
    });

    it('accepts boundary values', () => {
      expect(validateQuantity(1).isValid).toBe(true);
      expect(validateQuantity(100000).isValid).toBe(true);
    });
  });

  describe('invalid quantities', () => {
    it('rejects zero', () => {
      const result = validateQuantity(0);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Minimum quantity is 1');
    });

    it('rejects negative numbers', () => {
      const result = validateQuantity(-10);
      expect(result.isValid).toBe(false);
    });

    it('rejects non-integer values', () => {
      const result = validateQuantity(1.5);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Quantity must be a whole number');
    });

    it('rejects NaN', () => {
      const result = validateQuantity(NaN);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid quantity');
    });

    it('rejects Infinity', () => {
      const result = validateQuantity(Infinity);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid quantity');
    });

    it('rejects values above max', () => {
      const result = validateQuantity(100001);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Maximum quantity is 100000');
    });
  });

  describe('custom bounds', () => {
    it('respects custom min', () => {
      expect(validateQuantity(5, { min: 10 }).isValid).toBe(false);
      expect(validateQuantity(10, { min: 10 }).isValid).toBe(true);
    });

    it('respects custom max', () => {
      expect(validateQuantity(50, { max: 100 }).isValid).toBe(true);
      expect(validateQuantity(150, { max: 100 }).isValid).toBe(false);
    });
  });
});

describe('validatePrice', () => {
  describe('valid prices', () => {
    it('accepts positive decimal prices', () => {
      expect(validatePrice(0.01).isValid).toBe(true);
      expect(validatePrice(150.50).isValid).toBe(true);
      expect(validatePrice(1000.00).isValid).toBe(true);
    });

    it('accepts boundary values', () => {
      expect(validatePrice(0.01).isValid).toBe(true);
      expect(validatePrice(1000000).isValid).toBe(true);
    });
  });

  describe('invalid prices', () => {
    it('rejects zero', () => {
      const result = validatePrice(0);
      expect(result.isValid).toBe(false);
    });

    it('rejects negative prices', () => {
      const result = validatePrice(-10);
      expect(result.isValid).toBe(false);
    });

    it('rejects NaN', () => {
      const result = validatePrice(NaN);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid price');
    });

    it('rejects Infinity', () => {
      const result = validatePrice(Infinity);
      expect(result.isValid).toBe(false);
    });

    it('rejects prices above max', () => {
      const result = validatePrice(1000001);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Price exceeds maximum');
    });
  });

  describe('custom bounds', () => {
    it('respects custom min', () => {
      expect(validatePrice(0.50, { min: 1 }).isValid).toBe(false);
      expect(validatePrice(1, { min: 1 }).isValid).toBe(true);
    });

    it('respects custom max', () => {
      expect(validatePrice(500, { max: 1000 }).isValid).toBe(true);
      expect(validatePrice(1500, { max: 1000 }).isValid).toBe(false);
    });
  });
});
