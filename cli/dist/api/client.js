/**
 * API Client for DeepStack CLI
 *
 * Handles communication with the Python FastAPI backend.
 */
import axios from 'axios';
export class APIClient {
    client;
    baseURL;
    constructor(baseURL = 'http://127.0.0.1:8000') {
        this.baseURL = baseURL;
        this.client = axios.create({
            baseURL,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
        // Add response interceptor for error handling
        this.client.interceptors.response.use((response) => response, (error) => {
            if (error.code === 'ECONNREFUSED') {
                throw new Error('Cannot connect to DeepStack backend. Is the server running?');
            }
            if (error.response) {
                throw new Error(`API Error: ${error.response.status} - ${error.response.data.detail || error.message}`);
            }
            throw error;
        });
    }
    async healthCheck() {
        try {
            const response = await this.client.get('/health');
            return response.data.status === 'healthy';
        }
        catch (error) {
            throw new Error('Health check failed');
        }
    }
    async getQuote(symbol) {
        try {
            const response = await this.client.get(`/quote/${symbol}`);
            return response.data;
        }
        catch (error) {
            throw error;
        }
    }
    async getPositions() {
        try {
            const response = await this.client.get('/positions');
            return response.data;
        }
        catch (error) {
            throw error;
        }
    }
    async getAccountSummary() {
        try {
            const response = await this.client.get('/account');
            return response.data;
        }
        catch (error) {
            throw error;
        }
    }
    async placeOrder(order) {
        try {
            const response = await this.client.post('/orders', order);
            return response.data;
        }
        catch (error) {
            throw error;
        }
    }
    async cancelOrder(orderId) {
        try {
            await this.client.delete(`/orders/${orderId}`);
        }
        catch (error) {
            throw error;
        }
    }
    // Utility methods for CLI commands
    async quickQuote(symbol) {
        const quote = await this.getQuote(symbol);
        const price = quote.last?.toFixed(2) || 'N/A';
        const change = quote.last ? '+0.00' : 'N/A'; // Would need previous close for real change
        return `${symbol}: $${price} (${change})`;
    }
    async getPortfolioStatus() {
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
    connectWebSocket(onMessage) {
        try {
            const ws = new WebSocket(this.baseURL.replace('http', 'ws') + '/ws');
            ws.onopen = () => {
                console.log('Connected to DeepStack real-time updates');
            };
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    onMessage(data);
                }
                catch (error) {
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
        }
        catch (error) {
            console.error('Failed to connect WebSocket:', error);
            return null;
        }
    }
}
