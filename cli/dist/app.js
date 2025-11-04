#!/usr/bin/env node
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * DeepStack Trading System - PipBoy CLI Interface
 *
 * A retro-futuristic terminal interface inspired by Fallout's PipBoy,
 * providing a modern take on the classic Bloomberg Terminal experience.
 */
import React, { useState, useEffect } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import { Command } from 'commander';
import { format } from 'date-fns';
import Dashboard from './components/Dashboard.js';
import PositionMonitor from './components/PositionMonitor.js';
import RiskDisplay from './components/RiskDisplay.js';
import MarketScanner from './components/MarketScanner.js';
import { APIClient } from './api/client.js';
// ASCII Art Header - PipBoy Style (large + compact variants)
const HEADER_ART_LARGE = `
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                ██████╗ ███████╗███████╗██████╗ ███████╗████████╗ █████╗       ║
║                ██╔══██╗██╔════╝██╔════╝██╔══██╗██╔════╝╚══██╔══╝██╔══██╗      ║
║                ██║  ██║█████╗  █████╗  ██████╔╝███████╗   ██║   ███████║      ║
║                ██║  ██║██╔══╝  ██╔══╝  ██╔═══╝ ╚════██║   ██║   ██╔══██║      ║
║                ██████╔╝███████╗███████╗██║     ███████║   ██║   ██║  ██║      ║
║                ╚═════╝ ╚══════╝╚══════╝╚═╝     ╚══════╝   ╚═╝   ╚═╝  ╚═╝      ║
║                                                                              ║
║                    🔥 AUTONOMOUS TRADING AGENT POWERED BY CLAUDE 🔥           ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;
const HEADER_ART_COMPACT = `
  ██████╗ ███████╗███████╗██████╗ ███████╗  DEEPSTACK\n  ██╔══██╗██╔════╝██╔════╝██╔══██╗██╔════╝  Autonomous Trading Agent\n  ██║  ██║█████╗  █████╗  ██████╔╝███████╗  Powered by Claude\n`;
const App = ({ command, args }) => {
    const [currentView, setCurrentView] = useState('dashboard');
    const [isConnected, setIsConnected] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [marketOpen, setMarketOpen] = useState(false);
    const { exit } = useApp();
    // Initialize API client
    const apiClient = new APIClient();
    // Handle command-line execution
    React.useEffect(() => {
        if (command) {
            handleCommand(command, args || []).then(() => {
                exit();
            }).catch((error) => {
                console.error(`❌ Command failed: ${error}`);
                exit();
            });
        }
    }, [command, args]);
    // Check connection and market status (only in interactive mode)
    useEffect(() => {
        if (!command) {
            const checkStatus = async () => {
                try {
                    await apiClient.healthCheck();
                    setIsConnected(true);
                    // Check if market is open (simplified - would need proper market hours logic)
                    const now = new Date();
                    const marketOpen = now.getHours() >= 9 && now.getHours() < 16;
                    setMarketOpen(marketOpen);
                }
                catch (error) {
                    setIsConnected(false);
                }
            };
            checkStatus();
            const interval = setInterval(checkStatus, 30000); // Check every 30 seconds
            return () => clearInterval(interval);
        }
    }, [command]);
    // Handle keyboard navigation
    useInput((input, key) => {
        if (key.escape) {
            exit();
            return;
        }
        // View switching shortcuts
        if (input === 'd')
            setCurrentView('dashboard');
        if (input === 'p')
            setCurrentView('positions');
        if (input === 'r')
            setCurrentView('risk');
        if (input === 's')
            setCurrentView('scanner');
        if (input === 'q')
            exit();
    });
    // Update timestamp less frequently to avoid scrolling; align with status polling
    useEffect(() => {
        if (!command) {
            const interval = setInterval(() => {
                setLastUpdate(new Date());
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [command]);
    // Handle direct commands
    useEffect(() => {
        if (command) {
            handleCommand(command, args || []);
        }
    }, [command, args]);
    const handleCommand = async (cmd, cmdArgs) => {
        try {
            switch (cmd) {
                case 'quote':
                    if (cmdArgs.length > 0) {
                        const symbol = cmdArgs[0];
                        const quote = await apiClient.getQuote(symbol);
                        console.log(`${symbol}: $${quote.last?.toFixed(2)} (${quote.timestamp})`);
                    }
                    break;
                case 'buy':
                    if (cmdArgs.length >= 2) {
                        const symbol = cmdArgs[0];
                        const quantity = parseInt(cmdArgs[1]);
                        const result = await apiClient.placeOrder({
                            symbol,
                            quantity,
                            action: 'BUY',
                            order_type: 'MKT'
                        });
                        console.log(`Order ${result.order_id}: ${result.status}`);
                    }
                    break;
                case 'sell':
                    if (cmdArgs.length >= 2) {
                        const symbol = cmdArgs[0];
                        const quantity = parseInt(cmdArgs[1]);
                        const result = await apiClient.placeOrder({
                            symbol,
                            quantity,
                            action: 'SELL',
                            order_type: 'MKT'
                        });
                        console.log(`Order ${result.order_id}: ${result.status}`);
                    }
                    break;
                default:
                    console.log(`Unknown command: ${cmd}`);
            }
            exit();
        }
        catch (error) {
            console.error(`Command failed: ${error}`);
            exit();
        }
    };
    const renderHeader = () => {
        const isTTY = !!(process.stdout && process.stdout.isTTY);
        const width = isTTY ? process.stdout.columns : 120;
        const useCompact = width < 110;
        return (_jsxs(Box, { flexDirection: "column", marginBottom: 1, children: [_jsx(Text, { color: "green", bold: true, children: useCompact ? HEADER_ART_COMPACT : HEADER_ART_LARGE }), _jsxs(Box, { justifyContent: "space-between", children: [_jsxs(Text, { color: isConnected ? "green" : "red", children: ["\u25CF ", isConnected ? "CONNECTED" : "DISCONNECTED"] }), _jsx(Text, { color: marketOpen ? "green" : "yellow", children: marketOpen ? "🟢 MARKET OPEN" : "🟡 MARKET CLOSED" }), _jsx(Text, { color: "cyan", children: format(lastUpdate, 'HH:mm:ss') })] }), _jsx(Box, { justifyContent: "center", marginY: 1, children: _jsx(Text, { color: "gray", dimColor: true, children: "[D]ashboard | [P]ositions | [R]isk | [S]canner | [Q]uit" }) })] }));
    };
    const renderView = () => {
        switch (currentView) {
            case 'dashboard':
                return _jsx(Dashboard, { apiClient: apiClient });
            case 'positions':
                return _jsx(PositionMonitor, { apiClient: apiClient });
            case 'risk':
                return _jsx(RiskDisplay, { apiClient: apiClient });
            case 'scanner':
                return _jsx(MarketScanner, { apiClient: apiClient });
            default:
                return _jsx(Dashboard, { apiClient: apiClient });
        }
    };
    // If executing a command, handle it without rendering UI
    if (command) {
        return null;
    }
    return (_jsxs(Box, { flexDirection: "column", children: [renderHeader(), renderView()] }));
};
// CLI Command Setup
const program = new Command();
program
    .name('deepstack')
    .description('DeepStack Trading System - PipBoy CLI')
    .version('1.0.0');
// Interactive dashboard (default)
program
    .action(() => {
    const canUseRawMode = !!(process.stdin && process.stdin.isTTY && typeof process.stdin.setRawMode === 'function');
    if (!canUseRawMode) {
        console.log('Interactive dashboard requires a TTY.');
        console.log("Use 'deepstack status' or run in a real terminal.");
        process.exit(0);
    }
    render(_jsx(App, {}));
});
// Direct commands - handle without Ink rendering
program
    .command('start')
    .description('Start automated trading (paper mode)')
    .option('--cadence <seconds>', 'Cycle cadence in seconds', '30')
    .action(async (opts) => {
    try {
        const apiClient = new APIClient();
        const cadence_s = parseInt(opts.cadence, 10) || 30;
        const res = await apiClient.startAutomation(cadence_s);
        console.log(`Automation started: cadence=${res.cadence_s}s, symbols=${(res.symbols || []).join(',')}`);
    }
    catch (error) {
        console.error('Error starting automation:', error);
        process.exit(1);
    }
});
program
    .command('stop')
    .description('Stop automated trading')
    .action(async () => {
    try {
        const apiClient = new APIClient();
        const res = await apiClient.stopAutomation();
        console.log('Automation stopped.');
    }
    catch (error) {
        console.error('Error stopping automation:', error);
        process.exit(1);
    }
});
program
    .command('status')
    .description('Show automation status')
    .action(async () => {
    try {
        const apiClient = new APIClient();
        const res = await apiClient.automationStatus();
        console.log(`Running: ${res.running} | Cadence: ${res.cadence_s}s | Last: ${res.last_action || 'n/a'}`);
    }
    catch (error) {
        console.error('Error getting status:', error);
        process.exit(1);
    }
});
program
    .command('quote <symbol>')
    .description('Get current quote for symbol')
    .action(async (symbol) => {
    try {
        const apiClient = new APIClient();
        const quote = await apiClient.getQuote(symbol);
        console.log(`${symbol}: $${quote.last?.toFixed(2)} (${quote.timestamp})`);
    }
    catch (error) {
        console.error(`Error getting quote for ${symbol}:`, error);
        process.exit(1);
    }
});
program
    .command('buy <symbol> <quantity>')
    .description('Place market buy order')
    .action(async (symbol, quantity) => {
    try {
        const apiClient = new APIClient();
        const result = await apiClient.placeOrder({
            symbol,
            quantity: parseInt(quantity),
            action: 'BUY',
            order_type: 'MKT'
        });
        console.log(`Order ${result.order_id}: ${result.status}`);
    }
    catch (error) {
        console.error(`Error placing buy order:`, error);
        process.exit(1);
    }
});
program
    .command('sell <symbol> <quantity>')
    .description('Place market sell order')
    .action(async (symbol, quantity) => {
    try {
        const apiClient = new APIClient();
        const result = await apiClient.placeOrder({
            symbol,
            quantity: parseInt(quantity),
            action: 'SELL',
            order_type: 'MKT'
        });
        console.log(`Order ${result.order_id}: ${result.status}`);
    }
    catch (error) {
        console.error(`Error placing sell order:`, error);
        process.exit(1);
    }
});
// Parse and run
program.parse();
export default App;
