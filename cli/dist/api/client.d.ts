/**
 * API Client for DeepStack CLI
 *
 * Handles communication with the Python FastAPI backend.
 */
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
export declare class APIClient {
    private client;
    private baseURL;
    constructor(baseURL?: string);
    startAutomation(cadence_s?: number, symbols?: string[]): Promise<any>;
    stopAutomation(): Promise<any>;
    automationStatus(): Promise<any>;
    healthCheck(): Promise<boolean>;
    getQuote(symbol: string): Promise<QuoteData>;
    getPositions(): Promise<PositionData[]>;
    getAccountSummary(): Promise<AccountSummary>;
    placeOrder(order: OrderRequest): Promise<OrderResponse>;
    cancelOrder(orderId: string): Promise<void>;
    quickQuote(symbol: string): Promise<string>;
    getPortfolioStatus(): Promise<string>;
    connectWebSocket(onMessage: (data: any) => void): WebSocket | null;
}
