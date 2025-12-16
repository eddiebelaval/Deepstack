import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tradingTools, allTools } from '../tools';

// Mock dependencies
vi.mock('@/lib/api-extended', () => ({
  api: {
    positions: vi.fn(),
    account: vi.fn(),
    createOrderTicket: vi.fn(),
    calculatePositionSize: vi.fn(),
    searchNews: vi.fn(),
  },
}));

vi.mock('@/lib/supabase/trades', () => ({
  createTradeEntry: vi.fn(),
}));

vi.mock('../prediction-market-tools', () => ({
  predictionMarketTools: {
    search_prediction_markets: { description: 'Mock tool', inputSchema: {}, execute: vi.fn() },
    get_prediction_market: { description: 'Mock tool', inputSchema: {}, execute: vi.fn() },
  },
}));

describe('Trading Tools', () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
  });

  describe('Tool definitions', () => {
    it('should export tradingTools object', () => {
      expect(tradingTools).toBeDefined();
      expect(typeof tradingTools).toBe('object');
    });

    it('should export allTools as alias for tradingTools', () => {
      expect(allTools).toBe(tradingTools);
    });

    it('should have all expected trading tools', () => {
      const expectedTools = [
        'get_quote',
        'get_positions',
        'analyze_stock',
        'place_order',
        'place_paper_trade',
        'calculate_position_size',
        'get_chart_data',
        'search_news',
        'get_active_theses',
        'get_journal_entries',
        'get_emotional_state',
        'search_knowledge',
      ];

      expectedTools.forEach((toolName) => {
        expect(tradingTools).toHaveProperty(toolName);
        expect(tradingTools[toolName as keyof typeof tradingTools]).toHaveProperty('description');
        expect(tradingTools[toolName as keyof typeof tradingTools]).toHaveProperty('inputSchema');
        expect(tradingTools[toolName as keyof typeof tradingTools]).toHaveProperty('execute');
      });
    });

    it('should have all UI panel control tools', () => {
      const panelTools = [
        'show_chart',
        'show_portfolio',
        'show_orders',
        'show_screener',
        'show_alerts',
        'show_calendar',
        'show_news',
        'show_deep_value',
        'show_hedged_positions',
        'show_options_screener',
        'show_options_builder',
      ];

      panelTools.forEach((toolName) => {
        expect(tradingTools).toHaveProperty(toolName);
      });
    });
  });

  describe('get_quote tool', () => {
    it('should have correct schema definition', () => {
      const tool = tradingTools.get_quote;

      expect(tool.description).toContain('real-time stock quote');
      expect(tool.inputSchema).toBeDefined();
    });

    it('should fetch quote successfully from API', async () => {
      const mockQuote = {
        quotes: {
          AAPL: {
            symbol: 'AAPL',
            last: 175.50,
            bid: 175.49,
            ask: 175.51,
            volume: 50000000,
            change: 2.50,
            changePercent: 1.45,
          },
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockQuote,
      });

      const result = await tradingTools.get_quote.execute!({ symbol: 'AAPL' }, {} as any) as any;

      expect(result.success).toBe(true);
      expect(result.data.symbol).toBe('AAPL');
      expect(result.data.last).toBe(175.50);
    });

    it('should convert symbol to uppercase', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          quotes: {
            AAPL: { symbol: 'AAPL', last: 175.50 },
          },
        }),
      });

      await tradingTools.get_quote.execute!({ symbol: 'aapl' }, {} as any) as any;

      const fetchCall = (global.fetch as any).mock.calls[0][0];
      expect(fetchCall).toContain('symbols=AAPL');
    });

    it('should fall back to mock data on API error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await tradingTools.get_quote.execute!({ symbol: 'AAPL' }, {} as any) as any;

      expect(result.success).toBe(true);
      expect(result.mock).toBe(true);
      expect(result.data.symbol).toBe('AAPL');
      expect(result.data.last).toBeGreaterThan(0);
    });

    it('should handle non-ok response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await tradingTools.get_quote.execute!({ symbol: 'TSLA' }, {} as any) as any;

      expect(result.success).toBe(true);
      expect(result.mock).toBe(true);
    });

    it('should handle crypto symbols', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Offline'));

      const result = await tradingTools.get_quote.execute!({ symbol: 'BTC/USD' }, {} as any) as any;

      expect(result.success).toBe(true);
      expect(result.data.symbol).toBe('BTC/USD');
    });
  });

  describe('get_positions tool', () => {
    it('should have correct schema definition', () => {
      const tool = tradingTools.get_positions;

      expect(tool.description).toContain('portfolio positions');
      expect(tool.inputSchema).toBeDefined();
    });

    it('should fetch positions from API', async () => {
      const { api } = await import('@/lib/api-extended');

      (api.positions as any).mockResolvedValue([
        { symbol: 'AAPL', position: 100, unrealized_pnl: 500 },
      ]);
      (api.account as any).mockResolvedValue({
        cash: 50000,
        portfolio_value: 75000,
      });

      const result = await tradingTools.get_positions.execute!({}, {} as any) as any;

      expect(result.success).toBe(true);
      expect(result.data.positions).toHaveLength(1);
      expect(result.data.account_summary).toBeDefined();
    });

    it('should fall back to mock data on error', async () => {
      const { api } = await import('@/lib/api-extended');

      (api.positions as any).mockRejectedValue(new Error('API error'));

      const result = await tradingTools.get_positions.execute!({}, {} as any) as any;

      expect(result.success).toBe(true);
      expect(result.mock).toBe(true);
      expect(Array.isArray(result.data.positions)).toBe(true);
    });
  });

  describe('analyze_stock tool', () => {
    it('should have correct schema definition', () => {
      const tool = tradingTools.analyze_stock;

      expect(tool.description).toContain('comprehensive stock analysis');
      expect(tool.inputSchema).toBeDefined();
    });

    it('should fetch analysis from API', async () => {
      const mockAnalysis = {
        symbol: 'AAPL',
        price: 175.50,
        technicals: { trend: 'bullish' },
        sentiment: { overall: 'positive' },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockAnalysis,
      });

      const result = await tradingTools.analyze_stock.execute!({ symbol: 'AAPL' }, {} as any) as any;

      expect(result.success).toBe(true);
      expect(result.data.symbol).toBe('AAPL');
    });

    it('should generate mock analysis on error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await tradingTools.analyze_stock.execute!({ symbol: 'NVDA' }, {} as any) as any;

      expect(result.success).toBe(true);
      expect(result.mock).toBe(true);
      expect(result.data.symbol).toBe('NVDA');
      expect(result.data.technicals).toBeDefined();
    });
  });

  describe('place_order tool', () => {
    it('should have correct schema definition', () => {
      const tool = tradingTools.place_order;

      expect(tool.description).toContain('order ticket');
      expect(tool.description).toContain('DOES NOT execute');
      expect(tool.inputSchema).toBeDefined();
    });

    it('should check emotional firewall before creating order', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'clear' }),
        });

      const { api } = await import('@/lib/api-extended');
      (api.createOrderTicket as any).mockResolvedValue({
        id: 'ticket-123',
        symbol: 'AAPL',
      });

      const result = await tradingTools.place_order.execute!({
        symbol: 'AAPL',
        quantity: 10,
        action: 'BUY',
        order_type: 'MKT',
      }, {} as any) as any;

      expect(result.success).toBe(true);
      expect((global.fetch as any).mock.calls[0][0]).toContain('emotional-firewall');
    });

    it('should block order when emotional firewall triggers', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          blocked: true,
          status: 'blocked',
          patterns_detected: ['revenge_trading'],
          reasons: ['Multiple losses detected'],
        }),
      });

      const result = await tradingTools.place_order.execute!({
        symbol: 'TSLA',
        quantity: 100,
        action: 'BUY',
        order_type: 'MKT',
      }, {} as any) as any;

      expect(result.success).toBe(false);
      expect(result.blocked_by_firewall).toBe(true);
      expect(result.reasons).toContain('Multiple losses detected');
    });

    it('should create warning ticket when firewall shows warning', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'warning',
          patterns_detected: ['overtrading'],
          reasons: ['High trading frequency'],
        }),
      });

      const result = await tradingTools.place_order.execute!({
        symbol: 'AAPL',
        quantity: 10,
        action: 'BUY',
        order_type: 'MKT',
      }, {} as any) as any;

      expect(result.success).toBe(true);
      expect(result.firewall_warning).toBe(true);
      expect(result.reasons).toContain('High trading frequency');
    });

    it('should create mock ticket when API unavailable', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'clear' }),
      });

      const { api } = await import('@/lib/api-extended');
      (api.createOrderTicket as any).mockRejectedValue(new Error('API error'));

      const result = await tradingTools.place_order.execute!({
        symbol: 'NVDA',
        quantity: 50,
        action: 'BUY',
        order_type: 'LMT',
        limit_price: 140.00,
      }, {} as any) as any;

      expect(result.success).toBe(true);
      expect(result.mock).toBe(true);
      expect(result.data.symbol).toBe('NVDA');
    });
  });

  describe('place_paper_trade tool', () => {
    it('should have correct schema definition', () => {
      const tool = tradingTools.place_paper_trade;

      expect(tool.description).toContain('paper trade');
      expect(tool.inputSchema).toBeDefined();
    });

    it('should execute paper trade with provided price', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'clear' }),
      });

      const { createTradeEntry } = await import('@/lib/supabase/trades');
      (createTradeEntry as any).mockResolvedValue({
        id: 'trade-123',
        symbol: 'AAPL',
        action: 'BUY',
        quantity: 10,
        price: 175.50,
      });

      const result = await tradingTools.place_paper_trade.execute!({
        symbol: 'AAPL',
        quantity: 10,
        action: 'BUY',
        price: 175.50,
        order_type: 'MKT',
      }, {} as any) as any;

      expect(result.success).toBe(true);
      expect(createTradeEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'AAPL',
          quantity: 10,
          price: 175.50,
        })
      );
    });

    it('should fetch current price when not provided', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: 'clear' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            quotes: {
              TSLA: { last: 355.00 },
            },
          }),
        });

      const { createTradeEntry } = await import('@/lib/supabase/trades');
      (createTradeEntry as any).mockResolvedValue({
        id: 'trade-456',
        symbol: 'TSLA',
      });

      const result = await tradingTools.place_paper_trade.execute!({
        symbol: 'TSLA',
        quantity: 5,
        action: 'BUY',
        order_type: 'MKT',
      }, {} as any) as any;

      expect(result.success).toBe(true);
      expect(createTradeEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          price: 355.00,
        })
      );
    });

    it('should be blocked by emotional firewall', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          blocked: true,
          patterns_detected: ['tilt'],
          reasons: ['Emotional trading detected'],
        }),
      });

      const result = await tradingTools.place_paper_trade.execute!({
        symbol: 'AAPL',
        quantity: 100,
        action: 'SELL',
        order_type: 'MKT',
      }, {} as any) as any;

      expect(result.success).toBe(false);
      expect(result.blocked_by_firewall).toBe(true);
    });
  });

  describe('calculate_position_size tool', () => {
    it('should have correct schema definition', () => {
      const tool = tradingTools.calculate_position_size;

      expect(tool.description).toContain('Kelly Criterion');
      expect(tool.inputSchema).toBeDefined();
    });

    it('should calculate position size via API', async () => {
      const { api } = await import('@/lib/api-extended');
      (api.calculatePositionSize as any).mockResolvedValue({
        symbol: 'AAPL',
        risk_per_share: 5.00,
        risk_pct: 0.029,
      });

      const result = await tradingTools.calculate_position_size.execute!({
        symbol: 'AAPL',
        entry_price: 175.00,
        stop_price: 170.00,
      }, {} as any) as any;

      expect(result.success).toBe(true);
      expect(result.data.risk_per_share).toBeDefined();
    });

    it('should calculate locally when API unavailable', async () => {
      const { api } = await import('@/lib/api-extended');
      (api.calculatePositionSize as any).mockRejectedValue(new Error('API error'));

      const result = await tradingTools.calculate_position_size.execute!({
        symbol: 'NVDA',
        entry_price: 140.00,
        stop_price: 135.00,
      }, {} as any) as any;

      expect(result.success).toBe(true);
      expect(result.data.risk_per_share).toBe(5.00);
      expect(result.data.risk_pct).toBeCloseTo(0.0357, 2);
    });
  });

  describe('get_chart_data tool', () => {
    it('should have correct schema definition', () => {
      const tool = tradingTools.get_chart_data;

      expect(tool.description).toContain('OHLCV');
      expect(tool.inputSchema).toBeDefined();
    });

    it('should fetch chart data from API', async () => {
      const mockBars = {
        bars: [
          { t: '2025-01-01', o: 100, h: 105, l: 99, c: 103, v: 1000000 },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockBars,
      });

      const result = await tradingTools.get_chart_data.execute!({
        symbol: 'AAPL',
        timeframe: '1d',
        bars: 100,
      }, {} as any) as any;

      expect(result.success).toBe(true);
      expect(result.data.bars).toHaveLength(1);
    });

    it('should generate mock bars on error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await tradingTools.get_chart_data.execute!({
        symbol: 'SPY',
        timeframe: '1d',
        bars: 50,
      }, {} as any) as any;

      expect(result.success).toBe(true);
      expect(result.mock).toBe(true);
      expect(result.data.bars).toHaveLength(50);
    });
  });

  describe('search_news tool', () => {
    it('should have correct schema definition', () => {
      const tool = tradingTools.search_news;

      expect(tool.description).toContain('market news');
      expect(tool.inputSchema).toBeDefined();
    });

    it('should search news via API', async () => {
      const { api } = await import('@/lib/api-extended');
      (api.searchNews as any).mockResolvedValue({
        results: [
          { title: 'Market Update', source: 'Bloomberg' },
        ],
      });

      const result = await tradingTools.search_news.execute!({ query: 'Fed rates' }, {} as any) as any;

      expect(result.success).toBe(true);
      expect(result.data.results).toHaveLength(1);
    });

    it('should return mock news on error', async () => {
      const { api } = await import('@/lib/api-extended');
      (api.searchNews as any).mockRejectedValue(new Error('API error'));

      const result = await tradingTools.search_news.execute!({ query: 'Bitcoin' }, {} as any) as any;

      expect(result.success).toBe(true);
      expect(result.mock).toBe(true);
      expect(Array.isArray(result.data.results)).toBe(true);
    });
  });

  describe('UI Panel Tools', () => {
    it('show_chart should return correct action', async () => {
      const result = await tradingTools.show_chart.execute!({ symbol: 'AAPL' }, {} as any) as any;

      expect(result.success).toBe(true);
      expect(result.action).toBe('show_panel');
      expect(result.panel).toBe('chart');
      expect(result.symbol).toBe('AAPL');
    });

    it('show_portfolio should return correct action', async () => {
      const result = await tradingTools.show_portfolio.execute!({}, {} as any) as any;

      expect(result.success).toBe(true);
      expect(result.action).toBe('show_panel');
      expect(result.panel).toBe('portfolio');
    });

    it('show_orders should handle optional symbol', async () => {
      const resultWithSymbol = await tradingTools.show_orders.execute!({ symbol: 'TSLA' }, {} as any) as any;
      const resultWithoutSymbol = await tradingTools.show_orders.execute!({}, {} as any) as any;

      expect(resultWithSymbol.symbol).toBe('TSLA');
      expect(resultWithoutSymbol.symbol).toBeUndefined();
    });

    it('show_screener should handle filters', async () => {
      const result = await tradingTools.show_screener.execute!({
        filters: { sector: 'Technology', priceMin: 50 },
      }, {} as any) as any;

      expect(result.success).toBe(true);
      expect(result.filters).toEqual({ sector: 'Technology', priceMin: 50 });
    });
  });

  describe('Knowledge & Context Tools', () => {
    it('get_active_theses should fetch theses', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          theses: [
            { id: 'thesis-1', symbol: 'AAPL', title: 'Apple thesis' },
          ],
        }),
      });

      const result = await tradingTools.get_active_theses.execute!({}, {} as any) as any;

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('get_journal_entries should fetch entries with emotion summary', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          entries: [
            { id: 'entry-1', emotionAtEntry: 'confident' },
            { id: 'entry-2', emotionAtEntry: 'confident' },
            { id: 'entry-3', emotionAtEntry: 'anxious' },
          ],
        }),
      });

      const result = await tradingTools.get_journal_entries.execute!({ limit: 10 }, {} as any) as any;

      expect(result.success).toBe(true);
      expect(result.emotionSummary).toEqual({
        confident: 2,
        anxious: 1,
      });
    });

    it('get_emotional_state should check firewall status', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'warning',
          alerts: ['High trading frequency'],
          patterns: ['overtrading'],
        }),
      });

      const result = await tradingTools.get_emotional_state.execute!({}, {} as any) as any;

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('warning');
      expect(result.data.tradingAllowed).toBe(true);
    });

    it('search_knowledge should search knowledge base', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            {
              sourceType: 'journal_entry',
              symbol: 'AAPL',
              contentText: 'Bought AAPL at support level',
              similarity: 0.85,
            },
          ],
          count: 1,
        }),
      });

      const result = await tradingTools.search_knowledge.execute!({
        query: 'AAPL support levels',
        limit: 5,
      }, {} as any) as any;

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].type).toBe('journal entry');
    });
  });

  describe('Error handling', () => {
    it('should handle network errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await tradingTools.get_quote.execute!({ symbol: 'AAPL' }, {} as any) as any;

      expect(result.success).toBe(true);
      expect(result.mock).toBe(true);
    });

    it('should handle JSON parse errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const result = await tradingTools.get_quote.execute!({ symbol: 'TSLA' }, {} as any) as any;

      expect(result.success).toBe(true);
      expect(result.mock).toBe(true);
    });

    it('should return meaningful error messages', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Specific error message'));

      const result = await tradingTools.place_order.execute!({
        symbol: 'AAPL',
        quantity: 10,
        action: 'BUY',
        order_type: 'MKT',
      }, {} as any) as any;

      if (!result.success) {
        expect(result.error).toContain('error');
      }
    });
  });

  describe('Environment configuration', () => {
    it('should use VERCEL_URL when available', async () => {
      process.env.VERCEL_URL = 'deepstack.vercel.app';
      delete process.env.NEXT_PUBLIC_APP_URL;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ quotes: {} }),
      });

      await tradingTools.get_quote.execute!({ symbol: 'AAPL' }, {} as any) as any;

      const fetchCall = (global.fetch as any).mock.calls[0][0];
      expect(fetchCall).toContain('https://deepstack.vercel.app');
    });

    it('should default to localhost when no env vars', async () => {
      delete process.env.VERCEL_URL;
      delete process.env.NEXT_PUBLIC_APP_URL;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ quotes: {} }),
      });

      await tradingTools.get_quote.execute!({ symbol: 'AAPL' }, {} as any) as any;

      const fetchCall = (global.fetch as any).mock.calls[0][0];
      expect(fetchCall).toContain('http://localhost:3000');
    });
  });
});
