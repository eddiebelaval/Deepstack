import { describe, it, expect, beforeEach } from 'vitest';
import { useWidgetStore, getWidgetDefinition, getWidgetsByCategory, WIDGET_REGISTRY } from '../widget-store';
import { act } from '@testing-library/react';

describe('useWidgetStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    act(() => {
      useWidgetStore.setState({
        activeWidgets: [
          { id: 'default-watchlist', type: 'watchlist', isCollapsed: false, order: 0 },
          { id: 'default-quick-stats', type: 'quick-stats', isCollapsed: false, order: 1 },
          { id: 'default-market-status', type: 'market-status', isCollapsed: false, order: 2 },
        ],
      });
    });
  });

  describe('initial state', () => {
    it('has default widgets', () => {
      const state = useWidgetStore.getState();
      expect(state.activeWidgets).toHaveLength(3);
      expect(state.activeWidgets.map(w => w.type)).toEqual([
        'watchlist',
        'quick-stats',
        'market-status',
      ]);
    });

    it('has widgets with correct order', () => {
      const state = useWidgetStore.getState();
      expect(state.activeWidgets[0].order).toBe(0);
      expect(state.activeWidgets[1].order).toBe(1);
      expect(state.activeWidgets[2].order).toBe(2);
    });

    it('has all widgets expanded by default', () => {
      const state = useWidgetStore.getState();
      state.activeWidgets.forEach(widget => {
        expect(widget.isCollapsed).toBe(false);
      });
    });
  });

  describe('addWidget', () => {
    it('adds new widget to the end', () => {
      act(() => {
        useWidgetStore.getState().addWidget('mini-chart');
      });

      const state = useWidgetStore.getState();
      expect(state.activeWidgets).toHaveLength(4);
      expect(state.activeWidgets[3].type).toBe('mini-chart');
      expect(state.activeWidgets[3].order).toBe(3);
    });

    it('creates unique ID for new widget', () => {
      act(() => {
        useWidgetStore.getState().addWidget('news-headlines');
      });

      const state = useWidgetStore.getState();
      const newsWidget = state.activeWidgets.find(w => w.type === 'news-headlines');
      expect(newsWidget?.id).toContain('news-headlines-');
    });

    it('sets new widget as not collapsed', () => {
      act(() => {
        useWidgetStore.getState().addWidget('calendar-events');
      });

      const state = useWidgetStore.getState();
      const calendarWidget = state.activeWidgets.find(w => w.type === 'calendar-events');
      expect(calendarWidget?.isCollapsed).toBe(false);
    });

    it('can add multiple widgets of same type', async () => {
      await act(async () => {
        useWidgetStore.getState().addWidget('mini-chart');
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 2));
        useWidgetStore.getState().addWidget('mini-chart');
      });

      const state = useWidgetStore.getState();
      const miniCharts = state.activeWidgets.filter(w => w.type === 'mini-chart');
      expect(miniCharts).toHaveLength(2);
      expect(miniCharts[0].id).not.toBe(miniCharts[1].id);
    });
  });

  describe('removeWidget', () => {
    it('removes widget by id', () => {
      act(() => {
        useWidgetStore.getState().removeWidget('default-watchlist');
      });

      const state = useWidgetStore.getState();
      expect(state.activeWidgets).toHaveLength(2);
      expect(state.activeWidgets.find(w => w.id === 'default-watchlist')).toBeUndefined();
    });

    it('reorders remaining widgets after removal', () => {
      act(() => {
        useWidgetStore.getState().removeWidget('default-quick-stats');
      });

      const state = useWidgetStore.getState();
      expect(state.activeWidgets[0].order).toBe(0);
      expect(state.activeWidgets[1].order).toBe(1);
    });

    it('does nothing if widget id does not exist', () => {
      const beforeState = useWidgetStore.getState();

      act(() => {
        useWidgetStore.getState().removeWidget('nonexistent-id');
      });

      const afterState = useWidgetStore.getState();
      expect(afterState.activeWidgets).toEqual(beforeState.activeWidgets);
    });
  });

  describe('toggleCollapse', () => {
    it('collapses expanded widget', () => {
      act(() => {
        useWidgetStore.getState().toggleCollapse('default-watchlist');
      });

      const widget = useWidgetStore.getState().activeWidgets.find(w => w.id === 'default-watchlist');
      expect(widget?.isCollapsed).toBe(true);
    });

    it('expands collapsed widget', () => {
      act(() => {
        useWidgetStore.getState().toggleCollapse('default-watchlist');
        useWidgetStore.getState().toggleCollapse('default-watchlist');
      });

      const widget = useWidgetStore.getState().activeWidgets.find(w => w.id === 'default-watchlist');
      expect(widget?.isCollapsed).toBe(false);
    });

    it('only affects target widget', () => {
      act(() => {
        useWidgetStore.getState().toggleCollapse('default-watchlist');
      });

      const state = useWidgetStore.getState();
      const watchlist = state.activeWidgets.find(w => w.id === 'default-watchlist');
      const quickStats = state.activeWidgets.find(w => w.id === 'default-quick-stats');

      expect(watchlist?.isCollapsed).toBe(true);
      expect(quickStats?.isCollapsed).toBe(false);
    });

    it('does nothing if widget id does not exist', () => {
      const beforeState = useWidgetStore.getState();

      act(() => {
        useWidgetStore.getState().toggleCollapse('nonexistent-id');
      });

      const afterState = useWidgetStore.getState();
      expect(afterState.activeWidgets).toEqual(beforeState.activeWidgets);
    });
  });

  describe('reorderWidgets', () => {
    it('reorders widgets correctly', () => {
      act(() => {
        useWidgetStore.getState().reorderWidgets('default-watchlist', 'default-market-status');
      });

      const state = useWidgetStore.getState();
      expect(state.activeWidgets[0].id).toBe('default-quick-stats');
      expect(state.activeWidgets[1].id).toBe('default-market-status');
      expect(state.activeWidgets[2].id).toBe('default-watchlist');
    });

    it('updates order property after reordering', () => {
      act(() => {
        useWidgetStore.getState().reorderWidgets('default-market-status', 'default-watchlist');
      });

      const state = useWidgetStore.getState();
      state.activeWidgets.forEach((widget, index) => {
        expect(widget.order).toBe(index);
      });
    });

    it('does nothing if activeId does not exist', () => {
      const beforeState = useWidgetStore.getState();

      act(() => {
        useWidgetStore.getState().reorderWidgets('nonexistent-id', 'default-watchlist');
      });

      const afterState = useWidgetStore.getState();
      expect(afterState.activeWidgets).toEqual(beforeState.activeWidgets);
    });

    it('does nothing if overId does not exist', () => {
      const beforeState = useWidgetStore.getState();

      act(() => {
        useWidgetStore.getState().reorderWidgets('default-watchlist', 'nonexistent-id');
      });

      const afterState = useWidgetStore.getState();
      expect(afterState.activeWidgets).toEqual(beforeState.activeWidgets);
    });
  });

  describe('resetToDefaults', () => {
    it('resets to default widgets', () => {
      act(() => {
        useWidgetStore.getState().addWidget('mini-chart');
        useWidgetStore.getState().addWidget('news-headlines');
        useWidgetStore.getState().resetToDefaults();
      });

      const state = useWidgetStore.getState();
      expect(state.activeWidgets).toHaveLength(3);
      expect(state.activeWidgets.map(w => w.type)).toEqual([
        'watchlist',
        'quick-stats',
        'market-status',
      ]);
    });

    it('resets widget states', () => {
      act(() => {
        useWidgetStore.getState().toggleCollapse('default-watchlist');
        useWidgetStore.getState().resetToDefaults();
      });

      const state = useWidgetStore.getState();
      state.activeWidgets.forEach(widget => {
        expect(widget.isCollapsed).toBe(false);
      });
    });
  });
});

describe('getWidgetDefinition', () => {
  it('returns correct definition for watchlist', () => {
    const def = getWidgetDefinition('watchlist');
    expect(def.type).toBe('watchlist');
    expect(def.title).toBe('Watchlist');
    expect(def.category).toBe('market');
  });

  it('returns correct definition for quick-stats', () => {
    const def = getWidgetDefinition('quick-stats');
    expect(def.type).toBe('quick-stats');
    expect(def.title).toBe('Quick Stats');
    expect(def.category).toBe('portfolio');
  });

  it('returns correct definition for prediction-markets', () => {
    const def = getWidgetDefinition('prediction-markets');
    expect(def.type).toBe('prediction-markets');
    expect(def.title).toBe('Predictions');
    expect(def.category).toBe('predictions');
  });

  it('has icon for each widget', () => {
    Object.values(WIDGET_REGISTRY).forEach(widget => {
      expect(widget.icon).toBeDefined();
    });
  });

  it('has description for each widget', () => {
    Object.values(WIDGET_REGISTRY).forEach(widget => {
      expect(widget.description).toBeTruthy();
    });
  });
});

describe('getWidgetsByCategory', () => {
  it('returns market widgets', () => {
    const marketWidgets = getWidgetsByCategory('market');
    expect(marketWidgets.length).toBeGreaterThan(0);
    marketWidgets.forEach(widget => {
      expect(widget.category).toBe('market');
    });
  });

  it('returns portfolio widgets', () => {
    const portfolioWidgets = getWidgetsByCategory('portfolio');
    expect(portfolioWidgets.length).toBeGreaterThan(0);
    portfolioWidgets.forEach(widget => {
      expect(widget.category).toBe('portfolio');
    });
  });

  it('returns research widgets', () => {
    const researchWidgets = getWidgetsByCategory('research');
    expect(researchWidgets.length).toBeGreaterThan(0);
    researchWidgets.forEach(widget => {
      expect(widget.category).toBe('research');
    });
  });

  it('returns analysis widgets', () => {
    const analysisWidgets = getWidgetsByCategory('analysis');
    expect(analysisWidgets.length).toBeGreaterThan(0);
    analysisWidgets.forEach(widget => {
      expect(widget.category).toBe('analysis');
    });
  });

  it('returns options widgets', () => {
    const optionsWidgets = getWidgetsByCategory('options');
    expect(optionsWidgets.length).toBeGreaterThan(0);
    optionsWidgets.forEach(widget => {
      expect(widget.category).toBe('options');
    });
  });

  it('returns predictions widgets', () => {
    const predictionsWidgets = getWidgetsByCategory('predictions');
    expect(predictionsWidgets.length).toBeGreaterThan(0);
    predictionsWidgets.forEach(widget => {
      expect(widget.category).toBe('predictions');
    });
  });

  it('returns journal widgets', () => {
    const journalWidgets = getWidgetsByCategory('journal');
    expect(journalWidgets.length).toBeGreaterThan(0);
    journalWidgets.forEach(widget => {
      expect(widget.category).toBe('journal');
    });
  });
});
