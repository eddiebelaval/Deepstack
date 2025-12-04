import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ActiveContentType = 'chart' | 'portfolio' | 'orders' | 'analysis' | 'deep-value' | 'hedged-positions' | 'options-screener' | 'options-builder' | 'none';

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

  // Sidebar State
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setLeftSidebarOpen: (isOpen: boolean) => void;
  setRightSidebarOpen: (isOpen: boolean) => void;

  // Widget State
  widgets: WidgetConfig[];
  toggleWidget: (id: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Initial State
      activeContent: 'none',
      leftSidebarOpen: false, // Collapsed by default as per spec
      rightSidebarOpen: true, // Visible by default as per spec
      widgets: [
        { id: 'watchlist', type: 'watchlist', title: 'Watchlist', isOpen: true },
        { id: 'quick-stats', type: 'quick-stats', title: 'Quick Stats', isOpen: true },
        { id: 'market-status', type: 'market-status', title: 'Market Status', isOpen: true },
      ],

      // Actions
      setActiveContent: (content) => set({ activeContent: content }),

      toggleLeftSidebar: () => set((state) => ({ leftSidebarOpen: !state.leftSidebarOpen })),
      toggleRightSidebar: () => set((state) => ({ rightSidebarOpen: !state.rightSidebarOpen })),
      setLeftSidebarOpen: (isOpen) => set({ leftSidebarOpen: isOpen }),
      setRightSidebarOpen: (isOpen) => set({ rightSidebarOpen: isOpen }),

      toggleWidget: (id) => set((state) => ({
        widgets: state.widgets.map((w) =>
          w.id === id ? { ...w, isOpen: !w.isOpen } : w
        ),
      })),
    }),
    {
      name: 'deepstack-ui-storage',
      partialize: (state) => ({
        // Persist sidebar states and widgets
        leftSidebarOpen: state.leftSidebarOpen,
        rightSidebarOpen: state.rightSidebarOpen,
        widgets: state.widgets,
      }),
    }
  )
);
