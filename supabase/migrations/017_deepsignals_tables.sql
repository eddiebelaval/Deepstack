-- DeepSignals: Market intelligence data tables
-- Stores historical data for signal calculations (IV percentiles, flow alerts, dark pool, insider/congress trades)

-- ============================================================================
-- 1. Historical Implied Volatility
-- Used for IV percentile calculations (requires ~252 trading days of history)
-- ============================================================================

CREATE TABLE IF NOT EXISTS deepsignals_historical_iv (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  date date NOT NULL,
  implied_volatility double precision NOT NULL,
  iv_percentile double precision,
  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (symbol, date)
);

CREATE INDEX IF NOT EXISTS idx_deepsignals_historical_iv_symbol_date
  ON deepsignals_historical_iv (symbol, date);

ALTER TABLE deepsignals_historical_iv ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read" ON deepsignals_historical_iv
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service write" ON deepsignals_historical_iv
  FOR ALL TO service_role USING (true);


-- ============================================================================
-- 2. Options Flow Alerts
-- Sweeps, blocks, unusual volume, large premium, put/call imbalances
-- ============================================================================

CREATE TABLE IF NOT EXISTS deepsignals_flow_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  alert_type text NOT NULL CHECK (alert_type IN ('sweep', 'block', 'unusual_volume', 'large_premium', 'pc_imbalance')),
  option_type text CHECK (option_type IN ('call', 'put')),
  strike double precision,
  expiry date,
  volume integer,
  open_interest integer,
  volume_oi_ratio double precision,
  premium double precision,
  confidence integer,
  detected_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_deepsignals_flow_alerts_symbol
  ON deepsignals_flow_alerts (symbol);

CREATE INDEX IF NOT EXISTS idx_deepsignals_flow_alerts_detected_at
  ON deepsignals_flow_alerts (detected_at DESC);

ALTER TABLE deepsignals_flow_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read" ON deepsignals_flow_alerts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service write" ON deepsignals_flow_alerts
  FOR ALL TO service_role USING (true);


-- ============================================================================
-- 3. Dark Pool Activity
-- FINRA short volume data by symbol, date, and market
-- ============================================================================

CREATE TABLE IF NOT EXISTS deepsignals_dark_pool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL,
  date date NOT NULL,
  short_volume bigint NOT NULL,
  short_exempt_volume bigint NOT NULL DEFAULT 0,
  total_volume bigint NOT NULL,
  short_ratio double precision NOT NULL,
  market text,
  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (symbol, date, market)
);

CREATE INDEX IF NOT EXISTS idx_deepsignals_dark_pool_symbol_date
  ON deepsignals_dark_pool (symbol, date);

ALTER TABLE deepsignals_dark_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read" ON deepsignals_dark_pool
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service write" ON deepsignals_dark_pool
  FOR ALL TO service_role USING (true);


-- ============================================================================
-- 4. Insider Trades
-- SEC Form 4 filings - corporate insider buys/sells
-- ============================================================================

CREATE TABLE IF NOT EXISTS deepsignals_insider_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filer_name text NOT NULL,
  filer_cik text,
  company text,
  symbol text NOT NULL,
  filing_date date NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('buy', 'sell', 'gift')),
  shares double precision,
  price_per_share double precision,
  total_value double precision,
  ownership_type text CHECK (ownership_type IN ('direct', 'indirect')),
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deepsignals_insider_trades_symbol
  ON deepsignals_insider_trades (symbol);

CREATE INDEX IF NOT EXISTS idx_deepsignals_insider_trades_filing_date
  ON deepsignals_insider_trades (filing_date DESC);

ALTER TABLE deepsignals_insider_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read" ON deepsignals_insider_trades
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service write" ON deepsignals_insider_trades
  FOR ALL TO service_role USING (true);


-- ============================================================================
-- 5. Congress Trades
-- Congressional trading disclosures (STOCK Act filings)
-- ============================================================================

CREATE TABLE IF NOT EXISTS deepsignals_congress_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  politician text NOT NULL,
  party text CHECK (party IN ('D', 'R', 'I')),
  chamber text CHECK (chamber IN ('House', 'Senate')),
  state text,
  symbol text NOT NULL,
  company_name text,
  transaction_type text CHECK (transaction_type IN ('purchase', 'sale')),
  transaction_date date,
  disclosure_date date,
  amount_min double precision,
  amount_max double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deepsignals_congress_trades_symbol
  ON deepsignals_congress_trades (symbol);

CREATE INDEX IF NOT EXISTS idx_deepsignals_congress_trades_disclosure_date
  ON deepsignals_congress_trades (disclosure_date DESC);

ALTER TABLE deepsignals_congress_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read" ON deepsignals_congress_trades
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service write" ON deepsignals_congress_trades
  FOR ALL TO service_role USING (true);


-- ============================================================================
-- Table comments
-- ============================================================================

COMMENT ON TABLE deepsignals_historical_iv IS 'Historical implied volatility data for IV percentile calculations';
COMMENT ON TABLE deepsignals_flow_alerts IS 'Options flow alerts: sweeps, blocks, unusual volume, large premium';
COMMENT ON TABLE deepsignals_dark_pool IS 'Dark pool / FINRA short volume data';
COMMENT ON TABLE deepsignals_insider_trades IS 'SEC Form 4 insider trading filings';
COMMENT ON TABLE deepsignals_congress_trades IS 'Congressional trading disclosures (STOCK Act)';
