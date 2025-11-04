/**
 * API Client for DeepStack CLI
 *
 * Handles communication with the Python FastAPI backend.
 */

import axios, { AxiosInstance } from 'axios';

export interface QuoteData {
  symbol: string;
  bid?: number;
  ask?: number;
  last?: number;
  volume?: number;
  timestamp: string;
}

export interface PositionData {
  symbol: string;
  position: number;
  avg_cost: number;
  market_value: number;
  unrealized_pnl: number;
  realized_pnl: number;
}

export interface OrderRequest {
  symbol: string;
  quantity: number;
  action: string;
  order_type?: string;
  limit_price?: number;
  stop_price?: number;
}

export interface OrderResponse {
  order_id?: string;
  status: string;
  message: string;
}

export interface AccountSummary {
  cash: number;
  buying_power: number;
  portfolio_value: number;
  day_pnl: number;
  total_pnl: number;
}

export class APIClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string = 'http://127.0.0.1:8000') {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.code === 'ECONNREFUSED') {
          throw new Error('Cannot connect to DeepStack backend. Is the server running?');
        }
        if (error.response) {
          throw new Error(`API Error: ${error.response.status} - ${error.response.data.detail || error.message}`);
        }
        throw error;
      }
    );
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'healthy';
    } catch (error) {
      throw new Error('Health check failed');
    }
  }

  async getQuote(symbol: string): Promise<QuoteData> {
    try {
      const response = await this.client.get(`/quote/${symbol}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getPositions(): Promise<PositionData[]> {
    try {
      const response = await this.client.get('/positions');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getAccountSummary(): Promise<AccountSummary> {
    try {
      const response = await this.client.get('/account');
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async placeOrder(order: OrderRequest): Promise<OrderResponse> {
    try {
      const response = await this.client.post('/orders', order);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async cancelOrder(orderId: string): Promise<void> {
    try {
      await this.client.delete(`/orders/${orderId}`);
    } catch (error) {
      throw error;
    }
  }

  // Utility methods for CLI commands
  async quickQuote(symbol: string): Promise<string> {
    const quote = await this.getQuote(symbol);
    const price = quote.last?.toFixed(2) || 'N/A';
    const change = quote.last ? '+0.00' : 'N/A'; // Would need previous close for real change
    return `${symbol}: $${price} (${change})`;
  }

  async getPortfolioStatus(): Promise<string> {
    const [positions, account] = await Promise.all([
      this.getPositions(),
      this.getAccountSummary()
    ]);

    const totalValue = account.portfolio_value.toFixed(2);
    const dayPnL = account.day_pnl.toFixed(2);
    const positionCount = positions.length;

    return `Portfolio: $${totalValue} | Day P&L: $${dayPnL} | Positions: ${positionCount}`;
  }

  // WebSocket connection for real-time updates (future enhancement)
  connectWebSocket(onMessage: (data: any) => void): WebSocket | null {
    try {
      const ws = new WebSocket(this.baseURL.replace('http', 'ws') + '/ws');

      ws.onopen = () => {
        console.log('Connected to DeepStack real-time updates');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('Disconnected from DeepStack real-time updates');
      };

      return ws;
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      return null;
    }
  }
}
