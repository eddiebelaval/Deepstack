'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Drawing types
export type DrawingType = 'trendline' | 'horizontal' | 'fib';

export type DrawingPoint = {
    time: number; // Unix timestamp
    price: number;
};

export type Drawing = {
    id: string;
    type: DrawingType;
    symbol: string;
    points: DrawingPoint[];
    color: string;
    createdAt: number;
};

type ChartDrawingsState = {
    // Active drawing tool (null when not drawing)
    activeDrawingTool: DrawingType | null;

    // Drawing in progress (temporary while placing points)
    pendingDrawing: Partial<Drawing> | null;

    // All saved drawings by symbol
    drawings: Record<string, Drawing[]>;

    // Actions
    setActiveDrawingTool: (tool: DrawingType | null) => void;
    startDrawing: (symbol: string, type: DrawingType, point: DrawingPoint) => void;
    addPointToDrawing: (point: DrawingPoint) => void;
    completeDrawing: () => void;
    cancelDrawing: () => void;
    removeDrawing: (symbol: string, drawingId: string) => void;
    clearDrawings: (symbol: string) => void;

    // Selectors
    getDrawingsForSymbol: (symbol: string) => Drawing[];
};

// Default colors for different drawing types
const DRAWING_COLORS: Record<DrawingType, string> = {
    trendline: '#3B82F6', // Blue
    horizontal: '#F59E0B', // Amber
    fib: '#A855F7', // Purple
};

export const useChartDrawings = create<ChartDrawingsState>()(
    persist(
        (set, get) => ({
            activeDrawingTool: null,
            pendingDrawing: null,
            drawings: {},

            setActiveDrawingTool: (tool) => set({ activeDrawingTool: tool }),

            startDrawing: (symbol, type, point) => {
                set({
                    pendingDrawing: {
                        id: `drawing-${Date.now()}`,
                        type,
                        symbol,
                        points: [point],
                        color: DRAWING_COLORS[type],
                        createdAt: Date.now(),
                    },
                });
            },

            addPointToDrawing: (point) => {
                const { pendingDrawing } = get();
                if (!pendingDrawing) return;

                set({
                    pendingDrawing: {
                        ...pendingDrawing,
                        points: [...(pendingDrawing.points || []), point],
                    },
                });
            },

            completeDrawing: () => {
                const { pendingDrawing, drawings } = get();
                if (!pendingDrawing || !pendingDrawing.symbol || !pendingDrawing.points) return;

                // Validate drawing has enough points
                const minPoints = pendingDrawing.type === 'horizontal' ? 1 : 2;
                if (pendingDrawing.points.length < minPoints) return;

                const symbol = pendingDrawing.symbol;
                const newDrawing = pendingDrawing as Drawing;

                set({
                    drawings: {
                        ...drawings,
                        [symbol]: [...(drawings[symbol] || []), newDrawing],
                    },
                    pendingDrawing: null,
                    activeDrawingTool: null,
                });
            },

            cancelDrawing: () => {
                set({
                    pendingDrawing: null,
                    activeDrawingTool: null,
                });
            },

            removeDrawing: (symbol, drawingId) => {
                const { drawings } = get();
                set({
                    drawings: {
                        ...drawings,
                        [symbol]: drawings[symbol]?.filter((d) => d.id !== drawingId) || [],
                    },
                });
            },

            clearDrawings: (symbol) => {
                const { drawings } = get();
                set({
                    drawings: {
                        ...drawings,
                        [symbol]: [],
                    },
                });
            },

            getDrawingsForSymbol: (symbol) => get().drawings[symbol] || [],
        }),
        {
            name: 'deepstack-chart-drawings',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                drawings: state.drawings, // Only persist drawings, not active tool state
            }),
        }
    )
);

export default useChartDrawings;
