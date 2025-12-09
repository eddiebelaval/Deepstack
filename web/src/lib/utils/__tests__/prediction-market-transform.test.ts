import { describe, it, expect } from 'vitest';
import { transformMarket } from '../prediction-market-transform';

describe('transformMarket', () => {
  describe('snake_case to camelCase transformation', () => {
    it('should transform snake_case keys to camelCase', () => {
      const snakeCaseMarket = {
        id: 'TEST-123',
        platform: 'kalshi',
        title: 'Test Market',
        category: 'Economics',
        yes_price: 0.75,
        no_price: 0.25,
        volume: 1000000,
        volume_24h: 50000,
        open_interest: 75000,
        end_date: '2025-12-31',
        status: 'active',
        url: 'https://example.com/market',
        description: 'Test description',
      };

      const result = transformMarket(snakeCaseMarket);

      expect(result).toEqual({
        id: 'TEST-123',
        platform: 'kalshi',
        title: 'Test Market',
        category: 'Economics',
        yesPrice: 0.75,
        noPrice: 0.25,
        volume: 1000000,
        volume24h: 50000,
        openInterest: 75000,
        endDate: '2025-12-31',
        status: 'active',
        url: 'https://example.com/market',
        description: 'Test description',
      });
    });

    it('should transform yes_price to yesPrice', () => {
      const market = { yes_price: 0.65 };
      const result = transformMarket(market);

      expect(result.yesPrice).toBe(0.65);
      expect(result).not.toHaveProperty('yes_price');
    });

    it('should transform no_price to noPrice', () => {
      const market = { no_price: 0.35 };
      const result = transformMarket(market);

      expect(result.noPrice).toBe(0.35);
      expect(result).not.toHaveProperty('no_price');
    });

    it('should transform volume_24h to volume24h', () => {
      const market = { volume_24h: 100000 };
      const result = transformMarket(market);

      expect(result.volume24h).toBe(100000);
      expect(result).not.toHaveProperty('volume_24h');
    });

    it('should transform open_interest to openInterest', () => {
      const market = { open_interest: 250000 };
      const result = transformMarket(market);

      expect(result.openInterest).toBe(250000);
      expect(result).not.toHaveProperty('open_interest');
    });

    it('should transform end_date to endDate', () => {
      const market = { end_date: '2025-06-15' };
      const result = transformMarket(market);

      expect(result.endDate).toBe('2025-06-15');
      expect(result).not.toHaveProperty('end_date');
    });
  });

  describe('null and undefined value handling', () => {
    it('should handle null values gracefully', () => {
      const market = {
        id: null,
        platform: null,
        title: null,
        category: null,
        yes_price: null,
        no_price: null,
        volume: null,
        volume_24h: null,
        open_interest: null,
        end_date: null,
        status: null,
        url: null,
        description: null,
      };

      const result = transformMarket(market);

      expect(result.id).toBeNull();
      expect(result.platform).toBeNull();
      expect(result.title).toBeNull();
      expect(result.category).toBe('Unknown'); // Has default
      expect(result.yesPrice).toBe(0); // Has default
      expect(result.noPrice).toBe(0); // Has default
      expect(result.volume).toBe(0); // Has default
      // Fields with ?? operator fall through to undefined when both are null/undefined
      expect(result.volume24h).toBeUndefined();
      expect(result.openInterest).toBeUndefined();
      expect(result.endDate).toBeUndefined();
      expect(result.status).toBe('active'); // Has default
      expect(result.url).toBe(''); // Has default
      expect(result.description).toBeNull();
    });

    it('should handle undefined values gracefully', () => {
      const market = {};

      const result = transformMarket(market);

      expect(result.id).toBeUndefined();
      expect(result.platform).toBeUndefined();
      expect(result.title).toBeUndefined();
      expect(result.category).toBe('Unknown');
      expect(result.yesPrice).toBe(0);
      expect(result.noPrice).toBe(0);
      expect(result.volume).toBe(0);
      expect(result.volume24h).toBeUndefined();
      expect(result.openInterest).toBeUndefined();
      expect(result.endDate).toBeUndefined();
      expect(result.status).toBe('active');
      expect(result.url).toBe('');
      expect(result.description).toBeUndefined();
    });

    it('should handle missing optional fields', () => {
      const market = {
        id: 'TEST-123',
        platform: 'polymarket',
        title: 'Minimal Market',
      };

      const result = transformMarket(market);

      expect(result.id).toBe('TEST-123');
      expect(result.platform).toBe('polymarket');
      expect(result.title).toBe('Minimal Market');
      expect(result.category).toBe('Unknown');
      expect(result.yesPrice).toBe(0);
      expect(result.noPrice).toBe(0);
      expect(result.volume).toBe(0);
    });

    it('should handle missing prices specifically', () => {
      const market = {
        id: 'TEST-123',
      };

      const result = transformMarket(market);

      expect(result.yesPrice).toBe(0);
      expect(result.noPrice).toBe(0);
    });
  });

  describe('camelCase preservation', () => {
    it('should preserve existing camelCase keys', () => {
      const camelCaseMarket = {
        id: 'TEST-456',
        platform: 'kalshi',
        title: 'CamelCase Market',
        category: 'Crypto',
        yesPrice: 0.82,
        noPrice: 0.18,
        volume: 2000000,
        volume24h: 75000,
        openInterest: 150000,
        endDate: '2025-09-30',
        status: 'active',
        url: 'https://example.com/camel',
        description: 'Already camelCase',
      };

      const result = transformMarket(camelCaseMarket);

      expect(result).toEqual({
        id: 'TEST-456',
        platform: 'kalshi',
        title: 'CamelCase Market',
        category: 'Crypto',
        yesPrice: 0.82,
        noPrice: 0.18,
        volume: 2000000,
        volume24h: 75000,
        openInterest: 150000,
        endDate: '2025-09-30',
        status: 'active',
        url: 'https://example.com/camel',
        description: 'Already camelCase',
      });
    });

    it('should prefer snake_case over camelCase when both exist', () => {
      const mixedMarket = {
        yes_price: 0.60,
        yesPrice: 0.40, // Should be overridden
        no_price: 0.30,
        noPrice: 0.70, // Should be overridden
      };

      const result = transformMarket(mixedMarket);

      expect(result.yesPrice).toBe(0.60); // snake_case wins
      expect(result.noPrice).toBe(0.30); // snake_case wins
    });

    it('should fallback to camelCase when snake_case is missing', () => {
      const market = {
        yesPrice: 0.55,
        noPrice: 0.45,
        volume24h: 100000,
        openInterest: 200000,
        endDate: '2025-12-31',
      };

      const result = transformMarket(market);

      expect(result.yesPrice).toBe(0.55);
      expect(result.noPrice).toBe(0.45);
      expect(result.volume24h).toBe(100000);
      expect(result.openInterest).toBe(200000);
      expect(result.endDate).toBe('2025-12-31');
    });
  });

  describe('default values for missing required fields', () => {
    it('should provide default category "Unknown" when missing', () => {
      const market = { id: 'TEST-789' };
      const result = transformMarket(market);

      expect(result.category).toBe('Unknown');
    });

    it('should provide default yesPrice 0 when missing', () => {
      const market = { id: 'TEST-789' };
      const result = transformMarket(market);

      expect(result.yesPrice).toBe(0);
    });

    it('should provide default noPrice 0 when missing', () => {
      const market = { id: 'TEST-789' };
      const result = transformMarket(market);

      expect(result.noPrice).toBe(0);
    });

    it('should provide default volume 0 when missing', () => {
      const market = { id: 'TEST-789' };
      const result = transformMarket(market);

      expect(result.volume).toBe(0);
    });

    it('should provide default status "active" when missing', () => {
      const market = { id: 'TEST-789' };
      const result = transformMarket(market);

      expect(result.status).toBe('active');
    });

    it('should provide default url empty string when missing', () => {
      const market = { id: 'TEST-789' };
      const result = transformMarket(market);

      expect(result.url).toBe('');
    });

    it('should not override explicitly set values with defaults', () => {
      const market = {
        category: 'Stocks',
        yesPrice: 0,
        noPrice: 0,
        volume: 0,
        status: 'closed',
        url: '',
      };

      const result = transformMarket(market);

      expect(result.category).toBe('Stocks');
      expect(result.yesPrice).toBe(0);
      expect(result.noPrice).toBe(0);
      expect(result.volume).toBe(0);
      expect(result.status).toBe('closed');
      expect(result.url).toBe('');
    });
  });

  describe('numeric value handling', () => {
    it('should handle integer prices correctly', () => {
      const market = {
        yes_price: 1,
        no_price: 0,
      };

      const result = transformMarket(market);

      expect(result.yesPrice).toBe(1);
      expect(result.noPrice).toBe(0);
    });

    it('should handle decimal prices correctly', () => {
      const market = {
        yes_price: 0.7234567,
        no_price: 0.2765433,
      };

      const result = transformMarket(market);

      expect(result.yesPrice).toBe(0.7234567);
      expect(result.noPrice).toBe(0.2765433);
    });

    it('should handle large volume numbers correctly', () => {
      const market = {
        volume: 9999999999,
        volume_24h: 1234567890,
        open_interest: 8888888888,
      };

      const result = transformMarket(market);

      expect(result.volume).toBe(9999999999);
      expect(result.volume24h).toBe(1234567890);
      expect(result.openInterest).toBe(8888888888);
    });

    it('should handle zero values correctly', () => {
      const market = {
        yes_price: 0,
        no_price: 0,
        volume: 0,
        volume_24h: 0,
        open_interest: 0,
      };

      const result = transformMarket(market);

      expect(result.yesPrice).toBe(0);
      expect(result.noPrice).toBe(0);
      expect(result.volume).toBe(0);
      expect(result.volume24h).toBe(0);
      expect(result.openInterest).toBe(0);
    });

    it('should handle negative values (edge case)', () => {
      const market = {
        yes_price: -0.5,
        volume: -100,
      };

      const result = transformMarket(market);

      expect(result.yesPrice).toBe(-0.5);
      expect(result.volume).toBe(-100);
    });

    it('should handle very small decimal prices', () => {
      const market = {
        yes_price: 0.0001,
        no_price: 0.9999,
      };

      const result = transformMarket(market);

      expect(result.yesPrice).toBe(0.0001);
      expect(result.noPrice).toBe(0.9999);
    });
  });

  describe('real-world data scenarios', () => {
    it('should handle typical Kalshi market data', () => {
      const kalshiMarket = {
        id: 'KXBTCUSD-25JAN01-T100000',
        platform: 'kalshi',
        title: 'Will Bitcoin be above $100,000 on January 1, 2025?',
        category: 'Crypto',
        yes_price: 0.68,
        no_price: 0.32,
        volume: 5234000,
        volume_24h: 234500,
        open_interest: 1234000,
        end_date: '2025-01-01T00:00:00Z',
        status: 'active',
        url: 'https://kalshi.com/markets/KXBTCUSD-25JAN01-T100000',
        description: 'This market will resolve to Yes if Bitcoin trades above $100,000.',
      };

      const result = transformMarket(kalshiMarket);

      expect(result.platform).toBe('kalshi');
      expect(result.yesPrice).toBe(0.68);
      expect(result.noPrice).toBe(0.32);
      expect(result.volume).toBe(5234000);
    });

    it('should handle typical Polymarket data', () => {
      const polymarketData = {
        id: 'poly-btc-100k',
        platform: 'polymarket',
        title: 'Bitcoin to $100k?',
        category: 'Crypto',
        yes_price: 0.72,
        no_price: 0.28,
        volume: 8500000,
        volume_24h: 450000,
        status: 'active',
        url: 'https://polymarket.com/event/btc-100k',
      };

      const result = transformMarket(polymarketData);

      expect(result.platform).toBe('polymarket');
      expect(result.category).toBe('Crypto');
      expect(result.yesPrice).toBe(0.72);
      expect(result.url).toBe('https://polymarket.com/event/btc-100k');
    });

    it('should handle market with incomplete data', () => {
      const incompleteMarket = {
        id: 'INCOMPLETE-1',
        title: 'Incomplete Market',
        platform: 'unknown',
      };

      const result = transformMarket(incompleteMarket);

      expect(result.id).toBe('INCOMPLETE-1');
      expect(result.title).toBe('Incomplete Market');
      expect(result.category).toBe('Unknown');
      expect(result.yesPrice).toBe(0);
      expect(result.noPrice).toBe(0);
      expect(result.status).toBe('active');
    });
  });

  describe('string value handling', () => {
    it('should preserve string values correctly', () => {
      const market = {
        id: 'STRING-TEST',
        platform: 'test-platform',
        title: 'A market with special chars: @#$%',
        category: 'Test Category',
        status: 'pending',
        url: 'https://example.com/market?id=123&sort=asc',
        description: 'A long description\nwith multiple\nlines',
      };

      const result = transformMarket(market);

      expect(result.id).toBe('STRING-TEST');
      expect(result.platform).toBe('test-platform');
      expect(result.title).toBe('A market with special chars: @#$%');
      expect(result.category).toBe('Test Category');
      expect(result.status).toBe('pending');
      expect(result.url).toBe('https://example.com/market?id=123&sort=asc');
      expect(result.description).toBe('A long description\nwith multiple\nlines');
    });

    it('should handle empty strings', () => {
      const market = {
        id: '',
        platform: '',
        title: '',
        category: '',
        status: '',
        url: '',
        description: '',
      };

      const result = transformMarket(market);

      expect(result.id).toBe('');
      expect(result.platform).toBe('');
      expect(result.title).toBe('');
      expect(result.category).toBe('Unknown'); // Falsy, so uses default
      expect(result.status).toBe('active'); // Falsy, so uses default
      expect(result.url).toBe('');
      expect(result.description).toBe('');
    });
  });
});
