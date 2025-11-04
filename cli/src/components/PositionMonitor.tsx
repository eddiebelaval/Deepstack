/**
 * PositionMonitor Component - Displays current portfolio positions
 *
 * Shows detailed position information with P&L tracking, risk metrics,
 * and real-time updates in PipBoy terminal aesthetic.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { format } from 'date-fns';

import { APIClient, PositionData, AccountSummary } from '../api/client.js';

interface PositionMonitorProps {
  apiClient: APIClient;
}

interface ExtendedPositionData extends PositionData {
  market_price?: number;
  day_change?: number;
  day_change_pct?: number;
  risk_contribution?: number;
}

export const PositionMonitor: React.FC<PositionMonitorProps> = ({ apiClient }) => {
  const [positions, setPositions] = useState<ExtendedPositionData[]>([]);
  const [accountSummary, setAccountSummary] = useState<AccountSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'symbol' | 'pnl' | 'value' | 'risk'>('pnl');
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
      const enhancedPositions = await Promise.all(
        positionsData.map(async (pos) => {
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
          } catch (err) {
            // If quote fails, use avg_cost as market price
            return {
              ...pos,
              market_price: pos.avg_cost,
              day_change: 0,
              day_change_pct: 0,
              risk_contribution: 0
            };
          }
        })
      );

      setPositions(enhancedPositions);
      setAccountSummary(accountData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
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
    if (input === 'r') loadData(); // Refresh
    if (input === 'd') setShowDetails(!showDetails); // Toggle details
    if (input === 's') {
      // Cycle sort options
      const sortOptions: Array<'symbol' | 'pnl' | 'value' | 'risk'> = ['pnl', 'value', 'symbol', 'risk'];
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
    return (
      <Box justifyContent="center" alignItems="center" height={15}>
        <Text color="cyan">
          <Spinner type="dots" />
          {' Loading Positions...'}
        </Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" paddingX={2}>
        <Text color="red" bold>
          ⚠️  Position Monitor Error
        </Text>
        <Text color="gray">{error}</Text>
        <Text color="cyan" dimColor>
          Press 'r' to retry | Press 'd' for dashboard
        </Text>
      </Box>
    );
  }

  const renderHeader = () => (
    <Box flexDirection="column" marginBottom={2}>
      <Text color="yellow" bold>
        ════════════════════════════════════════════════════════════════════
      </Text>
      <Text color="yellow" bold>
        ███████╗██╗██╗     ████████╗ █████╗ ██████╗ ███████╗██████╗ ██████╗
      </Text>
      <Text color="yellow" bold>
        ██╔════╝██║██║     ╚══██╔══╝██╔══██╗██╔══██╗██╔════╝██╔══██╗██╔══██╗
      </Text>
      <Text color="yellow" bold>
        ███████╗██║██║        ██║   ███████║██████╔╝█████╗  ██████╔╝██████╔╝
      </Text>
      <Text color="yellow" bold>
        ╚════██║██║██║        ██║   ██╔══██║██╔══██╗██╔══╝  ██╔══██╗██╔═══╝
      </Text>
      <Text color="yellow" bold>
        ███████║██║███████╗   ██║   ██║  ██║██║  ██║███████╗██║  ██║██║
      </Text>
      <Text color="yellow" bold>
        ╚══════╝╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝
      </Text>
      <Text color="yellow" bold>
        ════════════════════════════════════════════════════════════════════
      </Text>

      <Box justifyContent="space-between" marginY={1}>
        <Text color="green">
          ● {positions.length} Positions
        </Text>
        <Text color="cyan">
          Sort: {sortBy.toUpperCase()}
        </Text>
        <Text color="yellow">
          {format(new Date(), 'HH:mm:ss')}
        </Text>
      </Box>

      <Text color="gray" dimColor>
        [R]efresh | [S]ort | [D]etails | [Q]uit
      </Text>
    </Box>
  );

  const renderPortfolioSummary = () => {
    if (!accountSummary) return null;

    const totalPnL = positions.reduce((sum, pos) => sum + pos.unrealized_pnl + pos.realized_pnl, 0);
    const totalValue = positions.reduce((sum, pos) => sum + pos.market_value, 0);
    const totalRisk = positions.reduce((sum, pos) => sum + (pos.risk_contribution || 0), 0);

    return (
      <Box flexDirection="column" marginBottom={2}>
        <Text color="yellow" bold>
          ═════════════════ PORTFOLIO SUMMARY ═════════════════
        </Text>

        <Box justifyContent="space-between">
          <Box flexDirection="column">
            <Text>
              <Text color="green">Total Positions:</Text> ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text>
              <Text color={totalPnL >= 0 ? "green" : "red"}>
                Total P&L: {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
              </Text>
            </Text>
          </Box>

          <Box flexDirection="column">
            <Text>
              <Text color="cyan">Portfolio Heat:</Text> {(totalRisk * 100).toFixed(1)}%
            </Text>
            <Text>
              <Text color="cyan">Cash Available:</Text> ${accountSummary.cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
            ════════════════════ POSITIONS ════════════════════
          </Text>
          <Text color="gray" italic>
            No open positions in portfolio
          </Text>
        </Box>
      );
    }

    return (
      <Box flexDirection="column">
        <Text color="yellow" bold>
          ════════════════════ POSITIONS ════════════════════
        </Text>

        <Box marginBottom={1}>
          <Box width={8}><Text color="cyan" bold>SYMBOL</Text></Box>
          <Box width={8}><Text color="cyan" bold>SHARES</Text></Box>
          <Box width={10}><Text color="cyan" bold>AVG COST</Text></Box>
          <Box width={8}><Text color="cyan" bold>MKT PRICE</Text></Box>
          <Box width={10}><Text color="cyan" bold>MKT VALUE</Text></Box>
          <Box width={10}><Text color="cyan" bold>DAY CHG</Text></Box>
          <Box width={10}><Text color="cyan" bold>TOTAL P&L</Text></Box>
          {showDetails && <Box width={8}><Text color="cyan" bold>RISK%</Text></Box>}
        </Box>

        {sortedPositions.slice(0, 10).map((position) => {
          const totalPnL = position.unrealized_pnl + position.realized_pnl;
          const pnlColor = totalPnL >= 0 ? "green" : "red";
          const dayChgColor = (position.day_change || 0) >= 0 ? "green" : "red";

          return (
            <Box key={position.symbol}>
              <Box width={8}><Text color="white" bold>{position.symbol}</Text></Box>
              <Box width={8}><Text>{position.position}</Text></Box>
              <Box width={10}><Text>${position.avg_cost.toFixed(2)}</Text></Box>
              <Box width={8}><Text>${(position.market_price || 0).toFixed(2)}</Text></Box>
              <Box width={10}><Text>${position.market_value.toFixed(2)}</Text></Box>
              <Box width={10}>
                <Text color={dayChgColor}>
                  {(position.day_change || 0) >= 0 ? '+' : ''}${(position.day_change || 0).toFixed(2)}
                  ({(position.day_change_pct || 0) >= 0 ? '+' : ''}{(position.day_change_pct || 0).toFixed(1)}%)
                </Text>
              </Box>
              <Box width={10}>
                <Text color={pnlColor}>
                  {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
                </Text>
              </Box>
              {showDetails && (
                <Box width={8}>
                  <Text color="yellow">
                    {(position.risk_contribution || 0) * 100 < 5 ? "LOW" :
                     (position.risk_contribution || 0) * 100 < 10 ? "MED" : "HIGH"}
                  </Text>
                </Box>
              )}
            </Box>
          );
        })}

        {positions.length > 10 && (
          <Text color="gray" italic>
            ... and {positions.length - 10} more positions
          </Text>
        )}
      </Box>
    );
  };

  const renderPositionDetails = () => {
    if (!showDetails || positions.length === 0) return null;

    return (
      <Box flexDirection="column" marginTop={2}>
        <Text color="yellow" bold>
          ═════════════════ POSITION DETAILS ═════════════════
        </Text>

        {sortedPositions.slice(0, 3).map((position) => (
          <Box key={position.symbol} flexDirection="column" marginBottom={1}>
            <Text color="cyan" bold>
              {position.symbol} - Detailed Analysis
            </Text>
            <Text>
              • Current Price: ${(position.market_price || 0).toFixed(2)}
            </Text>
            <Text>
              • Cost Basis: ${position.avg_cost.toFixed(2)}
            </Text>
            <Text>
              • Unrealized P&L: ${position.unrealized_pnl.toFixed(2)}
            </Text>
            <Text>
              • Realized P&L: ${position.realized_pnl.toFixed(2)}
            </Text>
            <Text>
              • Risk Contribution: {(position.risk_contribution || 0) * 100}%
            </Text>
            <Text>
              • Entry Date: {format(new Date(), 'MMM dd, yyyy')} {/* Would be actual entry date */}
            </Text>
          </Box>
        ))}
      </Box>
    );
  };

  const renderQuickStats = () => {
    const totalValue = positions.reduce((sum, pos) => sum + pos.market_value, 0);
    const totalPnL = positions.reduce((sum, pos) => sum + pos.unrealized_pnl + pos.realized_pnl, 0);
    const winningPositions = positions.filter(pos => (pos.unrealized_pnl + pos.realized_pnl) > 0).length;
    const losingPositions = positions.filter(pos => (pos.unrealized_pnl + pos.realized_pnl) < 0).length;

    return (
      <Box flexDirection="column" marginTop={2}>
        <Text color="yellow" bold>
          ═════════════════ QUICK STATS ═════════════════
        </Text>

        <Box justifyContent="space-between">
          <Text>
            <Text color="cyan">Win Rate:</Text> {positions.length > 0 ? `${((winningPositions / positions.length) * 100).toFixed(1)}%` : 'N/A'}
          </Text>
          <Text>
            <Text color="cyan">Total P&L:</Text> <Text color={totalPnL >= 0 ? "green" : "red"}>
              {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
            </Text>
          </Text>
          <Text>
            <Text color="cyan">Avg Position:</Text> ${positions.length > 0 ? (totalValue / positions.length).toFixed(0) : 'N/A'}
          </Text>
        </Box>

        <Box marginTop={1}>
          <Text color="gray" dimColor>
            💡 Tip: Use 'd' to toggle detailed view | 's' to cycle sort options
          </Text>
        </Box>
      </Box>
    );
  };

  return (
    <Box flexDirection="column">
      {renderHeader()}
      {renderPortfolioSummary()}
      {renderPositionsTable()}
      {renderPositionDetails()}
      {renderQuickStats()}
    </Box>
  );
};
