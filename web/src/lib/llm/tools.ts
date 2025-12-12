import { tool } from 'ai';
import { z } from 'zod';
import { api } from '@/lib/api-extended';
import { createTradeEntry } from '@/lib/supabase/trades';
import { predictionMarketTools } from './prediction-market-tools';

// Get the base URL for API calls - needed for edge runtime
const getBaseUrl = () => {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  return 'http://localhost:3000';
};

// Realistic base prices for common symbols (for mock data)
const SYMBOL_PRICES: Record<string, number> = {
  SPY: 595, QQQ: 520, DIA: 440, IWM: 225, VIX: 14,
  'BTC/USD': 98500, 'ETH/USD': 3800, 'DOGE/USD': 0.42, 'XRP/USD': 2.45,
  NVDA: 142, AAPL: 238, TSLA: 355, AMD: 140, MSFT: 432, GOOGL: 175, META: 580, AMZN: 210,
};

// Generate mock quote data
function generateMockQuote(symbol: string) {
  const basePrice = SYMBOL_PRICES[symbol.toUpperCase()] || 100 + Math.random() * 400;
  const change = (Math.random() - 0.5) * 4;
  return {
    symbol: symbol.toUpperCase(),
    last: basePrice,
    bid: basePrice - 0.01,
    ask: basePrice + 0.01,
    volume: Math.floor(Math.random() * 10000000) + 1000000,
    change,
    changePercent: (change / basePrice) * 100,
    timestamp: new Date().toISOString(),
    mock: true,
  };
}

// Generate mock positions data
function generateMockPositions() {
  return {
    positions: [
      { symbol: 'AAPL', position: 100, avg_cost: 175.50, market_value: 23800, unrealized_pnl: 6250, realized_pnl: 0 },
      { symbol: 'NVDA', position: 50, avg_cost: 120.00, market_value: 7100, unrealized_pnl: 1100, realized_pnl: 850 },
      { symbol: 'MSFT', position: 25, avg_cost: 400.00, market_value: 10800, unrealized_pnl: 800, realized_pnl: 0 },
    ],
    account_summary: {
      cash: 25000,
      buying_power: 50000,
      portfolio_value: 66700,
      day_pnl: 450,
      total_pnl: 8150,
    },
    mock: true,
  };
}

export const tradingTools = {
  get_quote: tool({
    description: 'Get real-time stock quote with bid, ask, last price, and volume',
    inputSchema: z.object({
      symbol: z.string().describe('Stock ticker symbol (e.g., AAPL, TSLA)'),
    }),
    execute: async ({ symbol }) => {
      const upperSymbol = symbol.toUpperCase();
      try {
        // Try Next.js API route first (which has mock fallback)
        const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}/api/market/quotes?symbols=${upperSymbol}`, {
          cache: 'no-store',
        });

        if (response.ok) {
          const data = await response.json();
          // Handle both nested {quotes: {SYMBOL: {...}}} and flat {SYMBOL: {...}} formats
          const quote = data.quotes?.[upperSymbol] || data[upperSymbol];
          if (quote) {
            return { success: true, data: { ...quote, mock: data.mock || false } };
          }
        }

        // Fallback to mock data
        return { success: true, data: generateMockQuote(upperSymbol), mock: true };
      } catch {
        // Return mock data on error
        return { success: true, data: generateMockQuote(upperSymbol), mock: true };
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
      } catch {
        // Return mock positions data when backend unavailable
        return {
          success: true,
          data: generateMockPositions(),
          mock: true,
        };
      }
    },
  }),

  analyze_stock: tool({
    description: 'Perform comprehensive stock analysis including fundamentals, technicals, and AI-driven insights',
    inputSchema: z.object({
      symbol: z.string().describe('Stock ticker symbol'),
    }),
    execute: async ({ symbol }) => {
      const upperSymbol = symbol.toUpperCase();
      try {
        // Use absolute URL for edge runtime compatibility
        const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}/api/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol: upperSymbol }),
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
      } catch {
        // Generate mock analysis on error
        const basePrice = SYMBOL_PRICES[upperSymbol] || 100 + Math.random() * 400;
        const change = (Math.random() - 0.5) * 10;
        return {
          success: true,
          data: {
            symbol: upperSymbol,
            price: basePrice,
            change,
            changePercent: (change / basePrice) * 100,
            volume: Math.floor(Math.random() * 10000000),
            technicals: {
              trend: change > 0 ? 'bullish' : 'bearish',
              support: basePrice * 0.95,
              resistance: basePrice * 1.05,
              rsi: Math.floor(40 + Math.random() * 20),
              macd_signal: 'neutral',
            },
            sentiment: { overall: 'neutral', score: 50 },
            mock: true,
          },
          mock: true,
        };
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
      const upperSymbol = params.symbol.toUpperCase();
      const baseUrl = getBaseUrl();

      try {
        // Check emotional firewall first
        const firewallResponse = await fetch(`${baseUrl}/api/emotional-firewall/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'check_trade', symbol: upperSymbol }),
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
            // Create mock ticket with warning
            const estimatedPrice = SYMBOL_PRICES[upperSymbol] || 100;
            return {
              success: true,
              data: {
                id: crypto.randomUUID(),
                symbol: upperSymbol,
                quantity: params.quantity,
                action: params.action,
                order_type: params.order_type,
                limit_price: params.limit_price,
                estimated_value: estimatedPrice * params.quantity,
                position_pct: 5,
                risk_warnings: firewallResult.reasons || [],
              },
              firewall_warning: true,
              patterns: firewallResult.patterns_detected,
              reasons: firewallResult.reasons,
              message: `Order ticket created with caution: ${firewallResult.reasons.join(', ')}. Please confirm carefully.`,
            };
          }
        }

        // Try to create ticket via backend, fall back to mock
        try {
          const ticket = await api.createOrderTicket(params);
          return {
            success: true,
            data: ticket,
            message: 'Order ticket created. User must confirm to execute.',
          };
        } catch {
          // Create mock ticket
          const estimatedPrice = SYMBOL_PRICES[upperSymbol] || 100;
          return {
            success: true,
            data: {
              id: crypto.randomUUID(),
              symbol: upperSymbol,
              quantity: params.quantity,
              action: params.action,
              order_type: params.order_type,
              limit_price: params.limit_price,
              estimated_value: estimatedPrice * params.quantity,
              position_pct: 5,
              risk_warnings: [],
            },
            message: 'Order ticket created (demo mode). User must confirm to execute.',
            mock: true,
          };
        }
      } catch (error) {
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
      const upperSymbol = params.symbol.toUpperCase();
      const baseUrl = getBaseUrl();

      try {
        // Check emotional firewall first
        const firewallResponse = await fetch(`${baseUrl}/api/emotional-firewall/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'check_trade', symbol: upperSymbol }),
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
          // Try to get quote from API, fall back to mock price
          try {
            const quoteResponse = await fetch(`${baseUrl}/api/market/quotes?symbols=${upperSymbol}`, {
              cache: 'no-store',
            });
            if (quoteResponse.ok) {
              const data = await quoteResponse.json();
              const quote = data.quotes?.[upperSymbol] || data[upperSymbol];
              executionPrice = quote?.last || 0;
            }
          } catch {
            // Use mock price
            executionPrice = SYMBOL_PRICES[upperSymbol] || 100;
          }

          // Final fallback to mock price
          if (!executionPrice || executionPrice <= 0) {
            executionPrice = SYMBOL_PRICES[upperSymbol] || 100;
          }
        }

        // Record trade in Supabase
        const trade = await createTradeEntry({
          symbol: upperSymbol,
          action: params.action,
          quantity: params.quantity,
          price: executionPrice,
          orderType: params.order_type,
          notes: params.notes || `Chat trade: ${params.action} ${params.quantity} shares`,
        });

        return {
          success: true,
          data: trade,
          message: `Paper trade executed: ${params.action} ${params.quantity} ${upperSymbol} @ $${executionPrice.toFixed(2)}`,
        };
      } catch (error) {
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
      const upperSymbol = params.symbol.toUpperCase();
      const baseUrl = getBaseUrl();

      try {
        // Use Next.js API route which has mock fallback
        const response = await fetch(
          `${baseUrl}/api/market/bars?symbol=${encodeURIComponent(upperSymbol)}&timeframe=${params.timeframe}&limit=${params.bars}`,
          { cache: 'no-store' }
        );

        if (response.ok) {
          const data = await response.json();
          return { success: true, data, mock: data.mock || false };
        }

        throw new Error('Failed to fetch bars');
      } catch {
        // Generate mock bars on error
        const bars = [];
        const now = Math.floor(Date.now() / 1000);
        const dayInSeconds = 86400;
        let price = SYMBOL_PRICES[upperSymbol] || 150;

        for (let i = params.bars; i > 0; i--) {
          const change = price * (Math.random() * 0.04 - 0.02);
          const open = price;
          const close = price + change;
          const high = Math.max(open, close) * (1 + Math.random() * 0.01);
          const low = Math.min(open, close) * (1 - Math.random() * 0.01);

          bars.push({
            t: new Date((now - i * dayInSeconds) * 1000).toISOString(),
            o: Math.round(open * 100) / 100,
            h: Math.round(high * 100) / 100,
            l: Math.round(low * 100) / 100,
            c: Math.round(close * 100) / 100,
            v: Math.floor(1000000 + Math.random() * 9000000),
          });

          price = close;
        }

        return { success: true, data: { bars, mock: true }, mock: true };
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
      } catch {
        // Return mock news results when backend unavailable
        const mockNews = {
          results: [
            {
              title: `Latest market analysis: ${query}`,
              source: 'Market Analysis',
              summary: `Based on recent market trends related to "${query}", analysts are monitoring key technical levels and sector performance. Market sentiment remains cautiously optimistic with focus on earnings and economic data.`,
              url: '#',
              timestamp: new Date().toISOString(),
            },
            {
              title: `Trading insights for ${query}`,
              source: 'Trading Desk',
              summary: `Current market conditions for "${query}" show mixed signals. Volume patterns suggest institutional activity, while technical indicators point to potential consolidation. Traders should watch for breakout confirmation.`,
              url: '#',
              timestamp: new Date(Date.now() - 3600000).toISOString(),
            },
          ],
          mock: true,
          note: 'News search requires Perplexity API integration for live results',
        };
        return { success: true, data: mockNews, mock: true };
      }
    },
  }),

  // =====================================================
  // THESIS & JOURNAL TOOLS - AI Semantic Awareness
  // These tools let the AI understand the user's research context
  // =====================================================

  get_active_theses: tool({
    description: 'Get all active investment theses the user is working on. Use this to understand their current research focus, targets, and key conditions.',
    inputSchema: z.object({
      symbol: z.string().optional().describe('Optional: Filter by specific symbol'),
    }),
    execute: async ({ symbol }) => {
      const baseUrl = getBaseUrl();
      try {
        const url = symbol
          ? `${baseUrl}/api/thesis?status=active&symbol=${symbol.toUpperCase()}`
          : `${baseUrl}/api/thesis?status=active`;
        const response = await fetch(url, { cache: 'no-store' });

        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            data: data.theses || [],
            count: data.theses?.length || 0,
            message: data.theses?.length > 0
              ? `Found ${data.theses.length} active thesis(es)`
              : 'No active theses found',
          };
        }
        return { success: true, data: [], count: 0, message: 'No theses found' };
      } catch {
        return { success: true, data: [], count: 0, message: 'Thesis data not available' };
      }
    },
  }),

  get_journal_entries: tool({
    description: 'Get recent journal entries with emotional tracking. Use this to understand the user trading history, emotions, and lessons learned.',
    inputSchema: z.object({
      symbol: z.string().optional().describe('Optional: Filter by specific symbol'),
      limit: z.number().default(10).describe('Number of recent entries to fetch'),
    }),
    execute: async ({ symbol, limit }) => {
      const baseUrl = getBaseUrl();
      try {
        const params = new URLSearchParams({ limit: limit.toString() });
        if (symbol) params.set('symbol', symbol.toUpperCase());

        const response = await fetch(`${baseUrl}/api/journal?${params}`, { cache: 'no-store' });

        if (response.ok) {
          const data = await response.json();
          const entries = data.entries || [];

          // Calculate emotion summary
          const emotionCounts: Record<string, number> = {};
          entries.forEach((e: any) => {
            if (e.emotionAtEntry) {
              emotionCounts[e.emotionAtEntry] = (emotionCounts[e.emotionAtEntry] || 0) + 1;
            }
          });

          return {
            success: true,
            data: entries,
            count: entries.length,
            emotionSummary: emotionCounts,
            message: entries.length > 0
              ? `Found ${entries.length} journal entries`
              : 'No journal entries found',
          };
        }
        return { success: true, data: [], count: 0, message: 'No journal entries found' };
      } catch {
        return { success: true, data: [], count: 0, message: 'Journal data not available' };
      }
    },
  }),

  get_emotional_state: tool({
    description: 'Check the user emotional firewall status and any recent trading discipline alerts. Use this before suggesting trades to ensure the user is in a good mental state.',
    inputSchema: z.object({}),
    execute: async () => {
      const baseUrl = getBaseUrl();
      try {
        const response = await fetch(`${baseUrl}/api/emotional-firewall/status`, { cache: 'no-store' });

        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            data: {
              status: data.status || 'clear',
              activeAlerts: data.alerts || [],
              cooldownExpires: data.cooldownExpires,
              recentPatterns: data.patterns || [],
              tradingAllowed: data.status !== 'blocked',
            },
            message: data.status === 'blocked'
              ? 'Emotional firewall is active - trading is temporarily blocked'
              : data.status === 'warning'
              ? 'Caution: Emotional patterns detected'
              : 'Emotional state is clear for trading',
          };
        }
        return {
          success: true,
          data: { status: 'clear', activeAlerts: [], tradingAllowed: true },
          message: 'Emotional firewall not configured',
        };
      } catch {
        return {
          success: true,
          data: { status: 'unknown', activeAlerts: [], tradingAllowed: true },
          message: 'Emotional firewall status unavailable',
        };
      }
    },
  }),

  search_knowledge: tool({
    description: 'Search the user\'s personal trading knowledge base including journals, theses, past conversations, and trading patterns for relevant information. Use this to recall past trades, lessons learned, investment hypotheses, or behavioral patterns.',
    inputSchema: z.object({
      query: z.string().describe('Search query to find relevant knowledge. Be specific about what you\'re looking for.'),
      sourceTypes: z.array(z.enum(['journal_entry', 'thesis', 'message', 'pattern_insight']))
        .optional()
        .describe('Filter by source types. Options: journal_entry (trade logs), thesis (investment hypotheses), message (past conversations), pattern_insight (trading patterns)'),
      symbol: z.string().optional().describe('Filter results to a specific trading symbol (e.g., AAPL, TSLA)'),
      limit: z.number().min(1).max(20).optional().default(5).describe('Maximum number of results to return'),
    }),
    execute: async ({ query, sourceTypes, symbol, limit }) => {
      const baseUrl = getBaseUrl();
      try {
        const response = await fetch(`${baseUrl}/api/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            mode: 'hybrid',
            sourceTypes,
            symbol,
            limit: limit || 5,
            threshold: 0.6,
          }),
        });

        if (response.ok) {
          const data = await response.json();

          if (data.results.length === 0) {
            return {
              success: true,
              action: 'search_results',
              results: [],
              message: 'No relevant entries found in your knowledge base for this query.',
            };
          }

          // Format results for display
          const formattedResults = data.results.map((r: any, i: number) => ({
            rank: i + 1,
            type: r.sourceType.replace('_', ' '),
            symbol: r.symbol || 'N/A',
            content: r.contentText.slice(0, 300) + (r.contentText.length > 300 ? '...' : ''),
            similarity: Math.round(r.similarity * 100) + '%',
          }));

          return {
            success: true,
            action: 'search_results',
            results: formattedResults,
            message: `Found ${data.count} relevant entries in your knowledge base.`,
          };
        }

        return {
          success: false,
          error: 'Failed to search knowledge base',
          message: 'Search temporarily unavailable. Please try again.',
        };
      } catch (error) {
        return {
          success: false,
          error: 'Knowledge search unavailable',
          message: 'Could not connect to knowledge base. The search feature may be offline.',
        };
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

  // Prediction Market Tools
  ...predictionMarketTools,
};

// Export all tools combined (for convenience)
export const allTools = tradingTools;
