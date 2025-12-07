/**
 * Market Hours Utilities for DeepStack
 * Handles US stock market hours, holidays, and session detection
 */

// US Market hours in Eastern Time
const MARKET_OPEN_HOUR = 9;
const MARKET_OPEN_MINUTE = 30;
const MARKET_CLOSE_HOUR = 16;
const MARKET_CLOSE_MINUTE = 0;

// Pre-market: 4:00 AM - 9:30 AM ET
const PREMARKET_START_HOUR = 4;
// After-hours: 4:00 PM - 8:00 PM ET
const AFTERHOURS_END_HOUR = 20;

// 2024-2025 US Stock Market Holidays (NYSE/NASDAQ)
const MARKET_HOLIDAYS = [
  // 2024
  '2024-01-01', // New Year's Day
  '2024-01-15', // MLK Day
  '2024-02-19', // Presidents Day
  '2024-03-29', // Good Friday
  '2024-05-27', // Memorial Day
  '2024-06-19', // Juneteenth
  '2024-07-04', // Independence Day
  '2024-09-02', // Labor Day
  '2024-11-28', // Thanksgiving
  '2024-12-25', // Christmas
  // 2025
  '2025-01-01', // New Year's Day
  '2025-01-20', // MLK Day
  '2025-02-17', // Presidents Day
  '2025-04-18', // Good Friday
  '2025-05-26', // Memorial Day
  '2025-06-19', // Juneteenth
  '2025-07-04', // Independence Day
  '2025-09-01', // Labor Day
  '2025-11-27', // Thanksgiving
  '2025-12-25', // Christmas
];

export type MarketSession = 'premarket' | 'regular' | 'afterhours' | 'closed';

export interface MarketStatus {
  isOpen: boolean;
  session: MarketSession;
  nextOpen: Date | null;
  nextClose: Date | null;
  message: string;
}

/**
 * Get current time in Eastern timezone
 */
function getEasternTime(): Date {
  const now = new Date();
  const easternTime = new Date(
    now.toLocaleString('en-US', { timeZone: 'America/New_York' })
  );
  return easternTime;
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Check if a date is a market holiday
 */
export function isMarketHoliday(date: Date = new Date()): boolean {
  const dateStr = formatDate(date);
  return MARKET_HOLIDAYS.includes(dateStr);
}

/**
 * Check if a date is a weekend
 */
export function isWeekend(date: Date = new Date()): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

/**
 * Get the current market session
 */
export function getMarketSession(date: Date = new Date()): MarketSession {
  const et = getEasternTime();

  // Check if weekend or holiday
  if (isWeekend(et) || isMarketHoliday(et)) {
    return 'closed';
  }

  const hours = et.getHours();
  const minutes = et.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  const marketOpenMinutes = MARKET_OPEN_HOUR * 60 + MARKET_OPEN_MINUTE;
  const marketCloseMinutes = MARKET_CLOSE_HOUR * 60 + MARKET_CLOSE_MINUTE;
  const premarketStartMinutes = PREMARKET_START_HOUR * 60;
  const afterhoursEndMinutes = AFTERHOURS_END_HOUR * 60;

  if (timeInMinutes >= marketOpenMinutes && timeInMinutes < marketCloseMinutes) {
    return 'regular';
  }

  if (timeInMinutes >= premarketStartMinutes && timeInMinutes < marketOpenMinutes) {
    return 'premarket';
  }

  if (timeInMinutes >= marketCloseMinutes && timeInMinutes < afterhoursEndMinutes) {
    return 'afterhours';
  }

  return 'closed';
}

/**
 * Check if market is currently open for regular trading
 */
export function isMarketOpen(): boolean {
  return getMarketSession() === 'regular';
}

/**
 * Check if any trading session is active (including pre/after hours)
 */
export function isExtendedHoursOpen(): boolean {
  const session = getMarketSession();
  return session !== 'closed';
}

/**
 * Get next market open time
 */
export function getNextMarketOpen(): Date {
  const et = getEasternTime();
  const result = new Date(et);

  // Set to market open time
  result.setHours(MARKET_OPEN_HOUR, MARKET_OPEN_MINUTE, 0, 0);

  // If already past open today, move to next day
  if (et >= result) {
    result.setDate(result.getDate() + 1);
  }

  // Skip weekends and holidays
  while (isWeekend(result) || isMarketHoliday(result)) {
    result.setDate(result.getDate() + 1);
  }

  return result;
}

/**
 * Get next market close time
 */
export function getNextMarketClose(): Date | null {
  if (!isMarketOpen()) {
    return null;
  }

  const et = getEasternTime();
  const result = new Date(et);
  result.setHours(MARKET_CLOSE_HOUR, MARKET_CLOSE_MINUTE, 0, 0);

  return result;
}

/**
 * Get comprehensive market status
 */
export function getMarketStatus(): MarketStatus {
  const session = getMarketSession();
  const isOpen = session === 'regular';

  let message: string;
  switch (session) {
    case 'regular':
      message = 'Market is open';
      break;
    case 'premarket':
      message = 'Pre-market session';
      break;
    case 'afterhours':
      message = 'After-hours session';
      break;
    case 'closed':
      if (isWeekend(getEasternTime())) {
        message = 'Weekend - Markets closed';
      } else if (isMarketHoliday(getEasternTime())) {
        message = 'Holiday - Markets closed';
      } else {
        message = 'Markets closed';
      }
      break;
  }

  return {
    isOpen,
    session,
    nextOpen: isOpen ? null : getNextMarketOpen(),
    nextClose: getNextMarketClose(),
    message,
  };
}

/**
 * Format time until market event
 */
export function formatTimeUntil(target: Date): string {
  const now = new Date();
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) return 'now';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

/**
 * Hook-friendly market status with auto-refresh
 */
export function useMarketStatus() {
  // This would be implemented as a React hook
  // For now, just return the static status
  return getMarketStatus();
}
