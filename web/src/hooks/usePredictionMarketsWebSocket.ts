'use client';

/**
 * usePredictionMarketsWebSocket - Real-time prediction market updates via WebSocket
 *
 * Features:
 * - Auto-reconnect on disconnect with exponential backoff
 * - Subscribes to prediction-market price updates
 * - Updates Zustand store with live prices
 * - Connection status indicator
 * - Falls back to polling if WebSocket unavailable
 * - Graceful degradation when backend is unavailable
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { usePredictionMarketsStore } from '@/lib/stores/prediction-markets-store';
import type { PredictionMarket } from '@/lib/types/prediction-markets';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'unavailable';

interface WebSocketMessage {
    type: string;
    timestamp: string;
    data: {
        markets?: PredictionMarket[];
        market?: PredictionMarket;
        action?: 'update' | 'add' | 'remove';
    };
}

// Polling fallback interval in milliseconds
const POLLING_INTERVAL = 60000; // Increased from 30s to reduce load

// Reconnect settings - reduced to avoid console spam
const MAX_RECONNECT_ATTEMPTS = 2;
const INITIAL_RECONNECT_DELAY = 3000;

// Backend availability check cache
let backendChecked = false;
let backendAvailable = false;

/**
 * Check if backend WebSocket is available
 */
async function checkBackendAvailable(): Promise<boolean> {
    if (backendChecked) return backendAvailable;

    try {
        const wsHost = process.env.NEXT_PUBLIC_API_URL?.replace(/^https?:\/\//, '') || 'localhost:8000';
        const httpUrl = `http://${wsHost.replace(/\/ws$/, '')}/health`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const response = await fetch(httpUrl, {
            method: 'GET',
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        backendChecked = true;
        backendAvailable = response.ok;
        return backendAvailable;
    } catch {
        backendChecked = true;
        backendAvailable = false;
        return false;
    }
}

export function usePredictionMarketsWebSocket() {
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectAttemptRef = useRef(0);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const hasLoggedUnavailable = useRef(false);

    const [status, setStatus] = useState<ConnectionStatus>('disconnected');
    const [isUsingPolling, setIsUsingPolling] = useState(false);

    const { setMarkets, markets } = usePredictionMarketsStore();

    // Polling fallback when WebSocket unavailable
    const startPollingFallback = useCallback(() => {
        if (pollingIntervalRef.current) return;

        setIsUsingPolling(true);
        setStatus('unavailable');

        // Only log once
        if (!hasLoggedUnavailable.current && process.env.NODE_ENV === 'development') {
            hasLoggedUnavailable.current = true;
            console.log('[Prediction Markets] Backend unavailable - using polling fallback');
        }

        const poll = async () => {
            try {
                const res = await fetch('/api/prediction-markets?limit=20');
                if (res.ok) {
                    const data = await res.json();
                    setMarkets(data.markets || data);
                }
            } catch {
                // Silently handle polling errors - don't spam console
            }
        };

        // Initial poll
        poll();

        // Set up interval
        pollingIntervalRef.current = setInterval(poll, POLLING_INTERVAL);
    }, [setMarkets]);

    // Handle incoming WebSocket messages
    const handleMessage = useCallback((event: MessageEvent) => {
        try {
            const message: WebSocketMessage = JSON.parse(event.data);

            // Only handle prediction-market updates
            if (message.type === 'prediction-market') {
                const { data } = message;

                if (data.markets) {
                    // Full market list update
                    setMarkets(data.markets);
                } else if (data.market) {
                    // Single market update - merge into existing markets
                    const updatedMarkets = markets.map((m) =>
                        m.id === data.market!.id && m.platform === data.market!.platform
                            ? data.market!
                            : m
                    );
                    setMarkets(updatedMarkets);
                }
            }
        } catch (err) {
            console.error('Error parsing WebSocket message:', err);
        }
    }, [markets, setMarkets]);

    // Connect to WebSocket - using ref for reconnect to avoid circular dependency
    const connectRef = useRef<(() => void) | undefined>(undefined);

    const connect = useCallback(async () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            return;
        }

        // Check backend availability first
        const isAvailable = await checkBackendAvailable();
        if (!isAvailable) {
            // Backend unavailable - skip WebSocket, go straight to polling
            startPollingFallback();
            return;
        }

        setStatus('connecting');

        try {
            // Determine WebSocket URL based on environment
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsHost = process.env.NEXT_PUBLIC_API_URL?.replace(/^https?:\/\//, '') || 'localhost:8000';
            const wsUrl = `${wsProtocol}//${wsHost}/ws`;

            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                setStatus('connected');
                setIsUsingPolling(false);
                hasLoggedUnavailable.current = false;
                reconnectAttemptRef.current = 0;

                // Subscribe to prediction market updates
                ws.send(JSON.stringify({
                    action: 'subscribe',
                    channel: 'prediction-markets',
                }));

                // Clear any polling interval
                if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                }
            };

            ws.onmessage = handleMessage;

            ws.onclose = () => {
                setStatus('disconnected');
                wsRef.current = null;

                // Attempt reconnection with exponential backoff
                if (reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
                    // Silently fall back to polling
                    startPollingFallback();
                    return;
                }

                const delay = INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttemptRef.current);
                reconnectAttemptRef.current += 1;

                // Only log in development, and only first attempt
                if (process.env.NODE_ENV === 'development' && reconnectAttemptRef.current === 1) {
                    console.log(`[Prediction Markets] WebSocket disconnected, reconnecting...`);
                }

                reconnectTimeoutRef.current = setTimeout(() => {
                    connectRef.current?.();
                }, delay);
            };

            ws.onerror = () => {
                // Suppress error logging - the onclose handler will manage fallback
                setStatus('error');
                // Close will trigger onclose handler which handles reconnection
            };
        } catch {
            // Silently fall back to polling on any error
            startPollingFallback();
        }
    }, [handleMessage, startPollingFallback]);

    // Store connect in ref for reconnection
    connectRef.current = connect;

    // Disconnect and cleanup
    const disconnect = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }

        setStatus('disconnected');
    }, []);

    // Connect on mount, disconnect on unmount
    useEffect(() => {
        connect();

        return () => {
            disconnect();
        };
    }, [connect, disconnect]);

    return {
        status,
        isConnected: status === 'connected',
        isUsingPolling,
        reconnect: connect,
        disconnect,
    };
}
