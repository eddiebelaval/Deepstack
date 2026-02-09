'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Activity, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface FlowAlert {
  id: string;
  symbol: string;
  option_type: 'call' | 'put';
  strike: number;
  expiration: string;
  volume: number;
  open_interest: number;
  estimated_premium: number;
  alert_type: string;
}

interface OptionsOpportunitiesWidgetProps {
  className?: string;
}

const REFRESH_INTERVAL = 60_000; // 60 seconds

function formatPremium(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function formatVolOI(volume: number, oi: number): string {
  return `${volume.toLocaleString()}/${oi.toLocaleString()}`;
}

export function OptionsOpportunitiesWidget({
  className,
}: OptionsOpportunitiesWidgetProps) {
  const [alerts, setAlerts] = useState<FlowAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFlow = useCallback(async () => {
    try {
      const res = await fetch('/api/signals/flow?limit=10');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const items: FlowAlert[] = (data.alerts || data || [])
        .map((a: any, idx: number) => ({
          id: a.id || `flow-${idx}`,
          symbol: a.symbol || '',
          option_type: a.option_type || 'call',
          strike: a.strike ?? 0,
          expiration: a.expiration || '',
          volume: a.volume ?? 0,
          open_interest: a.open_interest ?? 0,
          estimated_premium: a.estimated_premium ?? 0,
          alert_type: a.alert_type || 'sweep',
        }))
        .sort(
          (a: FlowAlert, b: FlowAlert) =>
            b.estimated_premium - a.estimated_premium
        );

      setAlerts(items);
      setError(null);
    } catch (err) {
      console.error('Options flow fetch error:', err);
      setError('Failed to load flow data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlow();
    const interval = setInterval(fetchFlow, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchFlow]);

  return (
    <div
      className={cn(
        'glass-surface rounded-2xl p-3 flex flex-col gap-2',
        className
      )}
      style={{ minHeight: '140px' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium text-muted-foreground">
          Options Flow
        </span>
        {alerts.length > 0 && (
          <Badge
            variant="outline"
            className="ml-auto text-[10px] px-1.5 py-0"
          >
            {alerts.length} alerts
          </Badge>
        )}
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-2 py-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-6 bg-muted/30 rounded animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <div className="text-xs text-muted-foreground text-center py-4">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && alerts.length === 0 && (
        <div className="text-center py-4 text-muted-foreground text-sm">
          <Activity className="h-6 w-6 mx-auto mb-1.5 opacity-50" />
          <p className="text-xs">No unusual activity detected</p>
        </div>
      )}

      {/* Flow table */}
      {!isLoading && !error && alerts.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] text-muted-foreground border-b border-border/50">
                <th className="text-left py-1 font-medium">Symbol</th>
                <th className="text-left py-1 font-medium">Type</th>
                <th className="text-right py-1 font-medium">Strike</th>
                <th className="text-right py-1 font-medium">Vol/OI</th>
                <th className="text-right py-1 font-medium">Premium</th>
                <th className="text-right py-1 font-medium">Alert</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => {
                const isCall = alert.option_type === 'call';
                return (
                  <tr
                    key={alert.id}
                    className={cn(
                      'border-l-2 hover:bg-muted/20 transition-colors',
                      isCall
                        ? 'border-l-green-500/50'
                        : 'border-l-red-500/50'
                    )}
                  >
                    <td className="py-1.5 pl-2 font-medium">
                      {alert.symbol}
                    </td>
                    <td className="py-1.5">
                      <span
                        className={cn(
                          'text-[10px] font-medium',
                          isCall ? 'text-green-500' : 'text-red-500'
                        )}
                      >
                        {isCall ? 'Call' : 'Put'}
                      </span>
                    </td>
                    <td className="py-1.5 text-right font-mono">
                      ${alert.strike.toFixed(0)}
                    </td>
                    <td className="py-1.5 text-right font-mono text-muted-foreground">
                      {formatVolOI(alert.volume, alert.open_interest)}
                    </td>
                    <td className="py-1.5 text-right font-mono font-medium">
                      {formatPremium(alert.estimated_premium)}
                    </td>
                    <td className="py-1.5 text-right">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[9px] px-1.5 py-0',
                          alert.alert_type === 'sweep'
                            ? 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10'
                            : alert.alert_type === 'block'
                              ? 'text-blue-500 border-blue-500/30 bg-blue-500/10'
                              : 'text-muted-foreground border-border'
                        )}
                      >
                        {alert.alert_type}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default OptionsOpportunitiesWidget;
