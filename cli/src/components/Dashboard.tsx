/**
 * Dashboard Component - Main PipBoy Trading Interface
 *
 * Displays real-time portfolio overview, recent activity, and key metrics.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { format } from 'date-fns';

import { APIClient, PositionData, AccountSummary } from '../api/client';

interface DashboardProps {
  apiClient: APIClient;
}

export const Dashboard: React.FC<DashboardProps> = ({ apiClient }) => {
  const [positions, setPositions] = useState<PositionData[]>([]);
  const [accountSummary, setAccountSummary] = useState<AccountSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
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
    return (
      <Box justifyContent="center" alignItems="center" height={10}>
        <Text color="cyan">Loading DeepStack Dashboard...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" paddingX={2}>
        <Text color="red" bold>
          ⚠️  Connection Error
        </Text>
        <Text color="gray">{error}</Text>
        <Text color="cyan" dimColor>
          Press 'r' to retry
        </Text>
      </Box>
    );
  }

  const renderPortfolioSummary = () => {
    if (!accountSummary) return null;

    const totalValue = accountSummary.portfolio_value;
    const cash = accountSummary.cash;
    const dayPnL = accountSummary.day_pnl;
    const dayPnLPct = totalValue > 0 ? (dayPnL / (totalValue - dayPnL)) * 100 : 0;

    return (
      <Box flexDirection="column" marginBottom={2}>
        <Text color="yellow" bold>
          ═══════════════ PORTFOLIO SUMMARY ═══════════════
        </Text>

        <Box justifyContent="space-between">
          <Box flexDirection="column">
            <Text>
              <Text color="green">Total Value:</Text> ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text>
              <Text color="cyan">Cash:</Text> ${cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </Box>

          <Box flexDirection="column">
            <Text>
              <Text color={dayPnL >= 0 ? "green" : "red"}>
                Day P&L: {dayPnL >= 0 ? '+' : ''}${dayPnL.toFixed(2)} ({dayPnLPct >= 0 ? '+' : ''}{dayPnLPct.toFixed(2)}%)
              </Text>
            </Text>
            <Text>
              <Text color="cyan">Buying Power:</Text> ${accountSummary.buying_power.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </Box>
        </Box>
      </Box>
    );
  };

  const renderPositionsTable = () => {
    if (positions.length === 0) {
      return (
        <Box flexDirection="column">
          <Text color="yellow" bold>
            ═════════════════ POSITIONS ═════════════════
          </Text>
          <Text color="gray" italic>
            No open positions
          </Text>
        </Box>
      );
    }

    return (
      <Box flexDirection="column">
        <Text color="yellow" bold>
          ═════════════════ POSITIONS ═════════════════
        </Text>

        <Box marginBottom={1}>
          <Box width={10}><Text color="cyan" bold>SYMBOL</Text></Box>
          <Box width={8}><Text color="cyan" bold>SHARES</Text></Box>
          <Box width={10}><Text color="cyan" bold>AVG COST</Text></Box>
          <Box width={12}><Text color="cyan" bold>MKT VALUE</Text></Box>
          <Box width={10}><Text color="cyan" bold>UNRL P&L</Text></Box>
          <Box width={10}><Text color="cyan" bold>TOTAL P&L</Text></Box>
        </Box>

        {positions.slice(0, 8).map((position) => (
          <Box key={position.symbol}>
            <Box width={10}><Text color="white" bold>{position.symbol}</Text></Box>
            <Box width={8}><Text>{position.position}</Text></Box>
            <Box width={10}><Text>${position.avg_cost.toFixed(2)}</Text></Box>
            <Box width={12}><Text>${position.market_value.toFixed(2)}</Text></Box>
            <Box width={10}>
              <Text color={position.unrealized_pnl >= 0 ? "green" : "red"}>
                {position.unrealized_pnl >= 0 ? '+' : ''}${position.unrealized_pnl.toFixed(2)}
              </Text>
            </Box>
            <Box width={10}>
              <Text color={position.realized_pnl + position.unrealized_pnl >= 0 ? "green" : "red"}>
                {position.realized_pnl + position.unrealized_pnl >= 0 ? '+' : ''}
                ${(position.realized_pnl + position.unrealized_pnl).toFixed(2)}
              </Text>
            </Box>
          </Box>
        ))}

        {positions.length > 8 && (
          <Text color="gray" italic>
            ... and {positions.length - 8} more positions
          </Text>
        )}
      </Box>
    );
  };

  const renderActivityFeed = () => {
    // Mock activity feed - would be populated from real trade data
    const activities = [
      { time: '14:32:15', action: 'BUY', symbol: 'AAPL', quantity: 50, price: 185.23 },
      { time: '14:28:42', action: 'SELL', symbol: 'TSLA', quantity: 25, price: 242.67 },
      { time: '14:15:33', action: 'BUY', symbol: 'NVDA', quantity: 30, price: 875.12 },
    ];

    return (
      <Box flexDirection="column" width={40}>
        <Text color="yellow" bold>
          ════════════ RECENT ACTIVITY ════════════
        </Text>

        {activities.map((activity, index) => (
          <Box key={index} marginBottom={1}>
            <Text color="gray" dimColor>
              {activity.time}
            </Text>
            <Text color="white">
              {' '}
              {activity.action} {activity.quantity} {activity.symbol} @ ${activity.price.toFixed(2)}
            </Text>
          </Box>
        ))}

        <Text color="cyan" dimColor>
          Press 'r' to refresh
        </Text>
      </Box>
    );
  };

  const renderQuickActions = () => (
    <Box flexDirection="column" marginTop={2}>
      <Text color="yellow" bold>
        ═════════════ QUICK ACTIONS ═════════════
      </Text>

      <Box>
        <Text color="cyan">• </Text>
        <Text>Buy/Sell: </Text>
        <Text color="green" bold>deepstack buy AAPL 100</Text>
      </Box>

      <Box>
        <Text color="cyan">• </Text>
        <Text>Get Quote: </Text>
        <Text color="green" bold>deepstack quote TSLA</Text>
      </Box>

      <Box>
        <Text color="cyan">• </Text>
        <Text>View Positions: </Text>
        <Text color="green" bold>Press 'p'</Text>
      </Box>

      <Box>
        <Text color="cyan">• </Text>
        <Text>Risk Analysis: </Text>
        <Text color="green" bold>Press 'r'</Text>
      </Box>
    </Box>
  );

  return (
    <Box flexDirection="column">
      {renderPortfolioSummary()}

      <Box>
        <Box flexDirection="column" width="60%">
          {renderPositionsTable()}
          {renderQuickActions()}
        </Box>

        <Box flexDirection="column" width="40%">
          {renderActivityFeed()}
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;
