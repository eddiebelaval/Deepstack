import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * PositionMonitor Component - Displays current portfolio positions
 *
 * Shows detailed position information with P&L tracking, risk metrics,
 * and real-time updates in PipBoy terminal aesthetic.
 */
import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { format } from 'date-fns';
export const PositionMonitor = ({ apiClient }) => {
    const [positions, setPositions] = useState([]);
    const [accountSummary, setAccountSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sortBy, setSortBy] = useState('pnl');
    const [showDetails, setShowDetails] = useState(false);
    // Load position data
    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            const [positionsData, accountData] = await Promise.all([
                apiClient.getPositions(),
                apiClient.getAccountSummary()
            ]);
            // Enhance positions with additional data
            const enhancedPositions = await Promise.all(positionsData.map(async (pos) => {
                try {
                    // Get current market price for each position
                    const quote = await apiClient.getQuote(pos.symbol);
                    const marketPrice = quote.last || pos.avg_cost;
                    // Calculate day change (simplified - would need previous close)
                    const dayChange = (marketPrice - pos.avg_cost) * pos.position;
                    const dayChangePct = pos.avg_cost > 0 ? (dayChange / (pos.avg_cost * pos.position)) * 100 : 0;
                    // Calculate risk contribution (simplified)
                    const riskContribution = Math.abs(pos.unrealized_pnl) / (accountData.portfolio_value || 1);
                    return {
                        ...pos,
                        market_price: marketPrice,
                        day_change: dayChange,
                        day_change_pct: dayChangePct,
                        risk_contribution: riskContribution
                    };
                }
                catch (err) {
                    // If quote fails, use avg_cost as market price
                    return {
                        ...pos,
                        market_price: pos.avg_cost,
                        day_change: 0,
                        day_change_pct: 0,
                        risk_contribution: 0
                    };
                }
            }));
            setPositions(enhancedPositions);
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
        // Auto-refresh every 10 seconds for positions
        const interval = setInterval(loadData, 10000);
        return () => clearInterval(interval);
    }, []);
    // Handle keyboard controls
    useInput((input) => {
        if (input === 'r')
            loadData(); // Refresh
        if (input === 'd')
            setShowDetails(!showDetails); // Toggle details
        if (input === 's') {
            // Cycle sort options
            const sortOptions = ['pnl', 'value', 'symbol', 'risk'];
            const currentIndex = sortOptions.indexOf(sortBy);
            setSortBy(sortOptions[(currentIndex + 1) % sortOptions.length]);
        }
    });
    // Sort positions based on current sort criteria
    const sortedPositions = React.useMemo(() => {
        const sorted = [...positions];
        switch (sortBy) {
            case 'pnl':
                return sorted.sort((a, b) => (b.unrealized_pnl + b.realized_pnl) - (a.unrealized_pnl + a.realized_pnl));
            case 'value':
                return sorted.sort((a, b) => b.market_value - a.market_value);
            case 'symbol':
                return sorted.sort((a, b) => a.symbol.localeCompare(b.symbol));
            case 'risk':
                return sorted.sort((a, b) => (b.risk_contribution || 0) - (a.risk_contribution || 0));
            default:
                return sorted;
        }
    }, [positions, sortBy]);
    if (loading) {
        return (_jsx(Box, { justifyContent: "center", alignItems: "center", height: 15, children: _jsx(Text, { color: "cyan", children: "Loading Positions..." }) }));
    }
    if (error) {
        return (_jsxs(Box, { flexDirection: "column", paddingX: 2, children: [_jsx(Text, { color: "red", bold: true, children: "\u26A0\uFE0F  Position Monitor Error" }), _jsx(Text, { color: "gray", children: error }), _jsx(Text, { color: "cyan", dimColor: true, children: "Press 'r' to retry | Press 'd' for dashboard" })] }));
    }
    const renderHeader = () => (_jsxs(Box, { flexDirection: "column", marginBottom: 2, children: [_jsx(Text, { color: "yellow", bold: true, children: "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550" }), _jsx(Text, { color: "yellow", bold: true, children: "\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2557\u2588\u2588\u2557     \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2557" }), _jsx(Text, { color: "yellow", bold: true, children: "\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D\u2588\u2588\u2551\u2588\u2588\u2551     \u255A\u2550\u2550\u2588\u2588\u2554\u2550\u2550\u255D\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557" }), _jsx(Text, { color: "yellow", bold: true, children: "\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2551\u2588\u2588\u2551        \u2588\u2588\u2551   \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D" }), _jsx(Text, { color: "yellow", bold: true, children: "\u255A\u2550\u2550\u2550\u2550\u2588\u2588\u2551\u2588\u2588\u2551\u2588\u2588\u2551        \u2588\u2588\u2551   \u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u255D  \u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2550\u255D" }), _jsx(Text, { color: "yellow", bold: true, children: "\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551\u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557   \u2588\u2588\u2551   \u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2551" }), _jsx(Text, { color: "yellow", bold: true, children: "\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D\u255A\u2550\u255D\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D   \u255A\u2550\u255D   \u255A\u2550\u255D  \u255A\u2550\u255D\u255A\u2550\u255D  \u255A\u2550\u255D\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D\u255A\u2550\u255D  \u255A\u2550\u255D\u255A\u2550\u255D" }), _jsx(Text, { color: "yellow", bold: true, children: "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550" }), _jsxs(Box, { justifyContent: "space-between", marginY: 1, children: [_jsxs(Text, { color: "green", children: ["\u25CF ", positions.length, " Positions"] }), _jsxs(Text, { color: "cyan", children: ["Sort: ", sortBy.toUpperCase()] }), _jsx(Text, { color: "yellow", children: format(new Date(), 'HH:mm:ss') })] }), _jsx(Text, { color: "gray", dimColor: true, children: "[R]efresh | [S]ort | [D]etails | [Q]uit" })] }));
    const renderPortfolioSummary = () => {
        if (!accountSummary)
            return null;
        const totalPnL = positions.reduce((sum, pos) => sum + pos.unrealized_pnl + pos.realized_pnl, 0);
        const totalValue = positions.reduce((sum, pos) => sum + pos.market_value, 0);
        const totalRisk = positions.reduce((sum, pos) => sum + (pos.risk_contribution || 0), 0);
        return (_jsxs(Box, { flexDirection: "column", marginBottom: 2, children: [_jsx(Text, { color: "yellow", bold: true, children: "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 PORTFOLIO SUMMARY \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550" }), _jsxs(Box, { justifyContent: "space-between", children: [_jsxs(Box, { flexDirection: "column", children: [_jsxs(Text, { children: [_jsx(Text, { color: "green", children: "Total Positions:" }), " $", totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })] }), _jsx(Text, { children: _jsxs(Text, { color: totalPnL >= 0 ? "green" : "red", children: ["Total P&L: ", totalPnL >= 0 ? '+' : '', "$", totalPnL.toFixed(2)] }) })] }), _jsxs(Box, { flexDirection: "column", children: [_jsxs(Text, { children: [_jsx(Text, { color: "cyan", children: "Portfolio Heat:" }), " ", (totalRisk * 100).toFixed(1), "%"] }), _jsxs(Text, { children: [_jsx(Text, { color: "cyan", children: "Cash Available:" }), " $", accountSummary.cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })] })] })] })] }));
    };
    const renderPositionsTable = () => {
        if (positions.length === 0) {
            return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { color: "yellow", bold: true, children: "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 POSITIONS \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550" }), _jsx(Text, { color: "gray", italic: true, children: "No open positions in portfolio" })] }));
        }
        return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { color: "yellow", bold: true, children: "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 POSITIONS \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550" }), _jsxs(Box, { marginBottom: 1, children: [_jsx(Box, { width: 8, children: _jsx(Text, { color: "cyan", bold: true, children: "SYMBOL" }) }), _jsx(Box, { width: 8, children: _jsx(Text, { color: "cyan", bold: true, children: "SHARES" }) }), _jsx(Box, { width: 10, children: _jsx(Text, { color: "cyan", bold: true, children: "AVG COST" }) }), _jsx(Box, { width: 8, children: _jsx(Text, { color: "cyan", bold: true, children: "MKT PRICE" }) }), _jsx(Box, { width: 10, children: _jsx(Text, { color: "cyan", bold: true, children: "MKT VALUE" }) }), _jsx(Box, { width: 10, children: _jsx(Text, { color: "cyan", bold: true, children: "DAY CHG" }) }), _jsx(Box, { width: 10, children: _jsx(Text, { color: "cyan", bold: true, children: "TOTAL P&L" }) }), showDetails && _jsx(Box, { width: 8, children: _jsx(Text, { color: "cyan", bold: true, children: "RISK%" }) })] }), sortedPositions.slice(0, 10).map((position) => {
                    const totalPnL = position.unrealized_pnl + position.realized_pnl;
                    const pnlColor = totalPnL >= 0 ? "green" : "red";
                    const dayChgColor = (position.day_change || 0) >= 0 ? "green" : "red";
                    return (_jsxs(Box, { children: [_jsx(Box, { width: 8, children: _jsx(Text, { color: "white", bold: true, children: position.symbol }) }), _jsx(Box, { width: 8, children: _jsx(Text, { children: position.position }) }), _jsx(Box, { width: 10, children: _jsxs(Text, { children: ["$", position.avg_cost.toFixed(2)] }) }), _jsx(Box, { width: 8, children: _jsxs(Text, { children: ["$", (position.market_price || 0).toFixed(2)] }) }), _jsx(Box, { width: 10, children: _jsxs(Text, { children: ["$", position.market_value.toFixed(2)] }) }), _jsx(Box, { width: 10, children: _jsxs(Text, { color: dayChgColor, children: [(position.day_change || 0) >= 0 ? '+' : '', "$", (position.day_change || 0).toFixed(2), "(", (position.day_change_pct || 0) >= 0 ? '+' : '', (position.day_change_pct || 0).toFixed(1), "%)"] }) }), _jsx(Box, { width: 10, children: _jsxs(Text, { color: pnlColor, children: [totalPnL >= 0 ? '+' : '', "$", totalPnL.toFixed(2)] }) }), showDetails && (_jsx(Box, { width: 8, children: _jsx(Text, { color: "yellow", children: (position.risk_contribution || 0) * 100 < 5 ? "LOW" :
                                        (position.risk_contribution || 0) * 100 < 10 ? "MED" : "HIGH" }) }))] }, position.symbol));
                }), positions.length > 10 && (_jsxs(Text, { color: "gray", italic: true, children: ["... and ", positions.length - 10, " more positions"] }))] }));
    };
    const renderPositionDetails = () => {
        if (!showDetails || positions.length === 0)
            return null;
        return (_jsxs(Box, { flexDirection: "column", marginTop: 2, children: [_jsx(Text, { color: "yellow", bold: true, children: "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 POSITION DETAILS \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550" }), sortedPositions.slice(0, 3).map((position) => (_jsxs(Box, { flexDirection: "column", marginBottom: 1, children: [_jsxs(Text, { color: "cyan", bold: true, children: [position.symbol, " - Detailed Analysis"] }), _jsxs(Text, { children: ["\u2022 Current Price: $", (position.market_price || 0).toFixed(2)] }), _jsxs(Text, { children: ["\u2022 Cost Basis: $", position.avg_cost.toFixed(2)] }), _jsxs(Text, { children: ["\u2022 Unrealized P&L: $", position.unrealized_pnl.toFixed(2)] }), _jsxs(Text, { children: ["\u2022 Realized P&L: $", position.realized_pnl.toFixed(2)] }), _jsxs(Text, { children: ["\u2022 Risk Contribution: ", (position.risk_contribution || 0) * 100, "%"] }), _jsxs(Text, { children: ["\u2022 Entry Date: ", format(new Date(), 'MMM dd, yyyy'), " "] })] }, position.symbol)))] }));
    };
    const renderQuickStats = () => {
        const totalValue = positions.reduce((sum, pos) => sum + pos.market_value, 0);
        const totalPnL = positions.reduce((sum, pos) => sum + pos.unrealized_pnl + pos.realized_pnl, 0);
        const winningPositions = positions.filter(pos => (pos.unrealized_pnl + pos.realized_pnl) > 0).length;
        const losingPositions = positions.filter(pos => (pos.unrealized_pnl + pos.realized_pnl) < 0).length;
        return (_jsxs(Box, { flexDirection: "column", marginTop: 2, children: [_jsx(Text, { color: "yellow", bold: true, children: "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 QUICK STATS \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550" }), _jsxs(Box, { justifyContent: "space-between", children: [_jsxs(Text, { children: [_jsx(Text, { color: "cyan", children: "Win Rate:" }), " ", positions.length > 0 ? `${((winningPositions / positions.length) * 100).toFixed(1)}%` : 'N/A'] }), _jsxs(Text, { children: [_jsx(Text, { color: "cyan", children: "Total P&L:" }), " ", _jsxs(Text, { color: totalPnL >= 0 ? "green" : "red", children: [totalPnL >= 0 ? '+' : '', "$", totalPnL.toFixed(2)] })] }), _jsxs(Text, { children: [_jsx(Text, { color: "cyan", children: "Avg Position:" }), " $", positions.length > 0 ? (totalValue / positions.length).toFixed(0) : 'N/A'] })] }), _jsx(Box, { marginTop: 1, children: _jsx(Text, { color: "gray", dimColor: true, children: "\uD83D\uDCA1 Tip: Use 'd' to toggle detailed view | 's' to cycle sort options" }) })] }));
    };
    return (_jsxs(Box, { flexDirection: "column", children: [renderHeader(), renderPortfolioSummary(), renderPositionsTable(), renderPositionDetails(), renderQuickStats()] }));
};
export default PositionMonitor;
