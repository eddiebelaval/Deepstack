"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useMarketDataStore, type QuoteData, type OHLCVBar } from "@/lib/stores/market-data-store";

// WebSocket message types from backend
type WSMessageType = "quote" | "bar" | "position" | "order" | "error" | "heartbeat";

type WSMessage = {
  type: WSMessageType;
  timestamp: string;
  data: unknown;
};

type QuoteMessage = {
  symbol: string;
  bid?: number;
  ask?: number;
  last: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  change?: number;
  changePercent?: number;
};

type BarMessage = {
  symbol: string;
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type UseWebSocketOptions = {
  url?: string;
  autoConnect?: boolean;
  reconnectOnError?: boolean;
  maxReconnectAttempts?: number;
  baseReconnectDelay?: number;
  maxReconnectDelay?: number;
  heartbeatInterval?: number;
  /** If true, will check backend availability before attempting to connect */
  checkBackendFirst?: boolean;
  /** Suppress console errors after initial connection failure (for frontend-only mode) */
  silentMode?: boolean;
};

const DEFAULT_OPTIONS: Required<UseWebSocketOptions> = {
  url: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws",
  autoConnect: true,
  reconnectOnError: true,
  maxReconnectAttempts: 3, // Reduced from 10 to avoid spam when backend is down
  baseReconnectDelay: 2000, // Increased from 1000
  maxReconnectDelay: 30000,
  heartbeatInterval: 30000,
  checkBackendFirst: true,
  silentMode: false,
};

// Backend availability check cache
let backendAvailable: boolean | null = null;
let lastBackendCheck: number = 0;
const BACKEND_CHECK_INTERVAL = 60000; // Re-check every 60 seconds

/**
 * Check if the WebSocket backend is available
 * Uses a simple HTTP health check before attempting WebSocket connection
 */
async function checkBackendAvailability(wsUrl: string): Promise<boolean> {
  const now = Date.now();

  // Return cached result if recent
  if (backendAvailable !== null && now - lastBackendCheck < BACKEND_CHECK_INTERVAL) {
    return backendAvailable;
  }

  try {
    // Extract host from WebSocket URL and check via HTTP
    const httpUrl = wsUrl
      .replace(/^ws:/, 'http:')
      .replace(/^wss:/, 'https:')
      .replace(/\/ws$/, '/health');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(httpUrl, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    backendAvailable = response.ok;
    lastBackendCheck = now;
    return backendAvailable;
  } catch {
    backendAvailable = false;
    lastBackendCheck = now;
    return false;
  }
}

/** Reset backend availability cache (useful for manual retry) */
export function resetBackendAvailabilityCache() {
  backendAvailable = null;
  lastBackendCheck = 0;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  // Filter out undefined values to ensure defaults are used properly
  const filteredOptions = Object.fromEntries(
    Object.entries(options).filter(([, value]) => value !== undefined)
  );
  const opts = { ...DEFAULT_OPTIONS, ...filteredOptions };

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isManuallyClosedRef = useRef(false);
  const isBackendUnavailableRef = useRef(false);
  const hasLoggedUnavailableRef = useRef(false);

  // Track if we're in "frontend-only mode" (backend unavailable)
  const [isFrontendOnlyMode, setIsFrontendOnlyMode] = useState(false);

  const {
    setWsConnected,
    setWsReconnecting,
    setLastError,
    updateQuote,
    updateLastBar,
    subscribedSymbols,
  } = useMarketDataStore();

  // Calculate reconnect delay with exponential backoff
  const getReconnectDelay = useCallback(() => {
    const delay = Math.min(
      opts.baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current),
      opts.maxReconnectDelay
    );
    // Add jitter (0-20% random variation)
    return delay + Math.random() * delay * 0.2;
  }, [opts.baseReconnectDelay, opts.maxReconnectDelay]);

  // Handle incoming messages
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const message: WSMessage = JSON.parse(event.data);

        switch (message.type) {
          case "quote": {
            const quoteData = message.data as QuoteMessage;
            const quote: QuoteData = {
              symbol: quoteData.symbol,
              bid: quoteData.bid,
              ask: quoteData.ask,
              last: quoteData.last,
              open: quoteData.open,
              high: quoteData.high,
              low: quoteData.low,
              close: quoteData.close,
              volume: quoteData.volume,
              change: quoteData.change,
              changePercent: quoteData.changePercent,
              timestamp: message.timestamp,
            };
            updateQuote(quoteData.symbol, quote);
            break;
          }

          case "bar": {
            const barData = message.data as BarMessage;
            const bar: OHLCVBar = {
              time: barData.time,
              open: barData.open,
              high: barData.high,
              low: barData.low,
              close: barData.close,
              volume: barData.volume,
            };
            updateLastBar(barData.symbol, bar);
            break;
          }

          case "heartbeat":
            // Connection is alive, nothing to do
            break;

          case "error": {
            const errorMsg = (message.data as { message?: string })?.message || "Unknown error";
            setLastError(errorMsg);
            break;
          }

          default:
            // Handle other message types (position, order) if needed
            if (process.env.NODE_ENV === 'development') {
              console.log("[WS] Unhandled message type:", message.type);
            }
        }
      } catch (error) {
        console.error("[WS] Error parsing message:", error);
      }
    },
    [updateQuote, updateLastBar, setLastError]
  );

  // Start heartbeat
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, opts.heartbeatInterval);
  }, [opts.heartbeatInterval]);

  // Stop heartbeat
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    if (process.env.NODE_ENV === 'test') {
      console.log('[useWebSocket connect()] called, creating WebSocket to:', opts.url);
    }

    // Don't connect if already connected or connecting
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) {
      if (process.env.NODE_ENV === 'test') {
        console.log('[useWebSocket connect()] already connected/connecting, returning');
      }
      return;
    }

    // Don't attempt connection if we know backend is unavailable
    if (isBackendUnavailableRef.current) {
      return;
    }

    isManuallyClosedRef.current = false;

    // Check backend availability first (if enabled)
    if (opts.checkBackendFirst) {
      const isAvailable = await checkBackendAvailability(opts.url);
      if (!isAvailable) {
        // Backend is unavailable - enter frontend-only mode
        isBackendUnavailableRef.current = true;
        setIsFrontendOnlyMode(true);

        // Only log once to avoid console spam
        if (!hasLoggedUnavailableRef.current) {
          hasLoggedUnavailableRef.current = true;
          if (process.env.NODE_ENV === 'development') {
            console.log("[WS] Backend unavailable - running in frontend-only mode. Real-time data disabled.");
          }
        }

        setWsConnected(false);
        setWsReconnecting(false);
        setLastError("Backend unavailable - using cached/REST data");
        return;
      }
    }

    try {
      const ws = new WebSocket(opts.url);
      if (process.env.NODE_ENV === 'test') {
        console.log('[useWebSocket connect()] WebSocket instance created');
      }

      ws.onopen = () => {
        if (process.env.NODE_ENV === 'development') {
          console.log("[WS] Connected to", opts.url);
        }
        setWsConnected(true);
        setWsReconnecting(false);
        setLastError(null);
        setIsFrontendOnlyMode(false);
        isBackendUnavailableRef.current = false;
        hasLoggedUnavailableRef.current = false;
        reconnectAttemptsRef.current = 0;

        // Start heartbeat
        startHeartbeat();

        // Re-subscribe to symbols
        if (subscribedSymbols.size > 0) {
          const symbols = Array.from(subscribedSymbols);
          ws.send(
            JSON.stringify({
              type: "subscribe",
              symbols,
            })
          );
        }
      };

      ws.onmessage = handleMessage;

      ws.onerror = () => {
        // Suppress error logging in silent mode or after we know backend is unavailable
        if (!opts.silentMode && !isBackendUnavailableRef.current) {
          // Only log in development, and only if this is a fresh attempt
          if (process.env.NODE_ENV === 'development' && reconnectAttemptsRef.current === 0) {
            console.log("[WS] Connection failed - backend may be unavailable");
          }
        }
        setLastError("WebSocket connection error");
      };

      ws.onclose = (event) => {
        // Only log if not in silent mode and backend was previously available
        if (process.env.NODE_ENV === 'development' && !isBackendUnavailableRef.current) {
          console.log("[WS] Disconnected:", event.code, event.reason || "");
        }
        setWsConnected(false);
        stopHeartbeat();

        // Reconnect if not manually closed and reconnect is enabled
        if (!isManuallyClosedRef.current && opts.reconnectOnError) {
          if (reconnectAttemptsRef.current < opts.maxReconnectAttempts) {
            const delay = getReconnectDelay();

            // Only log reconnect attempts in development
            if (process.env.NODE_ENV === 'development' && !isBackendUnavailableRef.current) {
              console.log(
                `[WS] Reconnecting in ${Math.round(delay)}ms (attempt ${
                  reconnectAttemptsRef.current + 1
                }/${opts.maxReconnectAttempts})`
              );
            }

            setWsReconnecting(true);
            reconnectAttemptsRef.current++;

            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, delay);
          } else {
            // Max attempts reached - enter frontend-only mode silently
            isBackendUnavailableRef.current = true;
            setIsFrontendOnlyMode(true);

            if (!hasLoggedUnavailableRef.current) {
              hasLoggedUnavailableRef.current = true;
              if (process.env.NODE_ENV === 'development') {
                console.log("[WS] Max reconnect attempts reached - running in frontend-only mode");
              }
            }

            setLastError("Backend unavailable - using cached/REST data");
            setWsReconnecting(false);
          }
        }
      };

      wsRef.current = ws;
    } catch (error) {
      // Suppress error logging after first failure
      if (!hasLoggedUnavailableRef.current && process.env.NODE_ENV === 'development') {
        hasLoggedUnavailableRef.current = true;
        console.log("[WS] Failed to create WebSocket - running in frontend-only mode");
      }
      isBackendUnavailableRef.current = true;
      setIsFrontendOnlyMode(true);
      setLastError("Backend unavailable - using cached/REST data");
    }
  }, [
    opts.url,
    opts.reconnectOnError,
    opts.maxReconnectAttempts,
    opts.checkBackendFirst,
    opts.silentMode,
    setWsConnected,
    setWsReconnecting,
    setLastError,
    handleMessage,
    startHeartbeat,
    stopHeartbeat,
    getReconnectDelay,
    subscribedSymbols,
  ]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    isManuallyClosedRef.current = true;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    stopHeartbeat();

    if (wsRef.current) {
      wsRef.current.close(1000, "Manual disconnect");
      wsRef.current = null;
    }

    setWsConnected(false);
    setWsReconnecting(false);
  }, [setWsConnected, setWsReconnecting, stopHeartbeat]);

  // Send message
  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
      return true;
    }
    // Only warn if not in frontend-only mode
    if (!isBackendUnavailableRef.current && process.env.NODE_ENV === 'development') {
      console.log("[WS] Cannot send message: not connected");
    }
    return false;
  }, []);

  // Subscribe to symbols
  const subscribeSymbols = useCallback(
    (symbols: string[]) => {
      return send({ type: "subscribe", symbols });
    },
    [send]
  );

  // Unsubscribe from symbols
  const unsubscribeSymbols = useCallback(
    (symbols: string[]) => {
      return send({ type: "unsubscribe", symbols });
    },
    [send]
  );

  // Retry connection (resets the backend unavailable state)
  const retryConnection = useCallback(() => {
    // Reset all state to allow fresh connection attempt
    isBackendUnavailableRef.current = false;
    hasLoggedUnavailableRef.current = false;
    reconnectAttemptsRef.current = 0;
    resetBackendAvailabilityCache();
    setIsFrontendOnlyMode(false);
    setLastError(null);

    // Attempt connection
    connect();
  }, [connect, setLastError]);

  // Auto-connect on mount
  useEffect(() => {
    if (opts.autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [opts.autoConnect, connect, disconnect]);

  return {
    connect,
    disconnect,
    retryConnection,
    send,
    subscribeSymbols,
    unsubscribeSymbols,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    isFrontendOnlyMode,
  };
}

export default useWebSocket;
