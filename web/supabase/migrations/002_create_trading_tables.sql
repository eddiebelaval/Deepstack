-- DeepStack Trading Tables Migration
-- Run this in your Supabase SQL Editor

-- ============================================
-- WATCHLISTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  symbols TEXT[] DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PRICE ALERTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('price_above', 'price_below', 'pct_change_up', 'pct_change_down')),
  target_value NUMERIC NOT NULL,
  triggered BOOLEAN DEFAULT FALSE,
  triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ -- Optional expiration
);

-- ============================================
-- CHART LAYOUTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.chart_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  config JSONB NOT NULL DEFAULT '{}',
  -- Config structure: { timeframe, chartType, indicators: [...], panelSizes: {...} }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TRADE JOURNAL TABLE (Optional - for tracking paper trades)
-- ============================================
CREATE TABLE IF NOT EXISTS public.trade_journal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('BUY', 'SELL')),
  quantity INTEGER NOT NULL,
  price NUMERIC NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('MKT', 'LMT', 'STP')),
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  pnl NUMERIC, -- Realized P&L
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON public.watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlists_sort_order ON public.watchlists(sort_order);

CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id ON public.price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_symbol ON public.price_alerts(symbol);
CREATE INDEX IF NOT EXISTS idx_price_alerts_triggered ON public.price_alerts(triggered) WHERE triggered = FALSE;

CREATE INDEX IF NOT EXISTS idx_chart_layouts_user_id ON public.chart_layouts(user_id);

CREATE INDEX IF NOT EXISTS idx_trade_journal_user_id ON public.trade_journal(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_journal_symbol ON public.trade_journal(symbol);
CREATE INDEX IF NOT EXISTS idx_trade_journal_created_at ON public.trade_journal(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_journal ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES: WATCHLISTS
-- ============================================
CREATE POLICY "Users can view their own watchlists"
  ON public.watchlists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own watchlists"
  ON public.watchlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watchlists"
  ON public.watchlists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own watchlists"
  ON public.watchlists FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES: PRICE ALERTS
-- ============================================
CREATE POLICY "Users can view their own price alerts"
  ON public.price_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own price alerts"
  ON public.price_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own price alerts"
  ON public.price_alerts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own price alerts"
  ON public.price_alerts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES: CHART LAYOUTS
-- ============================================
CREATE POLICY "Users can view their own chart layouts"
  ON public.chart_layouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chart layouts"
  ON public.chart_layouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chart layouts"
  ON public.chart_layouts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chart layouts"
  ON public.chart_layouts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES: TRADE JOURNAL
-- ============================================
CREATE POLICY "Users can view their own trade journal"
  ON public.trade_journal FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trade journal entries"
  ON public.trade_journal FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trade journal entries"
  ON public.trade_journal FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trade journal entries"
  ON public.trade_journal FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
DROP TRIGGER IF EXISTS update_watchlists_updated_at ON public.watchlists;
CREATE TRIGGER update_watchlists_updated_at
  BEFORE UPDATE ON public.watchlists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chart_layouts_updated_at ON public.chart_layouts;
CREATE TRIGGER update_chart_layouts_updated_at
  BEFORE UPDATE ON public.chart_layouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER FUNCTION: Ensure only one default watchlist per user
-- ============================================
CREATE OR REPLACE FUNCTION ensure_single_default_watchlist()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    UPDATE public.watchlists
    SET is_default = FALSE
    WHERE user_id = NEW.user_id AND id != NEW.id AND is_default = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_single_default_watchlist_trigger ON public.watchlists;
CREATE TRIGGER ensure_single_default_watchlist_trigger
  BEFORE INSERT OR UPDATE ON public.watchlists
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_watchlist();

-- ============================================
-- HELPER FUNCTION: Ensure only one default chart layout per user
-- ============================================
CREATE OR REPLACE FUNCTION ensure_single_default_chart_layout()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    UPDATE public.chart_layouts
    SET is_default = FALSE
    WHERE user_id = NEW.user_id AND id != NEW.id AND is_default = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_single_default_chart_layout_trigger ON public.chart_layouts;
CREATE TRIGGER ensure_single_default_chart_layout_trigger
  BEFORE INSERT OR UPDATE ON public.chart_layouts
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_chart_layout();
