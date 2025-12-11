import { describe, it, expect, beforeEach } from 'vitest';
import {
  useTradingStore,
  type Timeframe,
} from '../trading-store';
import { act } from '@testing-library/react';

describe('useTradingStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    act(() => {
      useTradingStore.getState().reset();
    });
  });

  describe('Initial State', () => {
    it('has default active symbol', () => {
      const { activeSymbol } = useTradingStore.getState();
      expect(activeSymbol).toBe('SPY');
    });

    it('has empty overlay symbols', () => {
      const { overlaySymbols } = useTradingStore.getState();
      expect(overlaySymbols).toEqual([]);
    });

    it('has default chart type', () => {
      const { chartType } = useTradingStore.getState();
      expect(chartType).toBe('candlestick');
    });

    it('has default timeframe', () => {
      const { timeframe } = useTradingStore.getState();
      expect(timeframe).toBe('1d');
    });

    it('has empty indicators array', () => {
      const { indicators } = useTradingStore.getState();
      expect(indicators).toEqual([]);
    });

    it('shows all panels by default', () => {
      const { showWatchlist, showOrderPanel, showChatPanel } = useTradingStore.getState();
      expect(showWatchlist).toBe(true);
      expect(showOrderPanel).toBe(true);
      expect(showChatPanel).toBe(true);
    });

    it('exports all required actions', () => {
      const state = useTradingStore.getState();
      expect(typeof state.setActiveSymbol).toBe('function');
      expect(typeof state.setChartType).toBe('function');
      expect(typeof state.setTimeframe).toBe('function');
      expect(typeof state.addOverlaySymbol).toBe('function');
      expect(typeof state.removeOverlaySymbol).toBe('function');
      expect(typeof state.clearOverlays).toBe('function');
      expect(typeof state.addIndicator).toBe('function');
      expect(typeof state.removeIndicator).toBe('function');
      expect(typeof state.toggleIndicator).toBe('function');
      expect(typeof state.updateIndicatorParams).toBe('function');
      expect(typeof state.updateIndicatorColor).toBe('function');
    });
  });

  describe('setActiveSymbol', () => {
    it('sets the active symbol', () => {
      const { setActiveSymbol } = useTradingStore.getState();

      act(() => {
        setActiveSymbol('AAPL');
      });

      expect(useTradingStore.getState().activeSymbol).toBe('AAPL');
    });

    it('can change symbol multiple times', () => {
      const { setActiveSymbol } = useTradingStore.getState();

      act(() => {
        setActiveSymbol('AAPL');
      });
      expect(useTradingStore.getState().activeSymbol).toBe('AAPL');

      act(() => {
        setActiveSymbol('NVDA');
      });
      expect(useTradingStore.getState().activeSymbol).toBe('NVDA');
    });
  });

  describe('setChartType', () => {
    it('sets candlestick chart type', () => {
      const { setChartType } = useTradingStore.getState();

      act(() => {
        setChartType('candlestick');
      });

      expect(useTradingStore.getState().chartType).toBe('candlestick');
    });

    it('sets line chart type', () => {
      const { setChartType } = useTradingStore.getState();

      act(() => {
        setChartType('line');
      });

      expect(useTradingStore.getState().chartType).toBe('line');
    });

    it('sets area chart type', () => {
      const { setChartType } = useTradingStore.getState();

      act(() => {
        setChartType('area');
      });

      expect(useTradingStore.getState().chartType).toBe('area');
    });
  });

  describe('setTimeframe', () => {
    const timeframes: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'];

    timeframes.forEach((tf) => {
      it(`sets ${tf} timeframe`, () => {
        const { setTimeframe } = useTradingStore.getState();

        act(() => {
          setTimeframe(tf);
        });

        expect(useTradingStore.getState().timeframe).toBe(tf);
      });
    });
  });

  describe('Overlay Symbols', () => {
    describe('addOverlaySymbol', () => {
      it('adds overlay symbol', () => {
        const { addOverlaySymbol } = useTradingStore.getState();

        act(() => {
          addOverlaySymbol('QQQ');
        });

        expect(useTradingStore.getState().overlaySymbols).toContain('QQQ');
      });

      it('adds multiple overlay symbols', () => {
        const { addOverlaySymbol } = useTradingStore.getState();

        act(() => {
          addOverlaySymbol('QQQ');
          addOverlaySymbol('IWM');
          addOverlaySymbol('DIA');
        });

        const { overlaySymbols } = useTradingStore.getState();
        expect(overlaySymbols).toHaveLength(3);
        expect(overlaySymbols).toContain('QQQ');
        expect(overlaySymbols).toContain('IWM');
        expect(overlaySymbols).toContain('DIA');
      });

      it('does not add duplicate symbols', () => {
        const { addOverlaySymbol } = useTradingStore.getState();

        act(() => {
          addOverlaySymbol('QQQ');
          addOverlaySymbol('QQQ');
        });

        expect(useTradingStore.getState().overlaySymbols).toHaveLength(1);
      });

      it('does not add active symbol as overlay', () => {
        const { setActiveSymbol, addOverlaySymbol } = useTradingStore.getState();

        act(() => {
          setActiveSymbol('AAPL');
          addOverlaySymbol('AAPL');
        });

        expect(useTradingStore.getState().overlaySymbols).toHaveLength(0);
      });

      it('limits overlays to 4 symbols', () => {
        const { addOverlaySymbol } = useTradingStore.getState();

        act(() => {
          addOverlaySymbol('QQQ');
          addOverlaySymbol('IWM');
          addOverlaySymbol('DIA');
          addOverlaySymbol('VTI');
          addOverlaySymbol('VOO'); // Should not be added
        });

        expect(useTradingStore.getState().overlaySymbols).toHaveLength(4);
        expect(useTradingStore.getState().overlaySymbols).not.toContain('VOO');
      });
    });

    describe('removeOverlaySymbol', () => {
      it('removes overlay symbol', () => {
        const { addOverlaySymbol, removeOverlaySymbol } = useTradingStore.getState();

        act(() => {
          addOverlaySymbol('QQQ');
          addOverlaySymbol('IWM');
        });

        expect(useTradingStore.getState().overlaySymbols).toHaveLength(2);

        act(() => {
          removeOverlaySymbol('QQQ');
        });

        const { overlaySymbols } = useTradingStore.getState();
        expect(overlaySymbols).toHaveLength(1);
        expect(overlaySymbols).not.toContain('QQQ');
        expect(overlaySymbols).toContain('IWM');
      });

      it('handles non-existent symbol gracefully', () => {
        const { addOverlaySymbol, removeOverlaySymbol } = useTradingStore.getState();

        act(() => {
          addOverlaySymbol('QQQ');
        });

        act(() => {
          removeOverlaySymbol('NONEXISTENT');
        });

        expect(useTradingStore.getState().overlaySymbols).toHaveLength(1);
      });
    });

    describe('clearOverlays', () => {
      it('removes all overlay symbols', () => {
        const { addOverlaySymbol, clearOverlays } = useTradingStore.getState();

        act(() => {
          addOverlaySymbol('QQQ');
          addOverlaySymbol('IWM');
          addOverlaySymbol('DIA');
        });

        expect(useTradingStore.getState().overlaySymbols).toHaveLength(3);

        act(() => {
          clearOverlays();
        });

        expect(useTradingStore.getState().overlaySymbols).toHaveLength(0);
      });
    });
  });

  describe('Indicators', () => {
    describe('addIndicator', () => {
      it('adds SMA indicator', () => {
        const { addIndicator } = useTradingStore.getState();

        act(() => {
          addIndicator('SMA');
        });

        const { indicators } = useTradingStore.getState();
        expect(indicators).toHaveLength(1);
        expect(indicators[0].type).toBe('SMA');
        expect(indicators[0].visible).toBe(true);
      });

      it('adds EMA indicator', () => {
        const { addIndicator } = useTradingStore.getState();

        act(() => {
          addIndicator('EMA');
        });

        const { indicators } = useTradingStore.getState();
        expect(indicators[0].type).toBe('EMA');
      });

      it('adds RSI indicator', () => {
        const { addIndicator } = useTradingStore.getState();

        act(() => {
          addIndicator('RSI');
        });

        const { indicators } = useTradingStore.getState();
        expect(indicators[0].type).toBe('RSI');
      });

      it('adds MACD indicator', () => {
        const { addIndicator } = useTradingStore.getState();

        act(() => {
          addIndicator('MACD');
        });

        const { indicators } = useTradingStore.getState();
        expect(indicators[0].type).toBe('MACD');
      });

      it('adds BOLLINGER indicator', () => {
        const { addIndicator } = useTradingStore.getState();

        act(() => {
          addIndicator('BOLLINGER');
        });

        const { indicators } = useTradingStore.getState();
        expect(indicators[0].type).toBe('BOLLINGER');
      });

      it('generates unique ID for each indicator', () => {
        const { addIndicator } = useTradingStore.getState();

        act(() => {
          addIndicator('SMA');
          addIndicator('EMA');
        });

        const { indicators } = useTradingStore.getState();
        expect(indicators[0].id).not.toBe(indicators[1].id);
        expect(indicators[0].id).toMatch(/^SMA-\d+$/);
        expect(indicators[1].id).toMatch(/^EMA-\d+$/);
      });

      it('does not add duplicate indicator types', () => {
        const { addIndicator } = useTradingStore.getState();

        act(() => {
          addIndicator('RSI');
          addIndicator('RSI');
        });

        expect(useTradingStore.getState().indicators).toHaveLength(1);
      });

      it('sets default params for SMA', () => {
        const { addIndicator } = useTradingStore.getState();

        act(() => {
          addIndicator('SMA');
        });

        const { indicators } = useTradingStore.getState();
        expect(indicators[0].params.period).toBe(20);
      });

      it('sets default params for RSI', () => {
        const { addIndicator } = useTradingStore.getState();

        act(() => {
          addIndicator('RSI');
        });

        const { indicators } = useTradingStore.getState();
        expect(indicators[0].params.period).toBe(14);
      });

      it('sets default params for MACD', () => {
        const { addIndicator } = useTradingStore.getState();

        act(() => {
          addIndicator('MACD');
        });

        const { indicators } = useTradingStore.getState();
        expect(indicators[0].params.fast).toBe(12);
        expect(indicators[0].params.slow).toBe(26);
        expect(indicators[0].params.signal).toBe(9);
      });

      it('sets indicator as visible by default', () => {
        const { addIndicator } = useTradingStore.getState();

        act(() => {
          addIndicator('SMA');
        });

        expect(useTradingStore.getState().indicators[0].visible).toBe(true);
      });

      it('sets default color for each indicator type', () => {
        const { addIndicator } = useTradingStore.getState();

        act(() => {
          addIndicator('SMA');
        });

        expect(useTradingStore.getState().indicators[0].color).toBeDefined();
      });
    });

    describe('removeIndicator', () => {
      it('removes indicator by ID', () => {
        const { addIndicator, removeIndicator } = useTradingStore.getState();

        let indicatorId: string;
        act(() => {
          addIndicator('SMA');
          indicatorId = useTradingStore.getState().indicators[0].id;
        });

        expect(useTradingStore.getState().indicators).toHaveLength(1);

        act(() => {
          removeIndicator(indicatorId);
        });

        expect(useTradingStore.getState().indicators).toHaveLength(0);
      });

      it('only removes specified indicator', () => {
        const { addIndicator, removeIndicator } = useTradingStore.getState();

        let smaId: string;
        act(() => {
          addIndicator('SMA');
          addIndicator('EMA');
          addIndicator('RSI');
          smaId = useTradingStore.getState().indicators[0].id;
        });

        act(() => {
          removeIndicator(smaId);
        });

        const { indicators } = useTradingStore.getState();
        expect(indicators).toHaveLength(2);
        expect(indicators.find(i => i.type === 'SMA')).toBeUndefined();
      });

      it('handles non-existent ID gracefully', () => {
        const { addIndicator, removeIndicator } = useTradingStore.getState();

        act(() => {
          addIndicator('SMA');
        });

        act(() => {
          removeIndicator('non-existent-id');
        });

        expect(useTradingStore.getState().indicators).toHaveLength(1);
      });
    });

    describe('toggleIndicator', () => {
      it('toggles indicator visibility', () => {
        const { addIndicator, toggleIndicator } = useTradingStore.getState();

        let indicatorId: string;
        act(() => {
          addIndicator('SMA');
          indicatorId = useTradingStore.getState().indicators[0].id;
        });

        expect(useTradingStore.getState().indicators[0].visible).toBe(true);

        act(() => {
          toggleIndicator(indicatorId);
        });

        expect(useTradingStore.getState().indicators[0].visible).toBe(false);

        act(() => {
          toggleIndicator(indicatorId);
        });

        expect(useTradingStore.getState().indicators[0].visible).toBe(true);
      });

      it('only toggles specified indicator', () => {
        const { addIndicator, toggleIndicator } = useTradingStore.getState();

        let smaId: string;
        act(() => {
          addIndicator('SMA');
          addIndicator('EMA');
          smaId = useTradingStore.getState().indicators[0].id;
        });

        act(() => {
          toggleIndicator(smaId);
        });

        const { indicators } = useTradingStore.getState();
        expect(indicators[0].visible).toBe(false); // SMA toggled
        expect(indicators[1].visible).toBe(true);  // EMA unchanged
      });
    });

    describe('updateIndicatorParams', () => {
      it('updates indicator parameters', () => {
        const { addIndicator, updateIndicatorParams } = useTradingStore.getState();

        let indicatorId: string;
        act(() => {
          addIndicator('SMA');
          indicatorId = useTradingStore.getState().indicators[0].id;
        });

        act(() => {
          updateIndicatorParams(indicatorId, { period: 50 });
        });

        expect(useTradingStore.getState().indicators[0].params.period).toBe(50);
      });

      it('merges new params with existing params', () => {
        const { addIndicator, updateIndicatorParams } = useTradingStore.getState();

        let indicatorId: string;
        act(() => {
          addIndicator('MACD');
          indicatorId = useTradingStore.getState().indicators[0].id;
        });

        act(() => {
          updateIndicatorParams(indicatorId, { fast: 10 });
        });

        const params = useTradingStore.getState().indicators[0].params;
        expect(params.fast).toBe(10);
        expect(params.slow).toBe(26); // Unchanged
        expect(params.signal).toBe(9); // Unchanged
      });

      it('only updates specified indicator', () => {
        const { addIndicator, updateIndicatorParams } = useTradingStore.getState();

        let smaId: string;
        act(() => {
          addIndicator('SMA');
          addIndicator('EMA');
          smaId = useTradingStore.getState().indicators[0].id;
        });

        act(() => {
          updateIndicatorParams(smaId, { period: 100 });
        });

        const { indicators } = useTradingStore.getState();
        expect(indicators[0].params.period).toBe(100); // SMA updated
        expect(indicators[1].params.period).toBe(12);  // EMA unchanged
      });
    });

    describe('updateIndicatorColor', () => {
      it('updates indicator color', () => {
        const { addIndicator, updateIndicatorColor } = useTradingStore.getState();

        let indicatorId: string;
        act(() => {
          addIndicator('SMA');
          indicatorId = useTradingStore.getState().indicators[0].id;
        });

        act(() => {
          updateIndicatorColor(indicatorId, '#ff0000');
        });

        expect(useTradingStore.getState().indicators[0].color).toBe('#ff0000');
      });

      it('only updates specified indicator', () => {
        const { addIndicator, updateIndicatorColor } = useTradingStore.getState();

        let smaId: string;
        act(() => {
          addIndicator('SMA');
          addIndicator('EMA');
          smaId = useTradingStore.getState().indicators[0].id;
        });

        const originalEmaColor = useTradingStore.getState().indicators[1].color;

        act(() => {
          updateIndicatorColor(smaId, '#00ff00');
        });

        const { indicators } = useTradingStore.getState();
        expect(indicators[0].color).toBe('#00ff00');
        expect(indicators[1].color).toBe(originalEmaColor); // Unchanged
      });
    });
  });

  describe('Panel Toggles', () => {
    describe('toggleWatchlist', () => {
      it('toggles watchlist visibility', () => {
        const { toggleWatchlist } = useTradingStore.getState();

        expect(useTradingStore.getState().showWatchlist).toBe(true);

        act(() => {
          toggleWatchlist();
        });

        expect(useTradingStore.getState().showWatchlist).toBe(false);

        act(() => {
          toggleWatchlist();
        });

        expect(useTradingStore.getState().showWatchlist).toBe(true);
      });
    });

    describe('toggleOrderPanel', () => {
      it('toggles order panel visibility', () => {
        const { toggleOrderPanel } = useTradingStore.getState();

        expect(useTradingStore.getState().showOrderPanel).toBe(true);

        act(() => {
          toggleOrderPanel();
        });

        expect(useTradingStore.getState().showOrderPanel).toBe(false);

        act(() => {
          toggleOrderPanel();
        });

        expect(useTradingStore.getState().showOrderPanel).toBe(true);
      });
    });

    describe('toggleChatPanel', () => {
      it('toggles chat panel visibility', () => {
        const { toggleChatPanel } = useTradingStore.getState();

        expect(useTradingStore.getState().showChatPanel).toBe(true);

        act(() => {
          toggleChatPanel();
        });

        expect(useTradingStore.getState().showChatPanel).toBe(false);

        act(() => {
          toggleChatPanel();
        });

        expect(useTradingStore.getState().showChatPanel).toBe(true);
      });
    });
  });

  describe('reset', () => {
    it('resets to initial state', () => {
      const {
        setActiveSymbol,
        setChartType,
        setTimeframe,
        addOverlaySymbol,
        addIndicator,
        toggleWatchlist,
        reset,
      } = useTradingStore.getState();

      act(() => {
        setActiveSymbol('AAPL');
        setChartType('line');
        setTimeframe('1h');
        addOverlaySymbol('QQQ');
        addIndicator('SMA');
        toggleWatchlist();
        reset();
      });

      const state = useTradingStore.getState();
      expect(state.activeSymbol).toBe('SPY');
      expect(state.chartType).toBe('candlestick');
      expect(state.timeframe).toBe('1d');
      expect(state.overlaySymbols).toEqual([]);
      expect(state.indicators).toEqual([]);
      expect(state.showWatchlist).toBe(true);
      expect(state.showOrderPanel).toBe(true);
      expect(state.showChatPanel).toBe(true);
    });
  });

  describe('Persistence', () => {
    it('uses correct storage key', () => {
      const storageKey = 'deepstack-trading-storage';
      expect(storageKey).toBe('deepstack-trading-storage');
    });
  });

  describe('Complex Scenarios', () => {
    it('handles full trading setup workflow', () => {
      const {
        setActiveSymbol,
        setChartType,
        setTimeframe,
        addOverlaySymbol,
        addIndicator,
      } = useTradingStore.getState();

      act(() => {
        // Setup trading view
        setActiveSymbol('AAPL');
        setChartType('candlestick');
        setTimeframe('1h');

        // Add overlays
        addOverlaySymbol('SPY');
        addOverlaySymbol('QQQ');

        // Add indicators
        addIndicator('SMA');
        addIndicator('RSI');
        addIndicator('MACD');
      });

      const state = useTradingStore.getState();
      expect(state.activeSymbol).toBe('AAPL');
      expect(state.chartType).toBe('candlestick');
      expect(state.timeframe).toBe('1h');
      expect(state.overlaySymbols).toHaveLength(2);
      expect(state.indicators).toHaveLength(3);
    });

    it('maintains indicator state through multiple operations', () => {
      const {
        addIndicator,
        toggleIndicator,
        updateIndicatorParams,
        updateIndicatorColor,
      } = useTradingStore.getState();

      let indicatorId: string;

      act(() => {
        addIndicator('SMA');
        indicatorId = useTradingStore.getState().indicators[0].id;

        toggleIndicator(indicatorId);
        updateIndicatorParams(indicatorId, { period: 50 });
        updateIndicatorColor(indicatorId, '#ff0000');
      });

      const indicator = useTradingStore.getState().indicators[0];
      expect(indicator.visible).toBe(false);
      expect(indicator.params.period).toBe(50);
      expect(indicator.color).toBe('#ff0000');
    });
  });
});
