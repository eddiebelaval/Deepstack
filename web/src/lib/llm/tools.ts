import { tool as createTool } from 'ai';
import { z } from 'zod';
import { api } from '@/lib/api-extended';

// Cast tool to any to avoid TypeScript overload errors with AI SDK 5.0
const tool = createTool as any;

export const tradingTools = {
  get_quote: tool({
    description: 'Get real-time stock quote with bid, ask, last price, and volume',
    parameters: z.object({
      symbol: z.string().describe('Stock ticker symbol (e.g., AAPL, TSLA)'),
    }),
    execute: async ({ symbol }: { symbol: string }) => {
      try {
        const quote = await api.quote(symbol.toUpperCase());
        return {
          success: true,
          data: quote,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to fetch quote',
        };
      }
    },
  }),

  get_positions: tool({
    description: 'Get current portfolio positions with P&L and market values',
    parameters: z.object({}),
    execute: async () => {
      try {
        const positions = await api.positions();
        const account = await api.account();
        return {
          success: true,
          data: {
            positions,
            account_summary: account,
          },
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to fetch positions',
        };
      }
    },
  }),

  analyze_stock: tool({
    description: 'Perform comprehensive stock analysis including fundamentals, technicals, and AI-driven insights',
    parameters: z.object({
      symbol: z.string().describe('Stock ticker symbol'),
    }),
    execute: async ({ symbol }: { symbol: string }) => {
      try {
        // Call the new FastAPI endpoint for deep analysis
        const analysis = await api.analyzeStock(symbol.toUpperCase());
        return {
          success: true,
          data: analysis,
        };
      } catch (error: any) {
        // Fallback to basic quote if analysis endpoint not ready
        try {
          const quote = await api.quote(symbol.toUpperCase());
          return {
            success: true,
            data: {
              symbol: symbol.toUpperCase(),
              quote,
              note: 'Full analysis endpoint not yet available. Showing basic quote data.',
            },
          };
        } catch {
          return {
            success: false,
            error: error.message || 'Failed to analyze stock',
          };
        }
      }
    },
  }),

  place_order: tool({
    description: 'Create an order ticket for user confirmation. DOES NOT execute the order - user must approve.',
    parameters: z.object({
      symbol: z.string().describe('Stock ticker symbol'),
      quantity: z.number().int().positive().describe('Number of shares'),
      action: z.enum(['BUY', 'SELL']).describe('Order action'),
      order_type: z.enum(['MKT', 'LMT', 'STP']).default('MKT').describe('Order type'),
      limit_price: z.number().optional().describe('Limit price for LMT orders'),
      stop_price: z.number().optional().describe('Stop price for STP orders'),
    }),
    execute: async (params: {
      symbol: string;
      quantity: number;
      action: 'BUY' | 'SELL';
      order_type: 'MKT' | 'LMT' | 'STP';
      limit_price?: number;
      stop_price?: number;
    }) => {
      try {
        // Create order ticket (not executed yet)
        const ticket = await api.createOrderTicket(params);
        return {
          success: true,
          data: ticket,
          message: 'Order ticket created. User must confirm to execute.',
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to create order ticket',
        };
      }
    },
  }),

  calculate_position_size: tool({
    description: 'Calculate Kelly Criterion optimal position size based on entry and stop prices',
    parameters: z.object({
      symbol: z.string().describe('Stock ticker symbol'),
      entry_price: z.number().describe('Planned entry price'),
      stop_price: z.number().describe('Stop loss price'),
    }),
    execute: async (params: { symbol: string; entry_price: number; stop_price: number }) => {
      try {
        const result = await api.calculatePositionSize(params);
        return {
          success: true,
          data: result,
        };
      } catch (error: any) {
        // Fallback calculation if endpoint not ready
        const riskPerShare = Math.abs(params.entry_price - params.stop_price);
        const riskPct = riskPerShare / params.entry_price;

        return {
          success: true,
          data: {
            symbol: params.symbol,
            entry_price: params.entry_price,
            stop_price: params.stop_price,
            risk_per_share: riskPerShare,
            risk_pct: riskPct,
            note: 'Using simplified calculation. Full Kelly endpoint not yet available.',
          },
        };
      }
    },
  }),

  get_chart_data: tool({
    description: 'Get OHLCV (candlestick) data for charting',
    parameters: z.object({
      symbol: z.string().describe('Stock ticker symbol'),
      timeframe: z.enum(['1min', '5min', '15min', '1h', '1d']).default('1d').describe('Timeframe for bars'),
      bars: z.number().default(100).describe('Number of bars to fetch'),
    }),
    execute: async (params: { symbol: string; timeframe: string; bars: number }) => {
      try {
        const data = await api.getChartData(params);
        return {
          success: true,
          data,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to fetch chart data',
        };
      }
    },
  }),

  search_news: tool({
    description: 'Search for market news and research using Perplexity AI',
    parameters: z.object({
      query: z.string().describe('Search query for news'),
    }),
    execute: async ({ query }: { query: string }) => {
      try {
        const news = await api.searchNews(query);
        return {
          success: true,
          data: news,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to search news',
          note: 'News search requires Perplexity API integration',
        };
      }
    },
  }),
};
