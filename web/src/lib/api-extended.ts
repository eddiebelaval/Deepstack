import { api as baseApi } from './api';

// Extended types for new endpoints
export type StockAnalysis = {
  symbol: string;
  analysis: string;
  score?: number;
  thesis?: string;
};

export type OrderTicketRequest = {
  symbol: string;
  quantity: number;
  action: 'BUY' | 'SELL';
  order_type?: 'MKT' | 'LMT' | 'STP';
  limit_price?: number;
  stop_price?: number;
};

export type OrderTicket = {
  id: string;
  symbol: string;
  quantity: number;
  action: 'BUY' | 'SELL';
  order_type: 'MKT' | 'LMT' | 'STP';
  limit_price?: number;
  estimated_value: number;
  position_pct: number;
  kelly_suggested?: number;
  risk_warnings: string[];
};

export type PositionSizeRequest = {
  symbol: string;
  entry_price: number;
  stop_price: number;
};

export type KellyResult = {
  symbol: string;
  suggested_shares: number;
  position_value: number;
  risk_amount: number;
};

export type ChartDataRequest = {
  symbol: string;
  timeframe?: string;
  bars?: number;
};

export type OHLCVBar = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
    cache: 'no-store'
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

// Extended API methods
export const api = {
  ...baseApi,

  analyzeStock: (symbol: string) =>
    http<StockAnalysis>(`/api/v1/agents/analyze`, {
      method: 'POST',
      body: JSON.stringify({ symbol }),
    }),

  createOrderTicket: (order: OrderTicketRequest) =>
    http<OrderTicket>(`/api/v1/orders/ticket`, {
      method: 'POST',
      body: JSON.stringify(order),
    }),

  confirmOrder: (ticketId: string) =>
    http<any>(`/api/v1/orders/confirm`, {
      method: 'POST',
      body: JSON.stringify({ ticket_id: ticketId }),
    }),

  calculatePositionSize: (params: PositionSizeRequest) =>
    http<KellyResult>(`/api/v1/risk/position-size`, {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  getChartData: (params: ChartDataRequest) =>
    http<OHLCVBar[]>(`/api/v1/market/bars/${encodeURIComponent(params.symbol)}?timeframe=${params.timeframe || '1d'}&bars=${params.bars || 100}`),

  searchNews: (query: string) =>
    http<{ results: any[] }>(`/api/v1/news/search`, {
      method: 'POST',
      body: JSON.stringify({ query }),
    }),
};
