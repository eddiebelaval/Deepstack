"use client";

import { useEffect, useRef, useCallback, useMemo } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  AreaSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type LineData,
  type AreaData,
  type UTCTimestamp,
  ColorType,
  CrosshairMode,
} from "lightweight-charts";
import { useTradingStore, type ChartType, type IndicatorConfig } from "@/lib/stores/trading-store";
import { useMarketDataStore } from "@/lib/stores/market-data-store";
import type { OHLCVBar } from "@/lib/stores/market-data-store";
import { calculateIndicators, type LineIndicatorData } from "@/lib/indicators";

// Chart theme colors - using hex/rgba for lightweight-charts compatibility
const CHART_THEME = {
  background: "#1a1a1a",              // Dark background
  gridLines: "#2a2a2a",               // Grid lines
  textColor: "#a0a0a0",               // Muted text
  crosshair: "#666666",               // Crosshair
  upColor: "#22c55e",                 // Profit green
  downColor: "#ef4444",               // Loss red
  volumeUp: "rgba(34, 197, 94, 0.4)",
  volumeDown: "rgba(239, 68, 68, 0.4)",
};

type TradingChartProps = {
  className?: string;
};

export function TradingChart({ className }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<"Candlestick" | "Line" | "Area"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const { activeSymbol, chartType, indicators } = useTradingStore();
  const { bars } = useMarketDataStore();
  const symbolBars = bars[activeSymbol] || [];

  // Memoize bar data transformation
  const chartData = useMemo(() => {
    return transformBarsToChartData(symbolBars, chartType);
  }, [symbolBars, chartType]);

  // Memoize volume data
  const volumeData = useMemo(() => {
    return symbolBars.map((bar) => ({
      time: bar.time as UTCTimestamp,
      value: bar.volume || 0,
      color: bar.close >= bar.open ? CHART_THEME.volumeUp : CHART_THEME.volumeDown,
    }));
  }, [symbolBars]);

  // Memoize indicator calculations
  const indicatorData = useMemo(() => {
    return calculateIndicators(symbolBars, indicators);
  }, [symbolBars, indicators]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

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
        vertLine: {
          color: CHART_THEME.crosshair,
          labelBackgroundColor: CHART_THEME.crosshair,
        },
        horzLine: {
          color: CHART_THEME.crosshair,
          labelBackgroundColor: CHART_THEME.crosshair,
        },
      },
      rightPriceScale: {
        borderColor: CHART_THEME.gridLines,
        scaleMargins: {
          top: 0.1,
          bottom: 0.2, // Leave room for volume
        },
      },
      timeScale: {
        borderColor: CHART_THEME.gridLines,
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    chartRef.current = chart;

    // Create main series based on chart type
    createMainSeries(chart, chartType);

    // Create volume series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.85,
        bottom: 0,
      },
    });
    volumeSeriesRef.current = volumeSeries;

    // Setup resize observer
    resizeObserverRef.current = new ResizeObserver((entries) => {
      if (entries.length === 0 || !chartRef.current) return;
      const { width, height } = entries[0].contentRect;
      chartRef.current.applyOptions({ width, height });
    });

    resizeObserverRef.current.observe(chartContainerRef.current);

    // Cleanup
    return () => {
      resizeObserverRef.current?.disconnect();
      chartRef.current?.remove();
      chartRef.current = null;
      mainSeriesRef.current = null;
      volumeSeriesRef.current = null;
      indicatorSeriesRef.current.clear();
    };
  }, []); // Only run once on mount

  // Handle chart type changes
  useEffect(() => {
    if (!chartRef.current) return;

    // Remove existing main series
    if (mainSeriesRef.current) {
      chartRef.current.removeSeries(mainSeriesRef.current);
    }

    // Create new series with correct type
    createMainSeries(chartRef.current, chartType);

    // Set data if available
    if (chartData.length > 0 && mainSeriesRef.current) {
      mainSeriesRef.current.setData(chartData as any);
    }
  }, [chartType]);

  // Update chart data when bars change
  useEffect(() => {
    if (!mainSeriesRef.current || chartData.length === 0) return;
    mainSeriesRef.current.setData(chartData as any);

    if (volumeSeriesRef.current && volumeData.length > 0) {
      volumeSeriesRef.current.setData(volumeData);
    }

    // Fit content to view
    chartRef.current?.timeScale().fitContent();
  }, [chartData, volumeData]);

  // Update indicators
  useEffect(() => {
    if (!chartRef.current) return;

    const currentIndicatorIds = new Set(
      indicators.filter((i) => i.visible).map((i) => i.id)
    );

    // Remove series for indicators that are no longer active
    indicatorSeriesRef.current.forEach((series, id) => {
      if (!currentIndicatorIds.has(id)) {
        chartRef.current?.removeSeries(series);
        indicatorSeriesRef.current.delete(id);
      }
    });

    // Add or update indicator series
    indicators.forEach((indicator) => {
      if (!indicator.visible) return;

      const data = indicatorData.get(indicator.id);
      if (!data) return;

      // Handle different indicator types
      if (indicator.type === "SMA" || indicator.type === "EMA") {
        updateLineIndicator(indicator, data as LineIndicatorData[]);
      } else if (indicator.type === "BOLLINGER") {
        updateBollingerBands(indicator, data as { upper: LineIndicatorData[]; middle: LineIndicatorData[]; lower: LineIndicatorData[] });
      }
      // RSI and MACD are handled in separate panels (Phase 2.3)
    });
  }, [indicators, indicatorData]);

  // Helper function to create main series
  function createMainSeries(chart: IChartApi, type: ChartType) {
    switch (type) {
      case "candlestick": {
        const series = chart.addSeries(CandlestickSeries, {
          upColor: CHART_THEME.upColor,
          downColor: CHART_THEME.downColor,
          borderVisible: false,
          wickUpColor: CHART_THEME.upColor,
          wickDownColor: CHART_THEME.downColor,
        });
        mainSeriesRef.current = series;
        break;
      }
      case "line": {
        const series = chart.addSeries(LineSeries, {
          color: CHART_THEME.upColor,
          lineWidth: 2,
        });
        mainSeriesRef.current = series;
        break;
      }
      case "area": {
        const series = chart.addSeries(AreaSeries, {
          lineColor: CHART_THEME.upColor,
          topColor: "rgba(34, 197, 94, 0.4)",
          bottomColor: "rgba(34, 197, 94, 0.05)",
          lineWidth: 2,
        });
        mainSeriesRef.current = series;
        break;
      }
    }
  }

  // Helper function to update line indicators (SMA, EMA)
  function updateLineIndicator(indicator: IndicatorConfig, data: LineIndicatorData[]) {
    if (!chartRef.current) return;

    let series = indicatorSeriesRef.current.get(indicator.id);

    if (!series) {
      series = chartRef.current.addSeries(LineSeries, {
        color: indicator.color,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
      });
      indicatorSeriesRef.current.set(indicator.id, series);
    }

    const lineData: LineData[] = data.map((d) => ({
      time: d.time as UTCTimestamp,
      value: d.value,
    }));
    series.setData(lineData);
  }

  // Helper function to update Bollinger Bands
  function updateBollingerBands(
    indicator: IndicatorConfig,
    data: { upper: LineIndicatorData[]; middle: LineIndicatorData[]; lower: LineIndicatorData[] }
  ) {
    if (!chartRef.current) return;

    // Create three series for BB (upper, middle, lower)
    const upperKey = `${indicator.id}-upper`;
    const middleKey = `${indicator.id}-middle`;
    const lowerKey = `${indicator.id}-lower`;

    // Upper band
    let upperSeries = indicatorSeriesRef.current.get(upperKey);
    if (!upperSeries) {
      upperSeries = chartRef.current.addSeries(LineSeries, {
        color: indicator.color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      indicatorSeriesRef.current.set(upperKey, upperSeries);
    }
    upperSeries.setData(data.upper.map((d) => ({ time: d.time as UTCTimestamp, value: d.value })));

    // Middle band (SMA)
    let middleSeries = indicatorSeriesRef.current.get(middleKey);
    if (!middleSeries) {
      middleSeries = chartRef.current.addSeries(LineSeries, {
        color: indicator.color,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
      });
      indicatorSeriesRef.current.set(middleKey, middleSeries);
    }
    middleSeries.setData(data.middle.map((d) => ({ time: d.time as UTCTimestamp, value: d.value })));

    // Lower band
    let lowerSeries = indicatorSeriesRef.current.get(lowerKey);
    if (!lowerSeries) {
      lowerSeries = chartRef.current.addSeries(LineSeries, {
        color: indicator.color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      indicatorSeriesRef.current.set(lowerKey, lowerSeries);
    }
    lowerSeries.setData(data.lower.map((d) => ({ time: d.time as UTCTimestamp, value: d.value })));
  }

  // Public method to update chart with new real-time bar
  const updateRealTimeBar = useCallback((bar: OHLCVBar) => {
    if (!mainSeriesRef.current) return;

    if (chartType === "candlestick") {
      mainSeriesRef.current.update({
        time: bar.time as UTCTimestamp,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
      } as CandlestickData);
    } else {
      mainSeriesRef.current.update({
        time: bar.time as UTCTimestamp,
        value: bar.close,
      } as LineData);
    }

    // Update volume
    if (volumeSeriesRef.current && bar.volume) {
      volumeSeriesRef.current.update({
        time: bar.time as UTCTimestamp,
        value: bar.volume,
        color: bar.close >= bar.open ? CHART_THEME.volumeUp : CHART_THEME.volumeDown,
      });
    }
  }, [chartType]);

  return (
    <div
      ref={chartContainerRef}
      className={className}
      style={{ width: "100%", height: "100%" }}
    />
  );
}

// Transform OHLCV bars to chart-specific data format
function transformBarsToChartData(
  bars: OHLCVBar[],
  chartType: ChartType
): CandlestickData[] | LineData[] | AreaData[] {
  if (chartType === "candlestick") {
    return bars.map((bar) => ({
      time: bar.time as UTCTimestamp,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
    }));
  } else {
    // Line and Area charts use close price
    return bars.map((bar) => ({
      time: bar.time as UTCTimestamp,
      value: bar.close,
    }));
  }
}

export default TradingChart;
