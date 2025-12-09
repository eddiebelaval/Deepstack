import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ActiveContentType = 'chart' | 'portfolio' | 'orders' | 'analysis' | 'deep-value' | 'hedged-positions' | 'options-screener' | 'options-builder' | 'screener' | 'alerts' | 'calendar' | 'news' | 'prediction-markets' | 'none';

export interface WidgetConfig {
  id: string;
  type: 'watchlist' | 'quick-stats' | 'market-status';
  title: string;
  isOpen: boolean;
}

interface UIState {
  // Main Content State
  activeContent: ActiveContentType;
  setActiveContent: (content: ActiveContentType) => void;

  // Chart Panel State (persistent during chat)
  chartPanelOpen: boolean;
  chartPanelCollapsed: boolean;
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

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Initial State
      activeContent: 'none',
      chartPanelOpen: true, // Chart visible by default
      chartPanelCollapsed: false, // Not collapsed by default
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
      setActiveContent: (content) => set({ activeContent: content }),
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
      }),
    }
  )
);
