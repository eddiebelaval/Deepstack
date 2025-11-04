#!/usr/bin/env node

/**
 * DeepStack Trading System - PipBoy CLI Interface
 *
 * A retro-futuristic terminal interface inspired by Fallout's PipBoy,
 * providing a modern take on the classic Bloomberg Terminal experience.
 */

import React, { useState, useEffect } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import { Command } from 'commander';
import axios from 'axios';
import { format } from 'date-fns';

import { Dashboard } from './components/Dashboard.js';
import { PositionMonitor } from './components/PositionMonitor.js';
import { RiskDisplay } from './components/RiskDisplay.js';
import { MarketScanner } from './components/MarketScanner.js';
import { APIClient } from './api/client.js';

// ASCII Art Header - PipBoy Style
const HEADER_ART = `
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

interface AppProps {
  command?: string;
  args?: string[];
}

const App: React.FC<AppProps> = ({ command, args }) => {
  const [currentView, setCurrentView] = useState<'dashboard' | 'positions' | 'risk' | 'scanner'>('dashboard');
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

        } catch (error) {
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
    if (input === 'd') setCurrentView('dashboard');
    if (input === 'p') setCurrentView('positions');
    if (input === 'r') setCurrentView('risk');
    if (input === 's') setCurrentView('scanner');
    if (input === 'q') exit();
  });

  // Update timestamp
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Handle direct commands
  useEffect(() => {
    if (command) {
      handleCommand(command, args || []);
    }
  }, [command, args]);

  const handleCommand = async (cmd: string, cmdArgs: string[]) => {
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
    } catch (error) {
      console.error(`Command failed: ${error}`);
      exit();
    }
  };

  const renderHeader = () => (
    <Box flexDirection="column" marginBottom={1}>
      <Text color="green" bold>
        {HEADER_ART}
      </Text>

      <Box justifyContent="space-between">
        <Text color={isConnected ? "green" : "red"}>
          ● {isConnected ? "CONNECTED" : "DISCONNECTED"}
        </Text>

        <Text color={marketOpen ? "green" : "yellow"}>
          {marketOpen ? "🟢 MARKET OPEN" : "🟡 MARKET CLOSED"}
        </Text>

        <Text color="cyan">
          {format(lastUpdate, 'HH:mm:ss')}
        </Text>
      </Box>

      <Box justifyContent="center" marginY={1}>
        <Text color="gray" dimColor>
          [D]ashboard | [P]ositions | [R]isk | [S]canner | [Q]uit
        </Text>
      </Box>
    </Box>
  );

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard apiClient={apiClient} />;
      case 'positions':
        return <PositionMonitor apiClient={apiClient} />;
      case 'risk':
        return <RiskDisplay apiClient={apiClient} />;
      case 'scanner':
        return <MarketScanner apiClient={apiClient} />;
      default:
        return <Dashboard apiClient={apiClient} />;
    }
  };

  // If executing a command, handle it without rendering UI
  if (command) {
    return null;
  }

  return (
    <Box flexDirection="column">
      {renderHeader()}
      {renderView()}
    </Box>
  );
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
    render(<App />);
  });

// Direct commands - handle without Ink rendering
program
  .command('quote <symbol>')
  .description('Get current quote for symbol')
  .action(async (symbol: string) => {
    try {
      const apiClient = new APIClient();
      const quote = await apiClient.getQuote(symbol);
      console.log(`${symbol}: $${quote.last?.toFixed(2)} (${quote.timestamp})`);
    } catch (error) {
      console.error(`Error getting quote for ${symbol}:`, error);
      process.exit(1);
    }
  });

program
  .command('buy <symbol> <quantity>')
  .description('Place market buy order')
  .action(async (symbol: string, quantity: string) => {
    try {
      const apiClient = new APIClient();
      const result = await apiClient.placeOrder({
        symbol,
        quantity: parseInt(quantity),
        action: 'BUY',
        order_type: 'MKT'
      });
      console.log(`Order ${result.order_id}: ${result.status}`);
    } catch (error) {
      console.error(`Error placing buy order:`, error);
      process.exit(1);
    }
  });

program
  .command('sell <symbol> <quantity>')
  .description('Place market sell order')
  .action(async (symbol: string, quantity: string) => {
    try {
      const apiClient = new APIClient();
      const result = await apiClient.placeOrder({
        symbol,
        quantity: parseInt(quantity),
        action: 'SELL',
        order_type: 'MKT'
      });
      console.log(`Order ${result.order_id}: ${result.status}`);
    } catch (error) {
      console.error(`Error placing sell order:`, error);
      process.exit(1);
    }
  });

// Parse and run
program.parse();

export default App;
