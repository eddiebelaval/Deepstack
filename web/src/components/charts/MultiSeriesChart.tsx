"use client";

import { useEffect, useRef, useMemo } from "react";
import {
    createChart,
    LineSeries,
    type IChartApi,
    type ISeriesApi,
    type LineData,
    type UTCTimestamp,
    ColorType,
    CrosshairMode,
} from "lightweight-charts";

// Chart theme colors
const CHART_THEME = {
    background: "transparent",
    gridLines: "#2a2a2a",
    textColor: "#a0a0a0",
    crosshair: "#666666",
};

export type SeriesData = {
    symbol: string;
    data: { time: number; value: number }[];
    color: string;
    visible: boolean;
};

type MultiSeriesChartProps = {
    series: SeriesData[];
    logScale?: boolean;
    className?: string;
    onCrosshairMove?: (param: any) => void;
};

export function MultiSeriesChart({
    series,
    logScale = false,
    className,
    onCrosshairMove
}: MultiSeriesChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRefs = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
    const resizeObserverRef = useRef<ResizeObserver | null>(null);

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
                vertLines: { color: CHART_THEME.gridLines, style: 1, visible: true },
                horzLines: { color: CHART_THEME.gridLines, style: 1, visible: true },
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
                mode: logScale ? 1 : 0, // 1 = Logarithmic, 0 = Normal
                autoScale: true,
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

        if (onCrosshairMove) {
            chart.subscribeCrosshairMove(onCrosshairMove);
        }

        // Setup resize observer
        resizeObserverRef.current = new ResizeObserver((entries) => {
            if (entries.length === 0 || !chartRef.current) return;
            const { width, height } = entries[0].contentRect;
            chartRef.current.applyOptions({ width, height });
        });

        resizeObserverRef.current.observe(chartContainerRef.current);

        return () => {
            if (onCrosshairMove && chartRef.current) {
                chartRef.current.unsubscribeCrosshairMove(onCrosshairMove);
            }
            resizeObserverRef.current?.disconnect();
            chartRef.current?.remove();
            chartRef.current = null;
            seriesRefs.current.clear();
        };
    }, []); // Only run once on mount

    // Update Log Scale
    useEffect(() => {
        if (!chartRef.current) return;
        chartRef.current.priceScale('right').applyOptions({
            mode: logScale ? 1 : 0,
        });
    }, [logScale]);

    // Update Series
    useEffect(() => {
        if (!chartRef.current) return;

        const currentSymbols = new Set(series.map(s => s.symbol));

        // Remove series that are no longer present
        seriesRefs.current.forEach((s, symbol) => {
            if (!currentSymbols.has(symbol)) {
                chartRef.current?.removeSeries(s);
                seriesRefs.current.delete(symbol);
            }
        });

        // Add or update series
        series.forEach(s => {
            if (!s.visible) {
                const existing = seriesRefs.current.get(s.symbol);
                if (existing) {
                    chartRef.current?.removeSeries(existing);
                    seriesRefs.current.delete(s.symbol);
                }
                return;
            }

            let lineSeries = seriesRefs.current.get(s.symbol);

            if (!lineSeries) {
                lineSeries = chartRef.current!.addSeries(LineSeries, {
                    color: s.color,
                    lineWidth: 2,
                    priceLineVisible: false,
                    lastValueVisible: true,
                    crosshairMarkerVisible: true,
                });
                seriesRefs.current.set(s.symbol, lineSeries);
            } else {
                lineSeries.applyOptions({ color: s.color });
            }

            // Format data
            const lineData: LineData[] = s.data.map(d => ({
                time: d.time as UTCTimestamp,
                value: d.value,
            }));

            lineSeries.setData(lineData);
        });

        // Fit content if it's the first load or significant change
        // For now, let's just fit content when series count changes
        chartRef.current.timeScale().fitContent();

    }, [series]);

    return (
        <div
            ref={chartContainerRef}
            className={className}
            style={{ width: "100%", height: "100%" }}
        />
    );
}
