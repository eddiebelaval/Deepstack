import { tool } from 'ai';
import { z } from 'zod';
import { api } from '@/lib/api-extended';
import { createTradeEntry } from '@/lib/supabase/trades';
import { predictionMarketTools } from './prediction-market-tools';
import { perplexityFinanceTools } from './perplexity-finance-tools';
import { deepstackVoiceTools } from './deepstack-voice-tools';
import { getBaseUrl } from './utils';

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

  create_journal_entry: tool({
    description: 'Create a new trading journal entry. Use this when the user wants to log a trade, capture a lesson learned, or record their trading thoughts. You can create entries from natural conversation - extract the symbol, emotion, notes, and any other details mentioned.',
    inputSchema: z.object({
      symbol: z.string().describe('Stock ticker symbol (e.g., AAPL, TSLA). Required.'),
      direction: z.enum(['long', 'short']).optional().default('long').describe('Trade direction: long or short'),
      entryPrice: z.number().optional().describe('Entry price of the trade'),
      exitPrice: z.number().optional().describe('Exit price if the trade is closed'),
      quantity: z.number().optional().describe('Number of shares/contracts'),
      emotionAtEntry: z.enum(['confident', 'anxious', 'greedy', 'fearful', 'fomo', 'regret', 'relief', 'neutral', 'excited', 'frustrated'])
        .optional()
        .default('neutral')
        .describe('How the user felt when entering the trade'),
      emotionAtExit: z.enum(['confident', 'anxious', 'greedy', 'fearful', 'fomo', 'regret', 'relief', 'neutral', 'excited', 'frustrated'])
        .optional()
        .describe('How the user felt when exiting the trade'),
      notes: z.string().optional().describe('Trade notes, reasoning, market conditions, or any thoughts the user shared'),
      lessonsLearned: z.string().optional().describe('What the user learned from this trade or wants to remember'),
    }),
    execute: async (params) => {
      const baseUrl = getBaseUrl();
      try {
        const response = await fetch(`${baseUrl}/api/journal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: params.symbol.toUpperCase(),
            direction: params.direction || 'long',
            entryPrice: params.entryPrice || 0,
            exitPrice: params.exitPrice,
            quantity: params.quantity || 0,
            emotionAtEntry: params.emotionAtEntry || 'neutral',
            emotionAtExit: params.emotionAtExit,
            notes: params.notes,
            lessonsLearned: params.lessonsLearned,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            action: 'journal_created',
            data: data.entry,
            message: `Journal entry created for ${params.symbol.toUpperCase()}${params.lessonsLearned ? ' with lesson captured' : ''}`,
          };
        }

        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.message || 'Failed to create journal entry',
          message: 'Could not save the journal entry. Please try again.',
        };
      } catch (error) {
        return {
          success: false,
          error: 'Journal service unavailable',
          message: 'Could not connect to journal service. The entry was not saved.',
        };
      }
    },
  }),

  show_journal: tool({
    description: 'Open the journal panel so the user can view their trading journal entries',
    inputSchema: z.object({}),
    execute: async () => ({
      success: true,
      action: 'show_panel',
      panel: 'journal',
      message: 'Showing trading journal',
    }),
  }),

  get_emotional_state: tool({
    description: 'Check the user emotional firewall status and any recent trading discipline alerts. Use this before suggesting trades to ensure the user is in a good mental state.',
    inputSchema: z.object({}),
    execute: async () => {
      const baseUrl = getBaseUrl();
      try {
        const response = await fetch(`${baseUrl}/api/emotional-firewall/check`, { cache: 'no-store' });

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

  // =====================================================
  // THESIS CREATION - Create new investment theses via chat
  // =====================================================

  create_thesis: tool({
    description: 'Create a new investment thesis. Use this when the user wants to document a trading idea, hypothesis, or investment thesis for tracking.',
    inputSchema: z.object({
      symbol: z.string().describe('Stock ticker symbol (e.g., AAPL, NVDA)'),
      hypothesis: z.string().describe('The core thesis or hypothesis (e.g., "NVDA will benefit from AI infrastructure buildout")'),
      timeframe: z.string().describe('Expected timeframe for the thesis to play out (e.g., "3-6 months", "Q1 2025", "long-term")'),
      entryTarget: z.number().optional().describe('Target entry price'),
      exitTarget: z.number().optional().describe('Target exit/profit price'),
      stopLoss: z.number().optional().describe('Stop loss price'),
      keyConditions: z.array(z.string()).optional().describe('Key conditions that must be true for the thesis'),
      status: z.enum(['drafting', 'active']).optional().default('drafting').describe('Initial status: drafting or active'),
    }),
    execute: async (params) => {
      const baseUrl = getBaseUrl();
      const upperSymbol = params.symbol.toUpperCase();

      try {
        const response = await fetch(`${baseUrl}/api/thesis`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `${upperSymbol} - ${params.hypothesis.slice(0, 50)}${params.hypothesis.length > 50 ? '...' : ''}`,
            symbol: upperSymbol,
            hypothesis: params.hypothesis,
            timeframe: params.timeframe,
            entryTarget: params.entryTarget,
            exitTarget: params.exitTarget,
            stopLoss: params.stopLoss,
            keyConditions: params.keyConditions || [],
            status: params.status || 'drafting',
          }),
        });

        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            action: 'thesis_created',
            data: data.thesis,
            message: `Created ${params.status || 'draft'} thesis for ${upperSymbol}: "${params.hypothesis}"`,
          };
        }

        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.message || 'Failed to create thesis',
          message: 'Could not save the thesis. Please try again.',
        };
      } catch {
        return {
          success: false,
          error: 'Thesis service unavailable',
          message: 'Could not connect to thesis service. The thesis was not saved.',
        };
      }
    },
  }),

  show_thesis: tool({
    description: 'Open the thesis panel so the user can view and manage their investment theses',
    inputSchema: z.object({
      symbol: z.string().optional().describe('Optional: Filter to theses for a specific symbol'),
    }),
    execute: async ({ symbol }) => ({
      success: true,
      action: 'show_panel',
      panel: 'thesis',
      symbol: symbol?.toUpperCase(),
      message: symbol ? `Showing theses for ${symbol.toUpperCase()}` : 'Showing Thesis Engine',
    }),
  }),

  // =====================================================
  // PRICE ALERTS - Create and manage price alerts via chat
  // =====================================================

  create_price_alert: tool({
    description: 'Create a price alert for a stock. Use this when the user wants to be notified when a stock reaches a certain price level.',
    inputSchema: z.object({
      symbol: z.string().describe('Stock ticker symbol (e.g., SPY, AAPL)'),
      targetPrice: z.number().positive().describe('The price level to alert at'),
      condition: z.enum(['above', 'below', 'crosses']).describe('Alert condition: "above" for price going up to target, "below" for price dropping to target, "crosses" for any crossing'),
      note: z.string().optional().describe('Optional note for the alert (e.g., "support level", "resistance break")'),
    }),
    execute: async (params) => {
      const upperSymbol = params.symbol.toUpperCase();

      // Return action for the client to create the alert in the store
      return {
        success: true,
        action: 'create_alert',
        data: {
          symbol: upperSymbol,
          targetPrice: params.targetPrice,
          condition: params.condition,
          note: params.note,
        },
        message: `Alert created: Notify when ${upperSymbol} goes ${params.condition} $${params.targetPrice.toFixed(2)}${params.note ? ` (${params.note})` : ''}`,
      };
    },
  }),

  // =====================================================
  // CALENDAR - Get market calendar events via chat
  // =====================================================

  get_calendar_events: tool({
    description: 'Get upcoming market calendar events including earnings, economic releases, dividends, and IPOs. Use this when the user asks about upcoming earnings, Fed meetings, economic data releases, etc.',
    inputSchema: z.object({
      startDate: z.string().optional().describe('Start date in YYYY-MM-DD format (defaults to today)'),
      endDate: z.string().optional().describe('End date in YYYY-MM-DD format (defaults to 2 weeks from start)'),
      eventType: z.enum(['earnings', 'economic', 'dividend', 'ipo', 'all']).optional().default('all').describe('Type of events to fetch'),
      symbol: z.string().optional().describe('Filter by specific stock symbol'),
    }),
    execute: async ({ startDate, endDate, eventType, symbol }) => {
      const baseUrl = getBaseUrl();

      // Default dates
      const start = startDate || new Date().toISOString().split('T')[0];
      const defaultEnd = new Date(new Date(start).getTime() + 14 * 24 * 60 * 60 * 1000);
      const end = endDate || defaultEnd.toISOString().split('T')[0];

      try {
        const params = new URLSearchParams({ start, end });
        if (eventType && eventType !== 'all') params.append('type', eventType);
        if (symbol) params.append('symbol', symbol.toUpperCase());

        const response = await fetch(`${baseUrl}/api/calendar?${params}`, {
          cache: 'no-store',
        });

        if (response.ok) {
          const data = await response.json();
          const events = data.events || [];

          // Filter by symbol if specified
          const filtered = symbol
            ? events.filter((e: any) => e.symbol?.toUpperCase() === symbol.toUpperCase())
            : events;

          // Group by type for better presentation
          const grouped = {
            earnings: filtered.filter((e: any) => e.type === 'earnings'),
            economic: filtered.filter((e: any) => e.type === 'economic'),
            dividend: filtered.filter((e: any) => e.type === 'dividend'),
            ipo: filtered.filter((e: any) => e.type === 'ipo'),
          };

          return {
            success: true,
            data: {
              events: filtered,
              grouped,
              dateRange: { start, end },
              totalCount: filtered.length,
            },
            message: filtered.length > 0
              ? `Found ${filtered.length} calendar events from ${start} to ${end}`
              : `No calendar events found for the selected period`,
          };
        }

        return {
          success: true,
          data: { events: [], grouped: {}, dateRange: { start, end }, totalCount: 0 },
          message: 'Calendar data temporarily unavailable',
        };
      } catch {
        return {
          success: true,
          data: { events: [], grouped: {}, dateRange: { start, end }, totalCount: 0 },
          message: 'Could not connect to calendar service',
        };
      }
    },
  }),

  // =====================================================
  // PROCESS INTEGRITY - Challenge thesis and manage friction
  // =====================================================

  challenge_thesis: tool({
    description: 'Challenge the user\'s investment thesis by presenting the bearish case, risks, and assumptions that could be wrong. Use this to strengthen their conviction or reveal weak spots. This engages the devil\'s advocate mode and improves research quality score.',
    inputSchema: z.object({
      symbol: z.string().describe('Stock ticker symbol'),
      hypothesis: z.string().describe('The user\'s current hypothesis or thesis statement'),
      thesisId: z.string().optional().describe('Thesis ID if available'),
    }),
    execute: async ({ symbol, hypothesis }) => {
      const upperSymbol = symbol.toUpperCase();
      const baseUrl = getBaseUrl();

      // Mark devil's advocate as engaged in the current session
      try {
        // Try to get active session and mark devil's advocate
        const sessionResponse = await fetch(`${baseUrl}/api/process-integrity/session`, {
          method: 'GET',
        });

        if (sessionResponse.ok) {
          const { session } = await sessionResponse.json();
          if (session?.id) {
            await fetch(`${baseUrl}/api/process-integrity/session`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'set_devils_advocate',
                sessionId: session.id,
              }),
            });
          }
        }
      } catch {
        // Continue even if session update fails
      }

      // Generate challenge points based on the hypothesis
      const challenges = [
        `What if ${upperSymbol}'s competitive moat is weaker than you think?`,
        `Have you considered how rising rates or recession could impact this thesis?`,
        `What's your exit plan if the thesis is wrong? At what price do you admit defeat?`,
        `Are you anchoring to a specific price or outcome?`,
        `What would the smartest bear say about ${upperSymbol}?`,
      ];

      return {
        success: true,
        data: {
          symbol: upperSymbol,
          originalHypothesis: hypothesis,
          challenges,
          devilsAdvocateEngaged: true,
        },
        action: 'devils_advocate_engaged',
        message: `Let me challenge your thesis on ${upperSymbol}. Consider these counter-arguments carefully before proceeding.`,
      };
    },
  }),

  check_process_integrity: tool({
    description: 'Check the user\'s process integrity before executing a trade. Returns friction level, research quality score, time-in-thesis, and conviction analysis. Use this when the user expresses intent to trade but you want to verify their process.',
    inputSchema: z.object({
      symbol: z.string().describe('Stock ticker symbol'),
      action: z.enum(['BUY', 'SELL']).describe('Intended trade action'),
      thesisId: z.string().optional().describe('Thesis ID if known'),
    }),
    execute: async ({ symbol, action, thesisId }) => {
      const upperSymbol = symbol.toUpperCase();
      const baseUrl = getBaseUrl();

      try {
        const response = await fetch(`${baseUrl}/api/process-integrity/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol: upperSymbol, action, thesisId }),
        });

        if (response.ok) {
          const result = await response.json();
          return {
            success: true,
            data: result,
            action: result.friction?.level !== 'none' ? 'show_friction' : 'clear_to_proceed',
            message: result.friction?.message || 'Process integrity check complete.',
          };
        }

        return {
          success: false,
          error: 'Failed to check process integrity',
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  }),

  override_process_friction: tool({
    description: 'Allow user to override process integrity friction after they acknowledge the risks. This logs the override for future learning. Use this when the user explicitly confirms they want to proceed despite warnings.',
    inputSchema: z.object({
      frictionLevel: z.enum(['soft', 'medium', 'hard']).describe('The friction level being overridden'),
      frictionReason: z.string().describe('Why friction was triggered'),
      dimension: z.enum(['research_quality', 'time_in_thesis', 'conviction_integrity', 'combined']).describe('Which dimension triggered friction'),
      symbol: z.string().describe('Stock ticker symbol'),
      thesisId: z.string().optional().describe('Thesis ID if available'),
      userReasoning: z.string().optional().describe('User\'s reason for overriding (required for hard friction)'),
      scoresSnapshot: z.object({
        researchQuality: z.number(),
        timeInThesisHours: z.number(),
        conviction: z.number(),
      }).describe('Current scores at time of override'),
    }),
    execute: async ({ frictionLevel, frictionReason, dimension, symbol, thesisId, userReasoning, scoresSnapshot }) => {
      const upperSymbol = symbol.toUpperCase();
      const baseUrl = getBaseUrl();

      try {
        const response = await fetch(`${baseUrl}/api/process-integrity/override`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            frictionLevel,
            frictionReason,
            dimension,
            symbol: upperSymbol,
            thesisId,
            userReasoning,
            scoresSnapshot,
            confirm: true,
            actionAttempted: 'place_paper_trade',
          }),
        });

        if (response.ok) {
          const result = await response.json();
          return {
            success: true,
            data: result,
            action: 'override_confirmed',
            message: `Override confirmed for ${upperSymbol}. You may now proceed with your trade. Remember: this override is logged for your learning.`,
            warning: frictionLevel === 'hard'
              ? 'You overrode a hard friction warning. Please review the outcome of this trade carefully.'
              : undefined,
          };
        }

        return {
          success: false,
          error: 'Failed to process override',
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  }),

  record_assumption: tool({
    description: 'Record an explicit assumption the user is making about their thesis. This improves research quality score by documenting what must be true for the thesis to work.',
    inputSchema: z.object({
      assumption: z.string().describe('The assumption being made (e.g., "Revenue will grow 20% YoY")'),
      thesisId: z.string().optional().describe('Thesis ID if available'),
    }),
    execute: async ({ assumption }) => {
      const baseUrl = getBaseUrl();

      try {
        // Get active session
        const sessionResponse = await fetch(`${baseUrl}/api/process-integrity/session`, {
          method: 'GET',
        });

        if (sessionResponse.ok) {
          const { session } = await sessionResponse.json();
          if (session?.id) {
            await fetch(`${baseUrl}/api/process-integrity/session`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'record_assumption',
                sessionId: session.id,
              }),
            });

            return {
              success: true,
              data: { assumption, recorded: true },
              message: `Assumption recorded: "${assumption}". Documenting assumptions strengthens your thesis.`,
            };
          }
        }

        return {
          success: true,
          data: { assumption, recorded: false },
          message: `Noted assumption: "${assumption}". Start a research session to track this for your quality score.`,
        };
      } catch {
        return {
          success: true,
          data: { assumption, recorded: false },
          message: `Noted assumption: "${assumption}"`,
        };
      }
    },
  }),

  update_thesis_status: tool({
    description: 'Update the status of a thesis. When promoting to "active" or "validated", this will check process integrity and may return friction that requires acknowledgment. Use this instead of directly updating thesis status.',
    inputSchema: z.object({
      thesisId: z.string().describe('The thesis ID to update'),
      newStatus: z.enum(['drafting', 'active', 'validated', 'invalidated', 'archived']).describe('The new status'),
      symbol: z.string().describe('The symbol for the thesis'),
      force: z.boolean().optional().describe('If true, skip process integrity check (user has acknowledged friction)'),
      overrideReason: z.string().optional().describe('Reason for overriding friction (required if force=true and friction was hard)'),
    }),
    execute: async ({ thesisId, newStatus, symbol, force, overrideReason }) => {
      const baseUrl = getBaseUrl();
      const upperSymbol = symbol.toUpperCase();

      // Statuses that require process integrity check
      const commitmentStatuses = ['active', 'validated'];

      // Check if this is a commitment status change
      if (commitmentStatuses.includes(newStatus) && !force) {
        try {
          // Check process integrity before allowing status change
          const integrityResponse = await fetch(`${baseUrl}/api/process-integrity/check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              symbol: upperSymbol,
              action: `promote_to_${newStatus}`,
              thesisId,
            }),
          });

          if (integrityResponse.ok) {
            const integrityResult = await integrityResponse.json();

            // If friction is triggered, return it instead of updating
            if (integrityResult.friction?.level && integrityResult.friction.level !== 'none') {
              return {
                success: false,
                friction_triggered: true,
                friction: integrityResult.friction,
                integrity: {
                  researchQuality: integrityResult.researchQuality,
                  timeInThesis: integrityResult.timeInThesis,
                  conviction: integrityResult.conviction,
                },
                message: integrityResult.friction.message,
                suggested_action: integrityResult.friction.suggestedAction,
                can_override: integrityResult.friction.canOverride,
                override_warning: integrityResult.friction.overrideWarning,
                action: 'status_change_blocked',
                data: {
                  thesisId,
                  requestedStatus: newStatus,
                  symbol: upperSymbol,
                },
              };
            }
          }
        } catch (error) {
          console.error('Process integrity check failed:', error);
          // Continue with update if integrity check fails (fail open)
        }
      }

      // If force=true and there was friction, log the override
      if (force && commitmentStatuses.includes(newStatus)) {
        try {
          await fetch(`${baseUrl}/api/process-integrity/override`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              frictionLevel: 'unknown', // We don't know the original level
              frictionReason: `User overrode friction to promote thesis to ${newStatus}`,
              dimension: 'combined',
              symbol: upperSymbol,
              thesisId,
              userReasoning: overrideReason,
            }),
          });
        } catch {
          // Log override failure but continue
        }
      }

      // Proceed with status update
      try {
        const response = await fetch(`${baseUrl}/api/thesis`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: thesisId,
            status: newStatus,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const statusMessages: Record<string, string> = {
            active: `Thesis promoted to active. You've committed to this trade idea for ${upperSymbol}.`,
            validated: `Thesis validated. Your hypothesis for ${upperSymbol} has been confirmed.`,
            invalidated: `Thesis invalidated. Important learning moment - what did you miss?`,
            archived: `Thesis archived for ${upperSymbol}.`,
            drafting: `Thesis moved back to drafting for ${upperSymbol}.`,
          };

          return {
            success: true,
            action: 'thesis_status_updated',
            data: data.thesis,
            message: statusMessages[newStatus] || `Thesis status updated to ${newStatus}.`,
          };
        } else {
          const errorData = await response.json().catch(() => ({}));
          return {
            success: false,
            error: errorData.message || 'Failed to update thesis status',
          };
        }
      } catch {
        return {
          success: false,
          error: 'Could not connect to thesis service',
        };
      }
    },
  }),

  detect_trading_intent: tool({
    description: 'Use this when you detect the user expressing intent to trade or act on a position externally. This triggers a process integrity check. Call this when you hear phrases like "I\'m going to buy", "ready to enter", "pulling the trigger", "placing the order", "about to execute", etc.',
    inputSchema: z.object({
      symbol: z.string().describe('The symbol they intend to trade'),
      intentStatement: z.string().describe('The user\'s statement expressing trading intent'),
      thesisId: z.string().optional().describe('Related thesis ID if known'),
    }),
    execute: async ({ symbol, intentStatement, thesisId }) => {
      const baseUrl = getBaseUrl();
      const upperSymbol = symbol.toUpperCase();

      try {
        // Check process integrity when intent is detected
        const integrityResponse = await fetch(`${baseUrl}/api/process-integrity/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: upperSymbol,
            action: 'external_trade_intent',
            thesisId,
          }),
        });

        if (integrityResponse.ok) {
          const integrityResult = await integrityResponse.json();

          // Always return the integrity check result
          const hasFriction = integrityResult.friction?.level && integrityResult.friction.level !== 'none';

          return {
            success: true,
            intent_detected: true,
            intent_statement: intentStatement,
            symbol: upperSymbol,
            friction_triggered: hasFriction,
            friction: integrityResult.friction,
            integrity: {
              researchQuality: integrityResult.researchQuality,
              timeInThesis: integrityResult.timeInThesis,
              conviction: integrityResult.conviction,
            },
            message: hasFriction
              ? integrityResult.friction.message
              : `Process integrity check passed for ${upperSymbol}. Your research and conviction appear solid.`,
            suggested_action: hasFriction
              ? integrityResult.friction.suggestedAction
              : 'You may proceed with your intended action.',
            can_override: integrityResult.friction?.canOverride ?? true,
          };
        }

        // If check fails, return neutral response
        return {
          success: true,
          intent_detected: true,
          intent_statement: intentStatement,
          symbol: upperSymbol,
          friction_triggered: false,
          message: `I noticed you're ready to act on ${upperSymbol}. Make sure you've done your due diligence.`,
        };
      } catch {
        return {
          success: true,
          intent_detected: true,
          intent_statement: intentStatement,
          symbol: upperSymbol,
          friction_triggered: false,
          message: `I noticed you're ready to act on ${upperSymbol}. Make sure you've done your due diligence.`,
        };
      }
    },
  }),

  // Prediction Market Tools
  ...predictionMarketTools,

  // Perplexity Finance Tools (SEC filings, earnings transcripts, market summaries, deep research)
  ...perplexityFinanceTools,

  // DeepStack Voice Tools (portfolio, strategy, signals, trade history)
  ...deepstackVoiceTools,
};

// Export all tools combined (for convenience)
export const allTools = tradingTools;
