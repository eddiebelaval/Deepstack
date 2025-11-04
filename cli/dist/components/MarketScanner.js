import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Market Scanner Component - Stock Screening Interface
 *
 * Screens for trading opportunities using deep value and squeeze criteria.
 */
import { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
export const MarketScanner = ({ apiClient }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [scanResults, setScanResults] = useState([]);
    const [selectedStrategy, setSelectedStrategy] = useState('both');
    const [showDetails, setShowDetails] = useState(null);
    // Load scan results
    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            // Mock scan results - would call real API
            const mockResults = [
                {
                    symbol: 'AAPL',
                    deep_value_score: 85,
                    squeeze_score: 45,
                    overall_score: 68,
                    recommendation: 'BUY',
                    thesis: 'Strong fundamentals with moderate squeeze potential. Good risk/reward setup.',
                    catalysts: ['Earnings report', 'Product launch'],
                    risks: ['Market volatility', 'Competition'],
                    target_price: 195.00,
                    stop_price: 165.00,
                    position_size_pct: 3.2,
                    confidence: 0.82
                },
                {
                    symbol: 'MSFT',
                    deep_value_score: 78,
                    squeeze_score: 32,
                    overall_score: 59,
                    recommendation: 'BUY',
                    thesis: 'Excellent fundamentals and competitive moat. Stable growth expected.',
                    catalysts: ['Cloud growth', 'AI integration'],
                    risks: ['Regulatory scrutiny'],
                    target_price: 385.00,
                    stop_price: 320.00,
                    position_size_pct: 2.8,
                    confidence: 0.75
                },
                {
                    symbol: 'GME',
                    deep_value_score: 35,
                    squeeze_score: 92,
                    overall_score: 58,
                    recommendation: 'WATCH',
                    thesis: 'Extreme squeeze potential but weak fundamentals. High volatility expected.',
                    catalysts: ['Short squeeze', 'Meme stock momentum'],
                    risks: ['No fundamental value', 'High volatility'],
                    target_price: 25.00,
                    stop_price: 12.00,
                    position_size_pct: 1.5,
                    confidence: 0.58
                },
                {
                    symbol: 'TSLA',
                    deep_value_score: 42,
                    squeeze_score: 67,
                    overall_score: 52,
                    recommendation: 'WATCH',
                    thesis: 'Growth story intact but valuation stretched. Monitor for entry point.',
                    catalysts: ['EV adoption', 'Autopilot progress'],
                    risks: ['Competition intensifying', 'Execution risk'],
                    target_price: 280.00,
                    stop_price: 180.00,
                    position_size_pct: 2.1,
                    confidence: 0.65
                }
            ];
            setScanResults(mockResults);
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
    }, [selectedStrategy]);
    // Handle keyboard input
    useInput((input, key) => {
        if (input === 'r') {
            loadData();
        }
        if (input === '1')
            setSelectedStrategy('deep_value');
        if (input === '2')
            setSelectedStrategy('squeeze');
        if (input === '3')
            setSelectedStrategy('both');
        if (input === 'ArrowUp' && showDetails !== null) {
            setShowDetails(Math.max(0, (showDetails || 0) - 1));
        }
        if (input === 'ArrowDown' && showDetails !== null) {
            setShowDetails(Math.min(scanResults.length - 1, (showDetails || 0) + 1));
        }
        if (input === 'Enter' && showDetails === null) {
            setShowDetails(0);
        }
        if (input === 'Escape') {
            setShowDetails(null);
        }
    });
    if (loading) {
        return (_jsx(Box, { justifyContent: "center", alignItems: "center", height: 10, children: _jsx(Text, { color: "cyan", children: "Scanning Markets..." }) }));
    }
    if (error) {
        return (_jsxs(Box, { flexDirection: "column", paddingX: 2, children: [_jsx(Text, { color: "red", bold: true, children: "\u26A0\uFE0F  Market Scanner Error" }), _jsx(Text, { color: "gray", children: error }), _jsx(Text, { color: "cyan", dimColor: true, children: "Press 'r' to retry" })] }));
    }
    const renderStrategySelector = () => (_jsxs(Box, { marginBottom: 2, children: [_jsx(Text, { color: "yellow", bold: true, children: "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 STRATEGY SELECTION \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550" }), _jsxs(Box, { marginY: 1, children: [_jsx(Text, { color: selectedStrategy === 'deep_value' ? 'green' : 'gray', children: "[1] Deep Value" }), _jsx(Text, { color: selectedStrategy === 'squeeze' ? 'green' : 'gray', children: '  [2] Squeeze Hunter' }), _jsx(Text, { color: selectedStrategy === 'both' ? 'green' : 'gray', children: '  [3] Combined' })] }), _jsxs(Text, { color: "cyan", dimColor: true, children: ["Current: ", selectedStrategy === 'deep_value' ? 'Deep Value Investing' :
                        selectedStrategy === 'squeeze' ? 'Short Squeeze Detection' : 'Combined Analysis'] })] }));
    const renderResultsTable = () => {
        if (scanResults.length === 0) {
            return (_jsxs(Box, { flexDirection: "column", marginBottom: 2, children: [_jsx(Text, { color: "yellow", bold: true, children: "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 SCAN RESULTS \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550" }), _jsx(Text, { color: "gray", italic: true, children: "No opportunities found matching current criteria" })] }));
        }
        return (_jsxs(Box, { flexDirection: "column", marginBottom: 2, children: [_jsx(Text, { color: "yellow", bold: true, children: "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 SCAN RESULTS \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550" }), _jsxs(Box, { marginBottom: 1, children: [_jsx(Box, { width: 8, children: _jsx(Text, { color: "cyan", bold: true, children: "SYMBOL" }) }), _jsx(Box, { width: 8, children: _jsx(Text, { color: "cyan", bold: true, children: "SCORE" }) }), _jsx(Box, { width: 8, children: _jsx(Text, { color: "cyan", bold: true, children: "DEEP" }) }), _jsx(Box, { width: 8, children: _jsx(Text, { color: "cyan", bold: true, children: "SQUEEZE" }) }), _jsx(Box, { width: 12, children: _jsx(Text, { color: "cyan", bold: true, children: "RECOMMEND" }) }), _jsx(Box, { width: 8, children: _jsx(Text, { color: "cyan", bold: true, children: "SIZE" }) }), _jsx(Box, { width: 8, children: _jsx(Text, { color: "cyan", bold: true, children: "TARGET" }) })] }), scanResults.slice(0, 8).map((result, index) => (_jsxs(Box, { children: [_jsx(Box, { width: 8, children: _jsx(Text, { color: showDetails === index ? "yellow" : "white", bold: true, children: result.symbol }) }), _jsx(Box, { width: 8, children: _jsx(Text, { color: result.overall_score >= 70 ? "green" :
                                    result.overall_score >= 50 ? "yellow" : "red", children: result.overall_score }) }), _jsx(Box, { width: 8, children: _jsx(Text, { children: result.deep_value_score }) }), _jsx(Box, { width: 8, children: _jsx(Text, { children: result.squeeze_score }) }), _jsx(Box, { width: 12, children: _jsx(Text, { color: result.recommendation === 'BUY' ? "green" :
                                    result.recommendation === 'WATCH' ? "yellow" : "red", children: result.recommendation }) }), _jsx(Box, { width: 8, children: _jsxs(Text, { children: [result.position_size_pct.toFixed(1), "%"] }) }), _jsx(Box, { width: 8, children: _jsxs(Text, { children: ["$", result.target_price.toFixed(0)] }) })] }, result.symbol))), scanResults.length > 8 && (_jsxs(Text, { color: "gray", italic: true, children: ["... and ", scanResults.length - 8, " more opportunities"] }))] }));
    };
    const renderDetailedView = () => {
        if (showDetails === null || !scanResults[showDetails])
            return null;
        const result = scanResults[showDetails];
        return (_jsxs(Box, { flexDirection: "column", marginBottom: 2, children: [_jsx(Text, { color: "yellow", bold: true, children: "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 DETAILED ANALYSIS \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550" }), _jsx(Box, { marginY: 1, children: _jsxs(Text, { color: "green", bold: true, children: [result.symbol, " - ", result.recommendation, " (Confidence: ", (result.confidence * 100).toFixed(0), "%)"] }) }), _jsxs(Text, { color: "white", children: [_jsx(Text, { color: "cyan", children: "Thesis:" }), " ", result.thesis] }), _jsxs(Box, { marginY: 1, children: [_jsx(Text, { color: "green", children: "Catalysts:" }), result.catalysts.map((catalyst, index) => (_jsxs(Text, { children: ["  \u2022 ", catalyst] }, index)))] }), _jsxs(Box, { marginY: 1, children: [_jsx(Text, { color: "red", children: "Risks:" }), result.risks.map((risk, index) => (_jsxs(Text, { children: ["  \u2022 ", risk] }, index)))] }), _jsxs(Box, { justifyContent: "space-between", marginY: 1, children: [_jsxs(Text, { color: "yellow", children: ["Target: $", result.target_price.toFixed(2)] }), _jsxs(Text, { color: "red", children: ["Stop: $", result.stop_price.toFixed(2)] }), _jsxs(Text, { color: "cyan", children: ["Size: ", result.position_size_pct.toFixed(1), "%"] })] }), _jsx(Text, { color: "gray", dimColor: true, children: "\u2191/\u2193 Navigate | Enter Select | Esc Back to List" })] }));
    };
    const renderScannerStats = () => (_jsxs(Box, { flexDirection: "column", marginBottom: 2, children: [_jsx(Text, { color: "yellow", bold: true, children: "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 SCANNER STATS \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550" }), _jsxs(Box, { justifyContent: "space-between", marginY: 1, children: [_jsxs(Text, { children: [_jsx(Text, { color: "green", children: "Opportunities:" }), " ", scanResults.length] }), _jsxs(Text, { children: [_jsx(Text, { color: "green", children: "Avg Score:" }), " ", scanResults.length > 0 ?
                                (scanResults.reduce((sum, r) => sum + r.overall_score, 0) / scanResults.length).toFixed(0) : 'N/A'] }), _jsxs(Text, { children: [_jsx(Text, { color: "green", children: "Buy Signals:" }), " ", scanResults.filter(r => r.recommendation === 'BUY').length] })] })] }));
    const renderQuickActions = () => (_jsxs(Box, { flexDirection: "column", marginTop: 2, children: [_jsx(Text, { color: "yellow", bold: true, children: "\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 QUICK ACTIONS \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550" }), _jsxs(Box, { children: [_jsx(Text, { color: "cyan", children: "\u2022 " }), _jsx(Text, { children: "Analyze Stock: " }), _jsx(Text, { color: "green", bold: true, children: "deepstack analyze AAPL" })] }), _jsxs(Box, { children: [_jsx(Text, { color: "cyan", children: "\u2022 " }), _jsx(Text, { children: "Place Order: " }), _jsx(Text, { color: "green", bold: true, children: "deepstack buy AAPL 100" })] }), _jsxs(Box, { children: [_jsx(Text, { color: "cyan", children: "\u2022 " }), _jsx(Text, { children: "View Positions: " }), _jsx(Text, { color: "green", bold: true, children: "Press 'p'" })] }), _jsxs(Box, { children: [_jsx(Text, { color: "cyan", children: "\u2022 " }), _jsx(Text, { children: "Risk Analysis: " }), _jsx(Text, { color: "green", bold: true, children: "Press 'r'" })] })] }));
    return (_jsxs(Box, { flexDirection: "column", children: [renderStrategySelector(), showDetails === null ? (_jsxs(_Fragment, { children: [renderScannerStats(), renderResultsTable()] })) : (renderDetailedView()), renderQuickActions(), _jsx(Box, { marginTop: 2, children: _jsx(Text, { color: "cyan", dimColor: true, children: "Press 'r' to refresh | [1-3] Change Strategy | [\u2191\u2193] Navigate | [Enter] Details | [Esc] Back" }) })] }));
};
export default MarketScanner;
