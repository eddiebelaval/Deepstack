"use client";

import { memo } from "react";

/**
 * ChartLegend - Professional OHLCV Legend Component
 *
 * Displays Open, High, Low, Close, Volume values in TradingView style
 * when user hovers over chart candles.
 */

export interface ChartLegendData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface ChartLegendProps {
  symbol: string;
  data: ChartLegendData | null;
  prevClose?: number;
}

function formatVolume(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

function formatPrice(value: number): string {
  if (value >= 10) return value.toFixed(2);
  if (value >= 1) return value.toFixed(3);
  if (value >= 0.01) return value.toFixed(4);
  return value.toFixed(6);
}

export const ChartLegend = memo(function ChartLegend({
  symbol,
  data,
  prevClose,
}: ChartLegendProps) {
  if (!data) {
    return (
      <div className="absolute top-3 left-3 z-20 pointer-events-none select-none">
        <div className="text-xs font-semibold text-zinc-400 tracking-wide">
          {symbol}
        </div>
      </div>
    );
  }

  const isUp = data.close >= data.open;
  const changeColor = isUp ? "text-green-500" : "text-red-500";
  const valueColor = isUp ? "text-green-400" : "text-red-400";

  let changePercent: number | null = null;
  if (prevClose !== undefined && prevClose > 0) {
    changePercent = ((data.close - prevClose) / prevClose) * 100;
  }

  return (
    <div className="absolute top-3 left-3 z-20 pointer-events-none select-none">
      <div
        className="rounded px-2.5 py-1.5"
        style={{
          backgroundColor: "rgba(15, 23, 42, 0.9)",
          backdropFilter: "blur(4px)",
        }}
      >
        {/* Symbol and Change */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-zinc-300 tracking-wide">
            {symbol}
          </span>
          {changePercent !== null && (
            <span className={`text-[11px] font-semibold tabular-nums ${changeColor}`}>
              {changePercent >= 0 ? "+" : ""}
              {changePercent.toFixed(2)}%
            </span>
          )}
        </div>

        {/* OHLC Values */}
        <div className="flex items-center gap-3 text-[11px] font-mono tabular-nums">
          <span className="text-zinc-500">
            O <span className={valueColor}>{formatPrice(data.open)}</span>
          </span>
          <span className="text-zinc-500">
            H <span className={valueColor}>{formatPrice(data.high)}</span>
          </span>
          <span className="text-zinc-500">
            L <span className={valueColor}>{formatPrice(data.low)}</span>
          </span>
          <span className="text-zinc-500">
            C <span className={valueColor}>{formatPrice(data.close)}</span>
          </span>
        </div>

        {/* Volume */}
        {data.volume !== undefined && data.volume > 0 && (
          <div className="text-[11px] font-mono tabular-nums text-zinc-500 mt-0.5">
            Vol <span className="text-zinc-400">{formatVolume(data.volume)}</span>
          </div>
        )}
      </div>
    </div>
  );
});

ChartLegend.displayName = "ChartLegend";

export default ChartLegend;
