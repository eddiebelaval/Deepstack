'use client';

import React, { useMemo, useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { usePositionsStore } from '@/lib/stores/positions-store';
import { TrendingUp, TrendingDown, PieChart } from 'lucide-react';

/**
 * PortfolioMiniChart - Compact portfolio chart for positions panel
 *
 * Features:
 * - Shows portfolio value over time (sparkline)
 * - Position allocation breakdown (horizontal bar)
 * - Auto-updates with positions store
 * - Height: ~120px
 */

interface PortfolioMiniChartProps {
  className?: string;
}

// Timeframe options
type Timeframe = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';

const TIMEFRAME_CONFIG: Record<Timeframe, { points: number; label: string; xLabels: string[] }> = {
  '1D': { points: 24, label: '1D', xLabels: ['Open', '12PM', 'Close'] },
  '1W': { points: 7, label: '1W', xLabels: ['Mon', 'Thu', 'Today'] },
  '1M': { points: 30, label: '1M', xLabels: ['30d', '15d', 'Now'] },
  '3M': { points: 90, label: '3M', xLabels: ['90d', '45d', 'Now'] },
  '6M': { points: 180, label: '6M', xLabels: ['6mo', '3mo', 'Now'] },
  '1Y': { points: 365, label: '1Y', xLabels: ['1yr', '6mo', 'Now'] },
  'ALL': { points: 730, label: 'ALL', xLabels: ['2yr', '1yr', 'Now'] },
};

// Generate mock historical data based on current positions and timeframe
function generateHistoricalData(currentValue: number, pnlPercent: number, timeframe: Timeframe): number[] {
  const { points } = TIMEFRAME_CONFIG[timeframe];
  const data: number[] = [];

  // Work backwards from current value
  // Simulate some volatility with overall trend matching P&L
  // Adjust volatility based on timeframe
  const volatilityMultiplier = timeframe === '1D' ? 0.005 : timeframe === '1W' ? 0.01 : 0.02;
  const dailyTrend = pnlPercent / points / 100;
  let value = currentValue;

  for (let i = points - 1; i >= 0; i--) {
    data.unshift(value);
    // Add some noise + trend
    const noise = (Math.random() - 0.5) * volatilityMultiplier;
    const factor = 1 - dailyTrend - noise;
    value = value * factor;
  }

  return data;
}

export function PortfolioMiniChart({ className }: PortfolioMiniChartProps) {
  const positions = usePositionsStore((state) => state.positions);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1M');

  // Calculate total portfolio value
  const totalValue = useMemo(() => {
    return positions.reduce((total, position) => {
      const currentPrice = position.currentPrice ?? position.avgCost;
      return total + position.shares * currentPrice;
    }, 0);
  }, [positions]);

  // Calculate total cost basis
  const totalCostBasis = useMemo(() => {
    return positions.reduce((total, position) => {
      return total + position.shares * position.avgCost;
    }, 0);
  }, [positions]);

  // Calculate P&L
  const totalPnL = useMemo(() => {
    return positions.reduce((total, position) => {
      const currentPrice = position.currentPrice ?? position.avgCost;
      const marketValue = position.shares * currentPrice;
      const costBasis = position.shares * position.avgCost;
      const pnl = position.side === 'long'
        ? marketValue - costBasis
        : costBasis - marketValue;
      return total + pnl;
    }, 0);
  }, [positions]);

  const pnlPercent = totalCostBasis > 0 ? (totalPnL / totalCostBasis) * 100 : 0;
  const isProfitable = totalPnL >= 0;

  // Generate historical data points
  const historicalData = useMemo(() => {
    if (totalValue === 0) return [];
    return generateHistoricalData(totalValue, pnlPercent, selectedTimeframe);
  }, [totalValue, pnlPercent, selectedTimeframe]);

  // Calculate min/max for sparkline scaling
  const { min, max } = useMemo(() => {
    if (historicalData.length === 0) return { min: 0, max: 0 };
    return {
      min: Math.min(...historicalData),
      max: Math.max(...historicalData),
    };
  }, [historicalData]);

  // Generate SVG path for sparkline
  const svgPath = useMemo(() => {
    if (historicalData.length === 0) return '';

    const width = 100;
    const height = 50;
    const padding = 4;
    const range = max - min || 1;

    const points = historicalData.map((value, i) => {
      const x = (i / (historicalData.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - padding * 2) - padding;
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  }, [historicalData, min, max]);

  // Generate area fill path
  const areaPath = useMemo(() => {
    if (historicalData.length === 0) return '';

    const width = 100;
    const height = 50;
    const padding = 4;
    const range = max - min || 1;

    const points = historicalData.map((value, i) => {
      const x = (i / (historicalData.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - padding * 2) - padding;
      return `${x},${y}`;
    });

    return `M 0,${height} L ${points.join(' L ')} L ${width},${height} Z`;
  }, [historicalData, min, max]);

  // Calculate position allocations for bar chart
  const allocations = useMemo(() => {
    if (totalValue === 0) return [];

    return positions.map((position) => {
      const currentPrice = position.currentPrice ?? position.avgCost;
      const marketValue = position.shares * currentPrice;
      const percentage = (marketValue / totalValue) * 100;
      const costBasis = position.shares * position.avgCost;
      const pnl = position.side === 'long'
        ? marketValue - costBasis
        : costBasis - marketValue;

      return {
        symbol: position.symbol,
        percentage,
        value: marketValue,
        isProfitable: pnl >= 0,
      };
    }).sort((a, b) => b.percentage - a.percentage);
  }, [positions, totalValue]);

  // Colors for allocation bars
  const allocationColors = [
    'bg-blue-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-cyan-500',
  ];

  // Calculate Y-axis percentage labels (based on P&L range)
  const yAxisLabels = useMemo(() => {
    if (historicalData.length === 0) return [];
    const startValue = historicalData[0];
    const minPct = ((min - startValue) / startValue) * 100;
    const maxPct = ((max - startValue) / startValue) * 100;
    // Create 3 labels: min, mid, max percentages
    const midPct = (minPct + maxPct) / 2;
    return [
      { pct: maxPct, y: 4 },
      { pct: midPct, y: 25 },
      { pct: minPct, y: 46 },
    ];
  }, [historicalData, min, max]);

  // Crosshair hover state
  const chartRef = useRef<HTMLDivElement>(null);
  const [hoverData, setHoverData] = useState<{
    x: number; // 0-100 in SVG viewBox
    y: number; // 0-50 in SVG viewBox
    dataIndex: number;
    value: number;
    date: string;
    pctChange: number;
  } | null>(null);

  // Handle mouse move over chart
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!chartRef.current || historicalData.length === 0) return;

    const rect = chartRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    // Convert to SVG viewBox coordinates (0-100 for x, 0-50 for y)
    const svgX = (mouseX / rect.width) * 100;

    // Find nearest data point
    const dataIndex = Math.round((svgX / 100) * (historicalData.length - 1));
    const clampedIndex = Math.max(0, Math.min(historicalData.length - 1, dataIndex));
    const value = historicalData[clampedIndex];

    // Calculate the actual X position for this data point
    const actualX = (clampedIndex / (historicalData.length - 1)) * 100;

    // Calculate Y position for this value
    const range = max - min || 1;
    const padding = 4;
    const actualY = 50 - ((value - min) / range) * (50 - padding * 2) - padding;

    // Calculate date based on timeframe
    const unitsAgo = historicalData.length - 1 - clampedIndex;
    const date = new Date();
    let dateStr: string;

    if (selectedTimeframe === '1D') {
      // Hours ago
      date.setHours(date.getHours() - unitsAgo);
      dateStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (selectedTimeframe === '1W') {
      // Days ago
      date.setDate(date.getDate() - unitsAgo);
      dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } else {
      // Days ago for all other timeframes
      date.setDate(date.getDate() - unitsAgo);
      dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    // Calculate % change from start
    const startValue = historicalData[0];
    const pctChange = ((value - startValue) / startValue) * 100;

    setHoverData({
      x: actualX,
      y: actualY,
      dataIndex: clampedIndex,
      value,
      date: dateStr,
      pctChange,
    });
  }, [historicalData, min, max, selectedTimeframe]);

  const handleMouseLeave = useCallback(() => {
    setHoverData(null);
  }, []);

  if (positions.length === 0) {
    return (
      <div className={cn(
        'rounded-xl border border-border/50 bg-muted/20 p-3 flex items-center justify-center',
        className
      )} style={{ height: '140px' }}>
        <div className="text-center text-muted-foreground">
          <PieChart className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-xs">Add positions to see portfolio chart</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-border/50 bg-gradient-to-br from-card to-muted/20 p-3 overflow-hidden',
        className
      )}
      style={{ height: '140px' }}
    >
      <div className="h-full flex gap-3 overflow-hidden">
        {/* Sparkline Chart - 75% width */}
        <div className="w-[75%] flex flex-col min-w-0 overflow-hidden">
          {/* Header with timeframe buttons */}
          <div className="flex items-center justify-between mb-1">
            {/* Timeframe selector */}
            <div className="flex items-center gap-0.5">
              {(['1D', '1W', '1M', '3M', '1Y'] as Timeframe[]).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setSelectedTimeframe(tf)}
                  className={cn(
                    'px-1.5 py-0.5 text-[9px] font-medium rounded transition-colors',
                    selectedTimeframe === tf
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  {tf}
                </button>
              ))}
            </div>
            <span
              className={cn(
                'flex items-center gap-0.5 text-[10px] font-semibold',
                isProfitable ? 'text-profit' : 'text-loss'
              )}
            >
              {isProfitable ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {isProfitable ? '+' : ''}
              {pnlPercent.toFixed(1)}%
            </span>
          </div>

          {/* Chart with Y-axis labels */}
          <div className="flex-1 flex gap-1.5 min-h-0 overflow-hidden">
            {/* Y-axis percentage labels */}
            <div className="flex flex-col justify-between text-[9px] text-muted-foreground w-8 flex-shrink-0">
              {yAxisLabels.map((label, i) => (
                <span key={i} className="leading-none">
                  {label.pct >= 0 ? '+' : ''}{label.pct.toFixed(0)}%
                </span>
              ))}
            </div>

            {/* Chart area */}
            <div
              ref={chartRef}
              className="flex-1 relative border border-border/30 rounded-lg bg-muted/10 overflow-hidden cursor-crosshair"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              {historicalData.length > 0 ? (
                <svg
                  viewBox="0 0 100 50"
                  className="absolute inset-0 w-full h-full"
                  preserveAspectRatio="none"
                >
                  {/* Grid lines - horizontal */}
                  <line x1="0" y1="12.5" x2="100" y2="12.5" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                  <line x1="0" y1="25" x2="100" y2="25" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" strokeDasharray="2,2" />
                  <line x1="0" y1="37.5" x2="100" y2="37.5" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />

                  {/* Grid lines - vertical */}
                  <line x1="25" y1="0" x2="25" y2="50" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                  <line x1="50" y1="0" x2="50" y2="50" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" strokeDasharray="2,2" />
                  <line x1="75" y1="0" x2="75" y2="50" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />

                  {/* Area fill */}
                  <path
                    d={areaPath}
                    fill={isProfitable ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)'}
                  />
                  {/* Line */}
                  <path
                    d={svgPath}
                    fill="none"
                    stroke={isProfitable ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'}
                    strokeWidth="1.5"
                    vectorEffect="non-scaling-stroke"
                  />
                  {/* End dot */}
                  <circle
                    cx="100"
                    cy={50 - ((historicalData[historicalData.length - 1] - min) / (max - min || 1)) * 42 - 4}
                    r="2"
                    fill={isProfitable ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'}
                  />

                  {/* Crosshair lines */}
                  {hoverData && (
                    <>
                      {/* Vertical crosshair line */}
                      <line
                        x1={hoverData.x}
                        y1="0"
                        x2={hoverData.x}
                        y2="50"
                        stroke="rgba(255,255,255,0.5)"
                        strokeWidth="0.5"
                        strokeDasharray="2,1"
                        vectorEffect="non-scaling-stroke"
                      />
                      {/* Horizontal crosshair line */}
                      <line
                        x1="0"
                        y1={hoverData.y}
                        x2="100"
                        y2={hoverData.y}
                        stroke="rgba(255,255,255,0.5)"
                        strokeWidth="0.5"
                        strokeDasharray="2,1"
                        vectorEffect="non-scaling-stroke"
                      />
                      {/* Hover dot */}
                      <circle
                        cx={hoverData.x}
                        cy={hoverData.y}
                        r="3"
                        fill={hoverData.pctChange >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'}
                        stroke="white"
                        strokeWidth="1"
                        vectorEffect="non-scaling-stroke"
                      />
                    </>
                  )}
                </svg>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[9px] text-muted-foreground">
                  No data
                </div>
              )}

              {/* Tooltip */}
              {hoverData && (
                <div
                  className="absolute z-10 pointer-events-none"
                  style={{
                    left: `${hoverData.x}%`,
                    top: '4px',
                    transform: hoverData.x > 70 ? 'translateX(-100%)' : hoverData.x < 30 ? 'translateX(0)' : 'translateX(-50%)',
                  }}
                >
                  <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-md px-2 py-1 shadow-lg">
                    <div className="text-[10px] text-muted-foreground">{hoverData.date}</div>
                    <div className="text-xs font-semibold">
                      ${hoverData.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className={cn(
                      'text-[10px] font-medium',
                      hoverData.pctChange >= 0 ? 'text-profit' : 'text-loss'
                    )}>
                      {hoverData.pctChange >= 0 ? '+' : ''}{hoverData.pctChange.toFixed(1)}%
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* X-axis time labels */}
          <div className="flex items-center justify-between text-[9px] text-muted-foreground mt-1 ml-9">
            {TIMEFRAME_CONFIG[selectedTimeframe].xLabels.map((label, i) => (
              <span key={i}>{label}</span>
            ))}
          </div>
        </div>

        {/* Allocation Breakdown - 25% width */}
        <div className="w-[25%] flex flex-col flex-shrink-0 min-w-[80px] overflow-hidden">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Allocation
          </span>

          {/* Stacked horizontal bar */}
          <div className="h-3 rounded-full overflow-hidden flex bg-muted/30 mb-2">
            {allocations.map((alloc, i) => (
              <div
                key={alloc.symbol}
                className={cn(allocationColors[i % allocationColors.length])}
                style={{ width: `${alloc.percentage}%` }}
                title={`${alloc.symbol}: ${alloc.percentage.toFixed(1)}%`}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="flex-1 overflow-hidden">
            <div className="space-y-1">
              {allocations.slice(0, 4).map((alloc, i) => (
                <div key={alloc.symbol} className="flex items-center gap-1.5">
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full flex-shrink-0',
                      allocationColors[i % allocationColors.length]
                    )}
                  />
                  <span className="text-[10px] font-medium truncate flex-1">
                    {alloc.symbol}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {alloc.percentage.toFixed(0)}%
                  </span>
                </div>
              ))}
              {allocations.length > 4 && (
                <div className="text-[9px] text-muted-foreground">
                  +{allocations.length - 4} more
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PortfolioMiniChart;
