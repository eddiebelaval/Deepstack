import { NextRequest, NextResponse } from 'next/server';

// Decision Fitness Firewall - Protects cognitive state for quality decisions
// Works for any market: stocks, crypto, prediction markets, etc.

export interface DecisionFitnessResult {
  compromised: boolean;
  reasons: string[];
  patterns_detected: string[];
  break_recommended_until: string | null;
  status: 'focused' | 'caution' | 'compromised';
  session: {
    duration_minutes: number;
    started_at: string | null;
    queries_this_session: number;
    sessions_today: number;
  };
}

// Session state
let sessionStarted: Date | null = null;
let sessionQueries: number = 0;
let sessionsToday: number = 0;
let lastSessionDate: string | null = null;
let breakRecommendedUntil: Date | null = null;
let breakReason: string | null = null;

// Configurable thresholds
const FATIGUE_THRESHOLD_MINUTES = 120; // 2 hours continuous
const EXTENDED_SESSION_MINUTES = 180; // 3 hours - recommend break
const LATE_NIGHT_START = 23; // 11 PM
const LATE_NIGHT_END = 5; // 5 AM
const MAX_SESSIONS_PER_DAY = 6; // Suggesting breaks between sessions
const RAPID_QUERY_THRESHOLD = 10; // Queries in short window
const RAPID_QUERY_WINDOW_MINUTES = 5;

// Break durations (minutes)
const FATIGUE_BREAK = 30;
const LATE_NIGHT_BREAK = 480; // Until morning
const OVERLOAD_BREAK = 60;

// Query timestamps for rapid-fire detection
let recentQueries: Date[] = [];

function isLateNight(date: Date): boolean {
  const hour = date.getHours();
  return hour >= LATE_NIGHT_START || hour < LATE_NIGHT_END;
}

function getSessionDurationMinutes(): number {
  if (!sessionStarted) return 0;
  return Math.floor((Date.now() - sessionStarted.getTime()) / (60 * 1000));
}

function getRecentQueryCount(windowMinutes: number): number {
  const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000);
  recentQueries = recentQueries.filter(q => q >= cutoff);
  return recentQueries.length;
}

function checkTodayReset() {
  const today = new Date().toDateString();
  if (lastSessionDate !== today) {
    sessionsToday = 0;
    lastSessionDate = today;
  }
}

function checkDecisionFitness(): DecisionFitnessResult {
  const now = new Date();
  const reasons: string[] = [];
  const patterns: string[] = [];

  // Check if break is still active
  if (breakRecommendedUntil && breakRecommendedUntil > now) {
    return {
      compromised: true,
      reasons: [`Break recommended: ${breakReason}`],
      patterns_detected: [],
      break_recommended_until: breakRecommendedUntil.toISOString(),
      status: 'compromised',
      session: getSessionStats(),
    };
  } else {
    breakRecommendedUntil = null;
    breakReason = null;
  }

  checkTodayReset();

  // Pattern: Late night research
  if (isLateNight(now)) {
    patterns.push('late_night');
    reasons.push('Late night session - decision quality typically declines after 11 PM');
  }

  // Pattern: Session fatigue
  const sessionMinutes = getSessionDurationMinutes();
  if (sessionMinutes >= EXTENDED_SESSION_MINUTES) {
    patterns.push('extended_session');
    reasons.push(`Extended session (${sessionMinutes} min) - mental fatigue impacts analysis quality`);
  } else if (sessionMinutes >= FATIGUE_THRESHOLD_MINUTES) {
    patterns.push('session_fatigue');
    reasons.push(`Long session (${sessionMinutes} min) - consider a break to maintain clarity`);
  }

  // Pattern: Rapid-fire queries (potential FOMO/panic)
  const rapidQueries = getRecentQueryCount(RAPID_QUERY_WINDOW_MINUTES);
  if (rapidQueries >= RAPID_QUERY_THRESHOLD) {
    patterns.push('rapid_queries');
    reasons.push('Rapid query pattern detected - rushing analysis often leads to missed details');
  }

  // Pattern: Session overload (too many sessions today)
  if (sessionsToday >= MAX_SESSIONS_PER_DAY) {
    patterns.push('session_overload');
    reasons.push(`High session count today (${sessionsToday}) - mental bandwidth may be depleted`);
  }

  // Determine if compromised (multiple patterns or severe single pattern)
  const severePatterns = ['extended_session', 'late_night'];
  const hasSeverePattern = patterns.some(p => severePatterns.includes(p));
  const compromised = patterns.length >= 2 || hasSeverePattern;

  // Set recommended break if compromised
  if (compromised) {
    let breakMinutes = FATIGUE_BREAK;

    if (patterns.includes('late_night')) {
      // Calculate minutes until 6 AM
      const sixAM = new Date(now);
      sixAM.setHours(LATE_NIGHT_END + 1, 0, 0, 0);
      if (sixAM <= now) {
        sixAM.setDate(sixAM.getDate() + 1);
      }
      breakMinutes = Math.ceil((sixAM.getTime() - now.getTime()) / (60 * 1000));
    } else if (patterns.includes('extended_session')) {
      breakMinutes = OVERLOAD_BREAK;
    }

    breakRecommendedUntil = new Date(now.getTime() + breakMinutes * 60 * 1000);
    breakReason = patterns.join(', ');
  }

  // Determine status
  let status: 'focused' | 'caution' | 'compromised' = 'focused';
  if (compromised) {
    status = 'compromised';
  } else if (patterns.length > 0) {
    status = 'caution';
  }

  return {
    compromised,
    reasons,
    patterns_detected: patterns,
    break_recommended_until: breakRecommendedUntil?.toISOString() || null,
    status,
    session: getSessionStats(),
  };
}

function getSessionStats() {
  return {
    duration_minutes: getSessionDurationMinutes(),
    started_at: sessionStarted?.toISOString() || null,
    queries_this_session: sessionQueries,
    sessions_today: sessionsToday,
  };
}

// GET - Check current decision fitness status
export async function GET() {
  try {
    const result = checkDecisionFitness();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Decision fitness check error:', error);
    return NextResponse.json(
      { error: 'Failed to check decision fitness' },
      { status: 500 }
    );
  }
}

// POST - Session management actions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'start_session') {
      checkTodayReset();
      if (!sessionStarted) {
        sessionStarted = new Date();
        sessionQueries = 0;
        sessionsToday++;
      }
      return NextResponse.json({
        success: true,
        message: 'Session started',
        session: getSessionStats(),
      });
    }

    if (action === 'record_query') {
      // Record a query/interaction
      recentQueries.push(new Date());
      sessionQueries++;

      // Auto-start session if not started
      if (!sessionStarted) {
        sessionStarted = new Date();
        checkTodayReset();
        sessionsToday++;
      }

      const result = checkDecisionFitness();
      return NextResponse.json({
        success: true,
        ...result,
      });
    }

    if (action === 'end_session') {
      sessionStarted = null;
      sessionQueries = 0;
      recentQueries = [];
      return NextResponse.json({
        success: true,
        message: 'Session ended',
      });
    }

    if (action === 'take_break') {
      // User acknowledges they need a break
      sessionStarted = null;
      sessionQueries = 0;
      recentQueries = [];
      return NextResponse.json({
        success: true,
        message: 'Break started - come back refreshed',
      });
    }

    if (action === 'dismiss_break') {
      // User chooses to continue despite recommendation
      breakRecommendedUntil = null;
      breakReason = null;
      return NextResponse.json({
        success: true,
        message: 'Break dismissed - stay mindful of your state',
      });
    }

    if (action === 'reset') {
      // Reset all state (for testing)
      sessionStarted = null;
      sessionQueries = 0;
      sessionsToday = 0;
      recentQueries = [];
      breakRecommendedUntil = null;
      breakReason = null;
      return NextResponse.json({
        success: true,
        message: 'Decision fitness state reset',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Decision fitness POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
