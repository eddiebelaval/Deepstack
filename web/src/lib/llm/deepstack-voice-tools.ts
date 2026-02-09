/**
 * DeepStack Voice Tools — Trading-Aware AI Tools
 *
 * Tools that give the Desk Analyst persona real-time awareness of:
 * - Portfolio state (balance, positions, P&L)
 * - Strategy status (which are active, last signals, hit rates)
 * - DeepSignals intelligence (PCR, dark pool, insider, congress)
 * - Trade history with outcomes and rationale
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getBaseUrl } from './utils';

const STRATEGY_EXPLANATIONS: Record<
  string,
  { summary: string; entry: string; exit: string; risk: string; market: string }
> = {
  mean_reversion: {
    summary:
      'Trades Kalshi INXD hourly S&P 500 contracts when YES prices deviate from fair value based on historical distribution.',
    entry:
      'Buy YES when price drops below floor (e.g., 45c). Scoring system filters weak signals with min_score threshold.',
    exit: 'Take profit at +8c, hard stop at -5c. All exits are systematic — no discretionary holds.',
    risk: 'Extended momentum can push through stops. INXD series availability varies.',
    market: 'Kalshi prediction markets (INXD series)',
  },
  momentum: {
    summary:
      'Trend-following strategy that buys strength and sells weakness across all Kalshi markets.',
    entry: 'Momentum score exceeds threshold with volume confirmation.',
    exit: 'Trailing stop or momentum reversal signal.',
    risk: 'Choppy markets cause whipsaws. Requires tight stop discipline.',
    market: 'All Kalshi markets',
  },
  deep_value: {
    summary:
      'Identifies stocks trading below intrinsic value with strong fundamentals for long-term holdings.',
    entry:
      'P/B < 1.0, P/E < 10, EV/EBITDA < 7, FCF yield > 7%, ROE > 15%. 40% allocation.',
    exit: 'Price reaches intrinsic value estimate, or thesis breaks.',
    risk: 'Value traps — cheap stocks that stay cheap. Requires patience.',
    market: 'US equities via Alpaca',
  },
  squeeze_hunter: {
    summary:
      'Targets heavily shorted stocks with low float that have squeeze potential.',
    entry:
      'Short interest > 20%, days to cover > 5, borrow cost > 5%, float < 20%. 30% allocation.',
    exit: 'Squeeze plays out, or setup deteriorates.',
    risk: 'False squeeze signals. Bagholding risk on failed squeezes.',
    market: 'US equities via Alpaca',
  },
  pairs_trading: {
    summary:
      'Trades mean reversion of correlated stock pairs when they diverge from historical relationship.',
    entry: 'Z-score > 2.0 standard deviations from mean.',
    exit: 'Z-score returns to 0, or stop at Z-score > 3.5.',
    risk: 'Correlation breakdown — the relationship may be permanently broken.',
    market: 'US equities (currently disabled)',
  },
  combinatorial_arbitrage: {
    summary:
      'Finds multi-leg contract combinations on Kalshi with guaranteed profit (sum of costs < guaranteed payout).',
    entry:
      'All legs simultaneously when arb spread exceeds costs + slippage buffer.',
    exit: 'Hold to settlement — outcome is guaranteed.',
    risk: 'Execution slippage on multi-leg orders. Thin order books.',
    market: 'Kalshi prediction markets',
  },
  cross_platform_arbitrage: {
    summary:
      'Exploits price differences for identical events between Kalshi and Polymarket.',
    entry: 'Price gap exceeds transaction costs + buffer on both platforms.',
    exit: 'Hold both sides to settlement.',
    risk: 'Platform-specific settlement rules may differ. Withdrawal delays.',
    market: 'Kalshi + Polymarket',
  },
};

export const deepstackVoiceTools = {
  get_portfolio_summary: tool({
    description:
      'Get a comprehensive portfolio summary including Kalshi balance, open positions, daily P&L, and risk utilization. Use when the user asks about their portfolio, balance, or positions.',
    inputSchema: z.object({}),
    execute: async () => {
      const baseUrl = getBaseUrl();
      try {
        const response = await fetch(`${baseUrl}/api/status`, {
          cache: 'no-store',
        });

        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            data: {
              account: data.account || {},
              risk: data.risk || {},
              strategies: (data.strategies || []).map(
                (s: { name: string; enabled: boolean; active_positions: number; status: string }) => ({
                  name: s.name,
                  enabled: s.enabled,
                  active_positions: s.active_positions,
                  status: s.status,
                })
              ),
              timestamp: data.timestamp,
            },
            message: 'Portfolio summary retrieved',
          };
        }

        return {
          success: true,
          data: {
            account: { balance_cents: 0, daily_pnl_cents: 0, total_positions: 0 },
            risk: {},
            strategies: [],
            note: 'Live data unavailable — showing defaults',
          },
          message: 'Portfolio data temporarily unavailable',
        };
      } catch {
        return {
          success: false,
          error: 'Could not fetch portfolio summary',
          message: 'Portfolio service offline',
        };
      }
    },
  }),

  get_strategy_status: tool({
    description:
      'Get the status of all trading strategies: which are enabled, last signals, hit rates, and recent performance. Use when the user asks about strategy performance or what strategies are running.',
    inputSchema: z.object({
      strategy_name: z
        .string()
        .optional()
        .describe(
          'Optional: filter to a specific strategy (mean_reversion, momentum, deep_value, squeeze_hunter, pairs_trading, combinatorial_arbitrage, cross_platform_arbitrage)'
        ),
    }),
    execute: async ({ strategy_name }) => {
      const baseUrl = getBaseUrl();
      try {
        const url = strategy_name
          ? `${baseUrl}/api/strategies/${encodeURIComponent(strategy_name)}/config`
          : `${baseUrl}/api/status`;

        const response = await fetch(url, { cache: 'no-store' });

        if (response.ok) {
          const data = await response.json();

          if (strategy_name) {
            return {
              success: true,
              data: {
                name: strategy_name,
                config: data,
              },
              message: `Strategy config for ${strategy_name}`,
            };
          }

          return {
            success: true,
            data: {
              strategies: data.strategies || [],
              trading_mode: data.trading_mode || 'paper',
            },
            message: `${(data.strategies || []).length} strategies configured`,
          };
        }

        return {
          success: true,
          data: { strategies: [], note: 'Strategy data unavailable' },
          message: 'Strategy service offline',
        };
      } catch {
        return {
          success: false,
          error: 'Could not fetch strategy status',
        };
      }
    },
  }),

  get_market_signals: tool({
    description:
      'Get the latest DeepSignals intelligence summary: CBOE put/call ratios, dark pool short volume, SEC insider trades, and congressional trading disclosures. Use when the user asks about unusual market activity, signals, or "what are the signals showing".',
    inputSchema: z.object({
      signal_type: z
        .enum(['all', 'pcr', 'dark_pool', 'insider', 'congress'])
        .optional()
        .default('all')
        .describe('Which signal type to fetch'),
      symbol: z
        .string()
        .optional()
        .describe('Optional: filter signals to a specific ticker'),
    }),
    execute: async ({ signal_type, symbol }) => {
      const baseUrl = getBaseUrl();
      const signals: Record<string, unknown> = {};

      try {
        // Fetch from DeepSignals API endpoints
        if (signal_type === 'all' || signal_type === 'pcr') {
          try {
            const resp = await fetch(`${baseUrl}/api/deepsignals/pcr`, {
              cache: 'no-store',
            });
            if (resp.ok) signals.pcr = await resp.json();
          } catch {
            signals.pcr = { status: 'unavailable' };
          }
        }

        if (signal_type === 'all' || signal_type === 'dark_pool') {
          try {
            const params = symbol ? `?symbol=${symbol.toUpperCase()}` : '';
            const resp = await fetch(
              `${baseUrl}/api/deepsignals/dark-pool${params}`,
              { cache: 'no-store' }
            );
            if (resp.ok) signals.dark_pool = await resp.json();
          } catch {
            signals.dark_pool = { status: 'unavailable' };
          }
        }

        if (signal_type === 'all' || signal_type === 'insider') {
          try {
            const params = symbol ? `?symbol=${symbol.toUpperCase()}` : '';
            const resp = await fetch(
              `${baseUrl}/api/deepsignals/insider${params}`,
              { cache: 'no-store' }
            );
            if (resp.ok) signals.insider = await resp.json();
          } catch {
            signals.insider = { status: 'unavailable' };
          }
        }

        if (signal_type === 'all' || signal_type === 'congress') {
          try {
            const resp = await fetch(`${baseUrl}/api/deepsignals/congress`, {
              cache: 'no-store',
            });
            if (resp.ok) signals.congress = await resp.json();
          } catch {
            signals.congress = { status: 'unavailable' };
          }
        }

        return {
          success: true,
          data: signals,
          filter: { signal_type, symbol },
          message: `DeepSignals data retrieved (${Object.keys(signals).length} sources)`,
        };
      } catch {
        return {
          success: false,
          error: 'Could not fetch market signals',
          message: 'DeepSignals service offline',
        };
      }
    },
  }),

  get_trade_history: tool({
    description:
      'Get recent trade history with outcomes, reasoning, and strategy attribution. Use when the user asks about recent trades, "what did we trade", or wants to review past decisions.',
    inputSchema: z.object({
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .default(10)
        .describe('Number of recent trades to fetch'),
      strategy: z
        .string()
        .optional()
        .describe('Optional: filter by strategy name'),
      status: z
        .enum(['all', 'open', 'closed', 'pending'])
        .optional()
        .default('all')
        .describe('Filter by trade status'),
    }),
    execute: async ({ limit, strategy, status }) => {
      const baseUrl = getBaseUrl();
      try {
        const params = new URLSearchParams({ limit: (limit || 10).toString() });
        if (strategy) params.set('strategy', strategy);
        if (status && status !== 'all') params.set('status', status);

        const response = await fetch(`${baseUrl}/api/trades?${params}`, {
          cache: 'no-store',
        });

        if (response.ok) {
          const data = await response.json();
          const trades = data.trades || data;
          return {
            success: true,
            data: trades,
            count: trades.length,
            message: `Retrieved ${trades.length} trades`,
          };
        }

        return {
          success: true,
          data: [],
          count: 0,
          message: 'No trade data available',
        };
      } catch {
        return {
          success: false,
          error: 'Could not fetch trade history',
        };
      }
    },
  }),

  explain_strategy: tool({
    description:
      'Get a detailed explanation of how a specific DeepStack strategy works, including entry/exit logic, risk parameters, and historical performance. Use when the user asks "how does X strategy work" or wants to understand strategy mechanics.',
    inputSchema: z.object({
      strategy: z
        .enum([
          'mean_reversion',
          'momentum',
          'deep_value',
          'squeeze_hunter',
          'pairs_trading',
          'combinatorial_arbitrage',
          'cross_platform_arbitrage',
        ])
        .describe('Which strategy to explain'),
    }),
    execute: async ({ strategy }) => {
      const explanation = STRATEGY_EXPLANATIONS[strategy];
      if (!explanation) {
        return {
          success: false,
          error: `Unknown strategy: ${strategy}`,
        };
      }

      return {
        success: true,
        data: {
          name: strategy,
          ...explanation,
        },
        message: `Strategy explanation for ${strategy.replace(/_/g, ' ')}`,
      };
    },
  }),
};
