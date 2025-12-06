-- Trade Journal table for DeepStack portfolio tracking
-- Run this migration in Supabase SQL Editor or via supabase db push

CREATE TABLE IF NOT EXISTS trade_journal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('BUY', 'SELL')),
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  price NUMERIC NOT NULL CHECK (price > 0),
  order_type TEXT NOT NULL DEFAULT 'MKT' CHECK (order_type IN ('MKT', 'LMT', 'STP')),
  notes TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  executed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE trade_journal ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only access their own trades
CREATE POLICY "Users can view own trades"
  ON trade_journal FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trades"
  ON trade_journal FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trades"
  ON trade_journal FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trades"
  ON trade_journal FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_trade_journal_user_id ON trade_journal(user_id);
CREATE INDEX idx_trade_journal_symbol ON trade_journal(symbol);
CREATE INDEX idx_trade_journal_executed_at ON trade_journal(executed_at DESC);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE trade_journal;

COMMENT ON TABLE trade_journal IS 'DeepStack paper trading journal for portfolio tracking';
