/**
 * Market Scanner Component - Stock Screening Interface
 *
 * Screens for trading opportunities using deep value and squeeze criteria.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';

import { APIClient } from '../api/client';

interface MarketScannerProps {
  apiClient: APIClient;
}

interface ScanResult {
  symbol: string;
  deep_value_score: number;
  squeeze_score: number;
  overall_score: number;
  recommendation: string;
  thesis: string;
  catalysts: string[];
  risks: string[];
  target_price: number;
  stop_price: number;
  position_size_pct: number;
  confidence: number;
}

export const MarketScanner: React.FC<MarketScannerProps> = ({ apiClient }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<'deep_value' | 'squeeze' | 'both'>('both');
  const [showDetails, setShowDetails] = useState<number | null>(null);

  // Load scan results
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Mock scan results - would call real API
      const mockResults: ScanResult[] = [
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

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
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
    if (input === '1') setSelectedStrategy('deep_value');
    if (input === '2') setSelectedStrategy('squeeze');
    if (input === '3') setSelectedStrategy('both');
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
    return (
      <Box justifyContent="center" alignItems="center" height={10}>
        <Text color="cyan">
          <Spinner type="dots" />
          {' Scanning Markets...'}
        </Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" paddingX={2}>
        <Text color="red" bold>
          ⚠️  Market Scanner Error
        </Text>
        <Text color="gray">{error}</Text>
        <Text color="cyan" dimColor>
          Press 'r' to retry
        </Text>
      </Box>
    );
  }

  const renderStrategySelector = () => (
    <Box marginBottom={2}>
      <Text color="yellow" bold>
        ═════════════════ STRATEGY SELECTION ═════════════════
      </Text>

      <Box marginY={1}>
        <Text color={selectedStrategy === 'deep_value' ? 'green' : 'gray'}>
          [1] Deep Value
        </Text>
        <Text color={selectedStrategy === 'squeeze' ? 'green' : 'gray'}>
          {'  [2] Squeeze Hunter'}
        </Text>
        <Text color={selectedStrategy === 'both' ? 'green' : 'gray'}>
          {'  [3] Combined'}
        </Text>
      </Box>

      <Text color="cyan" dimColor>
        Current: {selectedStrategy === 'deep_value' ? 'Deep Value Investing' :
                 selectedStrategy === 'squeeze' ? 'Short Squeeze Detection' : 'Combined Analysis'}
      </Text>
    </Box>
  );

  const renderResultsTable = () => {
    if (scanResults.length === 0) {
      return (
        <Box flexDirection="column" marginBottom={2}>
          <Text color="yellow" bold>
            ═══════════════════ SCAN RESULTS ═══════════════════
          </Text>
          <Text color="gray" italic>
            No opportunities found matching current criteria
          </Text>
        </Box>
      );
    }

    return (
      <Box flexDirection="column" marginBottom={2}>
        <Text color="yellow" bold>
          ═══════════════════ SCAN RESULTS ═══════════════════
        </Text>

        <Box marginBottom={1}>
          <Box width={8}><Text color="cyan" bold>SYMBOL</Text></Box>
          <Box width={8}><Text color="cyan" bold>SCORE</Text></Box>
          <Box width={8}><Text color="cyan" bold>DEEP</Text></Box>
          <Box width={8}><Text color="cyan" bold>SQUEEZE</Text></Box>
          <Box width={12}><Text color="cyan" bold>RECOMMEND</Text></Box>
          <Box width={8}><Text color="cyan" bold>SIZE</Text></Box>
          <Box width={8}><Text color="cyan" bold>TARGET</Text></Box>
        </Box>

        {scanResults.slice(0, 8).map((result, index) => (
          <Box key={result.symbol}>
            <Box width={8}>
              <Text color={showDetails === index ? "yellow" : "white"} bold>
                {result.symbol}
              </Text>
            </Box>
            <Box width={8}>
              <Text color={
                result.overall_score >= 70 ? "green" :
                result.overall_score >= 50 ? "yellow" : "red"
              }>
                {result.overall_score}
              </Text>
            </Box>
            <Box width={8}><Text>{result.deep_value_score}</Text></Box>
            <Box width={8}><Text>{result.squeeze_score}</Text></Box>
            <Box width={12}>
              <Text color={
                result.recommendation === 'BUY' ? "green" :
                result.recommendation === 'WATCH' ? "yellow" : "red"
              }>
                {result.recommendation}
              </Text>
            </Box>
            <Box width={8}><Text>{result.position_size_pct.toFixed(1)}%</Text></Box>
            <Box width={8}><Text>${result.target_price.toFixed(0)}</Text></Box>
          </Box>
        ))}

        {scanResults.length > 8 && (
          <Text color="gray" italic>
            ... and {scanResults.length - 8} more opportunities
          </Text>
        )}
      </Box>
    );
  };

  const renderDetailedView = () => {
    if (showDetails === null || !scanResults[showDetails]) return null;

    const result = scanResults[showDetails];

    return (
      <Box flexDirection="column" marginBottom={2}>
        <Text color="yellow" bold>
          ════════════════════ DETAILED ANALYSIS ════════════════════
        </Text>

        <Box marginY={1}>
          <Text color="green" bold>
            {result.symbol} - {result.recommendation} (Confidence: {(result.confidence * 100).toFixed(0)}%)
          </Text>
        </Box>

        <Text color="white">
          <Text color="cyan">Thesis:</Text> {result.thesis}
        </Text>

        <Box marginY={1}>
          <Text color="green">Catalysts:</Text>
          {result.catalysts.map((catalyst, index) => (
            <Text key={index}>  • {catalyst}</Text>
          ))}
        </Box>

        <Box marginY={1}>
          <Text color="red">Risks:</Text>
          {result.risks.map((risk, index) => (
            <Text key={index}>  • {risk}</Text>
          ))}
        </Box>

        <Box justifyContent="space-between" marginY={1}>
          <Text color="yellow">Target: ${result.target_price.toFixed(2)}</Text>
          <Text color="red">Stop: ${result.stop_price.toFixed(2)}</Text>
          <Text color="cyan">Size: {result.position_size_pct.toFixed(1)}%</Text>
        </Box>

        <Text color="gray" dimColor>
          ↑/↓ Navigate | Enter Select | Esc Back to List
        </Text>
      </Box>
    );
  };

  const renderScannerStats = () => (
    <Box flexDirection="column" marginBottom={2}>
      <Text color="yellow" bold>
        ══════════════════ SCANNER STATS ═══════════════════
      </Text>

      <Box justifyContent="space-between" marginY={1}>
        <Text>
          <Text color="green">Opportunities:</Text> {scanResults.length}
        </Text>
        <Text>
          <Text color="green">Avg Score:</Text> {scanResults.length > 0 ?
            (scanResults.reduce((sum, r) => sum + r.overall_score, 0) / scanResults.length).toFixed(0) : 'N/A'}
        </Text>
        <Text>
          <Text color="green">Buy Signals:</Text> {scanResults.filter(r => r.recommendation === 'BUY').length}
        </Text>
      </Box>
    </Box>
  );

  const renderQuickActions = () => (
    <Box flexDirection="column" marginTop={2}>
      <Text color="yellow" bold>
        ════════════════ QUICK ACTIONS ════════════════
      </Text>

      <Box>
        <Text color="cyan">• </Text>
        <Text>Analyze Stock: </Text>
        <Text color="green" bold>deepstack analyze AAPL</Text>
      </Box>

      <Box>
        <Text color="cyan">• </Text>
        <Text>Place Order: </Text>
        <Text color="green" bold>deepstack buy AAPL 100</Text>
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
      {renderStrategySelector()}

      {showDetails === null ? (
        <>
          {renderScannerStats()}
          {renderResultsTable()}
        </>
      ) : (
        renderDetailedView()
      )}

      {renderQuickActions()}

      <Box marginTop={2}>
        <Text color="cyan" dimColor>
          Press 'r' to refresh | [1-3] Change Strategy | [↑↓] Navigate | [Enter] Details | [Esc] Back
        </Text>
      </Box>
    </Box>
  );
};
