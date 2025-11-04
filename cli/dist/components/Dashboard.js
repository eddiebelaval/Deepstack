import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Dashboard Component - Main PipBoy Trading Interface
 *
 * Displays real-time portfolio overview, recent activity, and key metrics.
 */
import { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
export const Dashboard = ({ apiClient }) => {
    const [positions, setPositions] = useState([]);
    const [accountSummary, setAccountSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Load dashboard data
    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            const [positionsData, accountData] = await Promise.all([
                apiClient.getPositions(),
                apiClient.getAccountSummary()
            ]);
            setPositions(positionsData);
            setAccountSummary(accountData);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        loadData();
        // Auto-refresh every 30 seconds
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
    }, []);
    // Manual refresh with 'r' key
    useInput((input) => {
        if (input === 'r') {
            loadData();
        }
    });
    if (loading) {
        return (_jsx(Box, { justifyContent: "center", alignItems: "center", height: 10, children: _jsxs(Text, { color: "cyan", children: [_jsx(Spinner, { type: "dots" }), ' Loading DeepStack Dashboard...'] }) }));
    }
    if (error) {
        return (_jsxs(Box, { flexDirection: "column", paddingX: 2, children: [_jsx(Text, { color: "red", bold: true, children: "\u26A0\uFE0F  Connection Error" }), _jsx(Text, { color: "gray", children: error }), _jsx(Text, { color: "cyan", dimColor: true, children: "Press 'r' to retry" })] }));
    }
    const renderPortfolioSummary = () => {
        if (!accountSummary)
            return null;
        const totalValue = accountSummary.portfolio_value;
        const cash = accountSummary.cash;
        const dayPnL = accountSummary.day_pnl;
        const dayPnLPct = totalValue > 0 ? (dayPnL / (totalValue - dayPnL)) * 100 : 0;
        return (_jsxs(Box, { flexDirection: "column", marginBottom: 2, children: [_jsx(Text, { color: "yellow", bold: true, children: "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 PORTFOLIO SUMMARY \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550" }), _jsxs(Box, { justifyContent: "space-between", children: [_jsxs(Box, { flexDirection: "column", children: [_jsxs(Text, { children: [_jsx(Text, { color: "green", children: "Total Value:" }), " $", totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })] }), _jsxs(Text, { children: [_jsx(Text, { color: "cyan", children: "Cash:" }), " $", cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })] })] }), _jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { children: _jsxs(Text, { color: dayPnL >= 0 ? "green" : "red", children: ["Day P&L: ", dayPnL >= 0 ? '+' : '', "$", dayPnL.toFixed(2), " (", dayPnLPct >= 0 ? '+' : '', dayPnLPct.toFixed(2), "%)"] }) }), _jsxs(Text, { children: [_jsx(Text, { color: "cyan", children: "Buying Power:" }), " $", accountSummary.buying_power.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })] })] })] })] }));
    };
    const renderPositionsTable = () => {
        if (positions.length === 0) {
            return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { color: "yellow", bold: true, children: "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 POSITIONS \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550" }), _jsx(Text, { color: "gray", italic: true, children: "No open positions" })] }));
        }
        return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { color: "yellow", bold: true, children: "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 POSITIONS \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550" }), _jsxs(Box, { marginBottom: 1, children: [_jsx(Box, { width: 10, children: _jsx(Text, { color: "cyan", bold: true, children: "SYMBOL" }) }), _jsx(Box, { width: 8, children: _jsx(Text, { color: "cyan", bold: true, children: "SHARES" }) }), _jsx(Box, { width: 10, children: _jsx(Text, { color: "cyan", bold: true, children: "AVG COST" }) }), _jsx(Box, { width: 12, children: _jsx(Text, { color: "cyan", bold: true, children: "MKT VALUE" }) }), _jsx(Box, { width: 10, children: _jsx(Text, { color: "cyan", bold: true, children: "UNRL P&L" }) }), _jsx(Box, { width: 10, children: _jsx(Text, { color: "cyan", bold: true, children: "TOTAL P&L" }) })] }), positions.slice(0, 8).map((position) => (_jsxs(Box, { children: [_jsx(Box, { width: 10, children: _jsx(Text, { color: "white", bold: true, children: position.symbol }) }), _jsx(Box, { width: 8, children: _jsx(Text, { children: position.position }) }), _jsx(Box, { width: 10, children: _jsxs(Text, { children: ["$", position.avg_cost.toFixed(2)] }) }), _jsx(Box, { width: 12, children: _jsxs(Text, { children: ["$", position.market_value.toFixed(2)] }) }), _jsx(Box, { width: 10, children: _jsxs(Text, { color: position.unrealized_pnl >= 0 ? "green" : "red", children: [position.unrealized_pnl >= 0 ? '+' : '', "$", position.unrealized_pnl.toFixed(2)] }) }), _jsx(Box, { width: 10, children: _jsxs(Text, { color: position.realized_pnl + position.unrealized_pnl >= 0 ? "green" : "red", children: [position.realized_pnl + position.unrealized_pnl >= 0 ? '+' : '', "$", (position.realized_pnl + position.unrealized_pnl).toFixed(2)] }) })] }, position.symbol))), positions.length > 8 && (_jsxs(Text, { color: "gray", italic: true, children: ["... and ", positions.length - 8, " more positions"] }))] }));
    };
    const renderActivityFeed = () => {
        // Mock activity feed - would be populated from real trade data
        const activities = [
            { time: '14:32:15', action: 'BUY', symbol: 'AAPL', quantity: 50, price: 185.23 },
            { time: '14:28:42', action: 'SELL', symbol: 'TSLA', quantity: 25, price: 242.67 },
            { time: '14:15:33', action: 'BUY', symbol: 'NVDA', quantity: 30, price: 875.12 },
        ];
        return (_jsxs(Box, { flexDirection: "column", width: 40, children: [_jsx(Text, { color: "yellow", bold: true, children: "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 RECENT ACTIVITY \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550" }), activities.map((activity, index) => (_jsxs(Box, { marginBottom: 1, children: [_jsx(Text, { color: "gray", dimColor: true, children: activity.time }), _jsxs(Text, { color: "white", children: [' ', activity.action, " ", activity.quantity, " ", activity.symbol, " @ $", activity.price.toFixed(2)] })] }, index))), _jsx(Text, { color: "cyan", dimColor: true, children: "Press 'r' to refresh" })] }));
    };
    const renderQuickActions = () => (_jsxs(Box, { flexDirection: "column", marginTop: 2, children: [_jsx(Text, { color: "yellow", bold: true, children: "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 QUICK ACTIONS \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550" }), _jsxs(Box, { children: [_jsx(Text, { color: "cyan", children: "\u2022 " }), _jsx(Text, { children: "Buy/Sell: " }), _jsx(Text, { color: "green", bold: true, children: "deepstack buy AAPL 100" })] }), _jsxs(Box, { children: [_jsx(Text, { color: "cyan", children: "\u2022 " }), _jsx(Text, { children: "Get Quote: " }), _jsx(Text, { color: "green", bold: true, children: "deepstack quote TSLA" })] }), _jsxs(Box, { children: [_jsx(Text, { color: "cyan", children: "\u2022 " }), _jsx(Text, { children: "View Positions: " }), _jsx(Text, { color: "green", bold: true, children: "Press 'p'" })] }), _jsxs(Box, { children: [_jsx(Text, { color: "cyan", children: "\u2022 " }), _jsx(Text, { children: "Risk Analysis: " }), _jsx(Text, { color: "green", bold: true, children: "Press 'r'" })] })] }));
    return (_jsxs(Box, { flexDirection: "column", children: [renderPortfolioSummary(), _jsxs(Box, { children: [_jsxs(Box, { flexDirection: "column", width: "60%", children: [renderPositionsTable(), renderQuickActions()] }), _jsx(Box, { flexDirection: "column", width: "40%", children: renderActivityFeed() })] })] }));
};
