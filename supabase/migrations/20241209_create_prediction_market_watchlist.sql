-- Create prediction market watchlist table
CREATE TABLE IF NOT EXISTS prediction_market_watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Market identification
  platform text NOT NULL CHECK (platform IN ('kalshi', 'polymarket')),
  external_market_id text NOT NULL,

  -- Cached market data (updated on each fetch)
  title text NOT NULL,
  category text,
  yes_price numeric(10, 6),
  no_price numeric(10, 6),
  volume numeric(18, 2),
  end_date timestamptz,
  url text,

  -- User notes/alerts
  notes text,
  price_alert_above numeric(10, 6),
  price_alert_below numeric(10, 6),

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Ensure unique market per user
  UNIQUE (user_id, platform, external_market_id)
);

-- Create index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_pm_watchlist_user_id ON prediction_market_watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_pm_watchlist_platform ON prediction_market_watchlist(platform);

-- Enable RLS
ALTER TABLE prediction_market_watchlist ENABLE ROW LEVEL SECURITY;

-- RLS policies: Users can only see/modify their own watchlist
CREATE POLICY "Users can view own watchlist" ON prediction_market_watchlist
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watchlist" ON prediction_market_watchlist
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watchlist" ON prediction_market_watchlist
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlist" ON prediction_market_watchlist
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pm_watchlist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS pm_watchlist_updated_at ON prediction_market_watchlist;
CREATE TRIGGER pm_watchlist_updated_at
  BEFORE UPDATE ON prediction_market_watchlist
  FOR EACH ROW
  EXECUTE FUNCTION update_pm_watchlist_updated_at();

-- Add comment
COMMENT ON TABLE prediction_market_watchlist IS 'User watchlist for prediction markets (Kalshi, Polymarket) with cached market data';
