import { describe, it, expect } from 'vitest';
import {
  calculatePositions,
  updatePositionsWithPrices,
  calculatePortfolioSummary,
  Position,
} from '../portfolio';
import { TradeEntry } from '@/lib/stores/trades-store';

describe('Portfolio Module', () => {
  describe('calculatePositions', () => {
    it('should calculate position from single buy trade', () => {
      const trades: TradeEntry[] = [
        {
          id: '1',
          userId: 'user1',
          symbol: 'AAPL',
          action: 'BUY',
          quantity: 100,
          price: 150.0,
          orderType: 'MKT',
          createdAt: '2024-01-01T10:00:00Z',
        },
      ];

      const positions = calculatePositions(trades);

      expect(positions).toHaveLength(1);
      expect(positions[0]).toMatchObject({
        symbol: 'AAPL',
        quantity: 100,
        avg_cost: 150.0,
        total_cost: 15000,
        realized_pnl: 0,
      });
    });

    it('should calculate position from multiple buy trades (accumulation)', () => {
      const trades: TradeEntry[] = [
        {
          id: '1',
          userId: 'user1',
          symbol: 'AAPL',
          action: 'BUY',
          quantity: 100,
          price: 150.0,
          orderType: 'MKT',
          createdAt: '2024-01-01T10:00:00Z',
        },
        {
          id: '2',
          userId: 'user1',
          symbol: 'AAPL',
          action: 'BUY',
          quantity: 50,
          price: 155.0,
          orderType: 'MKT',
          createdAt: '2024-01-02T10:00:00Z',
        },
      ];

      const positions = calculatePositions(trades);

      expect(positions).toHaveLength(1);
      expect(positions[0].quantity).toBe(150);
      expect(positions[0].total_cost).toBe(22750); // (100*150) + (50*155)
      expect(positions[0].avg_cost).toBeCloseTo(151.67, 2); // 22750 / 150
      expect(positions[0].realized_pnl).toBe(0);
    });

    it('should calculate realized P&L using FIFO method', () => {
      const trades: TradeEntry[] = [
        {
          id: '1',
          userId: 'user1',
          symbol: 'AAPL',
          action: 'BUY',
          quantity: 100,
          price: 150.0,
          orderType: 'MKT',
          createdAt: '2024-01-01T10:00:00Z',
        },
        {
          id: '2',
          userId: 'user1',
          symbol: 'AAPL',
          action: 'SELL',
          quantity: 50,
          price: 160.0,
          orderType: 'MKT',
          createdAt: '2024-01-02T10:00:00Z',
        },
      ];

      const positions = calculatePositions(trades);

      expect(positions).toHaveLength(1);
      expect(positions[0].quantity).toBe(50); // 100 - 50
      expect(positions[0].avg_cost).toBe(150.0); // All from first lot
      expect(positions[0].total_cost).toBe(7500); // 50 * 150
      expect(positions[0].realized_pnl).toBe(500); // 50 * (160 - 150)
    });

    it('should handle complete position closure', () => {
      const trades: TradeEntry[] = [
        {
          id: '1',
          userId: 'user1',
          symbol: 'AAPL',
          action: 'BUY',
          quantity: 100,
          price: 150.0,
          orderType: 'MKT',
          createdAt: '2024-01-01T10:00:00Z',
        },
        {
          id: '2',
          userId: 'user1',
          symbol: 'AAPL',
          action: 'SELL',
          quantity: 100,
          price: 160.0,
          orderType: 'MKT',
          createdAt: '2024-01-02T10:00:00Z',
        },
      ];

      const positions = calculatePositions(trades);

      expect(positions).toHaveLength(1);
      expect(positions[0].quantity).toBe(0);
      expect(positions[0].total_cost).toBe(0);
      expect(positions[0].realized_pnl).toBe(1000); // 100 * (160 - 150)
    });

    it('should handle FIFO across multiple lots', () => {
      const trades: TradeEntry[] = [
        {
          id: '1',
          userId: 'user1',
          symbol: 'AAPL',
          action: 'BUY',
          quantity: 50,
          price: 150.0,
          orderType: 'MKT',
          createdAt: '2024-01-01T10:00:00Z',
        },
        {
          id: '2',
          userId: 'user1',
          symbol: 'AAPL',
          action: 'BUY',
          quantity: 50,
          price: 155.0,
          orderType: 'MKT',
          createdAt: '2024-01-02T10:00:00Z',
        },
        {
          id: '3',
          userId: 'user1',
          symbol: 'AAPL',
          action: 'SELL',
          quantity: 75,
          price: 160.0,
          orderType: 'MKT',
          createdAt: '2024-01-03T10:00:00Z',
        },
      ];

      const positions = calculatePositions(trades);

      expect(positions).toHaveLength(1);
      expect(positions[0].quantity).toBe(25); // 100 - 75
      expect(positions[0].avg_cost).toBe(155.0); // Remaining from second lot
      expect(positions[0].total_cost).toBe(3875); // 25 * 155
      // Realized P&L: (50 * (160 - 150)) + (25 * (160 - 155)) = 500 + 125 = 625
      expect(positions[0].realized_pnl).toBe(625);
    });

    it('should handle multiple symbols independently', () => {
      const trades: TradeEntry[] = [
        {
          id: '1',
          userId: 'user1',
          symbol: 'AAPL',
          action: 'BUY',
          quantity: 100,
          price: 150.0,
          orderType: 'MKT',
          createdAt: '2024-01-01T10:00:00Z',
        },
        {
          id: '2',
          userId: 'user1',
          symbol: 'GOOGL',
          action: 'BUY',
          quantity: 50,
          price: 100.0,
          orderType: 'MKT',
          createdAt: '2024-01-02T10:00:00Z',
        },
      ];

      const positions = calculatePositions(trades);

      expect(positions).toHaveLength(2);

      const aaplPosition = positions.find((p) => p.symbol === 'AAPL');
      const googlPosition = positions.find((p) => p.symbol === 'GOOGL');

      expect(aaplPosition).toBeDefined();
      expect(aaplPosition?.quantity).toBe(100);
      expect(aaplPosition?.avg_cost).toBe(150.0);

      expect(googlPosition).toBeDefined();
      expect(googlPosition?.quantity).toBe(50);
      expect(googlPosition?.avg_cost).toBe(100.0);
    });

    it('should skip empty positions with no P&L', () => {
      const trades: TradeEntry[] = [
        {
          id: '1',
          userId: 'user1',
          symbol: 'AAPL',
          action: 'BUY',
          quantity: 100,
          price: 150.0,
          orderType: 'MKT',
          createdAt: '2024-01-01T10:00:00Z',
        },
        {
          id: '2',
          userId: 'user1',
          symbol: 'AAPL',
          action: 'SELL',
          quantity: 100,
          price: 150.0, // Break even
          orderType: 'MKT',
          createdAt: '2024-01-02T10:00:00Z',
        },
      ];

      const positions = calculatePositions(trades);

      // Position with 0 quantity and 0 realized P&L should be skipped
      expect(positions).toHaveLength(0);
    });

    it('should handle empty trade array', () => {
      const positions = calculatePositions([]);

      expect(positions).toHaveLength(0);
    });

    it('should include all trades in position', () => {
      const trades: TradeEntry[] = [
        {
          id: '1',
          userId: 'user1',
          symbol: 'AAPL',
          action: 'BUY',
          quantity: 100,
          price: 150.0,
          orderType: 'MKT',
          createdAt: '2024-01-01T10:00:00Z',
        },
        {
          id: '2',
          userId: 'user1',
          symbol: 'AAPL',
          action: 'SELL',
          quantity: 50,
          price: 160.0,
          orderType: 'MKT',
          createdAt: '2024-01-02T10:00:00Z',
        },
      ];

      const positions = calculatePositions(trades);

      expect(positions[0].trades).toHaveLength(2);
      expect(positions[0].first_trade_at).toBe('2024-01-01T10:00:00Z');
      expect(positions[0].last_trade_at).toBe('2024-01-02T10:00:00Z');
    });

    it('should handle negative P&L (losses)', () => {
      const trades: TradeEntry[] = [
        {
          id: '1',
          userId: 'user1',
          symbol: 'AAPL',
          action: 'BUY',
          quantity: 100,
          price: 150.0,
          orderType: 'MKT',
          createdAt: '2024-01-01T10:00:00Z',
        },
        {
          id: '2',
          userId: 'user1',
          symbol: 'AAPL',
          action: 'SELL',
          quantity: 100,
          price: 140.0,
          orderType: 'MKT',
          createdAt: '2024-01-02T10:00:00Z',
        },
      ];

      const positions = calculatePositions(trades);

      expect(positions[0].realized_pnl).toBe(-1000); // 100 * (140 - 150)
    });
  });

  describe('updatePositionsWithPrices', () => {
    it('should update position with current price and calculate unrealized P&L', () => {
      const positions: Position[] = [
        {
          symbol: 'AAPL',
          quantity: 100,
          avg_cost: 150.0,
          total_cost: 15000,
          realized_pnl: 0,
          trades: [],
          first_trade_at: '2024-01-01T10:00:00Z',
          last_trade_at: '2024-01-01T10:00:00Z',
        },
      ];

      const prices = { AAPL: 160.0 };

      const updated = updatePositionsWithPrices(positions, prices);

      expect(updated[0].current_price).toBe(160.0);
      expect(updated[0].market_value).toBe(16000); // 100 * 160
      expect(updated[0].unrealized_pnl).toBe(1000); // 16000 - 15000
      expect(updated[0].unrealized_pnl_pct).toBeCloseTo(6.67, 2); // (1000 / 15000) * 100
    });

    it('should calculate negative unrealized P&L for losses', () => {
      const positions: Position[] = [
        {
          symbol: 'AAPL',
          quantity: 100,
          avg_cost: 150.0,
          total_cost: 15000,
          realized_pnl: 0,
          trades: [],
          first_trade_at: '2024-01-01T10:00:00Z',
          last_trade_at: '2024-01-01T10:00:00Z',
        },
      ];

      const prices = { AAPL: 140.0 };

      const updated = updatePositionsWithPrices(positions, prices);

      expect(updated[0].unrealized_pnl).toBe(-1000); // 14000 - 15000
      expect(updated[0].unrealized_pnl_pct).toBeCloseTo(-6.67, 2); // (-1000 / 15000) * 100
    });

    it('should not update position if price is not available', () => {
      const positions: Position[] = [
        {
          symbol: 'AAPL',
          quantity: 100,
          avg_cost: 150.0,
          total_cost: 15000,
          realized_pnl: 0,
          trades: [],
          first_trade_at: '2024-01-01T10:00:00Z',
          last_trade_at: '2024-01-01T10:00:00Z',
        },
      ];

      const prices = { GOOGL: 100.0 }; // Different symbol

      const updated = updatePositionsWithPrices(positions, prices);

      expect(updated[0].current_price).toBeUndefined();
      expect(updated[0].market_value).toBeUndefined();
      expect(updated[0].unrealized_pnl).toBeUndefined();
    });

    it('should not update position with zero quantity', () => {
      const positions: Position[] = [
        {
          symbol: 'AAPL',
          quantity: 0,
          avg_cost: 150.0,
          total_cost: 0,
          realized_pnl: 1000,
          trades: [],
          first_trade_at: '2024-01-01T10:00:00Z',
          last_trade_at: '2024-01-02T10:00:00Z',
        },
      ];

      const prices = { AAPL: 160.0 };

      const updated = updatePositionsWithPrices(positions, prices);

      expect(updated[0].current_price).toBeUndefined();
      expect(updated[0].market_value).toBeUndefined();
    });

    it('should handle multiple positions', () => {
      const positions: Position[] = [
        {
          symbol: 'AAPL',
          quantity: 100,
          avg_cost: 150.0,
          total_cost: 15000,
          realized_pnl: 0,
          trades: [],
          first_trade_at: '2024-01-01T10:00:00Z',
          last_trade_at: '2024-01-01T10:00:00Z',
        },
        {
          symbol: 'GOOGL',
          quantity: 50,
          avg_cost: 100.0,
          total_cost: 5000,
          realized_pnl: 0,
          trades: [],
          first_trade_at: '2024-01-01T10:00:00Z',
          last_trade_at: '2024-01-01T10:00:00Z',
        },
      ];

      const prices = { AAPL: 160.0, GOOGL: 110.0 };

      const updated = updatePositionsWithPrices(positions, prices);

      expect(updated).toHaveLength(2);
      expect(updated[0].unrealized_pnl).toBe(1000);
      expect(updated[1].unrealized_pnl).toBe(500);
    });

    it('should handle zero unrealized P&L percentage when total cost is zero', () => {
      const positions: Position[] = [
        {
          symbol: 'AAPL',
          quantity: 100,
          avg_cost: 0,
          total_cost: 0,
          realized_pnl: 0,
          trades: [],
          first_trade_at: '2024-01-01T10:00:00Z',
          last_trade_at: '2024-01-01T10:00:00Z',
        },
      ];

      const prices = { AAPL: 160.0 };

      const updated = updatePositionsWithPrices(positions, prices);

      expect(updated[0].unrealized_pnl_pct).toBe(0);
    });

    it('should not mutate original positions array', () => {
      const positions: Position[] = [
        {
          symbol: 'AAPL',
          quantity: 100,
          avg_cost: 150.0,
          total_cost: 15000,
          realized_pnl: 0,
          trades: [],
          first_trade_at: '2024-01-01T10:00:00Z',
          last_trade_at: '2024-01-01T10:00:00Z',
        },
      ];

      const prices = { AAPL: 160.0 };

      updatePositionsWithPrices(positions, prices);

      expect(positions[0].current_price).toBeUndefined();
    });
  });

  describe('calculatePortfolioSummary', () => {
    it('should calculate summary with default starting cash', () => {
      const positions: Position[] = [
        {
          symbol: 'AAPL',
          quantity: 100,
          avg_cost: 150.0,
          total_cost: 15000,
          current_price: 160.0,
          market_value: 16000,
          unrealized_pnl: 1000,
          unrealized_pnl_pct: 6.67,
          realized_pnl: 0,
          trades: [],
          first_trade_at: '2024-01-01T10:00:00Z',
          last_trade_at: '2024-01-01T10:00:00Z',
        },
      ];

      const summary = calculatePortfolioSummary(positions);

      expect(summary.total_value).toBe(101000); // 100000 - 15000 + 16000
      expect(summary.cash).toBe(85000); // 100000 - 15000
      expect(summary.positions_value).toBe(16000);
      expect(summary.unrealized_pnl).toBe(1000);
      expect(summary.realized_pnl).toBe(0);
      expect(summary.positions_count).toBe(1);
    });

    it('should calculate summary with custom starting cash', () => {
      const positions: Position[] = [
        {
          symbol: 'AAPL',
          quantity: 100,
          avg_cost: 150.0,
          total_cost: 15000,
          current_price: 160.0,
          market_value: 16000,
          unrealized_pnl: 1000,
          unrealized_pnl_pct: 6.67,
          realized_pnl: 0,
          trades: [],
          first_trade_at: '2024-01-01T10:00:00Z',
          last_trade_at: '2024-01-01T10:00:00Z',
        },
      ];

      const summary = calculatePortfolioSummary(positions, 50000);

      expect(summary.total_value).toBe(51000); // 50000 - 15000 + 16000
      expect(summary.cash).toBe(35000); // 50000 - 15000
    });

    it('should include realized P&L in cash calculation', () => {
      const positions: Position[] = [
        {
          symbol: 'AAPL',
          quantity: 50,
          avg_cost: 150.0,
          total_cost: 7500,
          current_price: 160.0,
          market_value: 8000,
          unrealized_pnl: 500,
          unrealized_pnl_pct: 6.67,
          realized_pnl: 1000, // From previous closed trades
          trades: [],
          first_trade_at: '2024-01-01T10:00:00Z',
          last_trade_at: '2024-01-02T10:00:00Z',
        },
      ];

      const summary = calculatePortfolioSummary(positions);

      expect(summary.cash).toBe(93500); // 100000 - 7500 + 1000
      expect(summary.realized_pnl).toBe(1000);
    });

    it('should handle multiple positions', () => {
      const positions: Position[] = [
        {
          symbol: 'AAPL',
          quantity: 100,
          avg_cost: 150.0,
          total_cost: 15000,
          current_price: 160.0,
          market_value: 16000,
          unrealized_pnl: 1000,
          unrealized_pnl_pct: 6.67,
          realized_pnl: 0,
          trades: [],
          first_trade_at: '2024-01-01T10:00:00Z',
          last_trade_at: '2024-01-01T10:00:00Z',
        },
        {
          symbol: 'GOOGL',
          quantity: 50,
          avg_cost: 100.0,
          total_cost: 5000,
          current_price: 110.0,
          market_value: 5500,
          unrealized_pnl: 500,
          unrealized_pnl_pct: 10.0,
          realized_pnl: 0,
          trades: [],
          first_trade_at: '2024-01-01T10:00:00Z',
          last_trade_at: '2024-01-01T10:00:00Z',
        },
      ];

      const summary = calculatePortfolioSummary(positions);

      expect(summary.total_value).toBe(101500); // 100000 - 20000 + 21500
      expect(summary.cash).toBe(80000); // 100000 - 20000
      expect(summary.positions_value).toBe(21500);
      expect(summary.unrealized_pnl).toBe(1500);
      expect(summary.positions_count).toBe(2);
    });

    it('should use total_cost as fallback when market_value is not available', () => {
      const positions: Position[] = [
        {
          symbol: 'AAPL',
          quantity: 100,
          avg_cost: 150.0,
          total_cost: 15000,
          realized_pnl: 0,
          trades: [],
          first_trade_at: '2024-01-01T10:00:00Z',
          last_trade_at: '2024-01-01T10:00:00Z',
        },
      ];

      const summary = calculatePortfolioSummary(positions);

      expect(summary.positions_value).toBe(15000); // Using total_cost
      expect(summary.unrealized_pnl).toBe(0);
    });

    it('should exclude closed positions from count', () => {
      const positions: Position[] = [
        {
          symbol: 'AAPL',
          quantity: 100,
          avg_cost: 150.0,
          total_cost: 15000,
          current_price: 160.0,
          market_value: 16000,
          unrealized_pnl: 1000,
          unrealized_pnl_pct: 6.67,
          realized_pnl: 0,
          trades: [],
          first_trade_at: '2024-01-01T10:00:00Z',
          last_trade_at: '2024-01-01T10:00:00Z',
        },
        {
          symbol: 'GOOGL',
          quantity: 0, // Closed position
          avg_cost: 100.0,
          total_cost: 0,
          realized_pnl: 500,
          trades: [],
          first_trade_at: '2024-01-01T10:00:00Z',
          last_trade_at: '2024-01-02T10:00:00Z',
        },
      ];

      const summary = calculatePortfolioSummary(positions);

      expect(summary.positions_count).toBe(1); // Only open positions
      expect(summary.realized_pnl).toBe(500);
    });

    it('should handle empty positions array', () => {
      const summary = calculatePortfolioSummary([]);

      expect(summary.total_value).toBe(100000); // Just starting cash
      expect(summary.cash).toBe(100000);
      expect(summary.positions_value).toBe(0);
      expect(summary.unrealized_pnl).toBe(0);
      expect(summary.realized_pnl).toBe(0);
      expect(summary.positions_count).toBe(0);
    });

    it('should handle positions with losses', () => {
      const positions: Position[] = [
        {
          symbol: 'AAPL',
          quantity: 100,
          avg_cost: 150.0,
          total_cost: 15000,
          current_price: 140.0,
          market_value: 14000,
          unrealized_pnl: -1000,
          unrealized_pnl_pct: -6.67,
          realized_pnl: -500,
          trades: [],
          first_trade_at: '2024-01-01T10:00:00Z',
          last_trade_at: '2024-01-02T10:00:00Z',
        },
      ];

      const summary = calculatePortfolioSummary(positions);

      expect(summary.total_value).toBe(98500); // 100000 - 15000 + 14000 - 500 = 98500
      expect(summary.cash).toBe(84500); // 100000 - 15000 + (-500) = 84500
      expect(summary.unrealized_pnl).toBe(-1000);
      expect(summary.realized_pnl).toBe(-500);
    });
  });
});
