import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Risk Display Component - Portfolio Risk Management Interface
 *
 * Shows risk metrics, position heat, Kelly sizing, and risk alerts.
 */
import { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
export const RiskDisplay = ({ apiClient }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [riskMetrics, setRiskMetrics] = useState(null);
    const [portfolioHeat, setPortfolioHeat] = useState(0);
    const [dailyLossCheck, setDailyLossCheck] = useState(null);
    const [weeklyLossCheck, setWeeklyLossCheck] = useState(null);
    // Load risk data
    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            // Get risk metrics (mock data for now - would call real API)
            const mockRiskMetrics = {
                portfolio_value: 100000,
                portfolio_heat: 0.12,
                kelly_fraction: 0.25,
                var_95: 5000,
                max_drawdown: 0.05,
                sharpe_ratio: 1.2,
                sortino_ratio: 1.8,
                calmar_ratio: 2.1
            };
            const mockPortfolioHeat = 0.12;
            const mockDailyLoss = {
                within_limit: true,
                current_loss_pct: 0.005,
                limit_pct: 0.02,
                reason: 'Daily loss 0.5% within limit 2.0%'
            };
            const mockWeeklyLoss = {
                within_limit: true,
                current_loss_pct: 0.01,
                limit_pct: 0.05,
                reason: 'Weekly loss 1.0% within limit 5.0%'
            };
            setRiskMetrics(mockRiskMetrics);
            setPortfolioHeat(mockPortfolioHeat);
            setDailyLossCheck(mockDailyLoss);
            setWeeklyLossCheck(mockWeeklyLoss);
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
        return (_jsx(Box, { justifyContent: "center", alignItems: "center", height: 10, children: _jsxs(Text, { color: "cyan", children: [_jsx(Spinner, { type: "dots" }), ' Loading Risk Analysis...'] }) }));
    }
    if (error) {
        return (_jsxs(Box, { flexDirection: "column", paddingX: 2, children: [_jsx(Text, { color: "red", bold: true, children: "\u26A0\uFE0F  Risk Analysis Error" }), _jsx(Text, { color: "gray", children: error }), _jsx(Text, { color: "cyan", dimColor: true, children: "Press 'r' to retry" })] }));
    }
    const renderRiskOverview = () => (_jsxs(Box, { flexDirection: "column", marginBottom: 2, children: [_jsx(Text, { color: "yellow", bold: true, children: "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 RISK OVERVIEW \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550" }), _jsxs(Box, { justifyContent: "space-between", marginY: 1, children: [_jsxs(Box, { flexDirection: "column", children: [_jsxs(Text, { children: [_jsx(Text, { color: "green", children: "Portfolio Value:" }), " $", riskMetrics?.portfolio_value?.toLocaleString()] }), _jsxs(Text, { children: [_jsx(Text, { color: "cyan", children: "Portfolio Heat:" }), " ", riskMetrics?.portfolio_heat ? `${(riskMetrics.portfolio_heat * 100).toFixed(1)}%` : 'N/A'] })] }), _jsxs(Box, { flexDirection: "column", children: [_jsxs(Text, { children: [_jsx(Text, { color: "yellow", children: "Kelly Fraction:" }), " ", riskMetrics?.kelly_fraction ? `${(riskMetrics.kelly_fraction * 100).toFixed(1)}%` : 'N/A'] }), _jsxs(Text, { children: [_jsx(Text, { color: "magenta", children: "VaR (95%):" }), " $", riskMetrics?.var_95?.toLocaleString()] })] })] })] }));
    const renderPerformanceMetrics = () => (_jsxs(Box, { flexDirection: "column", marginBottom: 2, children: [_jsx(Text, { color: "yellow", bold: true, children: "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 PERFORMANCE METRICS \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550" }), _jsxs(Box, { justifyContent: "space-between", marginY: 1, children: [_jsxs(Box, { flexDirection: "column", children: [_jsxs(Text, { children: [_jsx(Text, { color: "green", children: "Sharpe Ratio:" }), " ", riskMetrics?.sharpe_ratio?.toFixed(2) || 'N/A'] }), _jsxs(Text, { children: [_jsx(Text, { color: "green", children: "Sortino Ratio:" }), " ", riskMetrics?.sortino_ratio?.toFixed(2) || 'N/A'] })] }), _jsxs(Box, { flexDirection: "column", children: [_jsxs(Text, { children: [_jsx(Text, { color: "yellow", children: "Calmar Ratio:" }), " ", riskMetrics?.calmar_ratio?.toFixed(2) || 'N/A'] }), _jsxs(Text, { children: [_jsx(Text, { color: "red", children: "Max Drawdown:" }), " ", riskMetrics?.max_drawdown ? `${(riskMetrics.max_drawdown * 100).toFixed(1)}%` : 'N/A'] })] })] })] }));
    const renderLossLimits = () => (_jsxs(Box, { flexDirection: "column", marginBottom: 2, children: [_jsx(Text, { color: "yellow", bold: true, children: "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 LOSS LIMITS \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550" }), _jsx(Box, { marginY: 1, children: _jsxs(Text, { color: dailyLossCheck?.within_limit ? "green" : "red", children: ["\u25CF Daily Loss: ", dailyLossCheck?.current_loss_pct ? `${(dailyLossCheck.current_loss_pct * 100).toFixed(1)}%` : 'N/A', " / ", dailyLossCheck?.limit_pct ? `${(dailyLossCheck.limit_pct * 100).toFixed(1)}%` : 'N/A'] }) }), _jsx(Box, { marginY: 1, children: _jsxs(Text, { color: weeklyLossCheck?.within_limit ? "green" : "red", children: ["\u25CF Weekly Loss: ", weeklyLossCheck?.current_loss_pct ? `${(weeklyLossCheck.current_loss_pct * 100).toFixed(1)}%` : 'N/A', " / ", weeklyLossCheck?.limit_pct ? `${(weeklyLossCheck.limit_pct * 100).toFixed(1)}%` : 'N/A'] }) }), _jsx(Box, { marginY: 1, children: _jsxs(Text, { color: portfolioHeat > 0.15 ? "red" : "green", children: ["\u25CF Portfolio Heat: ", (portfolioHeat * 100).toFixed(1), "% / 15.0%"] }) })] }));
    const renderRiskAlerts = () => {
        const alerts = [];
        if (dailyLossCheck && !dailyLossCheck.within_limit) {
            alerts.push(`⚠️  Daily loss limit exceeded: ${dailyLossCheck.reason}`);
        }
        if (weeklyLossCheck && !weeklyLossCheck.within_limit) {
            alerts.push(`⚠️  Weekly loss limit exceeded: ${weeklyLossCheck.reason}`);
        }
        if (portfolioHeat > 0.15) {
            alerts.push(`⚠️  Portfolio heat ${(portfolioHeat * 100).toFixed(1)}% exceeds 15% limit`);
        }
        if (alerts.length === 0) {
            return (_jsxs(Box, { flexDirection: "column", marginBottom: 2, children: [_jsx(Text, { color: "yellow", bold: true, children: "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 RISK ALERTS \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550" }), _jsx(Text, { color: "green", children: "\u2705 All risk metrics within acceptable limits" })] }));
        }
        return (_jsxs(Box, { flexDirection: "column", marginBottom: 2, children: [_jsx(Text, { color: "yellow", bold: true, children: "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 RISK ALERTS \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550" }), alerts.map((alert, index) => (_jsx(Text, { color: "red", children: alert }, index)))] }));
    };
    const renderRiskManagementTips = () => (_jsxs(Box, { flexDirection: "column", marginTop: 2, children: [_jsx(Text, { color: "yellow", bold: true, children: "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 RISK MANAGEMENT TIPS \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550" }), _jsxs(Box, { children: [_jsx(Text, { color: "cyan", children: "\u2022 " }), _jsx(Text, { children: "Monitor portfolio heat daily (target: <15%)" })] }), _jsxs(Box, { children: [_jsx(Text, { color: "cyan", children: "\u2022 " }), _jsx(Text, { children: "Use Kelly Criterion for position sizing" })] }), _jsxs(Box, { children: [_jsx(Text, { color: "cyan", children: "\u2022 " }), _jsx(Text, { children: "Set stops before entering positions" })] }), _jsxs(Box, { children: [_jsx(Text, { color: "cyan", children: "\u2022 " }), _jsx(Text, { children: "Never move stop losses down" })] }), _jsxs(Box, { children: [_jsx(Text, { color: "cyan", children: "\u2022 " }), _jsx(Text, { children: "Take profits when targets hit" })] })] }));
    return (_jsxs(Box, { flexDirection: "column", children: [renderRiskOverview(), renderPerformanceMetrics(), renderLossLimits(), renderRiskAlerts(), renderRiskManagementTips(), _jsx(Box, { marginTop: 2, children: _jsx(Text, { color: "cyan", dimColor: true, children: "Press 'r' to refresh | Press 'd' for Dashboard | Press 'p' for Positions" }) })] }));
};
