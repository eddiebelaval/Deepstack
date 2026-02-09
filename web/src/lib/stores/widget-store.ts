'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  LineChart,
  Briefcase,
  List,
  BarChart3,
  Activity,
  Newspaper,
  Calendar,
  Bell,
  Diamond,
  Shield,
  Filter,
  Calculator,
  Lightbulb,
  BookOpen,
  TrendingUp,
  Brain,
  Flame,
  EyeOff,
  Users,
  type LucideIcon,
} from 'lucide-react';

// All available widget types
export type WidgetType =
  // Market Data
  | 'mini-chart'
  | 'watchlist'
  | 'market-status'
  | 'market-summary'
  // Portfolio
  | 'positions-summary'
  | 'quick-stats'
  // Research
  | 'news-headlines'
  | 'calendar-events'
  | 'screener-picks'
  // Alerts & Analysis
  | 'alerts-active'
  | 'deep-value-picks'
  | 'hedged-summary'
  // Options
  | 'options-opportunities'
  // Prediction Markets
  | 'prediction-markets'
  // Signals (DeepSignals)
  | 'gamma-exposure'
  | 'dark-pool'
  | 'insider-trades'
  // Thesis & Journal
  | 'thesis-active'
  | 'journal-recent'
  | 'insights-latest';

// Widget category for organization
export type WidgetCategory = 'market' | 'portfolio' | 'research' | 'analysis' | 'options' | 'signals' | 'predictions' | 'journal';

// Widget definition with metadata
export interface WidgetDefinition {
  type: WidgetType;
  title: string;
  description: string;
  icon: LucideIcon;
  category: WidgetCategory;
  defaultHeight?: 'compact' | 'medium' | 'tall';
}

// Registry of all available widgets
export const WIDGET_REGISTRY: Record<WidgetType, WidgetDefinition> = {
  // Market Data Widgets
  'mini-chart': {
    type: 'mini-chart',
    title: 'Mini Chart',
    description: 'Quick price chart for selected symbol',
    icon: LineChart,
    category: 'market',
    defaultHeight: 'medium',
  },
  'watchlist': {
    type: 'watchlist',
    title: 'Watchlist',
    description: 'Track your favorite symbols',
    icon: List,
    category: 'market',
    defaultHeight: 'medium',
  },
  'market-status': {
    type: 'market-status',
    title: 'Market Status',
    description: 'Market hours and connection status',
    icon: Activity,
    category: 'market',
    defaultHeight: 'compact',
  },
  'market-summary': {
    type: 'market-summary',
    title: 'AI Market Summary',
    description: 'AI-powered market intelligence from Perplexity',
    icon: Brain,
    category: 'market',
    defaultHeight: 'medium',
  },
  // Portfolio Widgets
  'positions-summary': {
    type: 'positions-summary',
    title: 'Positions',
    description: 'Open positions summary',
    icon: Briefcase,
    category: 'portfolio',
    defaultHeight: 'medium',
  },
  'quick-stats': {
    type: 'quick-stats',
    title: 'Quick Stats',
    description: 'Portfolio value and P&L',
    icon: BarChart3,
    category: 'portfolio',
    defaultHeight: 'compact',
  },
  // Research Widgets
  'news-headlines': {
    type: 'news-headlines',
    title: 'News Headlines',
    description: 'Latest market news',
    icon: Newspaper,
    category: 'research',
    defaultHeight: 'medium',
  },
  'calendar-events': {
    type: 'calendar-events',
    title: 'Economic Calendar',
    description: 'Upcoming economic events',
    icon: Calendar,
    category: 'research',
    defaultHeight: 'medium',
  },
  'screener-picks': {
    type: 'screener-picks',
    title: 'Screener Picks',
    description: 'Top screener results',
    icon: Filter,
    category: 'research',
    defaultHeight: 'medium',
  },
  // Analysis Widgets
  'alerts-active': {
    type: 'alerts-active',
    title: 'Active Alerts',
    description: 'Price alerts and notifications',
    icon: Bell,
    category: 'analysis',
    defaultHeight: 'medium',
  },
  'deep-value-picks': {
    type: 'deep-value-picks',
    title: 'Deep Value',
    description: 'Top value investment picks',
    icon: Diamond,
    category: 'analysis',
    defaultHeight: 'medium',
  },
  'hedged-summary': {
    type: 'hedged-summary',
    title: 'Hedged Positions',
    description: 'Portfolio hedging summary',
    icon: Shield,
    category: 'analysis',
    defaultHeight: 'compact',
  },
  // Options Widgets
  'options-opportunities': {
    type: 'options-opportunities',
    title: 'Options Flow',
    description: 'Notable options activity',
    icon: Calculator,
    category: 'options',
    defaultHeight: 'medium',
  },
  // Signals Widgets (DeepSignals)
  'gamma-exposure': {
    type: 'gamma-exposure',
    title: 'Gamma Exposure',
    description: 'GEX by strike price with regime detection',
    icon: Flame,
    category: 'signals',
    defaultHeight: 'tall',
  },
  'dark-pool': {
    type: 'dark-pool',
    title: 'Dark Pool Activity',
    description: 'FINRA short volume and dark pool ratios',
    icon: EyeOff,
    category: 'signals',
    defaultHeight: 'medium',
  },
  'insider-trades': {
    type: 'insider-trades',
    title: 'Insider Trades',
    description: 'SEC Form 4 insider buying and selling',
    icon: Users,
    category: 'signals',
    defaultHeight: 'medium',
  },
  // Prediction Markets Widgets
  'prediction-markets': {
    type: 'prediction-markets',
    title: 'Predictions',
    description: 'Top prediction markets',
    icon: TrendingUp,
    category: 'predictions',
    defaultHeight: 'medium',
  },
  // Journal Widgets
  'thesis-active': {
    type: 'thesis-active',
    title: 'Active Theses',
    description: 'Your investment theses',
    icon: Lightbulb,
    category: 'journal',
    defaultHeight: 'medium',
  },
  'journal-recent': {
    type: 'journal-recent',
    title: 'Recent Journal',
    description: 'Latest journal entries',
    icon: BookOpen,
    category: 'journal',
    defaultHeight: 'medium',
  },
  'insights-latest': {
    type: 'insights-latest',
    title: 'AI Insights',
    description: 'Latest AI-generated insights',
    icon: Lightbulb,
    category: 'journal',
    defaultHeight: 'medium',
  },
};

// Active widget instance
export interface ActiveWidget {
  id: string;
  type: WidgetType;
  isCollapsed: boolean;
  order: number;
}

// Widget store state
interface WidgetState {
  // Active widgets in the panel
  activeWidgets: ActiveWidget[];

  // Actions
  addWidget: (type: WidgetType) => void;
  removeWidget: (id: string) => void;
  toggleCollapse: (id: string) => void;
  reorderWidgets: (activeId: string, overId: string) => void;
  resetToDefaults: () => void;
}

// Default widgets
const DEFAULT_WIDGETS: ActiveWidget[] = [
  { id: 'default-watchlist', type: 'watchlist', isCollapsed: false, order: 0 },
  { id: 'default-quick-stats', type: 'quick-stats', isCollapsed: false, order: 1 },
  { id: 'default-market-status', type: 'market-status', isCollapsed: false, order: 2 },
];

// Generate unique ID for new widgets
const generateWidgetId = (type: WidgetType) => `${type}-${Date.now()}`;

export const useWidgetStore = create<WidgetState>()(
  persist(
    (set, get) => ({
      activeWidgets: DEFAULT_WIDGETS,

      addWidget: (type) => {
        const { activeWidgets } = get();
        const newWidget: ActiveWidget = {
          id: generateWidgetId(type),
          type,
          isCollapsed: false,
          order: activeWidgets.length,
        };
        set({ activeWidgets: [...activeWidgets, newWidget] });
      },

      removeWidget: (id) => {
        set((state) => ({
          activeWidgets: state.activeWidgets
            .filter((w) => w.id !== id)
            .map((w, idx) => ({ ...w, order: idx })),
        }));
      },

      toggleCollapse: (id) => {
        set((state) => ({
          activeWidgets: state.activeWidgets.map((w) =>
            w.id === id ? { ...w, isCollapsed: !w.isCollapsed } : w
          ),
        }));
      },

      reorderWidgets: (activeId, overId) => {
        set((state) => {
          const oldIndex = state.activeWidgets.findIndex((w) => w.id === activeId);
          const newIndex = state.activeWidgets.findIndex((w) => w.id === overId);

          if (oldIndex === -1 || newIndex === -1) return state;

          const newWidgets = [...state.activeWidgets];
          const [removed] = newWidgets.splice(oldIndex, 1);
          newWidgets.splice(newIndex, 0, removed);

          return {
            activeWidgets: newWidgets.map((w, idx) => ({ ...w, order: idx })),
          };
        });
      },

      resetToDefaults: () => {
        set({ activeWidgets: DEFAULT_WIDGETS });
      },
    }),
    {
      name: 'deepstack-widgets',
      version: 1,
    }
  )
);

// Helper to get widget definition
export const getWidgetDefinition = (type: WidgetType): WidgetDefinition => {
  return WIDGET_REGISTRY[type];
};

// Get widgets by category
export const getWidgetsByCategory = (category: WidgetCategory): WidgetDefinition[] => {
  return Object.values(WIDGET_REGISTRY).filter((w) => w.category === category);
};

// All categories with labels
export const WIDGET_CATEGORIES: { key: WidgetCategory; label: string }[] = [
  { key: 'market', label: 'Market Data' },
  { key: 'portfolio', label: 'Portfolio' },
  { key: 'research', label: 'Research' },
  { key: 'analysis', label: 'Analysis' },
  { key: 'options', label: 'Options' },
  { key: 'signals', label: 'Signals' },
  { key: 'predictions', label: 'Predictions' },
  { key: 'journal', label: 'Journal & Insights' },
];
