import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ActiveContentType = 'chart' | 'portfolio' | 'positions' | 'analysis' | 'deep-value' | 'hedged-positions' | 'options-screener' | 'options-builder' | 'screener' | 'alerts' | 'calendar' | 'news' | 'prediction-markets' | 'thesis' | 'journal' | 'insights' | 'none';

export interface WidgetConfig {
  id: string;
  type: 'watchlist' | 'quick-stats' | 'market-status';
  title: string;
  isOpen: boolean;
}

// Market Watch Panel - Global collapsible panel at top of page
export interface MarketWatchPanelState {
  isOpen: boolean;           // Panel visible (expanded or collapsed tab)
  isExpanded: boolean;       // Panel expanded (vs collapsed to tab)
  height: number;            // Panel height when expanded (px)
}

interface UIState {
  // Main Content State
  activeContent: ActiveContentType;
  setActiveContent: (content: ActiveContentType) => void;

  // Market Watch Panel State (global, fixed at top)
  marketWatchPanel: MarketWatchPanelState;
  openMarketWatchPanel: () => void;
  closeMarketWatchPanel: () => void;
  toggleMarketWatchPanel: () => void;
  expandMarketWatchPanel: () => void;
  collapseMarketWatchPanel: () => void;
  setMarketWatchPanelHeight: (height: number) => void;

  // Chart Panel State (persistent during chat)
  chartPanelOpen: boolean;
  chartPanelCollapsed: boolean;
  chartWasOpenBeforeTool: boolean; // Track chart state before tool panel opened
  setChartPanelOpen: (isOpen: boolean) => void;
  toggleChartCollapsed: () => void;

  // Sidebar State
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setLeftSidebarOpen: (isOpen: boolean) => void;
  setRightSidebarOpen: (isOpen: boolean) => void;

  // Profile & Settings State
  profileOpen: boolean;
  settingsOpen: boolean;
  toggleProfile: () => void;
  toggleSettings: () => void;
  setProfileOpen: (isOpen: boolean) => void;
  setSettingsOpen: (isOpen: boolean) => void;

  // Widget State
  widgets: WidgetConfig[];
  toggleWidget: (id: string) => void;

  // Usage / Paywall State
  credits: number;
  setCredits: (credits: number) => void;
  paywallOpen: boolean;
  setPaywallOpen: (isOpen: boolean) => void;
}

// Constants for Market Watch Panel
const MARKET_WATCH_PANEL_DEFAULT_HEIGHT = 480; // Default height in px
const MARKET_WATCH_PANEL_MIN_HEIGHT = 200;
const MARKET_WATCH_PANEL_MAX_HEIGHT = 800;

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Initial State
      activeContent: 'none',

      // Market Watch Panel - starts collapsed as a tab
      marketWatchPanel: {
        isOpen: true,       // Visible (as collapsed tab or expanded)
        isExpanded: false,  // Starts collapsed
        height: MARKET_WATCH_PANEL_DEFAULT_HEIGHT,
      },

      chartPanelOpen: true, // Chart visible by default
      chartPanelCollapsed: false, // Not collapsed by default
      chartWasOpenBeforeTool: true, // Track for restore when tool closes
      leftSidebarOpen: false, // Collapsed by default as per spec
      rightSidebarOpen: true, // Visible by default as per spec
      profileOpen: false,
      settingsOpen: false,
      widgets: [
        { id: 'watchlist', type: 'watchlist', title: 'Watchlist', isOpen: true },
        { id: 'quick-stats', type: 'quick-stats', title: 'Quick Stats', isOpen: true },
        { id: 'market-status', type: 'market-status', title: 'Market Status', isOpen: true },
      ],
      credits: 500, // Default optimistic start, updated by DB
      paywallOpen: false,

      // Actions
      // Smart chart persistence: when a tool opens, hide chart; when returning to 'none', restore chart
      setActiveContent: (content) => set((state) => {
        const wasNone = state.activeContent === 'none';
        const isNone = content === 'none';

        // Opening a tool (transitioning from 'none' to something else)
        if (wasNone && !isNone && content !== 'chart') {
          return {
            activeContent: content,
            chartWasOpenBeforeTool: state.chartPanelOpen, // Save current chart state
            chartPanelCollapsed: true, // Collapse chart when tool opens (not fully hide)
          };
        }

        // Closing a tool (transitioning back to 'none')
        if (!wasNone && isNone) {
          return {
            activeContent: content,
            chartPanelCollapsed: !state.chartWasOpenBeforeTool, // Restore to previous state (collapsed = !open)
          };
        }

        // Switching between tools or to 'chart' explicitly
        return { activeContent: content };
      }),

      // Market Watch Panel Actions
      openMarketWatchPanel: () => set((state) => ({
        marketWatchPanel: { ...state.marketWatchPanel, isOpen: true, isExpanded: true }
      })),
      closeMarketWatchPanel: () => set((state) => ({
        marketWatchPanel: { ...state.marketWatchPanel, isOpen: false, isExpanded: false }
      })),
      toggleMarketWatchPanel: () => set((state) => ({
        marketWatchPanel: {
          ...state.marketWatchPanel,
          isExpanded: !state.marketWatchPanel.isExpanded
        }
      })),
      expandMarketWatchPanel: () => set((state) => ({
        marketWatchPanel: { ...state.marketWatchPanel, isExpanded: true }
      })),
      collapseMarketWatchPanel: () => set((state) => ({
        marketWatchPanel: { ...state.marketWatchPanel, isExpanded: false }
      })),
      setMarketWatchPanelHeight: (height) => set((state) => ({
        marketWatchPanel: {
          ...state.marketWatchPanel,
          height: Math.min(Math.max(height, MARKET_WATCH_PANEL_MIN_HEIGHT), MARKET_WATCH_PANEL_MAX_HEIGHT)
        }
      })),

      setChartPanelOpen: (isOpen) => set({ chartPanelOpen: isOpen }),
      toggleChartCollapsed: () => set((state) => ({ chartPanelCollapsed: !state.chartPanelCollapsed })),


      toggleLeftSidebar: () => set((state) => ({ leftSidebarOpen: !state.leftSidebarOpen })),
      toggleRightSidebar: () => set((state) => ({ rightSidebarOpen: !state.rightSidebarOpen })),
      setLeftSidebarOpen: (isOpen) => set({ leftSidebarOpen: isOpen }),
      setRightSidebarOpen: (isOpen) => set({ rightSidebarOpen: isOpen }),

      toggleProfile: () => set((state) => ({
        profileOpen: !state.profileOpen,
        settingsOpen: false // Close settings when opening profile
      })),
      toggleSettings: () => set((state) => ({
        settingsOpen: !state.settingsOpen,
        profileOpen: false // Close profile when opening settings
      })),
      setProfileOpen: (isOpen) => set({ profileOpen: isOpen }),
      setSettingsOpen: (isOpen) => set({ settingsOpen: isOpen }),

      toggleWidget: (id) => set((state) => ({
        widgets: state.widgets.map((w) =>
          w.id === id ? { ...w, isOpen: !w.isOpen } : w
        ),
      })),

      setCredits: (credits) => set({ credits }),
      setPaywallOpen: (isOpen) => set({ paywallOpen: isOpen }),
    }),
    {
      name: 'deepstack-ui-storage',
      partialize: (state) => ({
        // Persist sidebar states and widgets
        leftSidebarOpen: state.leftSidebarOpen,
        rightSidebarOpen: state.rightSidebarOpen,
        profileOpen: state.profileOpen,
        settingsOpen: state.settingsOpen,
        widgets: state.widgets,
        // Persist Market Watch Panel state
        marketWatchPanel: state.marketWatchPanel,
      }),
    }
  )
);
