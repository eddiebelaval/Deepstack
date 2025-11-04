/**
 * Risk Display Component - Portfolio Risk Management Interface
 *
 * Shows risk metrics, position heat, Kelly sizing, and risk alerts.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';

import { APIClient } from '../api/client';

interface RiskDisplayProps {
  apiClient: APIClient;
}

export const RiskDisplay: React.FC<RiskDisplayProps> = ({ apiClient }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [riskMetrics, setRiskMetrics] = useState<any>(null);
  const [portfolioHeat, setPortfolioHeat] = useState<number>(0);
  const [dailyLossCheck, setDailyLossCheck] = useState<any>(null);
  const [weeklyLossCheck, setWeeklyLossCheck] = useState<any>(null);

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
        <Text color="cyan">Loading Risk Analysis...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" paddingX={2}>
        <Text color="red" bold>
          ⚠️  Risk Analysis Error
        </Text>
        <Text color="gray">{error}</Text>
        <Text color="cyan" dimColor>
          Press 'r' to retry
        </Text>
      </Box>
    );
  }

  const renderRiskOverview = () => (
    <Box flexDirection="column" marginBottom={2}>
      <Text color="yellow" bold>
        ═════════════════ RISK OVERVIEW ═════════════════
      </Text>

      <Box justifyContent="space-between" marginY={1}>
        <Box flexDirection="column">
          <Text>
            <Text color="green">Portfolio Value:</Text> ${riskMetrics?.portfolio_value?.toLocaleString()}
          </Text>
          <Text>
            <Text color="cyan">Portfolio Heat:</Text> {riskMetrics?.portfolio_heat ? `${(riskMetrics.portfolio_heat * 100).toFixed(1)}%` : 'N/A'}
          </Text>
        </Box>

        <Box flexDirection="column">
          <Text>
            <Text color="yellow">Kelly Fraction:</Text> {riskMetrics?.kelly_fraction ? `${(riskMetrics.kelly_fraction * 100).toFixed(1)}%` : 'N/A'}
          </Text>
          <Text>
            <Text color="magenta">VaR (95%):</Text> ${riskMetrics?.var_95?.toLocaleString()}
          </Text>
        </Box>
      </Box>
    </Box>
  );

  const renderPerformanceMetrics = () => (
    <Box flexDirection="column" marginBottom={2}>
      <Text color="yellow" bold>
        ════════════════ PERFORMANCE METRICS ════════════════
      </Text>

      <Box justifyContent="space-between" marginY={1}>
        <Box flexDirection="column">
          <Text>
            <Text color="green">Sharpe Ratio:</Text> {riskMetrics?.sharpe_ratio?.toFixed(2) || 'N/A'}
          </Text>
          <Text>
            <Text color="green">Sortino Ratio:</Text> {riskMetrics?.sortino_ratio?.toFixed(2) || 'N/A'}
          </Text>
        </Box>

        <Box flexDirection="column">
          <Text>
            <Text color="yellow">Calmar Ratio:</Text> {riskMetrics?.calmar_ratio?.toFixed(2) || 'N/A'}
          </Text>
          <Text>
            <Text color="red">Max Drawdown:</Text> {riskMetrics?.max_drawdown ? `${(riskMetrics.max_drawdown * 100).toFixed(1)}%` : 'N/A'}
          </Text>
        </Box>
      </Box>
    </Box>
  );

  const renderLossLimits = () => (
    <Box flexDirection="column" marginBottom={2}>
      <Text color="yellow" bold>
        ══════════════════ LOSS LIMITS ═══════════════════
      </Text>

      <Box marginY={1}>
        <Text color={dailyLossCheck?.within_limit ? "green" : "red"}>
          ● Daily Loss: {dailyLossCheck?.current_loss_pct ? `${(dailyLossCheck.current_loss_pct * 100).toFixed(1)}%` : 'N/A'} / {dailyLossCheck?.limit_pct ? `${(dailyLossCheck.limit_pct * 100).toFixed(1)}%` : 'N/A'}
        </Text>
      </Box>

      <Box marginY={1}>
        <Text color={weeklyLossCheck?.within_limit ? "green" : "red"}>
          ● Weekly Loss: {weeklyLossCheck?.current_loss_pct ? `${(weeklyLossCheck.current_loss_pct * 100).toFixed(1)}%` : 'N/A'} / {weeklyLossCheck?.limit_pct ? `${(weeklyLossCheck.limit_pct * 100).toFixed(1)}%` : 'N/A'}
        </Text>
      </Box>

      <Box marginY={1}>
        <Text color={portfolioHeat > 0.15 ? "red" : "green"}>
          ● Portfolio Heat: {(portfolioHeat * 100).toFixed(1)}% / 15.0%
        </Text>
      </Box>
    </Box>
  );

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
      return (
        <Box flexDirection="column" marginBottom={2}>
          <Text color="yellow" bold>
            ═════════════════ RISK ALERTS ═════════════════
          </Text>
          <Text color="green">✅ All risk metrics within acceptable limits</Text>
        </Box>
      );
    }

    return (
      <Box flexDirection="column" marginBottom={2}>
        <Text color="yellow" bold>
          ═════════════════ RISK ALERTS ═════════════════
        </Text>
        {alerts.map((alert, index) => (
          <Text key={index} color="red">
            {alert}
          </Text>
        ))}
      </Box>
    );
  };

  const renderRiskManagementTips = () => (
    <Box flexDirection="column" marginTop={2}>
      <Text color="yellow" bold>
        ════════════════ RISK MANAGEMENT TIPS ════════════════
      </Text>

      <Box>
        <Text color="cyan">• </Text>
        <Text>Monitor portfolio heat daily (target: &lt;15%)</Text>
      </Box>

      <Box>
        <Text color="cyan">• </Text>
        <Text>Use Kelly Criterion for position sizing</Text>
      </Box>

      <Box>
        <Text color="cyan">• </Text>
        <Text>Set stops before entering positions</Text>
      </Box>

      <Box>
        <Text color="cyan">• </Text>
        <Text>Never move stop losses down</Text>
      </Box>

      <Box>
        <Text color="cyan">• </Text>
        <Text>Take profits when targets hit</Text>
      </Box>
    </Box>
  );

  return (
    <Box flexDirection="column">
      {renderRiskOverview()}
      {renderPerformanceMetrics()}
      {renderLossLimits()}
      {renderRiskAlerts()}
      {renderRiskManagementTips()}

      <Box marginTop={2}>
        <Text color="cyan" dimColor>
          Press 'r' to refresh | Press 'd' for Dashboard | Press 'p' for Positions
        </Text>
      </Box>
    </Box>
  );
};

export default RiskDisplay;
