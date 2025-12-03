export type QuoteData = {
  symbol: string;
  bid?: number;
  ask?: number;
  last?: number;
  volume?: number;
  timestamp: string;
};

export type PositionData = {
  symbol: string;
  position: number;
  avg_cost: number;
  market_value: number;
  unrealized_pnl: number;
  realized_pnl: number;
};

export type OrderRequest = {
  symbol: string;
  quantity: number;
  action: 'BUY' | 'SELL';
  order_type?: 'MKT' | 'LMT' | 'STP';
  limit_price?: number;
  stop_price?: number;
};

export type OrderResponse = {
  order_id?: string;
  status: string;
  message: string;
};

export type AccountSummary = {
  cash: number;
  buying_power: number;
  portfolio_value: number;
  day_pnl: number;
  total_pnl: number;
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

export const api = {
  health: () => http<{ status: string; timestamp: string; version: string }>(`/health`),
  quote: (symbol: string) => http<QuoteData>(`/quote/${encodeURIComponent(symbol)}`),
  positions: () => http<PositionData[]>(`/positions`),
  account: () => http<AccountSummary>(`/account`),
  placeOrder: (body: OrderRequest) => http<OrderResponse>(`/orders`, { method: 'POST', body: JSON.stringify(body) }),
  cancelOrder: (orderId: string) => http(`/orders/${encodeURIComponent(orderId)}`, { method: 'DELETE' }),
  automationStart: (cadence_s?: number, symbols?: string[]) =>
    http(`/automation/start`, { method: 'POST', body: JSON.stringify({ cadence_s, symbols }) }),
  automationStop: () => http(`/automation/stop`, { method: 'POST' }),
  automationStatus: () => http<{ running: boolean; cadence_s: number; last_run_ts?: string; last_action?: string; symbols?: string[] }>(`/automation/status`)
};
