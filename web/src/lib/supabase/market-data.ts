/**
 * Market Data Storage - Supabase queries for historical OHLCV data
 *
 * This module handles storing and retrieving immutable historical market data.
 * When live data sources are unavailable, we serve real cached data instead of mock.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Types for market bars
export interface MarketBar {
  symbol: string;
  timeframe: string;
  timestamp: string;  // ISO string
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
}

// Database row type (snake_case from Supabase)
interface MarketBarRow {
  id: string;
  symbol: string;
  timeframe: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
  created_at: string;
}

// Create a server-side Supabase client for market data operations
// This uses the anon key but runs server-side, so it's safe
let marketDataClient: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (marketDataClient) return marketDataClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn('Supabase not configured for market data storage');
    return null;
  }

  marketDataClient = createClient(url, key);
  return marketDataClient;
}

/**
 * Fetch historical bars from Supabase storage
 * Returns bars in descending order by timestamp (most recent first)
 */
export async function fetchStoredBars(
  symbol: string,
  timeframe: string,
  limit: number = 100,
  startDate?: Date,
  endDate?: Date
): Promise<MarketBar[]> {
  const client = getClient();
  if (!client) return [];

  let query = client
    .from('market_bars')
    .select('*')
    .eq('symbol', symbol.toUpperCase())
    .eq('timeframe', timeframe.toLowerCase())
    .order('timestamp', { ascending: false })
    .limit(limit);

  // Optional date filtering
  if (startDate) {
    query = query.gte('timestamp', startDate.toISOString());
  }
  if (endDate) {
    query = query.lte('timestamp', endDate.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching stored bars:', error);
    return [];
  }

  // Convert rows to MarketBar format and reverse to ascending order for charts
  return (data as MarketBarRow[])
    .map(row => ({
      symbol: row.symbol,
      timeframe: row.timeframe,
      timestamp: row.timestamp,
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      volume: row.volume ? Number(row.volume) : null,
    }))
    .reverse(); // Charts expect ascending order
}

/**
 * Store bars in Supabase
 * Uses upsert to handle duplicates (same symbol/timeframe/timestamp)
 */
export async function storeBars(bars: MarketBar[]): Promise<boolean> {
  const client = getClient();
  if (!client || bars.length === 0) return false;

  // Prepare rows for upsert
  const rows = bars.map(bar => ({
    symbol: bar.symbol.toUpperCase(),
    timeframe: bar.timeframe.toLowerCase(),
    timestamp: bar.timestamp,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume,
  }));

  // Upsert in batches of 1000 to avoid payload limits
  const BATCH_SIZE = 1000;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    const { error } = await client
      .from('market_bars')
      .upsert(batch, {
        onConflict: 'symbol,timeframe,timestamp',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('Error storing bars batch:', error);
      return false;
    }
  }

  return true;
}

/**
 * Get the most recent bar timestamp for a symbol/timeframe
 * Useful for determining what data we already have
 */
export async function getLatestBarTimestamp(
  symbol: string,
  timeframe: string
): Promise<Date | null> {
  const client = getClient();
  if (!client) return null;

  const { data, error } = await client
    .from('market_bars')
    .select('timestamp')
    .eq('symbol', symbol.toUpperCase())
    .eq('timeframe', timeframe.toLowerCase())
    .order('timestamp', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return new Date(data.timestamp);
}

/**
 * Get the oldest bar timestamp for a symbol/timeframe
 */
export async function getOldestBarTimestamp(
  symbol: string,
  timeframe: string
): Promise<Date | null> {
  const client = getClient();
  if (!client) return null;

  const { data, error } = await client
    .from('market_bars')
    .select('timestamp')
    .eq('symbol', symbol.toUpperCase())
    .eq('timeframe', timeframe.toLowerCase())
    .order('timestamp', { ascending: true })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return new Date(data.timestamp);
}

/**
 * Get bar count for a symbol/timeframe
 */
export async function getBarCount(
  symbol: string,
  timeframe: string
): Promise<number> {
  const client = getClient();
  if (!client) return 0;

  const { count, error } = await client
    .from('market_bars')
    .select('*', { count: 'exact', head: true })
    .eq('symbol', symbol.toUpperCase())
    .eq('timeframe', timeframe.toLowerCase());

  if (error) {
    console.error('Error getting bar count:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Check if we have sufficient data for a request
 * Returns true if we have at least 80% of requested bars
 */
export async function hasAdequateData(
  symbol: string,
  timeframe: string,
  requestedLimit: number
): Promise<boolean> {
  const count = await getBarCount(symbol, timeframe);
  return count >= requestedLimit * 0.8;
}

/**
 * Find gaps in stored data
 * Returns date ranges where data is missing
 */
export async function findDataGaps(
  symbol: string,
  timeframe: string,
  startDate: Date,
  endDate: Date
): Promise<Array<{ start: Date; end: Date }>> {
  const client = getClient();
  if (!client) return [{ start: startDate, end: endDate }];

  const { data, error } = await client
    .from('market_bars')
    .select('timestamp')
    .eq('symbol', symbol.toUpperCase())
    .eq('timeframe', timeframe.toLowerCase())
    .gte('timestamp', startDate.toISOString())
    .lte('timestamp', endDate.toISOString())
    .order('timestamp', { ascending: true });

  if (error || !data || data.length === 0) {
    // No data at all, entire range is a gap
    return [{ start: startDate, end: endDate }];
  }

  // For simplicity, just check if we have any data
  // A more sophisticated approach would analyze actual gaps
  // For now, if we have some data, assume no critical gaps
  return [];
}
