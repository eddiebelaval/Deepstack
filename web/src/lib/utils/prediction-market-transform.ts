/**
 * Transform snake_case backend response to camelCase frontend types
 * This utility is shared between all prediction market API routes
 */
export function transformMarket(market: Record<string, unknown>) {
  return {
    id: market.id,
    platform: market.platform,
    title: market.title,
    category: market.category || 'Unknown',
    yesPrice: market.yes_price ?? market.yesPrice ?? 0,
    noPrice: market.no_price ?? market.noPrice ?? 0,
    volume: market.volume ?? 0,
    volume24h: market.volume_24h ?? market.volume24h,
    openInterest: market.open_interest ?? market.openInterest,
    endDate: market.end_date ?? market.endDate,
    status: market.status || 'active',
    url: market.url || '',
    description: market.description,
  };
}
