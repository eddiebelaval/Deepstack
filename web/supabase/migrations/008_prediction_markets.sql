-- =====================================================
-- Prediction Market User Features
-- =====================================================

-- User watchlists for prediction markets
CREATE TABLE IF NOT EXISTS prediction_market_watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Market identification (external)
  platform TEXT NOT NULL CHECK (platform IN ('kalshi', 'polymarket')),
  external_market_id TEXT NOT NULL,
  market_title TEXT NOT NULL,
  market_category TEXT,

  -- User tracking
  notes TEXT,
  alert_threshold_high NUMERIC CHECK (alert_threshold_high >= 0 AND alert_threshold_high <= 100),
  alert_threshold_low NUMERIC CHECK (alert_threshold_low >= 0 AND alert_threshold_low <= 100),

  -- Paper position tracking (optional)
  tracked_position TEXT CHECK (tracked_position IN ('yes', 'no')),
  tracked_entry_price NUMERIC,
  tracked_quantity INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, platform, external_market_id)
);

-- Link prediction markets to thesis entries
CREATE TABLE IF NOT EXISTS thesis_prediction_market_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thesis_id UUID REFERENCES thesis(id) ON DELETE CASCADE NOT NULL,

  -- Market identification
  platform TEXT NOT NULL CHECK (platform IN ('kalshi', 'polymarket')),
  external_market_id TEXT NOT NULL,
  market_title TEXT NOT NULL,

  -- Relationship
  relationship TEXT NOT NULL CHECK (relationship IN ('supports', 'contradicts', 'correlates', 'hedges')),

  -- AI analysis (populated by system)
  ai_analysis TEXT,
  confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),

  -- User notes
  user_notes TEXT,

  -- Snapshot at link time
  price_at_link NUMERIC,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(thesis_id, platform, external_market_id)
);

-- Indexes for performance
CREATE INDEX idx_pm_watchlist_user ON prediction_market_watchlists(user_id);
CREATE INDEX idx_pm_watchlist_platform ON prediction_market_watchlists(platform);
CREATE INDEX idx_thesis_pm_links_thesis ON thesis_prediction_market_links(thesis_id);
CREATE INDEX idx_thesis_pm_links_platform ON thesis_prediction_market_links(platform);

-- Row Level Security
ALTER TABLE prediction_market_watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE thesis_prediction_market_links ENABLE ROW LEVEL SECURITY;

-- Watchlist policies: Users can only access their own watchlists
CREATE POLICY "Users can view their own PM watchlist"
  ON prediction_market_watchlists FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert to their own PM watchlist"
  ON prediction_market_watchlists FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own PM watchlist"
  ON prediction_market_watchlists FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from their own PM watchlist"
  ON prediction_market_watchlists FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Thesis links: Users can only access links for their own theses
CREATE POLICY "Users can view their thesis PM links"
  ON thesis_prediction_market_links FOR SELECT
  TO authenticated
  USING (
    thesis_id IN (SELECT id FROM thesis WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert thesis PM links"
  ON thesis_prediction_market_links FOR INSERT
  TO authenticated
  WITH CHECK (
    thesis_id IN (SELECT id FROM thesis WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their thesis PM links"
  ON thesis_prediction_market_links FOR UPDATE
  TO authenticated
  USING (
    thesis_id IN (SELECT id FROM thesis WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete their thesis PM links"
  ON thesis_prediction_market_links FOR DELETE
  TO authenticated
  USING (
    thesis_id IN (SELECT id FROM thesis WHERE user_id = auth.uid())
  );

-- Updated_at trigger function (reuse if exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_pm_watchlist_updated_at
  BEFORE UPDATE ON prediction_market_watchlists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_thesis_pm_links_updated_at
  BEFORE UPDATE ON thesis_prediction_market_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
