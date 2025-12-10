import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../ui-store';
import { act } from '@testing-library/react';

describe('useUIStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    act(() => {
      useUIStore.setState({
        activeContent: 'none',
        marketWatchPanel: {
          isOpen: true,
          isExpanded: false,
          height: 480,
        },
        chartPanelOpen: true,
        chartPanelCollapsed: false,
        chartWasOpenBeforeTool: true,
        leftSidebarOpen: false,
        rightSidebarOpen: true,
        profileOpen: false,
        settingsOpen: false,
        widgets: [
          { id: 'watchlist', type: 'watchlist', title: 'Watchlist', isOpen: true },
          { id: 'quick-stats', type: 'quick-stats', title: 'Quick Stats', isOpen: true },
          { id: 'market-status', type: 'market-status', title: 'Market Status', isOpen: true },
        ],
        credits: 500,
        paywallOpen: false,
      });
    });
  });

  describe('initial state', () => {
    it('has no active content', () => {
      const state = useUIStore.getState();
      expect(state.activeContent).toBe('none');
    });

    it('has market watch panel collapsed by default', () => {
      const state = useUIStore.getState();
      expect(state.marketWatchPanel.isOpen).toBe(true);
      expect(state.marketWatchPanel.isExpanded).toBe(false);
    });

    it('has chart panel open by default', () => {
      const state = useUIStore.getState();
      expect(state.chartPanelOpen).toBe(true);
      expect(state.chartPanelCollapsed).toBe(false);
    });

    it('has left sidebar collapsed', () => {
      const state = useUIStore.getState();
      expect(state.leftSidebarOpen).toBe(false);
    });

    it('has right sidebar open', () => {
      const state = useUIStore.getState();
      expect(state.rightSidebarOpen).toBe(true);
    });

    it('has profile closed', () => {
      const state = useUIStore.getState();
      expect(state.profileOpen).toBe(false);
    });

    it('has settings closed', () => {
      const state = useUIStore.getState();
      expect(state.settingsOpen).toBe(false);
    });

    it('has default widgets', () => {
      const state = useUIStore.getState();
      expect(state.widgets).toHaveLength(3);
      expect(state.widgets.map((w) => w.id)).toEqual([
        'watchlist',
        'quick-stats',
        'market-status',
      ]);
    });

    it('has default credits', () => {
      const state = useUIStore.getState();
      expect(state.credits).toBe(500);
    });

    it('has paywall closed', () => {
      const state = useUIStore.getState();
      expect(state.paywallOpen).toBe(false);
    });
  });

  describe('active content management', () => {
    describe('setActiveContent', () => {
      it('sets active content type', () => {
        act(() => {
          useUIStore.getState().setActiveContent('portfolio');
        });

        expect(useUIStore.getState().activeContent).toBe('portfolio');
      });

      it('collapses chart when opening tool from none', () => {
        act(() => {
          useUIStore.getState().setActiveContent('none');
          useUIStore.getState().setActiveContent('analysis');
        });

        const state = useUIStore.getState();
        expect(state.chartPanelCollapsed).toBe(true);
        expect(state.activeContent).toBe('analysis');
      });

      it('saves chart state when opening tool', () => {
        act(() => {
          useUIStore.getState().setChartPanelOpen(true);
          useUIStore.getState().setActiveContent('none');
          useUIStore.getState().setActiveContent('screener');
        });

        expect(useUIStore.getState().chartWasOpenBeforeTool).toBe(true);
      });

      it('restores chart state when returning to none', () => {
        act(() => {
          useUIStore.getState().setChartPanelOpen(true);
          useUIStore.getState().setActiveContent('none');
          useUIStore.getState().setActiveContent('alerts');
          useUIStore.getState().setActiveContent('none');
        });

        expect(useUIStore.getState().chartPanelCollapsed).toBe(false);
      });

      it('does not collapse chart when switching between tools', () => {
        act(() => {
          useUIStore.getState().setActiveContent('portfolio');
          useUIStore.getState().setActiveContent('positions');
        });

        expect(useUIStore.getState().activeContent).toBe('positions');
      });

      it('handles chart as active content', () => {
        act(() => {
          useUIStore.getState().setActiveContent('chart');
        });

        expect(useUIStore.getState().activeContent).toBe('chart');
      });
    });
  });

  describe('market watch panel', () => {
    describe('openMarketWatchPanel', () => {
      it('opens and expands panel', () => {
        act(() => {
          useUIStore.getState().closeMarketWatchPanel();
          useUIStore.getState().openMarketWatchPanel();
        });

        const panel = useUIStore.getState().marketWatchPanel;
        expect(panel.isOpen).toBe(true);
        expect(panel.isExpanded).toBe(true);
      });
    });

    describe('closeMarketWatchPanel', () => {
      it('closes panel completely', () => {
        act(() => {
          useUIStore.getState().closeMarketWatchPanel();
        });

        const panel = useUIStore.getState().marketWatchPanel;
        expect(panel.isOpen).toBe(false);
        expect(panel.isExpanded).toBe(false);
      });
    });

    describe('toggleMarketWatchPanel', () => {
      it('toggles expanded state', () => {
        act(() => {
          useUIStore.getState().toggleMarketWatchPanel();
        });

        expect(useUIStore.getState().marketWatchPanel.isExpanded).toBe(true);

        act(() => {
          useUIStore.getState().toggleMarketWatchPanel();
        });

        expect(useUIStore.getState().marketWatchPanel.isExpanded).toBe(false);
      });
    });

    describe('expandMarketWatchPanel', () => {
      it('expands panel', () => {
        act(() => {
          useUIStore.getState().collapseMarketWatchPanel();
          useUIStore.getState().expandMarketWatchPanel();
        });

        expect(useUIStore.getState().marketWatchPanel.isExpanded).toBe(true);
      });
    });

    describe('collapseMarketWatchPanel', () => {
      it('collapses panel', () => {
        act(() => {
          useUIStore.getState().expandMarketWatchPanel();
          useUIStore.getState().collapseMarketWatchPanel();
        });

        expect(useUIStore.getState().marketWatchPanel.isExpanded).toBe(false);
      });
    });

    describe('setMarketWatchPanelHeight', () => {
      it('sets panel height', () => {
        act(() => {
          useUIStore.getState().setMarketWatchPanelHeight(600);
        });

        expect(useUIStore.getState().marketWatchPanel.height).toBe(600);
      });

      it('enforces minimum height', () => {
        act(() => {
          useUIStore.getState().setMarketWatchPanelHeight(100);
        });

        expect(useUIStore.getState().marketWatchPanel.height).toBe(200);
      });

      it('enforces maximum height', () => {
        act(() => {
          useUIStore.getState().setMarketWatchPanelHeight(1000);
        });

        expect(useUIStore.getState().marketWatchPanel.height).toBe(800);
      });

      it('allows height within range', () => {
        act(() => {
          useUIStore.getState().setMarketWatchPanelHeight(400);
        });

        expect(useUIStore.getState().marketWatchPanel.height).toBe(400);
      });
    });
  });

  describe('chart panel', () => {
    describe('setChartPanelOpen', () => {
      it('opens chart panel', () => {
        act(() => {
          useUIStore.getState().setChartPanelOpen(true);
        });

        expect(useUIStore.getState().chartPanelOpen).toBe(true);
      });

      it('closes chart panel', () => {
        act(() => {
          useUIStore.getState().setChartPanelOpen(false);
        });

        expect(useUIStore.getState().chartPanelOpen).toBe(false);
      });
    });

    describe('toggleChartCollapsed', () => {
      it('toggles collapsed state', () => {
        act(() => {
          useUIStore.getState().toggleChartCollapsed();
        });

        expect(useUIStore.getState().chartPanelCollapsed).toBe(true);

        act(() => {
          useUIStore.getState().toggleChartCollapsed();
        });

        expect(useUIStore.getState().chartPanelCollapsed).toBe(false);
      });
    });
  });

  describe('sidebar management', () => {
    describe('left sidebar', () => {
      it('toggles left sidebar', () => {
        act(() => {
          useUIStore.getState().toggleLeftSidebar();
        });

        expect(useUIStore.getState().leftSidebarOpen).toBe(true);

        act(() => {
          useUIStore.getState().toggleLeftSidebar();
        });

        expect(useUIStore.getState().leftSidebarOpen).toBe(false);
      });

      it('sets left sidebar open', () => {
        act(() => {
          useUIStore.getState().setLeftSidebarOpen(true);
        });

        expect(useUIStore.getState().leftSidebarOpen).toBe(true);
      });

      it('sets left sidebar closed', () => {
        act(() => {
          useUIStore.getState().setLeftSidebarOpen(false);
        });

        expect(useUIStore.getState().leftSidebarOpen).toBe(false);
      });
    });

    describe('right sidebar', () => {
      it('toggles right sidebar', () => {
        act(() => {
          useUIStore.getState().toggleRightSidebar();
        });

        expect(useUIStore.getState().rightSidebarOpen).toBe(false);

        act(() => {
          useUIStore.getState().toggleRightSidebar();
        });

        expect(useUIStore.getState().rightSidebarOpen).toBe(true);
      });

      it('sets right sidebar open', () => {
        act(() => {
          useUIStore.getState().setRightSidebarOpen(true);
        });

        expect(useUIStore.getState().rightSidebarOpen).toBe(true);
      });

      it('sets right sidebar closed', () => {
        act(() => {
          useUIStore.getState().setRightSidebarOpen(false);
        });

        expect(useUIStore.getState().rightSidebarOpen).toBe(false);
      });
    });
  });

  describe('profile and settings', () => {
    describe('toggleProfile', () => {
      it('toggles profile open', () => {
        act(() => {
          useUIStore.getState().toggleProfile();
        });

        expect(useUIStore.getState().profileOpen).toBe(true);
      });

      it('closes settings when opening profile', () => {
        act(() => {
          useUIStore.getState().toggleSettings();
          useUIStore.getState().toggleProfile();
        });

        const state = useUIStore.getState();
        expect(state.profileOpen).toBe(true);
        expect(state.settingsOpen).toBe(false);
      });
    });

    describe('toggleSettings', () => {
      it('toggles settings open', () => {
        act(() => {
          useUIStore.getState().toggleSettings();
        });

        expect(useUIStore.getState().settingsOpen).toBe(true);
      });

      it('closes profile when opening settings', () => {
        act(() => {
          useUIStore.getState().toggleProfile();
          useUIStore.getState().toggleSettings();
        });

        const state = useUIStore.getState();
        expect(state.settingsOpen).toBe(true);
        expect(state.profileOpen).toBe(false);
      });
    });

    describe('setProfileOpen', () => {
      it('opens profile', () => {
        act(() => {
          useUIStore.getState().setProfileOpen(true);
        });

        expect(useUIStore.getState().profileOpen).toBe(true);
      });

      it('closes profile', () => {
        act(() => {
          useUIStore.getState().setProfileOpen(false);
        });

        expect(useUIStore.getState().profileOpen).toBe(false);
      });
    });

    describe('setSettingsOpen', () => {
      it('opens settings', () => {
        act(() => {
          useUIStore.getState().setSettingsOpen(true);
        });

        expect(useUIStore.getState().settingsOpen).toBe(true);
      });

      it('closes settings', () => {
        act(() => {
          useUIStore.getState().setSettingsOpen(false);
        });

        expect(useUIStore.getState().settingsOpen).toBe(false);
      });
    });
  });

  describe('widget management', () => {
    describe('toggleWidget', () => {
      it('toggles widget open state', () => {
        act(() => {
          useUIStore.getState().toggleWidget('watchlist');
        });

        const widget = useUIStore
          .getState()
          .widgets.find((w) => w.id === 'watchlist');
        expect(widget?.isOpen).toBe(false);
      });

      it('toggles widget back to open', () => {
        act(() => {
          useUIStore.getState().toggleWidget('quick-stats');
          useUIStore.getState().toggleWidget('quick-stats');
        });

        const widget = useUIStore
          .getState()
          .widgets.find((w) => w.id === 'quick-stats');
        expect(widget?.isOpen).toBe(true);
      });

      it('only affects target widget', () => {
        act(() => {
          useUIStore.getState().toggleWidget('watchlist');
        });

        const widgets = useUIStore.getState().widgets;
        const watchlist = widgets.find((w) => w.id === 'watchlist');
        const quickStats = widgets.find((w) => w.id === 'quick-stats');

        expect(watchlist?.isOpen).toBe(false);
        expect(quickStats?.isOpen).toBe(true);
      });

      it('does nothing for non-existent widget', () => {
        const originalWidgets = useUIStore.getState().widgets;

        act(() => {
          useUIStore.getState().toggleWidget('nonexistent');
        });

        expect(useUIStore.getState().widgets).toEqual(originalWidgets);
      });
    });
  });

  describe('credits and paywall', () => {
    describe('setCredits', () => {
      it('updates credit count', () => {
        act(() => {
          useUIStore.getState().setCredits(1000);
        });

        expect(useUIStore.getState().credits).toBe(1000);
      });

      it('can set credits to zero', () => {
        act(() => {
          useUIStore.getState().setCredits(0);
        });

        expect(useUIStore.getState().credits).toBe(0);
      });

      it('can decrease credits', () => {
        act(() => {
          useUIStore.getState().setCredits(500);
          useUIStore.getState().setCredits(250);
        });

        expect(useUIStore.getState().credits).toBe(250);
      });
    });

    describe('setPaywallOpen', () => {
      it('opens paywall', () => {
        act(() => {
          useUIStore.getState().setPaywallOpen(true);
        });

        expect(useUIStore.getState().paywallOpen).toBe(true);
      });

      it('closes paywall', () => {
        act(() => {
          useUIStore.getState().setPaywallOpen(true);
          useUIStore.getState().setPaywallOpen(false);
        });

        expect(useUIStore.getState().paywallOpen).toBe(false);
      });
    });
  });
});
