'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Bell, TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * AlertsActiveWidget - Active price alerts widget
 *
 * Features:
 * - Shows count + top 3 active alerts
 * - Symbol, target price, alert type (above/below)
 * - Compact alert overview
 * - Height: ~120px
 *
 * Usage:
 * <AlertsActiveWidget alerts={alerts} />
 */

export type AlertType = 'above' | 'below';

export interface PriceAlertData {
  id: string;
  symbol: string;
  targetPrice: number;
  type: AlertType;
  currentPrice?: number;
}

interface AlertsActiveWidgetProps {
  alerts?: PriceAlertData[];
  className?: string;
}

// Mock alerts for demo - replace with real alert data
const MOCK_ALERTS: PriceAlertData[] = [
  {
    id: '1',
    symbol: 'AAPL',
    targetPrice: 195.00,
    type: 'above',
    currentPrice: 189.50,
  },
  {
    id: '2',
    symbol: 'NVDA',
    targetPrice: 480.00,
    type: 'below',
    currentPrice: 495.75,
  },
  {
    id: '3',
    symbol: 'TSLA',
    targetPrice: 250.00,
    type: 'above',
    currentPrice: 242.30,
  },
  {
    id: '4',
    symbol: 'SPY',
    targetPrice: 450.00,
    type: 'below',
    currentPrice: 465.20,
  },
];

export function AlertsActiveWidget({
  alerts = MOCK_ALERTS,
  className
}: AlertsActiveWidgetProps) {
  // Show top 3 alerts
  const topAlerts = alerts.slice(0, 3);

  // Calculate distance to target
  const getDistancePercent = (alert: PriceAlertData): number => {
    if (!alert.currentPrice) return 0;
    const diff = alert.targetPrice - alert.currentPrice;
    return (diff / alert.currentPrice) * 100;
  };

  return (
    <div
      className={cn(
        'glass-surface rounded-2xl p-3 flex flex-col gap-2',
        className
      )}
      style={{ minHeight: '120px' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium text-muted-foreground">
          Price Alerts
        </span>
        <Badge
          variant="outline"
          className="ml-auto text-[10px] px-1.5 py-0"
        >
          {alerts.length} active
        </Badge>
      </div>

      {/* Alerts List */}
      <div className="space-y-1.5">
        {topAlerts.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-2">
            No active alerts
          </div>
        ) : (
          topAlerts.map((alert) => {
            const distancePercent = getDistancePercent(alert);
            const isClose = Math.abs(distancePercent) < 3; // Within 3%

            return (
              <div
                key={alert.id}
                className={cn(
                  'flex items-center justify-between py-1.5 px-2 rounded-lg transition-colors',
                  isClose
                    ? 'bg-yellow-500/10 hover:bg-yellow-500/20'
                    : 'hover:bg-muted/30'
                )}
              >
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-sm font-medium">{alert.symbol}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[9px] px-1.5 py-0 gap-0.5',
                      alert.type === 'above'
                        ? 'text-green-500 border-green-500/30 bg-green-500/10'
                        : 'text-red-500 border-red-500/30 bg-red-500/10'
                    )}
                  >
                    {alert.type === 'above' ? (
                      <TrendingUp className="h-2.5 w-2.5" />
                    ) : (
                      <TrendingDown className="h-2.5 w-2.5" />
                    )}
                    {alert.type}
                  </Badge>
                </div>

                <div className="flex flex-col items-end">
                  <span className="text-xs font-mono font-medium">
                    ${alert.targetPrice.toFixed(2)}
                  </span>
                  {alert.currentPrice && (
                    <span
                      className={cn(
                        'text-[10px] font-mono',
                        isClose ? 'text-yellow-500 font-medium' : 'text-muted-foreground'
                      )}
                    >
                      {distancePercent > 0 ? '+' : ''}
                      {distancePercent.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* See All Link */}
      {alerts.length > 3 && (
        <div className="pt-1 border-t border-border">
          <button className="text-xs text-primary hover:underline w-full text-center">
            +{alerts.length - 3} more alerts
          </button>
        </div>
      )}
    </div>
  );
}

export default AlertsActiveWidget;
