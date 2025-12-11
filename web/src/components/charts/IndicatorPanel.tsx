"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useRef, useMemo } from "react";
import {
  createChart,
  LineSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
  ColorType,
  CrosshairMode,
} from "lightweight-charts";
import { useTradingStore } from "@/lib/stores/trading-store";
import { useMarketDataStore } from "@/lib/stores/market-data-store";
import { calculateRSI, calculateMACD, type RSIResult, type MACDResult } from "@/lib/indicators";

// Chart theme colors - using hex/rgba for lightweight-charts compatibility
const CHART_THEME = {
  background: "#1a1a1a",
  gridLines: "#2a2a2a",
  textColor: "#a0a0a0",
  crosshair: "#666666",
  rsiLine: "#f59e0b",
  rsiOverbought: "rgba(239, 68, 68, 0.3)",
  rsiOversold: "rgba(34, 197, 94, 0.3)",
  macdLine: "#3b82f6",
  signalLine: "#f59e0b",
  histogramPositive: "rgba(34, 197, 94, 0.8)",
  histogramNegative: "rgba(239, 68, 68, 0.8)",
};

type IndicatorPanelProps = {
  type: "RSI" | "MACD";
  height?: number;
  className?: string;
};

export function IndicatorPanel({ type, height = 120, className }: IndicatorPanelProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRefs = useRef<Map<string, ISeriesApi<"Line" | "Histogram">>>(new Map());
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const { activeSymbol, indicators } = useTradingStore();
  const { bars } = useMarketDataStore();
  const symbolBars = bars[activeSymbol] || [];

  // Find indicator config
  const indicatorConfig = indicators.find((i) => i.type === type && i.visible);

  // Calculate indicator data
  const indicatorData = useMemo(() => {
    if (!indicatorConfig || symbolBars.length === 0) return null;

    if (type === "RSI") {
      return calculateRSI(symbolBars, indicatorConfig.params.period || 14);
    } else if (type === "MACD") {
      return calculateMACD(
        symbolBars,
        indicatorConfig.params.fast || 12,
        indicatorConfig.params.slow || 26,
        indicatorConfig.params.signal || 9
      );
    }
    return null;
  }, [symbolBars, indicatorConfig, type]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current || !indicatorConfig) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: CHART_THEME.background },
        textColor: CHART_THEME.textColor,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      },
      grid: {
        vertLines: { color: CHART_THEME.gridLines },
        horzLines: { color: CHART_THEME.gridLines },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: CHART_THEME.crosshair },
        horzLine: { color: CHART_THEME.crosshair },
      },
      rightPriceScale: {
        borderColor: CHART_THEME.gridLines,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: CHART_THEME.gridLines,
        visible: false, // Hide time scale (synced with main chart)
      },
      height,
    });

    chartRef.current = chart;

    // Create series based on indicator type
    if (type === "RSI") {
      createRSISeries(chart);
    } else if (type === "MACD") {
      createMACDSeries(chart);
    }

    // Setup resize observer
    resizeObserverRef.current = new ResizeObserver((entries) => {
      if (entries.length === 0 || !chartRef.current) return;
      const { width } = entries[0].contentRect;
      chartRef.current.applyOptions({ width, height });
    });

    resizeObserverRef.current.observe(chartContainerRef.current);

    return () => {
      resizeObserverRef.current?.disconnect();
      chartRef.current?.remove();
      chartRef.current = null;
      seriesRefs.current.clear();
    };
  }, [indicatorConfig, height, type]);

  // Update indicator data
  useEffect(() => {
    if (!chartRef.current || !indicatorData) return;

    if (type === "RSI") {
      updateRSIData(indicatorData as RSIResult[]);
    } else if (type === "MACD") {
      updateMACDData(indicatorData as MACDResult[]);
    }

    chartRef.current.timeScale().fitContent();
  }, [indicatorData, type]);

  function createRSISeries(chart: IChartApi) {
    // RSI line
    const rsiSeries = chart.addSeries(LineSeries, {
      color: CHART_THEME.rsiLine,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
    });
    seriesRefs.current.set("rsi", rsiSeries);

    // Set price scale for RSI (0-100)
    rsiSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.1, bottom: 0.1 },
    });
  }

  function createMACDSeries(chart: IChartApi) {
    // MACD histogram
    const histogramSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "price", precision: 4 },
      priceLineVisible: false,
      lastValueVisible: false,
    });
    seriesRefs.current.set("histogram", histogramSeries);

    // MACD line
    const macdSeries = chart.addSeries(LineSeries, {
      color: CHART_THEME.macdLine,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
    });
    seriesRefs.current.set("macd", macdSeries);

    // Signal line
    const signalSeries = chart.addSeries(LineSeries, {
      color: CHART_THEME.signalLine,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    seriesRefs.current.set("signal", signalSeries);
  }

  function updateRSIData(data: RSIResult[]) {
    const rsiSeries = seriesRefs.current.get("rsi");
    if (!rsiSeries) return;

    const lineData = data.map((d) => ({
      time: d.time as UTCTimestamp,
      value: d.value,
    }));
    rsiSeries.setData(lineData);
  }

  function updateMACDData(data: MACDResult[]) {
    const histogramSeries = seriesRefs.current.get("histogram");
    const macdSeries = seriesRefs.current.get("macd");
    const signalSeries = seriesRefs.current.get("signal");

    if (!histogramSeries || !macdSeries || !signalSeries) return;

    // Histogram data with colors
    const histogramData = data.map((d) => ({
      time: d.time as UTCTimestamp,
      value: d.histogram,
      color: d.histogram >= 0 ? CHART_THEME.histogramPositive : CHART_THEME.histogramNegative,
    }));
    histogramSeries.setData(histogramData);

    // MACD line data
    const macdData = data.map((d) => ({
      time: d.time as UTCTimestamp,
      value: d.macd,
    }));
    macdSeries.setData(macdData);

    // Signal line data
    const signalData = data.map((d) => ({
      time: d.time as UTCTimestamp,
      value: d.signal,
    }));
    signalSeries.setData(signalData);
  }

  // Don't render if indicator is not active
  if (!indicatorConfig) {
    return null;
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between px-2 py-1 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground">
          {type === "RSI" ? `RSI(${indicatorConfig.params.period || 14})` : `MACD(${indicatorConfig.params.fast || 12},${indicatorConfig.params.slow || 26},${indicatorConfig.params.signal || 9})`}
        </span>
        {type === "RSI" && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="text-loss">70</span>
            <span className="text-profit">30</span>
          </div>
        )}
      </div>
      <div
        ref={chartContainerRef}
        style={{ width: "100%", height: `${height}px` }}
      />
    </div>
  );
}

export default IndicatorPanel;
