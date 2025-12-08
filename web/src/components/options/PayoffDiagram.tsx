'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { createChart, IChartApi, ISeriesApi, LineSeries, AreaSeries, LineData, ColorType, UTCTimestamp } from 'lightweight-charts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StrategyCalculation } from '@/lib/types/options';
import { cn } from '@/lib/utils';

interface PayoffDiagramProps {
  calculation: StrategyCalculation | null;
  underlyingPrice: number;
  className?: string;
  showGreeks?: boolean;
}

export function PayoffDiagram({
  calculation,
  underlyingPrice,
  className,
  showGreeks = false,
}: PayoffDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const expirationSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const currentSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const zeroLineRef = useRef<ISeriesApi<'Line'> | null>(null);

  // Convert P&L points to chart data
  const chartData = useMemo(() => {
    if (!calculation) return { expiration: [], current: [], zeroLine: [] };

    const expiration: LineData<UTCTimestamp>[] = calculation.pnl_at_expiration.map((p) => ({
      time: p.price as UTCTimestamp,
      value: p.pnl,
    }));

    const current: LineData<UTCTimestamp>[] = calculation.pnl_current.map((p) => ({
      time: p.price as UTCTimestamp,
      value: p.pnl,
    }));

    // Zero line
    const zeroLine: LineData<UTCTimestamp>[] = calculation.pnl_at_expiration.map((p) => ({
      time: p.price as UTCTimestamp,
      value: 0,
    }));

    return { expiration, current, zeroLine };
  }, [calculation]);

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: 'rgba(75, 85, 99, 0.2)' },
        horzLines: { color: 'rgba(75, 85, 99, 0.2)' },
      },
      width: containerRef.current.clientWidth,
      height: 300,
      rightPriceScale: {
        borderColor: 'rgba(75, 85, 99, 0.3)',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: 'rgba(75, 85, 99, 0.3)',
        tickMarkFormatter: (time: number) => `$${time.toFixed(0)}`,
      },
      crosshair: {
        vertLine: { color: 'rgba(156, 163, 175, 0.5)', width: 1, style: 2 },
        horzLine: { color: 'rgba(156, 163, 175, 0.5)', width: 1, style: 2 },
      },
    });

    chartRef.current = chart;

    // Zero reference line
    const zeroSeries = chart.addSeries(LineSeries, {
      color: 'rgba(156, 163, 175, 0.4)',
      lineWidth: 1,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    zeroLineRef.current = zeroSeries;

    // Expiration P&L (area)
    const expirationSeries = chart.addSeries(AreaSeries, {
      topColor: 'rgba(34, 197, 94, 0.4)',
      bottomColor: 'rgba(239, 68, 68, 0.4)',
      lineColor: 'rgba(34, 197, 94, 0.8)',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    expirationSeriesRef.current = expirationSeries;

    // Current P&L (line)
    const currentSeries = chart.addSeries(LineSeries, {
      color: 'rgba(96, 165, 250, 1)',
      lineWidth: 2,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    currentSeriesRef.current = currentSeries;

    // Handle resize
    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Update chart data
  useEffect(() => {
    if (!chartRef.current || !calculation) return;

    if (zeroLineRef.current && chartData.zeroLine.length > 0) {
      zeroLineRef.current.setData(chartData.zeroLine);
    }

    if (expirationSeriesRef.current && chartData.expiration.length > 0) {
      expirationSeriesRef.current.setData(chartData.expiration);
    }

    if (currentSeriesRef.current && chartData.current.length > 0) {
      currentSeriesRef.current.setData(chartData.current);
    }

    // Fit content
    chartRef.current.timeScale().fitContent();
  }, [chartData, calculation]);

  if (!calculation) {
    return (
      <Card className={cn('', className)}>
        <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground">
          Add legs to see payoff diagram
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{calculation.strategy_name}</CardTitle>
            {calculation.mock && (
              <Badge variant="outline" className="text-xs text-yellow-500 border-yellow-500">
                Simulated
              </Badge>
            )}
          </div>
          <div className="flex gap-2 items-center text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-green-500 rounded" />
              <span className="text-muted-foreground">At Expiry</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-blue-400 rounded" style={{ borderStyle: 'dashed' }} />
              <span className="text-muted-foreground">Current</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Chart */}
        <div ref={containerRef} className="w-full" />

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <MetricCard
            label="Max Profit"
            value={calculation.max_profit === Infinity ? 'Unlimited' : `$${calculation.max_profit.toFixed(0)}`}
            variant="profit"
          />
          <MetricCard
            label="Max Loss"
            value={`$${calculation.max_loss.toFixed(0)}`}
            variant="loss"
          />
          <MetricCard
            label="Breakeven"
            value={
              calculation.breakeven_points.length > 0
                ? calculation.breakeven_points.map((b) => `$${b.toFixed(2)}`).join(', ')
                : 'N/A'
            }
          />
          <MetricCard
            label="Risk/Reward"
            value={
              calculation.risk_reward_ratio === Infinity
                ? 'Unlimited'
                : `${calculation.risk_reward_ratio.toFixed(2)}:1`
            }
          />
        </div>

        {/* Greeks */}
        {showGreeks && (
          <div className="grid grid-cols-4 gap-3 mt-3">
            <MetricCard label="Delta" value={calculation.greeks.delta.toFixed(2)} size="sm" />
            <MetricCard label="Gamma" value={calculation.greeks.gamma.toFixed(3)} size="sm" />
            <MetricCard label="Theta" value={calculation.greeks.theta.toFixed(2)} size="sm" />
            <MetricCard label="Vega" value={calculation.greeks.vega.toFixed(2)} size="sm" />
          </div>
        )}

        {/* Net Cost/Credit */}
        <div className="mt-3 flex justify-center">
          <Badge
            variant={calculation.net_debit_credit < 0 ? 'destructive' : 'default'}
            className={cn(
              'text-sm px-3 py-1',
              calculation.net_debit_credit > 0 ? 'bg-green-600' : ''
            )}
          >
            {calculation.net_debit_credit < 0
              ? `Net Debit: $${Math.abs(calculation.net_debit_credit).toFixed(0)}`
              : `Net Credit: $${calculation.net_debit_credit.toFixed(0)}`}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  variant?: 'default' | 'profit' | 'loss';
  size?: 'default' | 'sm';
}

function MetricCard({ label, value, variant = 'default', size = 'default' }: MetricCardProps) {
  return (
    <div className="p-2 bg-muted/50 rounded-md border">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          'font-mono font-medium',
          size === 'sm' ? 'text-sm' : 'text-base',
          variant === 'profit' && 'text-green-500',
          variant === 'loss' && 'text-red-500'
        )}
      >
        {value}
      </div>
    </div>
  );
}
