"use client";

import { useEffect, useRef, useCallback } from "react";
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
};

const DEFAULT_OPTIONS: Required<UseWebSocketOptions> = {
  url: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws",
  autoConnect: true,
  reconnectOnError: true,
  maxReconnectAttempts: 10,
  baseReconnectDelay: 1000,
  maxReconnectDelay: 30000,
  heartbeatInterval: 30000,
};

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
            console.log("[WS] Unhandled message type:", message.type);
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
  const connect = useCallback(() => {
    // Don't connect if already connected or connecting
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    isManuallyClosedRef.current = false;

    try {
      const ws = new WebSocket(opts.url);

      ws.onopen = () => {
        console.log("[WS] Connected to", opts.url);
        setWsConnected(true);
        setWsReconnecting(false);
        setLastError(null);
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

      ws.onerror = (error) => {
        console.error("[WS] Error:", error);
        setLastError("WebSocket connection error");
      };

      ws.onclose = (event) => {
        console.log("[WS] Disconnected:", event.code, event.reason);
        setWsConnected(false);
        stopHeartbeat();

        // Reconnect if not manually closed and reconnect is enabled
        if (!isManuallyClosedRef.current && opts.reconnectOnError) {
          if (reconnectAttemptsRef.current < opts.maxReconnectAttempts) {
            const delay = getReconnectDelay();
            console.log(
              `[WS] Reconnecting in ${Math.round(delay)}ms (attempt ${
                reconnectAttemptsRef.current + 1
              }/${opts.maxReconnectAttempts})`
            );

            setWsReconnecting(true);
            reconnectAttemptsRef.current++;

            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, delay);
          } else {
            console.error("[WS] Max reconnect attempts reached");
            setLastError("Connection lost. Please refresh the page.");
            setWsReconnecting(false);
          }
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("[WS] Failed to create WebSocket:", error);
      setLastError("Failed to connect to server");
    }
  }, [
    opts.url,
    opts.reconnectOnError,
    opts.maxReconnectAttempts,
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
    console.warn("[WS] Cannot send message: not connected");
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
    send,
    subscribeSymbols,
    unsubscribeSymbols,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  };
}

export default useWebSocket;
