import { tool } from 'ai';
import { z } from 'zod';
import { api } from '@/lib/api-extended';
import { recordTrade } from '@/lib/supabase/portfolio';

export const tradingTools = {
  get_quote: tool({
    description: 'Get real-time stock quote with bid, ask, last price, and volume',
    inputSchema: z.object({
      symbol: z.string().describe('Stock ticker symbol (e.g., AAPL, TSLA)'),
    }),
    execute: async ({ symbol }) => {
      try {
        const quote = await api.quote(symbol.toUpperCase());
        return { success: true, data: quote };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch quote';
        return { success: false, error: message };
      }
    },
  }),

  get_positions: tool({
    description: 'Get current portfolio positions with P&L and market values',
    inputSchema: z.object({}),
    execute: async () => {
      try {
        const positions = await api.positions();
        const account = await api.account();
        return {
          success: true,
          data: { positions, account_summary: account },
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch positions';
        return { success: false, error: message };
      }
    },
  }),

  analyze_stock: tool({
    description: 'Perform comprehensive stock analysis including fundamentals, technicals, and AI-driven insights',
    inputSchema: z.object({
      symbol: z.string().describe('Stock ticker symbol'),
    }),
    execute: async ({ symbol }) => {
      try {
        // Use Next.js API route which handles backend fallback with mock data
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol: symbol.toUpperCase() }),
        });

        if (!response.ok) {
          throw new Error(`Analysis failed: ${response.status}`);
        }

        const analysis = await response.json();
        return {
          success: true,
          data: analysis,
          mock: analysis.mock || false,
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to analyze stock';
        return { success: false, error: message };
      }
    },
  }),

  place_order: tool({
    description: 'Create an order ticket for user confirmation. DOES NOT execute the order - user must approve. Checks emotional firewall first.',
    inputSchema: z.object({
      symbol: z.string().describe('Stock ticker symbol'),
      quantity: z.number().int().positive().describe('Number of shares'),
      action: z.enum(['BUY', 'SELL']).describe('Order action'),
      order_type: z.enum(['MKT', 'LMT', 'STP']).default('MKT').describe('Order type'),
      limit_price: z.number().optional().describe('Limit price for LMT orders'),
      stop_price: z.number().optional().describe('Stop price for STP orders'),
    }),
    execute: async (params) => {
      try {
        const firewallResponse = await fetch('/api/emotional-firewall/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'check_trade', symbol: params.symbol }),
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

        const ticket = await api.createOrderTicket(params);
        return {
          success: true,
          data: ticket,
          message: 'Order ticket created. User must confirm to execute.',
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to create order ticket';
        return { success: false, error: message };
      }
    },
  }),

  place_paper_trade: tool({
    description: 'Execute a paper trade and record it in the portfolio. Use this for confirmed trades that should be tracked.',
    inputSchema: z.object({
      symbol: z.string().describe('Stock ticker symbol'),
      quantity: z.number().int().positive().describe('Number of shares'),
      action: z.enum(['BUY', 'SELL']).describe('Order action'),
      price: z.number().positive().optional().describe('Execution price (defaults to current market price)'),
      order_type: z.enum(['MKT', 'LMT', 'STP']).default('MKT').describe('Order type'),
      notes: z.string().optional().describe('Trade notes'),
    }),
    execute: async (params) => {
      try {
        // Check emotional firewall first
        const firewallResponse = await fetch('/api/emotional-firewall/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'check_trade', symbol: params.symbol }),
        });

        if (firewallResponse.ok) {
          const firewallResult = await firewallResponse.json();

          if (firewallResult.blocked) {
            return {
              success: false,
              blocked_by_firewall: true,
              patterns: firewallResult.patterns_detected,
              reasons: firewallResult.reasons,
              message: `Trade blocked by Emotional Firewall: ${firewallResult.reasons?.join(', ') || 'Take a break'}`,
            };
          }
        }

        // Get current price if not provided
        let executionPrice = params.price;
        if (!executionPrice) {
          try {
            const quote = await api.quote(params.symbol.toUpperCase());
            executionPrice = quote.last || 0;
          } catch {
            return { success: false, error: 'Could not fetch current price' };
          }
        }

        if (!executionPrice || executionPrice <= 0) {
          return { success: false, error: 'Invalid execution price' };
        }

        // Record trade in Supabase
        const trade = await recordTrade({
          symbol: params.symbol.toUpperCase(),
          action: params.action,
          quantity: params.quantity,
          price: executionPrice,
          order_type: params.order_type,
          notes: params.notes || `Chat trade: ${params.action} ${params.quantity} shares`,
        });

        return {
          success: true,
          data: trade,
          message: `Paper trade executed: ${params.action} ${params.quantity} ${params.symbol.toUpperCase()} @ $${executionPrice.toFixed(2)}`,
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to place paper trade';
        return { success: false, error: message };
      }
    },
  }),

  calculate_position_size: tool({
    description: 'Calculate Kelly Criterion optimal position size based on entry and stop prices',
    inputSchema: z.object({
      symbol: z.string().describe('Stock ticker symbol'),
      entry_price: z.number().describe('Planned entry price'),
      stop_price: z.number().describe('Stop loss price'),
    }),
    execute: async (params) => {
      try {
        const result = await api.calculatePositionSize(params);
        return { success: true, data: result };
      } catch {
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
    inputSchema: z.object({
      symbol: z.string().describe('Stock ticker symbol'),
      timeframe: z.enum(['1min', '5min', '15min', '1h', '1d']).default('1d').describe('Timeframe for bars'),
      bars: z.number().default(100).describe('Number of bars to fetch'),
    }),
    execute: async (params) => {
      try {
        const data = await api.getChartData(params);
        return { success: true, data };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch chart data';
        return { success: false, error: message };
      }
    },
  }),

  search_news: tool({
    description: 'Search for market news and research using Perplexity AI',
    inputSchema: z.object({
      query: z.string().describe('Search query for news'),
    }),
    execute: async ({ query }) => {
      try {
        const news = await api.searchNews(query);
        return { success: true, data: news };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to search news';
        return { success: false, error: message, note: 'News search requires Perplexity API integration' };
      }
    },
  }),

  // UI Panel Control Tools
  show_chart: tool({
    description: 'Display the chart panel for a specific stock symbol. Use when user wants to see a chart or you want to show them price action.',
    inputSchema: z.object({
      symbol: z.string().describe('Stock ticker symbol to chart (e.g., AAPL, TSLA)'),
    }),
    execute: async ({ symbol }) => ({
      success: true,
      action: 'show_panel',
      panel: 'chart',
      symbol: symbol.toUpperCase(),
      message: `Showing chart for ${symbol.toUpperCase()}`,
    }),
  }),

  show_portfolio: tool({
    description: 'Display the portfolio/positions panel showing current holdings and P&L',
    inputSchema: z.object({}),
    execute: async () => ({
      success: true,
      action: 'show_panel',
      panel: 'portfolio',
      message: 'Showing portfolio positions',
    }),
  }),

  show_orders: tool({
    description: 'Display the orders panel for placing new trades or viewing order history',
    inputSchema: z.object({
      symbol: z.string().optional().describe('Optional: Pre-fill order form with this symbol'),
    }),
    execute: async ({ symbol }) => ({
      success: true,
      action: 'show_panel',
      panel: 'orders',
      symbol: symbol?.toUpperCase(),
      message: symbol ? `Showing order form for ${symbol.toUpperCase()}` : 'Showing orders panel',
    }),
  }),

  show_screener: tool({
    description: 'Display the stock screener panel for filtering stocks by criteria like price, volume, sector, market cap',
    inputSchema: z.object({
      filters: z.object({
        sector: z.string().optional().describe('Filter by sector'),
        priceMin: z.number().optional().describe('Minimum price'),
        priceMax: z.number().optional().describe('Maximum price'),
      }).optional().describe('Optional filters to apply'),
    }),
    execute: async ({ filters }) => ({
      success: true,
      action: 'show_panel',
      panel: 'screener',
      filters,
      message: 'Showing stock screener',
    }),
  }),

  show_alerts: tool({
    description: 'Display the price alerts panel for creating or viewing stock price alerts',
    inputSchema: z.object({
      symbol: z.string().optional().describe('Optional: Pre-fill alert form with this symbol'),
    }),
    execute: async ({ symbol }) => ({
      success: true,
      action: 'show_panel',
      panel: 'alerts',
      symbol: symbol?.toUpperCase(),
      message: symbol ? `Showing alerts for ${symbol.toUpperCase()}` : 'Showing alerts panel',
    }),
  }),

  show_calendar: tool({
    description: 'Display the market calendar panel showing earnings, economic events, dividends, and IPOs',
    inputSchema: z.object({}),
    execute: async () => ({
      success: true,
      action: 'show_panel',
      panel: 'calendar',
      message: 'Showing market calendar',
    }),
  }),

  show_news: tool({
    description: 'Display the news panel showing market news. Can filter by symbol.',
    inputSchema: z.object({
      symbol: z.string().optional().describe('Optional: Filter news by this symbol'),
    }),
    execute: async ({ symbol }) => ({
      success: true,
      action: 'show_panel',
      panel: 'news',
      symbol: symbol?.toUpperCase(),
      message: symbol ? `Showing news for ${symbol.toUpperCase()}` : 'Showing market news',
    }),
  }),

  show_deep_value: tool({
    description: 'Display the Deep Value screener panel for finding undervalued stocks using fundamental analysis',
    inputSchema: z.object({}),
    execute: async () => ({
      success: true,
      action: 'show_panel',
      panel: 'deep-value',
      message: 'Showing Deep Value screener',
    }),
  }),

  show_hedged_positions: tool({
    description: 'Display the Hedged Positions panel for building and analyzing hedged stock positions with options',
    inputSchema: z.object({
      symbol: z.string().optional().describe('Optional: Pre-fill with this symbol'),
    }),
    execute: async ({ symbol }) => ({
      success: true,
      action: 'show_panel',
      panel: 'hedged-positions',
      symbol: symbol?.toUpperCase(),
      message: symbol ? `Showing hedged positions for ${symbol.toUpperCase()}` : 'Showing Hedged Positions panel',
    }),
  }),

  show_options_screener: tool({
    description: 'Display the Options Screener panel for finding options by various criteria',
    inputSchema: z.object({
      symbol: z.string().optional().describe('Optional: Filter options by underlying symbol'),
    }),
    execute: async ({ symbol }) => ({
      success: true,
      action: 'show_panel',
      panel: 'options-screener',
      symbol: symbol?.toUpperCase(),
      message: symbol ? `Showing options for ${symbol.toUpperCase()}` : 'Showing Options Screener',
    }),
  }),

  show_options_builder: tool({
    description: 'Display the Options Strategy Builder panel for constructing multi-leg options strategies with P&L diagrams',
    inputSchema: z.object({
      symbol: z.string().optional().describe('Optional: Pre-fill with this underlying symbol'),
    }),
    execute: async ({ symbol }) => ({
      success: true,
      action: 'show_panel',
      panel: 'options-builder',
      symbol: symbol?.toUpperCase(),
      message: symbol ? `Showing options builder for ${symbol.toUpperCase()}` : 'Showing Options Strategy Builder',
    }),
  }),
};
