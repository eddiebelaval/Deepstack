import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMarketWatchStore, getSymbolDisplayName } from '../market-watch-store';
import { act } from '@testing-library/react';

// Mock the market categories module
vi.mock('@/lib/data/market-categories', () => ({
  getCategoriesForTab: vi.fn((tab: string) => {
    if (tab === 'market') return ['Indices', 'Sectors', 'Commodities'];
    if (tab === 'crypto') return ['Major', 'DeFi', 'Layer 1'];
    if (tab === 'etfs') return ['Broad Market', 'Sector', 'International'];
    return [];
  }),
  getSymbolsForCategory: vi.fn(() => ['SPY', 'QQQ', 'DIA']),
}));

describe('useMarketWatchStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    act(() => {
      useMarketWatchStore.setState({
        indices: ['SPY', 'QQQ', 'DIA', 'IWM'],
        crypto: ['BTC/USD', 'ETH/USD', 'DOGE/USD', 'XRP/USD'],
        etfs: ['SPY', 'QQQ', 'GLD', 'TLT'],
        custom: ['SPY', 'AAPL'],
        selectedCategoryIndex: {
          market: 0,
          crypto: 0,
          etfs: 0,
        },
        isEditMode: false,
      });
    });
  });

  describe('initial state', () => {
    it('has default indices', () => {
      const state = useMarketWatchStore.getState();
      expect(state.indices).toEqual(['SPY', 'QQQ', 'DIA', 'IWM']);
    });

    it('has default crypto symbols', () => {
      const state = useMarketWatchStore.getState();
      expect(state.crypto).toEqual(['BTC/USD', 'ETH/USD', 'DOGE/USD', 'XRP/USD']);
    });

    it('has default ETFs', () => {
      const state = useMarketWatchStore.getState();
      expect(state.etfs).toEqual(['SPY', 'QQQ', 'GLD', 'TLT']);
    });

    it('has default custom symbols', () => {
      const state = useMarketWatchStore.getState();
      expect(state.custom).toEqual(['SPY', 'AAPL']);
    });

    it('has category indices at 0', () => {
      const state = useMarketWatchStore.getState();
      expect(state.selectedCategoryIndex.market).toBe(0);
      expect(state.selectedCategoryIndex.crypto).toBe(0);
      expect(state.selectedCategoryIndex.etfs).toBe(0);
    });

    it('has edit mode disabled', () => {
      const state = useMarketWatchStore.getState();
      expect(state.isEditMode).toBe(false);
    });
  });

  describe('setIndices', () => {
    it('updates indices list', () => {
      act(() => {
        useMarketWatchStore.getState().setIndices(['SPY', 'VTI', 'VOO']);
      });

      expect(useMarketWatchStore.getState().indices).toEqual(['SPY', 'VTI', 'VOO']);
    });

    it('limits to 8 symbols', () => {
      act(() => {
        useMarketWatchStore.getState().setIndices([
          'SPY', 'QQQ', 'DIA', 'IWM', 'VTI', 'VOO', 'VEA', 'VWO', 'EXTRA1', 'EXTRA2'
        ]);
      });

      expect(useMarketWatchStore.getState().indices).toHaveLength(8);
    });
  });

  describe('setCrypto', () => {
    it('updates crypto list', () => {
      act(() => {
        useMarketWatchStore.getState().setCrypto(['BTC/USD', 'SOL/USD']);
      });

      expect(useMarketWatchStore.getState().crypto).toEqual(['BTC/USD', 'SOL/USD']);
    });

    it('limits to 8 symbols', () => {
      act(() => {
        useMarketWatchStore.getState().setCrypto([
          'BTC/USD', 'ETH/USD', 'SOL/USD', 'ADA/USD', 'DOT/USD',
          'AVAX/USD', 'MATIC/USD', 'LINK/USD', 'EXTRA1', 'EXTRA2'
        ]);
      });

      expect(useMarketWatchStore.getState().crypto).toHaveLength(8);
    });
  });

  describe('setEtfs', () => {
    it('updates ETFs list', () => {
      act(() => {
        useMarketWatchStore.getState().setEtfs(['SPY', 'GLD']);
      });

      expect(useMarketWatchStore.getState().etfs).toEqual(['SPY', 'GLD']);
    });
  });

  describe('setCustom', () => {
    it('updates custom list', () => {
      act(() => {
        useMarketWatchStore.getState().setCustom(['AAPL', 'MSFT', 'GOOGL']);
      });

      expect(useMarketWatchStore.getState().custom).toEqual(['AAPL', 'MSFT', 'GOOGL']);
    });
  });

  describe('addSymbol', () => {
    it('adds symbol to indices', () => {
      act(() => {
        useMarketWatchStore.getState().addSymbol('indices', 'VTI');
      });

      expect(useMarketWatchStore.getState().indices).toContain('VTI');
    });

    it('adds symbol to crypto', () => {
      act(() => {
        useMarketWatchStore.getState().addSymbol('crypto', 'SOL/USD');
      });

      expect(useMarketWatchStore.getState().crypto).toContain('SOL/USD');
    });

    it('normalizes symbol to uppercase', () => {
      act(() => {
        useMarketWatchStore.getState().addSymbol('indices', 'vti');
      });

      expect(useMarketWatchStore.getState().indices).toContain('VTI');
    });

    it('trims whitespace from symbol', () => {
      act(() => {
        useMarketWatchStore.getState().addSymbol('indices', '  VOO  ');
      });

      expect(useMarketWatchStore.getState().indices).toContain('VOO');
    });

    it('does not add duplicate symbols', () => {
      const initialLength = useMarketWatchStore.getState().indices.length;

      act(() => {
        useMarketWatchStore.getState().addSymbol('indices', 'SPY');
      });

      expect(useMarketWatchStore.getState().indices).toHaveLength(initialLength);
    });

    it('does not exceed 8 symbols', () => {
      act(() => {
        useMarketWatchStore.setState({ indices: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] });
        useMarketWatchStore.getState().addSymbol('indices', 'EXTRA');
      });

      expect(useMarketWatchStore.getState().indices).toHaveLength(8);
      expect(useMarketWatchStore.getState().indices).not.toContain('EXTRA');
    });
  });

  describe('removeSymbol', () => {
    it('removes symbol from indices', () => {
      act(() => {
        useMarketWatchStore.getState().removeSymbol('indices', 'SPY');
      });

      expect(useMarketWatchStore.getState().indices).not.toContain('SPY');
    });

    it('removes symbol from crypto', () => {
      act(() => {
        useMarketWatchStore.getState().removeSymbol('crypto', 'BTC/USD');
      });

      expect(useMarketWatchStore.getState().crypto).not.toContain('BTC/USD');
    });

    it('does nothing if symbol does not exist', () => {
      const initialIndices = useMarketWatchStore.getState().indices;

      act(() => {
        useMarketWatchStore.getState().removeSymbol('indices', 'NONEXISTENT');
      });

      expect(useMarketWatchStore.getState().indices).toEqual(initialIndices);
    });
  });

  describe('reorderSymbols', () => {
    it('reorders symbols correctly', () => {
      act(() => {
        useMarketWatchStore.getState().reorderSymbols('indices', 0, 2);
      });

      const indices = useMarketWatchStore.getState().indices;
      expect(indices[0]).toBe('QQQ');
      expect(indices[1]).toBe('DIA');
      expect(indices[2]).toBe('SPY');
    });

    it('moves symbol from end to beginning', () => {
      act(() => {
        useMarketWatchStore.getState().reorderSymbols('indices', 3, 0);
      });

      const indices = useMarketWatchStore.getState().indices;
      expect(indices[0]).toBe('IWM');
    });

    it('handles crypto reordering', () => {
      act(() => {
        useMarketWatchStore.getState().reorderSymbols('crypto', 1, 3);
      });

      const crypto = useMarketWatchStore.getState().crypto;
      // After moving index 1 (ETH/USD) to index 3, order should be:
      // BTC/USD, DOGE/USD, XRP/USD, ETH/USD
      expect(crypto[3]).toBe('ETH/USD');
    });
  });

  describe('setSelectedCategory', () => {
    it('sets category index for market tab', () => {
      act(() => {
        useMarketWatchStore.getState().setSelectedCategory('market', 1);
      });

      expect(useMarketWatchStore.getState().selectedCategoryIndex.market).toBe(1);
    });

    it('sets category index for crypto tab', () => {
      act(() => {
        useMarketWatchStore.getState().setSelectedCategory('crypto', 2);
      });

      expect(useMarketWatchStore.getState().selectedCategoryIndex.crypto).toBe(2);
    });

    it('sets category index for etfs tab', () => {
      act(() => {
        useMarketWatchStore.getState().setSelectedCategory('etfs', 1);
      });

      expect(useMarketWatchStore.getState().selectedCategoryIndex.etfs).toBe(1);
    });

    it('does not set index out of bounds', () => {
      act(() => {
        useMarketWatchStore.getState().setSelectedCategory('market', 10);
      });

      // Should remain unchanged
      expect(useMarketWatchStore.getState().selectedCategoryIndex.market).toBe(0);
    });

    it('does not set negative index', () => {
      act(() => {
        useMarketWatchStore.getState().setSelectedCategory('market', -1);
      });

      expect(useMarketWatchStore.getState().selectedCategoryIndex.market).toBe(0);
    });
  });

  describe('edit mode', () => {
    it('enables edit mode', () => {
      act(() => {
        useMarketWatchStore.getState().setEditMode(true);
      });

      expect(useMarketWatchStore.getState().isEditMode).toBe(true);
    });

    it('disables edit mode', () => {
      act(() => {
        useMarketWatchStore.getState().setEditMode(false);
      });

      expect(useMarketWatchStore.getState().isEditMode).toBe(false);
    });

    it('toggles edit mode on', () => {
      act(() => {
        useMarketWatchStore.getState().toggleEditMode();
      });

      expect(useMarketWatchStore.getState().isEditMode).toBe(true);
    });

    it('toggles edit mode off', () => {
      act(() => {
        useMarketWatchStore.getState().setEditMode(true);
        useMarketWatchStore.getState().toggleEditMode();
      });

      expect(useMarketWatchStore.getState().isEditMode).toBe(false);
    });
  });

  describe('reset functions', () => {
    it('resets indices to defaults', () => {
      act(() => {
        useMarketWatchStore.getState().setIndices(['CUSTOM1', 'CUSTOM2']);
        useMarketWatchStore.getState().resetIndices();
      });

      expect(useMarketWatchStore.getState().indices).toEqual(['SPY', 'QQQ', 'DIA', 'IWM']);
    });

    it('resets crypto to defaults', () => {
      act(() => {
        useMarketWatchStore.getState().setCrypto(['SOL/USD', 'ADA/USD']);
        useMarketWatchStore.getState().resetCrypto();
      });

      expect(useMarketWatchStore.getState().crypto).toEqual(['BTC/USD', 'ETH/USD', 'DOGE/USD', 'XRP/USD']);
    });

    it('resets etfs to defaults', () => {
      act(() => {
        useMarketWatchStore.getState().setEtfs(['VTI', 'VOO']);
        useMarketWatchStore.getState().resetEtfs();
      });

      expect(useMarketWatchStore.getState().etfs).toEqual(['SPY', 'QQQ', 'GLD', 'TLT']);
    });

    it('resets custom to defaults', () => {
      act(() => {
        useMarketWatchStore.getState().setCustom(['MSFT', 'GOOGL']);
        useMarketWatchStore.getState().resetCustom();
      });

      expect(useMarketWatchStore.getState().custom).toEqual(['SPY', 'AAPL']);
    });

    it('resets all to defaults', () => {
      act(() => {
        useMarketWatchStore.getState().setIndices(['CUSTOM']);
        useMarketWatchStore.getState().setCrypto(['SOL/USD']);
        useMarketWatchStore.getState().setEtfs(['VTI']);
        useMarketWatchStore.getState().setCustom(['MSFT']);
        useMarketWatchStore.getState().setEditMode(true);
        useMarketWatchStore.getState().setSelectedCategory('market', 2);
        useMarketWatchStore.getState().resetAll();
      });

      const state = useMarketWatchStore.getState();
      expect(state.indices).toEqual(['SPY', 'QQQ', 'DIA', 'IWM']);
      expect(state.crypto).toEqual(['BTC/USD', 'ETH/USD', 'DOGE/USD', 'XRP/USD']);
      expect(state.etfs).toEqual(['SPY', 'QQQ', 'GLD', 'TLT']);
      expect(state.custom).toEqual(['SPY', 'AAPL']);
      expect(state.isEditMode).toBe(false);
      expect(state.selectedCategoryIndex.market).toBe(0);
      expect(state.selectedCategoryIndex.crypto).toBe(0);
      expect(state.selectedCategoryIndex.etfs).toBe(0);
    });
  });
});

describe('getSymbolDisplayName', () => {
  it('returns display name for SPY', () => {
    expect(getSymbolDisplayName('SPY')).toBe('S&P 500');
  });

  it('returns display name for BTC/USD', () => {
    expect(getSymbolDisplayName('BTC/USD')).toBe('Bitcoin');
  });

  it('returns symbol itself for unknown symbols', () => {
    expect(getSymbolDisplayName('UNKNOWN')).toBe('UNKNOWN');
  });

  it('returns display name for QQQ', () => {
    expect(getSymbolDisplayName('QQQ')).toBe('NASDAQ 100');
  });

  it('returns display name for ETH/USD', () => {
    expect(getSymbolDisplayName('ETH/USD')).toBe('Ethereum');
  });
});
