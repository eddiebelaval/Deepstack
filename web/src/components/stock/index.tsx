'use client';

import React from 'react';

interface StockDeepDivePanelProps {
  className?: string;
}

export function StockDeepDivePanel({ className }: StockDeepDivePanelProps) {
  return (
    <div className={className}>
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Stock Deep Dive — coming soon
      </div>
    </div>
  );
}
