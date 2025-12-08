-- Migration: Update Watchlist Schema
-- Description: Migrate from symbols TEXT[] to items JSONB structure
-- This migration preserves existing watchlist data while updating the schema

-- ============================================
-- STEP 1: Add new items column
-- ============================================
ALTER TABLE public.watchlists
ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;

-- ============================================
-- STEP 2: Migrate existing data from symbols to items
-- ============================================
-- Convert each symbol in the array to a structured item
UPDATE public.watchlists
SET items = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'symbol', symbol,
      'addedAt', created_at::text
    )
  )
  FROM unnest(symbols) AS symbol
)
WHERE symbols IS NOT NULL AND array_length(symbols, 1) > 0;

-- ============================================
-- STEP 3: Drop old symbols column
-- ============================================
ALTER TABLE public.watchlists
DROP COLUMN IF EXISTS symbols;

-- ============================================
-- STEP 4: Drop old sort_order column (not used in current implementation)
-- ============================================
ALTER TABLE public.watchlists
DROP COLUMN IF EXISTS sort_order;

-- ============================================
-- STEP 5: Add constraints
-- ============================================
-- Ensure items is always a valid JSON array
ALTER TABLE public.watchlists
ADD CONSTRAINT items_is_array CHECK (jsonb_typeof(items) = 'array');

-- ============================================
-- STEP 6: Create index for better query performance
-- ============================================
-- Index on items for faster lookups
CREATE INDEX IF NOT EXISTS idx_watchlists_items ON public.watchlists USING gin(items);

-- ============================================
-- STEP 7: Update trigger (already exists, but ensure it works with new schema)
-- ============================================
-- The existing update_watchlists_updated_at trigger should still work

-- ============================================
-- VERIFICATION QUERIES (comment these out before running)
-- ============================================
-- SELECT id, name, items, created_at, updated_at FROM public.watchlists LIMIT 10;
-- SELECT count(*) FROM public.watchlists WHERE items IS NOT NULL;
