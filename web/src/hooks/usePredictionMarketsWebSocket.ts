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
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { usePredictionMarketsStore } from '@/lib/stores/prediction-markets-store';
import type { PredictionMarket } from '@/lib/types/prediction-markets';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

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
const POLLING_INTERVAL = 30000;

// Reconnect settings
const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000;

export function usePredictionMarketsWebSocket() {
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectAttemptRef = useRef(0);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const [status, setStatus] = useState<ConnectionStatus>('disconnected');
    const [isUsingPolling, setIsUsingPolling] = useState(false);

    const { setMarkets, markets } = usePredictionMarketsStore();

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

    // Connect to WebSocket
    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
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
                attemptReconnect();
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                setStatus('error');
                ws.close();
            };
        } catch (err) {
            console.error('Failed to create WebSocket:', err);
            setStatus('error');
            startPollingFallback();
        }
    }, [handleMessage]);

    // Attempt reconnection with exponential backoff
    const attemptReconnect = useCallback(() => {
        if (reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
            console.log('Max reconnect attempts reached, falling back to polling');
            startPollingFallback();
            return;
        }

        const delay = INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttemptRef.current);
        reconnectAttemptRef.current += 1;

        console.log(`Attempting WebSocket reconnect in ${delay}ms (attempt ${reconnectAttemptRef.current})`);

        reconnectTimeoutRef.current = setTimeout(() => {
            connect();
        }, delay);
    }, [connect]);

    // Polling fallback when WebSocket unavailable
    const startPollingFallback = useCallback(() => {
        if (pollingIntervalRef.current) return;

        setIsUsingPolling(true);
        console.log('Starting polling fallback for prediction markets');

        const poll = async () => {
            try {
                const res = await fetch('/api/prediction-markets?limit=20');
                if (res.ok) {
                    const data = await res.json();
                    setMarkets(data.markets || data);
                }
            } catch (err) {
                console.error('Polling error:', err);
            }
        };

        // Initial poll
        poll();

        // Set up interval
        pollingIntervalRef.current = setInterval(poll, POLLING_INTERVAL);
    }, [setMarkets]);

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
