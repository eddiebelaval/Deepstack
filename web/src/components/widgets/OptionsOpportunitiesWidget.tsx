'use client';

import React from 'react';
import { Activity, ExternalLink } from 'lucide-react';

/**
 * OptionsOpportunitiesWidget - Displays notable options activity
 *
 * Note: Unusual options flow data requires specialized providers like
 * FlowAlgo, BlackBox, or Cheddar Flow. Currently showing empty state.
 *
 * Future: Integrate options flow API or derive from options chain data.
 *
 * Usage:
 * <OptionsOpportunitiesWidget />
 */

export function OptionsOpportunitiesWidget() {
  // Options flow data requires specialized providers
  // Show helpful empty state with guidance

  return (
    <div className="space-y-1.5">
      <div className="text-center py-4 text-muted-foreground text-sm">
        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="mb-2">Options flow coming soon</p>
        <p className="text-xs text-muted-foreground/70">
          Unusual options activity requires premium data feeds
        </p>
        <div className="flex items-center justify-center gap-1 mt-2 text-xs text-primary/70">
          <ExternalLink className="h-3 w-3" />
          <span>Use Options Screener for now</span>
        </div>
      </div>
    </div>
  );
}

export default OptionsOpportunitiesWidget;
