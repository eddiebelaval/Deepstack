"use client";
/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useRef, useCallback, useMemo, useState } from "react";
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
  LineStyle,
} from "lightweight-charts";
import { useTradingStore, type ChartType, type IndicatorConfig } from "@/lib/stores/trading-store";
import { useMarketDataStore } from "@/lib/stores/market-data-store";
import { useMarketData } from "@/components/providers/MarketDataProvider";
import type { OHLCVBar } from "@/lib/stores/market-data-store";
import { calculateIndicators, type LineIndicatorData } from "@/lib/indicators";
import { ChartLegend, type ChartLegendData } from "./ChartLegend";

// Overlay colors - distinct from main chart
const OVERLAY_COLORS = [
  '#3B82F6', // Blue
  '#A855F7', // Purple
  '#10B981', // Green
  '#EC4899', // Pink
];

// Chart theme colors - TradingView-inspired professional styling
const CHART_THEME = {
  background: "#0f172a",                          // Slate-900 dark background
  gridLines: "rgba(30, 41, 59, 0.5)",             // Subtle grid (slate-800 @ 50%)
  textColor: "#9CA3AF",                           // Muted gray text
  crosshairLine: "rgba(148, 163, 184, 0.7)",      // Crosshair vertical line
  crosshairLineHorz: "rgba(148, 163, 184, 0.35)", // Crosshair horizontal (softer)
  crosshairLabel: "#334155",                      // Label background (slate-700)
  scaleBorder: "rgba(148, 163, 184, 0.4)",        // Price/time scale borders
  upColor: "#22c55e",                             // Profit green
  downColor: "#ef4444",                           // Loss red
  volumeUp: "rgba(34, 197, 94, 0.5)",             // Slightly more visible volume
  volumeDown: "rgba(239, 68, 68, 0.5)",
};

type TradingChartProps = {
  className?: string;
  /** Callback fired when crosshair moves, providing the price at cursor */
  onCrosshairPriceChange?: (price: number | null) => void;
  /** Ref to get the current crosshair price (for context menu) */
  crosshairPriceRef?: React.MutableRefObject<number | null>;
};

export function TradingChart({ className, onCrosshairPriceChange, crosshairPriceRef: externalPriceRef }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const internalPriceRef = useRef<number | null>(null);
  // Use external ref if provided, otherwise use internal
  const crosshairPriceRef = externalPriceRef || internalPriceRef;
  const mainSeriesRef = useRef<ISeriesApi<"Candlestick" | "Line" | "Area"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
  const overlaySeriesRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Legend state for OHLCV display
  const [legendData, setLegendData] = useState<ChartLegendData | null>(null);

  const { activeSymbol, chartType, indicators, overlaySymbols } = useTradingStore();
  const { bars } = useMarketDataStore();
  const { fetchBars } = useMarketData();

  // Wrap symbolBars in useMemo to prevent dependency issues
  const symbolBars = useMemo(() => bars[activeSymbol] || [], [bars, activeSymbol]);

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

  // Get previous bar's close for change calculation
  const prevClose = useMemo(() => {
    if (symbolBars.length >= 2) {
      return symbolBars[symbolBars.length - 2].close;
    }
    return undefined;
  }, [symbolBars]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: CHART_THEME.background },
        textColor: CHART_THEME.textColor,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: CHART_THEME.gridLines },
        horzLines: { color: CHART_THEME.gridLines },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: CHART_THEME.crosshairLine,
          style: LineStyle.Dotted,
          width: 1,
          labelBackgroundColor: CHART_THEME.crosshairLabel,
        },
        horzLine: {
          color: CHART_THEME.crosshairLineHorz,
          style: LineStyle.Dotted,
          width: 1,
          labelBackgroundColor: CHART_THEME.crosshairLabel,
        },
      },
      rightPriceScale: {
        borderColor: CHART_THEME.scaleBorder,
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
      timeScale: {
        borderColor: CHART_THEME.scaleBorder,
        timeVisible: true,
        secondsVisible: false,
      },
      localization: {
        priceFormatter: (price: number) => {
          if (price >= 1000000) return `${(price / 1000000).toFixed(2)}M`;
          if (price >= 10000) return price.toFixed(0);
          if (price >= 1) return price.toFixed(2);
          return price.toFixed(4);
        },
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

    // Subscribe to crosshair movement to track price at cursor and update legend
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.point || !mainSeriesRef.current) {
        crosshairPriceRef.current = null;
        onCrosshairPriceChange?.(null);
        setLegendData(null);
        return;
      }

      // Get price from the series data at the crosshair position
      const seriesData = param.seriesData.get(mainSeriesRef.current);
      if (seriesData) {
        // For candlestick, use close price; for line/area, use value
        const price = 'close' in seriesData ? seriesData.close : ('value' in seriesData ? seriesData.value : null);
        crosshairPriceRef.current = price as number | null;
        onCrosshairPriceChange?.(price as number | null);

        // Update legend with full OHLCV data
        if ('open' in seriesData && 'high' in seriesData && 'low' in seriesData && 'close' in seriesData) {
          // Find volume from volume series data
          const volumeData = volumeSeriesRef.current ? param.seriesData.get(volumeSeriesRef.current) : null;
          const volume = volumeData && 'value' in volumeData ? volumeData.value : undefined;

          setLegendData({
            time: param.time as number,
            open: seriesData.open as number,
            high: seriesData.high as number,
            low: seriesData.low as number,
            close: seriesData.close as number,
            volume: volume as number | undefined,
          });
        } else if ('value' in seriesData) {
          // Line/Area chart - use value for all OHLC
          const val = seriesData.value as number;
          setLegendData({
            time: param.time as number,
            open: val,
            high: val,
            low: val,
            close: val,
          });
        }
      }
    });

    // Cleanup
    return () => {
      resizeObserverRef.current?.disconnect();
      chartRef.current?.remove();
      chartRef.current = null;
      mainSeriesRef.current = null;
      volumeSeriesRef.current = null;
      // Copy refs to variables for cleanup
      const currentIndicatorRefs = indicatorSeriesRef.current;
      const currentOverlayRefs = overlaySeriesRef.current;
      currentIndicatorRefs.clear();
      currentOverlayRefs.clear();
      crosshairPriceRef.current = null;
    };
  }, [onCrosshairPriceChange, crosshairPriceRef, chartType]); // Include callback, ref and chartType in deps

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
  }, [chartType, chartData]);

  // Track state for efficient updates
  const lastSymbolRef = useRef<string | null>(null);
  const prevDataLengthRef = useRef<number>(0);

  // Update chart data when symbol or bars change
  useEffect(() => {
    if (!mainSeriesRef.current) return;

    // Check if we need a full reset (symbol change or significant data change)
    const isSymbolChange = activeSymbol !== lastSymbolRef.current;
    const dataLengthDiff = Math.abs(chartData.length - prevDataLengthRef.current);
    const isSignificantChange = dataLengthDiff > 1;

    if (isSymbolChange || isSignificantChange || chartData.length === 0) {
      // Full reset
      mainSeriesRef.current.setData(chartData as any);

      if (volumeSeriesRef.current) {
        volumeSeriesRef.current.setData(volumeData);
      }

      // Only fit content on symbol change or initial load
      if (isSymbolChange && chartData.length > 0) {
        chartRef.current?.timeScale().fitContent();
      }

      lastSymbolRef.current = activeSymbol;
    } else {
      // Incremental update (real-time tick)
      const lastBar = chartData[chartData.length - 1];
      const lastVolume = volumeData[volumeData.length - 1];

      if (lastBar) {
        mainSeriesRef.current.update(lastBar as any);
      }
      if (volumeSeriesRef.current && lastVolume) {
        volumeSeriesRef.current.update(lastVolume);
      }
    }

    prevDataLengthRef.current = chartData.length;
  }, [activeSymbol, chartData, volumeData]);

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

  // Fetch and render overlay symbols
  useEffect(() => {
    if (!chartRef.current) return;

    // Fetch bars for any overlay symbols that don't have data
    overlaySymbols.forEach((symbol) => {
      if (!bars[symbol]) {
        fetchBars(symbol);
      }
    });

    // Get current overlay symbols set
    const overlaySet = new Set(overlaySymbols);

    // Remove series for symbols no longer in overlays
    overlaySeriesRef.current.forEach((series, symbol) => {
      if (!overlaySet.has(symbol)) {
        chartRef.current?.removeSeries(series);
        overlaySeriesRef.current.delete(symbol);
      }
    });

    // Get the main symbol's first value for normalization
    const mainFirstValue = symbolBars.length > 0 ? symbolBars[0].close : null;
    if (!mainFirstValue) return;

    // Add or update overlay series
    overlaySymbols.forEach((symbol, index) => {
      const overlayBars = bars[symbol];
      if (!overlayBars || overlayBars.length === 0) return;

      // Get or create series
      let series = overlaySeriesRef.current.get(symbol);
      if (!series) {
        series = chartRef.current!.addSeries(LineSeries, {
          color: OVERLAY_COLORS[index % OVERLAY_COLORS.length],
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
          title: symbol,
        });
        overlaySeriesRef.current.set(symbol, series);
      }

      // Normalize to percentage change from first bar (for fair comparison)
      const overlayFirstValue = overlayBars[0].close;
      const normalizedData: LineData[] = overlayBars.map((bar) => ({
        time: bar.time as UTCTimestamp,
        // Scale overlay to main chart's price range using % change
        value: mainFirstValue * (1 + (bar.close - overlayFirstValue) / overlayFirstValue),
      }));

      series.setData(normalizedData);
    });
  }, [overlaySymbols, bars, symbolBars, fetchBars]);

  // Helper function to create main series
  function createMainSeries(chart: IChartApi, type: ChartType) {
    switch (type) {
      case "candlestick": {
        const series = chart.addSeries(CandlestickSeries, {
          upColor: CHART_THEME.upColor,
          downColor: CHART_THEME.downColor,
          borderVisible: true,
          borderUpColor: CHART_THEME.upColor,
          borderDownColor: CHART_THEME.downColor,
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

  // Public method to update chart with new real-time bar (for WebSocket integration)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    <div className="relative w-full h-full">
      {/* Chart Canvas */}
      <div
        ref={chartContainerRef}
        className={className}
        style={{ width: "100%", height: "100%" }}
      />

      {/* OHLCV Legend - TradingView style */}
      <ChartLegend
        symbol={activeSymbol}
        data={legendData}
        prevClose={prevClose}
      />

      {/* Ticker Symbol Watermark - on top with pointer-events: none */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
        style={{ zIndex: 10 }}
      >
        <span
          className="font-extrabold"
          style={{
            fontSize: 'clamp(1.8rem, 6.6vw, 5.4rem)',
            color: 'rgba(255, 255, 255, 0.08)',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            letterSpacing: '0.25em',
            transform: 'translateX(5%)',
          }}
        >
          {activeSymbol}
        </span>
      </div>
    </div>
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
