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
    parameters: z.object({
      _unused: z.string().optional().describe('No parameters required'),
    }),
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
    description: 'Create an order ticket for user confirmation. DOES NOT execute the order - user must approve. Checks emotional firewall first.',
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
        // Check emotional firewall first
        const firewallResponse = await fetch('/api/emotional-firewall/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'check_trade',
            symbol: params.symbol,
          }),
        });

        if (firewallResponse.ok) {
          const firewallResult = await firewallResponse.json();

          if (firewallResult.blocked) {
            return {
              success: false,
              blocked_by_firewall: true,
              patterns: firewallResult.patterns_detected,
              reasons: firewallResult.reasons,
              cooldown_expires: firewallResult.cooldown_expires,
              message: `Trade blocked by Emotional Firewall: ${firewallResult.reasons.join(', ')}. Take a break and reassess.`,
            };
          }

          if (firewallResult.status === 'warning') {
            // Create ticket but with warning
            const ticket = await api.createOrderTicket(params);
            return {
              success: true,
              data: ticket,
              firewall_warning: true,
              patterns: firewallResult.patterns_detected,
              reasons: firewallResult.reasons,
              message: `Order ticket created with caution: ${firewallResult.reasons.join(', ')}. Please confirm carefully.`,
            };
          }
        }

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
      } catch {
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

  // UI Panel Control Tools
  show_chart: tool({
    description: 'Display the chart panel for a specific stock symbol. Use when user wants to see a chart or you want to show them price action.',
    parameters: z.object({
      symbol: z.string().describe('Stock ticker symbol to chart (e.g., AAPL, TSLA)'),
    }),
    execute: async ({ symbol }: { symbol: string }) => {
      return {
        success: true,
        action: 'show_panel',
        panel: 'chart',
        symbol: symbol.toUpperCase(),
        message: `Showing chart for ${symbol.toUpperCase()}`,
      };
    },
  }),

  show_portfolio: tool({
    description: 'Display the portfolio/positions panel showing current holdings and P&L',
    parameters: z.object({
      _unused: z.string().optional().describe('No parameters required'),
    }),
    execute: async () => {
      return {
        success: true,
        action: 'show_panel',
        panel: 'portfolio',
        message: 'Showing portfolio positions',
      };
    },
  }),

  show_orders: tool({
    description: 'Display the orders panel for placing new trades or viewing order history',
    parameters: z.object({
      symbol: z.string().optional().describe('Optional: Pre-fill order form with this symbol'),
    }),
    execute: async ({ symbol }: { symbol?: string }) => {
      return {
        success: true,
        action: 'show_panel',
        panel: 'orders',
        symbol: symbol?.toUpperCase(),
        message: symbol ? `Showing order form for ${symbol.toUpperCase()}` : 'Showing orders panel',
      };
    },
  }),

  show_screener: tool({
    description: 'Display the stock screener panel for filtering stocks by criteria like price, volume, sector, market cap',
    parameters: z.object({
      filters: z.object({
        sector: z.string().optional().describe('Filter by sector'),
        priceMin: z.number().optional().describe('Minimum price'),
        priceMax: z.number().optional().describe('Maximum price'),
      }).optional().describe('Optional filters to apply'),
    }),
    execute: async ({ filters }: { filters?: { sector?: string; priceMin?: number; priceMax?: number } }) => {
      return {
        success: true,
        action: 'show_panel',
        panel: 'screener',
        filters,
        message: 'Showing stock screener',
      };
    },
  }),

  show_alerts: tool({
    description: 'Display the price alerts panel for creating or viewing stock price alerts',
    parameters: z.object({
      symbol: z.string().optional().describe('Optional: Pre-fill alert form with this symbol'),
    }),
    execute: async ({ symbol }: { symbol?: string }) => {
      return {
        success: true,
        action: 'show_panel',
        panel: 'alerts',
        symbol: symbol?.toUpperCase(),
        message: symbol ? `Showing alerts for ${symbol.toUpperCase()}` : 'Showing alerts panel',
      };
    },
  }),

  show_calendar: tool({
    description: 'Display the market calendar panel showing earnings, economic events, dividends, and IPOs',
    parameters: z.object({
      _unused: z.string().optional().describe('No parameters required'),
    }),
    execute: async () => {
      return {
        success: true,
        action: 'show_panel',
        panel: 'calendar',
        message: 'Showing market calendar',
      };
    },
  }),

  show_news: tool({
    description: 'Display the news panel showing market news. Can filter by symbol.',
    parameters: z.object({
      symbol: z.string().optional().describe('Optional: Filter news by this symbol'),
    }),
    execute: async ({ symbol }: { symbol?: string }) => {
      return {
        success: true,
        action: 'show_panel',
        panel: 'news',
        symbol: symbol?.toUpperCase(),
        message: symbol ? `Showing news for ${symbol.toUpperCase()}` : 'Showing market news',
      };
    },
  }),

  show_deep_value: tool({
    description: 'Display the Deep Value screener panel for finding undervalued stocks using fundamental analysis',
    parameters: z.object({
      _unused: z.string().optional().describe('No parameters required'),
    }),
    execute: async () => {
      return {
        success: true,
        action: 'show_panel',
        panel: 'deep-value',
        message: 'Showing Deep Value screener',
      };
    },
  }),

  show_hedged_positions: tool({
    description: 'Display the Hedged Positions panel for building and analyzing hedged stock positions with options',
    parameters: z.object({
      symbol: z.string().optional().describe('Optional: Pre-fill with this symbol'),
    }),
    execute: async ({ symbol }: { symbol?: string }) => {
      return {
        success: true,
        action: 'show_panel',
        panel: 'hedged-positions',
        symbol: symbol?.toUpperCase(),
        message: symbol ? `Showing hedged positions for ${symbol.toUpperCase()}` : 'Showing Hedged Positions panel',
      };
    },
  }),

  show_options_screener: tool({
    description: 'Display the Options Screener panel for finding options by various criteria',
    parameters: z.object({
      symbol: z.string().optional().describe('Optional: Filter options by underlying symbol'),
    }),
    execute: async ({ symbol }: { symbol?: string }) => {
      return {
        success: true,
        action: 'show_panel',
        panel: 'options-screener',
        symbol: symbol?.toUpperCase(),
        message: symbol ? `Showing options for ${symbol.toUpperCase()}` : 'Showing Options Screener',
      };
    },
  }),

  show_options_builder: tool({
    description: 'Display the Options Strategy Builder panel for constructing multi-leg options strategies with P&L diagrams',
    parameters: z.object({
      symbol: z.string().optional().describe('Optional: Pre-fill with this underlying symbol'),
    }),
    execute: async ({ symbol }: { symbol?: string }) => {
      return {
        success: true,
        action: 'show_panel',
        panel: 'options-builder',
        symbol: symbol?.toUpperCase(),
        message: symbol ? `Showing options builder for ${symbol.toUpperCase()}` : 'Showing Options Strategy Builder',
      };
    },
  }),
};
