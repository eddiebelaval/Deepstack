'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useUIStore, ActiveContentType } from '@/lib/stores/ui-store';
import { useHaptics } from '@/hooks/useHaptics';
import {
  LineChart,
  Briefcase,
  Newspaper,
  Calendar,
  BarChart3,
  Bell,
  Diamond,
  Shield,
  Filter,
  Calculator,
  Plus,
  X,
  MoreHorizontal,
  ChevronUp,
  Sparkles,
} from 'lucide-react';

type ToolItem = {
  id: ActiveContentType;
  icon: React.ElementType;
  label: string;
  color?: string;
};

// Quick access tools (shown in collapsed state)
const QUICK_TOOLS: ToolItem[] = [
  { id: 'chart', icon: LineChart, label: 'Chart', color: 'text-blue-400' },
  { id: 'portfolio', icon: Briefcase, label: 'Portfolio', color: 'text-green-400' },
  { id: 'news', icon: Newspaper, label: 'News', color: 'text-amber-400' },
];

// All available tools (shown when expanded)
const ALL_TOOLS: ToolItem[] = [
  { id: 'chart', icon: LineChart, label: 'Chart', color: 'text-blue-400' },
  { id: 'portfolio', icon: Briefcase, label: 'Portfolio', color: 'text-green-400' },
  { id: 'news', icon: Newspaper, label: 'News', color: 'text-amber-400' },
  { id: 'calendar', icon: Calendar, label: 'Calendar', color: 'text-purple-400' },
  { id: 'screener', icon: BarChart3, label: 'Screener', color: 'text-cyan-400' },
  { id: 'alerts', icon: Bell, label: 'Alerts', color: 'text-red-400' },
  { id: 'deep-value', icon: Diamond, label: 'Deep Value', color: 'text-pink-400' },
  { id: 'hedged-positions', icon: Shield, label: 'Hedged', color: 'text-teal-400' },
  { id: 'options-screener', icon: Filter, label: 'Options', color: 'text-orange-400' },
  { id: 'options-builder', icon: Calculator, label: 'Builder', color: 'text-indigo-400' },
  { id: 'prediction-markets', icon: Sparkles, label: 'Markets', color: 'text-yellow-400' },
];

interface FloatingToolbarProps {
  className?: string;
}

/**
 * Floating Toolbar
 *
 * A modern floating action bar that provides quick access to trading tools.
 * Replaces the traditional bottom navigation with a more flexible, floating design.
 */
export function FloatingToolbar({ className }: FloatingToolbarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { activeContent, setActiveContent } = useUIStore();
  const { light, selection } = useHaptics();

  const handleToolClick = (toolId: ActiveContentType) => {
    selection();

    if (activeContent === toolId) {
      // Toggle off if already active
      setActiveContent('none');
    } else {
      setActiveContent(toolId);
    }

    // Close expanded menu after selection
    if (isExpanded) {
      setIsExpanded(false);
    }
  };

  const toggleExpanded = () => {
    light();
    setIsExpanded(!isExpanded);
  };

  const isActive = (id: ActiveContentType) => activeContent === id;

  return (
    <>
      {/* Backdrop when expanded */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={() => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>

      {/* Floating Toolbar */}
      <motion.div
        className={cn(
          "absolute bottom-6 left-1/2 -translate-x-1/2 z-50 safe-area-bottom",
          className
        )}
        layout
      >
        <AnimatePresence mode="wait">
          {isExpanded ? (
            /* Expanded State - Full tool grid */
            <motion.div
              key="expanded"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="bg-sidebar/95 backdrop-blur-xl border border-sidebar-border rounded-3xl p-4 shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-sm font-medium text-muted-foreground">Tools</span>
                <button
                  onClick={toggleExpanded}
                  className="p-1.5 rounded-full hover:bg-muted/50 transition-colors tap-target"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Tool Grid */}
              <div className="grid grid-cols-4 gap-2 min-w-[280px]">
                {ALL_TOOLS.map((tool) => (
                  <motion.button
                    key={tool.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleToolClick(tool.id)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-2xl transition-colors tap-target",
                      isActive(tool.id)
                        ? "bg-primary/20 ring-1 ring-primary/50"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <tool.icon
                      className={cn(
                        "h-5 w-5",
                        isActive(tool.id) ? "text-primary" : tool.color || "text-muted-foreground"
                      )}
                    />
                    <span className={cn(
                      "text-[10px] font-medium",
                      isActive(tool.id) ? "text-primary" : "text-muted-foreground"
                    )}>
                      {tool.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            /* Collapsed State - Pill with quick actions */
            <motion.div
              key="collapsed"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="flex items-center gap-1 bg-sidebar/95 backdrop-blur-xl border border-sidebar-border rounded-full px-2 py-2 shadow-2xl"
            >
              {/* Quick Tools */}
              {QUICK_TOOLS.map((tool) => (
                <motion.button
                  key={tool.id}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleToolClick(tool.id)}
                  className={cn(
                    "p-2.5 rounded-full transition-colors tap-target",
                    isActive(tool.id)
                      ? "bg-primary/20"
                      : "hover:bg-muted/50"
                  )}
                >
                  <tool.icon
                    className={cn(
                      "h-5 w-5",
                      isActive(tool.id) ? "text-primary" : tool.color || "text-muted-foreground"
                    )}
                  />
                </motion.button>
              ))}

              {/* Divider */}
              <div className="w-px h-6 bg-sidebar-border mx-1" />

              {/* Expand Button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={toggleExpanded}
                className="p-2.5 rounded-full hover:bg-muted/50 transition-colors tap-target"
              >
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
