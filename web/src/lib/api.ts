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

export type ManualPositionRequest = {
  symbol: string;
  quantity: number;
  avg_cost: number;
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

import { createClient } from '@/lib/supabase/client';
import { useCreditStore } from '@/lib/stores/credit-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

class PaywallError extends Error {
  constructor() {
    super('Payment Required');
    this.name = 'PaywallError';
  }
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const supabase = createClient();
  let token = null;

  if (supabase) {
    const { data } = await supabase.auth.getSession();
    token = data.session?.access_token;
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(init?.headers || {}),
  };

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    cache: 'no-store'
  });

  if (res.status === 402) {
    // Dispatch event for UI to catch
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('deepstack-paywall'));
    }
    throw new PaywallError();
  }

  // Sync credits from response header
  const creditsHeader = res.headers.get('X-DeepStack-Credits');
  if (creditsHeader) {
    // syncFromHeader handles parsing internally
    useCreditStore.getState().syncFromHeader(creditsHeader);
  }

  // Also check for tier header if provided
  const tierHeader = res.headers.get('X-DeepStack-Tier');
  if (tierHeader && ['free', 'pro', 'elite'].includes(tierHeader)) {
    useCreditStore.getState().setTier(tierHeader as 'free' | 'pro' | 'elite');
  }

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
  addManualPosition: (body: ManualPositionRequest) => http<PositionData>(`/positions/manual`, { method: 'POST', body: JSON.stringify(body) }),
  cancelOrder: (orderId: string) => http(`/orders/${encodeURIComponent(orderId)}`, { method: 'DELETE' }),
  automationStart: (cadence_s?: number, symbols?: string[]) =>
    http(`/automation/start`, { method: 'POST', body: JSON.stringify({ cadence_s, symbols }) }),
  automationStop: () => http(`/automation/stop`, { method: 'POST' }),
  automationStatus: () => http<{ running: boolean; cadence_s: number; last_run_ts?: string; last_action?: string; symbols?: string[] }>(`/automation/status`)
};
