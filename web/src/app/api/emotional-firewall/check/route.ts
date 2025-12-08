import { NextRequest, NextResponse } from 'next/server';

// Types matching Python emotional_firewall.py
export interface FirewallCheckResult {
  blocked: boolean;
  reasons: string[];
  patterns_detected: string[];
  cooldown_expires: string | null;
  status: 'safe' | 'warning' | 'blocked';
  stats: {
    trades_today: number;
    trades_this_hour: number;
    current_streak: number;
    streak_type: 'win' | 'loss' | null;
    last_trade_pnl: number | null;
  };
}

// In-memory state (in production, this would come from Python backend)
// For MVP, we'll track locally and can connect to Python later
let tradeHistory: Array<{
  symbol: string;
  pnl: number;
  timestamp: Date;
  size?: number;
}> = [];

let cooldownExpires: Date | null = null;
let cooldownReason: string | null = null;

// Constants matching Python firewall
const REVENGE_WINDOW_MINUTES = 30;
const HOURLY_TRADE_LIMIT = 3;
const DAILY_TRADE_LIMIT = 10;
const LATE_NIGHT_HOUR = 20; // 8 PM
const EARLY_MORNING_HOUR = 6; // 6 AM
const LOSS_STREAK_LIMIT = 5;
const WIN_STREAK_LIMIT = 5;

// Cooldown durations (minutes)
const REVENGE_COOLDOWN = 60;
const OVERTRADING_COOLDOWN = 240;
const STREAK_COOLDOWN = 180;

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isLateNight(date: Date): boolean {
  const hour = date.getHours();
  return hour >= LATE_NIGHT_HOUR || hour < EARLY_MORNING_HOUR;
}

function getRecentTrades(windowMinutes: number): typeof tradeHistory {
  const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000);
  return tradeHistory.filter((t) => t.timestamp >= cutoff);
}

function getTodaysTrades(): typeof tradeHistory {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return tradeHistory.filter((t) => t.timestamp >= today);
}

function getCurrentStreak(): { type: 'win' | 'loss' | null; count: number } {
  if (tradeHistory.length === 0) {
    return { type: null, count: 0 };
  }

  const sorted = [...tradeHistory].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );
  const firstType = sorted[0].pnl >= 0 ? 'win' : 'loss';
  let count = 0;

  for (const trade of sorted) {
    const tradeType = trade.pnl >= 0 ? 'win' : 'loss';
    if (tradeType === firstType) {
      count++;
    } else {
      break;
    }
  }

  return { type: firstType, count };
}

function checkFirewall(
  _symbol?: string,
  _positionSize?: number
): FirewallCheckResult {
  const now = new Date();
  const reasons: string[] = [];
  const patterns: string[] = [];

  // Check if in cooldown
  if (cooldownExpires && cooldownExpires > now) {
    return {
      blocked: true,
      reasons: [`Active cooldown: ${cooldownReason}`],
      patterns_detected: [],
      cooldown_expires: cooldownExpires.toISOString(),
      status: 'blocked',
      stats: getStats(),
    };
  } else {
    // Clear expired cooldown
    cooldownExpires = null;
    cooldownReason = null;
  }

  // Check weekend trading
  if (isWeekend(now)) {
    patterns.push('weekend_trading');
    reasons.push('Weekend trading blocked');
  }

  // Check late night trading
  if (isLateNight(now)) {
    patterns.push('late_night_trading');
    reasons.push(`Late night trading blocked (after ${LATE_NIGHT_HOUR}:00)`);
  }

  // Check revenge trading (trade within 30 min of loss)
  const recentTrades = getRecentTrades(REVENGE_WINDOW_MINUTES);
  const recentLoss = recentTrades.find((t) => t.pnl < 0);
  if (recentLoss) {
    patterns.push('revenge_trading');
    reasons.push(
      `Revenge trading detected (trade within ${REVENGE_WINDOW_MINUTES} min of loss)`
    );
  }

  // Check overtrading
  const hourlyTrades = getRecentTrades(60);
  const dailyTrades = getTodaysTrades();

  if (hourlyTrades.length >= HOURLY_TRADE_LIMIT) {
    patterns.push('overtrading');
    reasons.push(
      `Overtrading: ${hourlyTrades.length} trades this hour (limit: ${HOURLY_TRADE_LIMIT})`
    );
  }

  if (dailyTrades.length >= DAILY_TRADE_LIMIT) {
    patterns.push('overtrading');
    reasons.push(
      `Daily limit reached: ${dailyTrades.length} trades today (limit: ${DAILY_TRADE_LIMIT})`
    );
  }

  // Check streaks
  const streak = getCurrentStreak();
  if (streak.type === 'loss' && streak.count >= LOSS_STREAK_LIMIT) {
    patterns.push('loss_streak');
    reasons.push(`Loss streak: ${streak.count} consecutive losses`);
  }

  if (streak.type === 'win' && streak.count >= WIN_STREAK_LIMIT) {
    patterns.push('win_streak');
    reasons.push(
      `Win streak warning: ${streak.count} consecutive wins (overconfidence risk)`
    );
  }

  const blocked = patterns.length > 0;

  // Set cooldown if blocked
  if (blocked) {
    let cooldownMinutes = REVENGE_COOLDOWN;
    if (patterns.includes('overtrading')) {
      cooldownMinutes = OVERTRADING_COOLDOWN;
    }
    if (patterns.includes('loss_streak') || patterns.includes('win_streak')) {
      cooldownMinutes = STREAK_COOLDOWN;
    }

    cooldownExpires = new Date(now.getTime() + cooldownMinutes * 60 * 1000);
    cooldownReason = patterns.join(', ');
  }

  // Determine status
  let status: 'safe' | 'warning' | 'blocked' = 'safe';
  if (blocked) {
    status = 'blocked';
  } else if (
    hourlyTrades.length >= HOURLY_TRADE_LIMIT - 1 ||
    dailyTrades.length >= DAILY_TRADE_LIMIT - 2 ||
    (streak.count >= 3 && streak.count < 5)
  ) {
    status = 'warning';
  }

  return {
    blocked,
    reasons,
    patterns_detected: patterns,
    cooldown_expires: cooldownExpires?.toISOString() || null,
    status,
    stats: getStats(),
  };
}

function getStats() {
  const streak = getCurrentStreak();
  const todaysTrades = getTodaysTrades();
  const hourlyTrades = getRecentTrades(60);
  const lastTrade = tradeHistory[tradeHistory.length - 1];

  return {
    trades_today: todaysTrades.length,
    trades_this_hour: hourlyTrades.length,
    current_streak: streak.count,
    streak_type: streak.type,
    last_trade_pnl: lastTrade?.pnl ?? null,
  };
}

// GET - Check current firewall status
export async function GET() {
  try {
    const result = checkFirewall();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Firewall check error:', error);
    return NextResponse.json(
      { error: 'Failed to check firewall status' },
      { status: 500 }
    );
  }
}

// POST - Record a trade and check if next trade would be blocked
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, pnl, size, action } = body;

    if (action === 'record_trade') {
      // Record the trade
      tradeHistory.push({
        symbol,
        pnl: pnl || 0,
        timestamp: new Date(),
        size,
      });

      // Keep only last 1000 trades
      if (tradeHistory.length > 1000) {
        tradeHistory = tradeHistory.slice(-1000);
      }

      return NextResponse.json({
        success: true,
        message: 'Trade recorded',
        stats: getStats(),
      });
    }

    if (action === 'check_trade') {
      // Check if proposed trade should be blocked
      const result = checkFirewall(symbol, size);
      return NextResponse.json(result);
    }

    if (action === 'clear_cooldown') {
      // Admin action to clear cooldown
      cooldownExpires = null;
      cooldownReason = null;
      return NextResponse.json({
        success: true,
        message: 'Cooldown cleared',
      });
    }

    if (action === 'reset') {
      // Reset all state (for testing)
      tradeHistory = [];
      cooldownExpires = null;
      cooldownReason = null;
      return NextResponse.json({
        success: true,
        message: 'Firewall state reset',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Firewall POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
