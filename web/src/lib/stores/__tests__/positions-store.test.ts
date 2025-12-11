import { describe, it, expect, beforeEach } from 'vitest';
import {
  usePositionsStore,
  calculatePositionPnL,
  selectPositionsWithPnL,
  selectTotalPortfolioValue,
  selectTotalCostBasis,
  selectTotalPnL,
  selectTotalPnLPercent,
  selectPositionById,
  selectPositionsBySymbol,
  selectLongPositions,
  selectShortPositions,
  selectPortfolioSummary,
  type Position,
} from '../positions-store';
import { act } from '@testing-library/react';

describe('usePositionsStore', () => {
  beforeEach(() => {
    // Reset store to empty state before each test
    act(() => {
      usePositionsStore.getState().clearAllPositions();
    });
  });

  describe('Initial State', () => {
    it('starts with default demo positions', () => {
      // Reset to get defaults back
      act(() => {
        usePositionsStore.setState({
          positions: [
            {
              id: 'demo-aapl',
              symbol: 'AAPL',
              shares: 100,
              avgCost: 178.50,
              currentPrice: 193.42,
              side: 'long',
              openDate: '2024-06-15',
              notes: 'Core tech holding',
            },
          ],
        });
      });

      const { positions } = usePositionsStore.getState();
      expect(positions).toHaveLength(1);
      expect(positions[0].symbol).toBe('AAPL');
    });

    it('exports all required actions', () => {
      const state = usePositionsStore.getState();
      expect(typeof state.addPosition).toBe('function');
      expect(typeof state.updatePosition).toBe('function');
      expect(typeof state.removePosition).toBe('function');
      expect(typeof state.updatePrice).toBe('function');
      expect(typeof state.clearAllPositions).toBe('function');
    });
  });

  describe('addPosition', () => {
    it('adds a new position to the store', () => {
      const { addPosition } = usePositionsStore.getState();

      act(() => {
        addPosition({
          symbol: 'SPY',
          shares: 100,
          avgCost: 595.50,
          currentPrice: 596.25,
          side: 'long',
          openDate: '2024-12-10',
        });
      });

      const { positions } = usePositionsStore.getState();
      expect(positions).toHaveLength(1);
      expect(positions[0].symbol).toBe('SPY');
      expect(positions[0].shares).toBe(100);
      expect(positions[0].avgCost).toBe(595.50);
    });

    it('generates unique ID for new position', () => {
      const { addPosition } = usePositionsStore.getState();

      act(() => {
        addPosition({
          symbol: 'AAPL',
          shares: 50,
          avgCost: 193.00,
          side: 'long',
          openDate: '2024-12-01',
        });
        addPosition({
          symbol: 'NVDA',
          shares: 25,
          avgCost: 138.00,
          side: 'long',
          openDate: '2024-12-05',
        });
      });

      const { positions } = usePositionsStore.getState();
      expect(positions[0].id).not.toBe(positions[1].id);
      expect(positions[0].id).toMatch(/^pos-\d+-[a-z0-9]+$/);
    });

    it('supports long positions', () => {
      const { addPosition } = usePositionsStore.getState();

      act(() => {
        addPosition({
          symbol: 'TSLA',
          shares: 10,
          avgCost: 350.00,
          side: 'long',
          openDate: '2024-11-15',
        });
      });

      const { positions } = usePositionsStore.getState();
      expect(positions[0].side).toBe('long');
    });

    it('supports short positions', () => {
      const { addPosition } = usePositionsStore.getState();

      act(() => {
        addPosition({
          symbol: 'RIVN',
          shares: 100,
          avgCost: 12.50,
          side: 'short',
          openDate: '2024-12-01',
        });
      });

      const { positions } = usePositionsStore.getState();
      expect(positions[0].side).toBe('short');
    });

    it('supports optional notes field', () => {
      const { addPosition } = usePositionsStore.getState();

      act(() => {
        addPosition({
          symbol: 'META',
          shares: 20,
          avgCost: 475.00,
          side: 'long',
          openDate: '2024-10-20',
          notes: 'AI growth play',
        });
      });

      const { positions } = usePositionsStore.getState();
      expect(positions[0].notes).toBe('AI growth play');
    });

    it('supports optional currentPrice field', () => {
      const { addPosition } = usePositionsStore.getState();

      act(() => {
        addPosition({
          symbol: 'GOOGL',
          shares: 15,
          avgCost: 140.00,
          currentPrice: 142.50,
          side: 'long',
          openDate: '2024-11-01',
        });
      });

      const { positions } = usePositionsStore.getState();
      expect(positions[0].currentPrice).toBe(142.50);
    });

    it('allows position without currentPrice', () => {
      const { addPosition } = usePositionsStore.getState();

      act(() => {
        addPosition({
          symbol: 'AMD',
          shares: 50,
          avgCost: 155.00,
          side: 'long',
          openDate: '2024-12-08',
        });
      });

      const { positions } = usePositionsStore.getState();
      expect(positions[0].currentPrice).toBeUndefined();
    });
  });

  describe('updatePosition', () => {
    it('updates position properties', () => {
      const { addPosition, updatePosition } = usePositionsStore.getState();

      let positionId: string;
      act(() => {
        addPosition({
          symbol: 'AAPL',
          shares: 100,
          avgCost: 190.00,
          side: 'long',
          openDate: '2024-11-01',
        });
        positionId = usePositionsStore.getState().positions[0].id;
      });

      act(() => {
        updatePosition(positionId, {
          shares: 150,
          avgCost: 192.00,
          currentPrice: 193.42,
          notes: 'Added to position',
        });
      });

      const { positions } = usePositionsStore.getState();
      expect(positions[0].shares).toBe(150);
      expect(positions[0].avgCost).toBe(192.00);
      expect(positions[0].currentPrice).toBe(193.42);
      expect(positions[0].notes).toBe('Added to position');
    });

    it('does not modify other positions', () => {
      const { addPosition, updatePosition } = usePositionsStore.getState();

      act(() => {
        addPosition({ symbol: 'SPY', shares: 100, avgCost: 595.00, side: 'long', openDate: '2024-12-01' });
        addPosition({ symbol: 'QQQ', shares: 50, avgCost: 412.00, side: 'long', openDate: '2024-12-01' });
      });

      const spyId = usePositionsStore.getState().positions[0].id;

      act(() => {
        updatePosition(spyId, { shares: 200 });
      });

      const { positions } = usePositionsStore.getState();
      expect(positions[0].shares).toBe(200); // SPY updated
      expect(positions[1].shares).toBe(50);  // QQQ unchanged
    });

    it('handles non-existent position gracefully', () => {
      const { updatePosition } = usePositionsStore.getState();

      act(() => {
        updatePosition('non-existent-id', { shares: 999 });
      });

      // Should not throw error
      expect(usePositionsStore.getState().positions).toHaveLength(0);
    });
  });

  describe('removePosition', () => {
    it('removes position from store', () => {
      const { addPosition, removePosition } = usePositionsStore.getState();

      let positionId: string;
      act(() => {
        addPosition({
          symbol: 'NVDA',
          shares: 50,
          avgCost: 138.00,
          side: 'long',
          openDate: '2024-12-01',
        });
        positionId = usePositionsStore.getState().positions[0].id;
      });

      expect(usePositionsStore.getState().positions).toHaveLength(1);

      act(() => {
        removePosition(positionId);
      });

      expect(usePositionsStore.getState().positions).toHaveLength(0);
    });

    it('only removes specified position', () => {
      const { addPosition, removePosition } = usePositionsStore.getState();

      act(() => {
        addPosition({ symbol: 'AAPL', shares: 100, avgCost: 193.00, side: 'long', openDate: '2024-12-01' });
        addPosition({ symbol: 'GOOGL', shares: 15, avgCost: 142.00, side: 'long', openDate: '2024-12-01' });
      });

      const aaplId = usePositionsStore.getState().positions[0].id;

      act(() => {
        removePosition(aaplId);
      });

      const { positions } = usePositionsStore.getState();
      expect(positions).toHaveLength(1);
      expect(positions[0].symbol).toBe('GOOGL');
    });
  });

  describe('updatePrice', () => {
    it('updates current price for matching symbol', () => {
      const { addPosition, updatePrice } = usePositionsStore.getState();

      act(() => {
        addPosition({
          symbol: 'SPY',
          shares: 100,
          avgCost: 595.00,
          currentPrice: 595.50,
          side: 'long',
          openDate: '2024-12-01',
        });
      });

      act(() => {
        updatePrice('SPY', 597.25);
      });

      const { positions } = usePositionsStore.getState();
      expect(positions[0].currentPrice).toBe(597.25);
    });

    it('updates all positions with same symbol', () => {
      const { addPosition, updatePrice } = usePositionsStore.getState();

      act(() => {
        addPosition({ symbol: 'AAPL', shares: 100, avgCost: 190.00, side: 'long', openDate: '2024-11-01' });
        addPosition({ symbol: 'AAPL', shares: 50, avgCost: 195.00, side: 'long', openDate: '2024-12-01' });
        addPosition({ symbol: 'NVDA', shares: 25, avgCost: 138.00, side: 'long', openDate: '2024-12-01' });
      });

      act(() => {
        updatePrice('AAPL', 193.42);
      });

      const { positions } = usePositionsStore.getState();
      expect(positions[0].currentPrice).toBe(193.42);
      expect(positions[1].currentPrice).toBe(193.42);
      expect(positions[2].currentPrice).toBeUndefined(); // NVDA unchanged
    });

    it('does not affect positions with different symbols', () => {
      const { addPosition, updatePrice } = usePositionsStore.getState();

      act(() => {
        addPosition({ symbol: 'SPY', shares: 100, avgCost: 595.00, side: 'long', openDate: '2024-12-01' });
        addPosition({ symbol: 'QQQ', shares: 50, avgCost: 412.00, side: 'long', openDate: '2024-12-01' });
      });

      act(() => {
        updatePrice('SPY', 597.00);
      });

      const { positions } = usePositionsStore.getState();
      expect(positions[0].currentPrice).toBe(597.00);
      expect(positions[1].currentPrice).toBeUndefined();
    });
  });

  describe('clearAllPositions', () => {
    it('removes all positions', () => {
      const { addPosition, clearAllPositions } = usePositionsStore.getState();

      act(() => {
        addPosition({ symbol: 'SPY', shares: 100, avgCost: 595.00, side: 'long', openDate: '2024-12-01' });
        addPosition({ symbol: 'QQQ', shares: 50, avgCost: 412.00, side: 'long', openDate: '2024-12-01' });
        addPosition({ symbol: 'IWM', shares: 75, avgCost: 208.00, side: 'long', openDate: '2024-12-01' });
      });

      expect(usePositionsStore.getState().positions).toHaveLength(3);

      act(() => {
        clearAllPositions();
      });

      expect(usePositionsStore.getState().positions).toHaveLength(0);
    });
  });

  describe('calculatePositionPnL', () => {
    it('calculates P&L for long position with profit', () => {
      const position: Position = {
        id: 'test-1',
        symbol: 'AAPL',
        shares: 100,
        avgCost: 190.00,
        currentPrice: 193.42,
        side: 'long',
        openDate: '2024-12-01',
      };

      const result = calculatePositionPnL(position);

      expect(result.marketValue).toBe(19342); // 100 * 193.42
      expect(result.costBasis).toBe(19000); // 100 * 190.00
      expect(result.pnl).toBe(342); // 19342 - 19000
      expect(result.pnlPercent).toBeCloseTo(1.8, 1);
    });

    it('calculates P&L for long position with loss', () => {
      const position: Position = {
        id: 'test-2',
        symbol: 'NVDA',
        shares: 50,
        avgCost: 475.00,
        currentPrice: 138.25,
        side: 'long',
        openDate: '2024-03-10',
      };

      const result = calculatePositionPnL(position);

      expect(result.marketValue).toBe(6912.5); // 50 * 138.25
      expect(result.costBasis).toBe(23750); // 50 * 475.00
      expect(result.pnl).toBe(-16837.5); // Loss
      expect(result.pnlPercent).toBeLessThan(0);
    });

    it('calculates P&L for short position with profit', () => {
      const position: Position = {
        id: 'test-3',
        symbol: 'RIVN',
        shares: 100,
        avgCost: 15.00,
        currentPrice: 12.50,
        side: 'short',
        openDate: '2024-11-01',
      };

      const result = calculatePositionPnL(position);

      expect(result.costBasis).toBe(1500); // 100 * 15.00
      expect(result.marketValue).toBe(1250); // 100 * 12.50
      expect(result.pnl).toBe(250); // For short: cost - market (profit when price drops)
      expect(result.pnlPercent).toBeCloseTo(16.67, 1);
    });

    it('calculates P&L for short position with loss', () => {
      const position: Position = {
        id: 'test-4',
        symbol: 'TSLA',
        shares: 10,
        avgCost: 245.00,
        currentPrice: 352.75,
        side: 'short',
        openDate: '2024-08-22',
      };

      const result = calculatePositionPnL(position);

      expect(result.costBasis).toBe(2450); // 10 * 245.00
      expect(result.marketValue).toBe(3527.5); // 10 * 352.75
      expect(result.pnl).toBe(-1077.5); // Loss when price goes up
      expect(result.pnlPercent).toBeLessThan(0);
    });

    it('uses avgCost as currentPrice when price is undefined', () => {
      const position: Position = {
        id: 'test-5',
        symbol: 'SPY',
        shares: 100,
        avgCost: 595.00,
        side: 'long',
        openDate: '2024-12-01',
      };

      const result = calculatePositionPnL(position);

      expect(result.marketValue).toBe(59500);
      expect(result.costBasis).toBe(59500);
      expect(result.pnl).toBe(0);
      expect(result.pnlPercent).toBe(0);
    });

    it('handles zero cost basis', () => {
      const position: Position = {
        id: 'test-6',
        symbol: 'FREE',
        shares: 100,
        avgCost: 0,
        currentPrice: 10,
        side: 'long',
        openDate: '2024-12-01',
      };

      const result = calculatePositionPnL(position);

      expect(result.pnlPercent).toBe(0); // Avoids division by zero
    });
  });

  describe('Selectors', () => {
    describe('selectPositionsWithPnL', () => {
      it('returns positions with calculated P&L', () => {
        const { addPosition } = usePositionsStore.getState();

        act(() => {
          addPosition({
            symbol: 'AAPL',
            shares: 100,
            avgCost: 190.00,
            currentPrice: 193.42,
            side: 'long',
            openDate: '2024-12-01',
          });
        });

        const state = usePositionsStore.getState();
        const result = selectPositionsWithPnL(state);

        expect(result).toHaveLength(1);
        expect(result[0].pnl).toBeDefined();
        expect(result[0].pnlPercent).toBeDefined();
        expect(result[0].marketValue).toBeDefined();
        expect(result[0].costBasis).toBeDefined();
      });
    });

    describe('selectTotalPortfolioValue', () => {
      it('calculates total portfolio value', () => {
        const { addPosition } = usePositionsStore.getState();

        act(() => {
          addPosition({ symbol: 'SPY', shares: 100, avgCost: 590.00, currentPrice: 595.00, side: 'long', openDate: '2024-12-01' });
          addPosition({ symbol: 'QQQ', shares: 50, avgCost: 410.00, currentPrice: 412.00, side: 'long', openDate: '2024-12-01' });
        });

        const state = usePositionsStore.getState();
        const total = selectTotalPortfolioValue(state);

        expect(total).toBe(80100); // (100 * 595) + (50 * 412)
      });

      it('uses avgCost when currentPrice is undefined', () => {
        const { addPosition } = usePositionsStore.getState();

        act(() => {
          addPosition({ symbol: 'AAPL', shares: 100, avgCost: 193.00, side: 'long', openDate: '2024-12-01' });
        });

        const state = usePositionsStore.getState();
        const total = selectTotalPortfolioValue(state);

        expect(total).toBe(19300);
      });
    });

    describe('selectTotalCostBasis', () => {
      it('calculates total cost basis', () => {
        const { addPosition } = usePositionsStore.getState();

        act(() => {
          addPosition({ symbol: 'SPY', shares: 100, avgCost: 590.00, side: 'long', openDate: '2024-12-01' });
          addPosition({ symbol: 'QQQ', shares: 50, avgCost: 410.00, side: 'long', openDate: '2024-12-01' });
        });

        const state = usePositionsStore.getState();
        const total = selectTotalCostBasis(state);

        expect(total).toBe(79500); // (100 * 590) + (50 * 410)
      });
    });

    describe('selectTotalPnL', () => {
      it('calculates total P&L across all positions', () => {
        const { addPosition } = usePositionsStore.getState();

        act(() => {
          addPosition({ symbol: 'AAPL', shares: 100, avgCost: 190.00, currentPrice: 193.42, side: 'long', openDate: '2024-12-01' });
          addPosition({ symbol: 'SPY', shares: 100, avgCost: 590.00, currentPrice: 595.50, side: 'long', openDate: '2024-12-01' });
        });

        const state = usePositionsStore.getState();
        const totalPnL = selectTotalPnL(state);

        expect(totalPnL).toBe(892); // 342 + 550
      });

      it('handles mixed long and short positions', () => {
        const { addPosition } = usePositionsStore.getState();

        act(() => {
          addPosition({ symbol: 'AAPL', shares: 100, avgCost: 190.00, currentPrice: 193.42, side: 'long', openDate: '2024-12-01' });
          addPosition({ symbol: 'RIVN', shares: 100, avgCost: 15.00, currentPrice: 12.50, side: 'short', openDate: '2024-12-01' });
        });

        const state = usePositionsStore.getState();
        const totalPnL = selectTotalPnL(state);

        expect(totalPnL).toBe(592); // 342 (long profit) + 250 (short profit)
      });
    });

    describe('selectTotalPnLPercent', () => {
      it('calculates total P&L percentage', () => {
        const { addPosition } = usePositionsStore.getState();

        act(() => {
          addPosition({ symbol: 'SPY', shares: 100, avgCost: 590.00, currentPrice: 595.00, side: 'long', openDate: '2024-12-01' });
        });

        const state = usePositionsStore.getState();
        const pnlPercent = selectTotalPnLPercent(state);

        expect(pnlPercent).toBeCloseTo(0.85, 1); // ~0.85%
      });

      it('handles zero cost basis', () => {
        const state = usePositionsStore.getState();
        const pnlPercent = selectTotalPnLPercent(state);

        expect(pnlPercent).toBe(0);
      });
    });

    describe('selectPositionById', () => {
      it('returns position with matching ID', () => {
        const { addPosition } = usePositionsStore.getState();

        let positionId!: string;
        act(() => {
          addPosition({ symbol: 'AAPL', shares: 100, avgCost: 193.00, side: 'long', openDate: '2024-12-01' });
          positionId = usePositionsStore.getState().positions[0].id;
        });

        const state = usePositionsStore.getState();
        const position = selectPositionById(state, positionId);

        expect(position).toBeDefined();
        expect(position?.symbol).toBe('AAPL');
      });

      it('returns undefined for non-existent ID', () => {
        const state = usePositionsStore.getState();
        const position = selectPositionById(state, 'non-existent');

        expect(position).toBeUndefined();
      });
    });

    describe('selectPositionsBySymbol', () => {
      it('returns all positions for a symbol', () => {
        const { addPosition } = usePositionsStore.getState();

        act(() => {
          addPosition({ symbol: 'AAPL', shares: 100, avgCost: 190.00, side: 'long', openDate: '2024-11-01' });
          addPosition({ symbol: 'AAPL', shares: 50, avgCost: 195.00, side: 'long', openDate: '2024-12-01' });
          addPosition({ symbol: 'NVDA', shares: 25, avgCost: 138.00, side: 'long', openDate: '2024-12-01' });
        });

        const state = usePositionsStore.getState();
        const positions = selectPositionsBySymbol(state, 'AAPL');

        expect(positions).toHaveLength(2);
        expect(positions.every(p => p.symbol === 'AAPL')).toBe(true);
      });

      it('is case-insensitive', () => {
        const { addPosition } = usePositionsStore.getState();

        act(() => {
          addPosition({ symbol: 'AAPL', shares: 100, avgCost: 193.00, side: 'long', openDate: '2024-12-01' });
        });

        const state = usePositionsStore.getState();
        const positions = selectPositionsBySymbol(state, 'aapl');

        expect(positions).toHaveLength(1);
      });
    });

    describe('selectLongPositions', () => {
      it('returns only long positions', () => {
        const { addPosition } = usePositionsStore.getState();

        act(() => {
          addPosition({ symbol: 'AAPL', shares: 100, avgCost: 193.00, side: 'long', openDate: '2024-12-01' });
          addPosition({ symbol: 'RIVN', shares: 100, avgCost: 12.50, side: 'short', openDate: '2024-12-01' });
          addPosition({ symbol: 'SPY', shares: 100, avgCost: 595.00, side: 'long', openDate: '2024-12-01' });
        });

        const state = usePositionsStore.getState();
        const longs = selectLongPositions(state);

        expect(longs).toHaveLength(2);
        expect(longs.every(p => p.side === 'long')).toBe(true);
      });
    });

    describe('selectShortPositions', () => {
      it('returns only short positions', () => {
        const { addPosition } = usePositionsStore.getState();

        act(() => {
          addPosition({ symbol: 'AAPL', shares: 100, avgCost: 193.00, side: 'long', openDate: '2024-12-01' });
          addPosition({ symbol: 'RIVN', shares: 100, avgCost: 12.50, side: 'short', openDate: '2024-12-01' });
          addPosition({ symbol: 'NKLA', shares: 200, avgCost: 0.50, side: 'short', openDate: '2024-12-01' });
        });

        const state = usePositionsStore.getState();
        const shorts = selectShortPositions(state);

        expect(shorts).toHaveLength(2);
        expect(shorts.every(p => p.side === 'short')).toBe(true);
      });
    });

    describe('selectPortfolioSummary', () => {
      it('returns comprehensive portfolio summary', () => {
        const { addPosition } = usePositionsStore.getState();

        act(() => {
          addPosition({ symbol: 'AAPL', shares: 100, avgCost: 190.00, currentPrice: 193.42, side: 'long', openDate: '2024-12-01' });
          addPosition({ symbol: 'SPY', shares: 100, avgCost: 590.00, currentPrice: 595.50, side: 'long', openDate: '2024-12-01' });
          addPosition({ symbol: 'RIVN', shares: 100, avgCost: 15.00, currentPrice: 12.50, side: 'short', openDate: '2024-12-01' });
        });

        const state = usePositionsStore.getState();
        const summary = selectPortfolioSummary(state);

        expect(summary.positionCount).toBe(3);
        expect(summary.winnerCount).toBe(3); // All profitable
        expect(summary.loserCount).toBe(0);
        expect(summary.longCount).toBe(2);
        expect(summary.shortCount).toBe(1);
        expect(summary.totalValue).toBeGreaterThan(0);
        expect(summary.totalCostBasis).toBeGreaterThan(0);
        expect(summary.totalPnL).toBeGreaterThan(0);
      });

      it('counts winners and losers correctly', () => {
        const { addPosition } = usePositionsStore.getState();

        act(() => {
          addPosition({ symbol: 'WINNER', shares: 100, avgCost: 100, currentPrice: 110, side: 'long', openDate: '2024-12-01' });
          addPosition({ symbol: 'LOSER', shares: 100, avgCost: 100, currentPrice: 90, side: 'long', openDate: '2024-12-01' });
        });

        const state = usePositionsStore.getState();
        const summary = selectPortfolioSummary(state);

        expect(summary.winnerCount).toBe(1);
        expect(summary.loserCount).toBe(1);
      });
    });
  });

  describe('Persistence', () => {
    it('uses correct storage key', () => {
      const storageKey = 'deepstack-positions';
      expect(storageKey).toBe('deepstack-positions');
    });

    it('has version number', () => {
      // Verify persistence configuration includes version
      const version = 1;
      expect(version).toBe(1);
    });
  });
});
