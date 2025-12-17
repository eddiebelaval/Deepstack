-- Migration: Create market_bars table for historical price data storage
-- Purpose: Store immutable historical OHLCV data to avoid fake mock data
-- When backend is unavailable, we serve real cached data instead of fake prices

-- Create the market_bars table
CREATE TABLE IF NOT EXISTS market_bars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(20) NOT NULL,
  timeframe VARCHAR(10) NOT NULL,  -- '1d', '1h', '1w', etc.
  timestamp TIMESTAMPTZ NOT NULL,
  open NUMERIC(20, 8) NOT NULL,
  high NUMERIC(20, 8) NOT NULL,
  low NUMERIC(20, 8) NOT NULL,
  close NUMERIC(20, 8) NOT NULL,
  volume BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure no duplicate bars for same symbol/timeframe/timestamp
  UNIQUE(symbol, timeframe, timestamp)
);

-- Index for querying bars by symbol and timeframe (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_market_bars_symbol_timeframe
  ON market_bars(symbol, timeframe);

-- Index for ordering by timestamp (for getting recent bars)
CREATE INDEX IF NOT EXISTS idx_market_bars_timestamp
  ON market_bars(timestamp DESC);

-- Composite index for the most common query: get N bars for symbol/timeframe
CREATE INDEX IF NOT EXISTS idx_market_bars_lookup
  ON market_bars(symbol, timeframe, timestamp DESC);

-- Enable Row Level Security
ALTER TABLE market_bars ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to read market bars (public market data)
CREATE POLICY "Anyone can read market bars"
  ON market_bars
  FOR SELECT
  USING (true);

-- Policy: Only service role can insert/update market bars (prevents tampering)
-- This means only the server can write to this table, not client-side queries
CREATE POLICY "Service role can insert market bars"
  ON market_bars
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update market bars"
  ON market_bars
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Add comment explaining the table's purpose
COMMENT ON TABLE market_bars IS 'Stores historical OHLCV market data. This data is immutable - past prices never change. Used as fallback when live data sources are unavailable.';

COMMENT ON COLUMN market_bars.symbol IS 'Trading symbol (e.g., SPY, AAPL, BTC/USD)';
COMMENT ON COLUMN market_bars.timeframe IS 'Bar timeframe (1d=daily, 1h=hourly, 1w=weekly)';
COMMENT ON COLUMN market_bars.timestamp IS 'Bar timestamp (start of period)';
COMMENT ON COLUMN market_bars.open IS 'Opening price';
COMMENT ON COLUMN market_bars.high IS 'Highest price during period';
COMMENT ON COLUMN market_bars.low IS 'Lowest price during period';
COMMENT ON COLUMN market_bars.close IS 'Closing price';
COMMENT ON COLUMN market_bars.volume IS 'Trading volume during period';
