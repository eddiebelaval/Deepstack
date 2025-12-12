import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isMarketHoliday,
  isWeekend,
  formatTimeUntil,
  getMarketSession,
  isMarketOpen,
  isExtendedHoursOpen,
  getNextMarketOpen,
  getNextMarketClose,
  getMarketStatus,
} from '../market-hours';

describe('isWeekend', () => {
  it('returns true for Saturday', () => {
    const saturday = new Date('2024-12-07T12:00:00');
    expect(isWeekend(saturday)).toBe(true);
  });

  it('returns true for Sunday', () => {
    const sunday = new Date('2024-12-08T12:00:00');
    expect(isWeekend(sunday)).toBe(true);
  });

  it('returns false for weekdays', () => {
    expect(isWeekend(new Date('2024-12-09T12:00:00'))).toBe(false); // Monday
    expect(isWeekend(new Date('2024-12-10T12:00:00'))).toBe(false); // Tuesday
    expect(isWeekend(new Date('2024-12-11T12:00:00'))).toBe(false); // Wednesday
    expect(isWeekend(new Date('2024-12-12T12:00:00'))).toBe(false); // Thursday
    expect(isWeekend(new Date('2024-12-13T12:00:00'))).toBe(false); // Friday
  });
});

describe('isMarketHoliday', () => {
  it('returns true for known 2024 holidays', () => {
    expect(isMarketHoliday(new Date('2024-01-01'))).toBe(true); // New Year's
    expect(isMarketHoliday(new Date('2024-12-25'))).toBe(true); // Christmas
    expect(isMarketHoliday(new Date('2024-07-04'))).toBe(true); // Independence Day
  });

  it('returns true for known 2025 holidays', () => {
    expect(isMarketHoliday(new Date('2025-01-01'))).toBe(true); // New Year's
    expect(isMarketHoliday(new Date('2025-12-25'))).toBe(true); // Christmas
  });

  it('returns false for regular trading days', () => {
    expect(isMarketHoliday(new Date('2024-12-09'))).toBe(false); // Regular Monday
    expect(isMarketHoliday(new Date('2024-06-15'))).toBe(false); // Regular day
  });
});

describe('formatTimeUntil', () => {
  it('returns "now" for past dates', () => {
    const past = new Date(Date.now() - 1000);
    expect(formatTimeUntil(past)).toBe('now');
  });

  it('formats minutes correctly', () => {
    const now = Date.now();
    const target = new Date(now + 30 * 60 * 1000); // 30 minutes from now

    const result = formatTimeUntil(target);
    // Should be around 30m (might be 29m or 30m depending on timing)
    expect(result).toMatch(/^\d+m$/);
  });

  it('formats hours and minutes correctly', () => {
    const now = Date.now();
    const target = new Date(now + 150 * 60 * 1000); // 2h 30m from now

    const result = formatTimeUntil(target);
    expect(result).toMatch(/^\d+h \d+m$/);
  });

  it('formats days and hours for long durations', () => {
    const now = Date.now();
    const target = new Date(now + 52 * 60 * 60 * 1000); // 52 hours (2d 4h)

    const result = formatTimeUntil(target);
    expect(result).toMatch(/^\d+d \d+h$/);
  });
});

// Note: These tests use actual time, so results depend on when tests run
// For production, we'd use vi.setSystemTime() to mock dates
describe('getMarketSession', () => {
  it('returns a valid session type', () => {
    const session = getMarketSession();
    expect(['premarket', 'regular', 'afterhours', 'closed']).toContain(session);
  });
});

describe('isMarketOpen', () => {
  it('returns a boolean', () => {
    const result = isMarketOpen();
    expect(typeof result).toBe('boolean');
  });

  it('is consistent with getMarketSession', () => {
    const session = getMarketSession();
    const isOpen = isMarketOpen();
    expect(isOpen).toBe(session === 'regular');
  });
});

describe('isExtendedHoursOpen', () => {
  it('returns a boolean', () => {
    const result = isExtendedHoursOpen();
    expect(typeof result).toBe('boolean');
  });

  it('is true when session is not closed', () => {
    const session = getMarketSession();
    const extendedOpen = isExtendedHoursOpen();
    expect(extendedOpen).toBe(session !== 'closed');
  });
});

describe('getNextMarketOpen', () => {
  it('returns a Date object', () => {
    const nextOpen = getNextMarketOpen();
    expect(nextOpen).toBeInstanceOf(Date);
  });

  it('returns a date in the future or today', () => {
    const nextOpen = getNextMarketOpen();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expect(nextOpen.getTime()).toBeGreaterThanOrEqual(today.getTime());
  });

  it('returns a weekday', () => {
    const nextOpen = getNextMarketOpen();
    const day = nextOpen.getDay();
    expect(day).not.toBe(0); // Not Sunday
    expect(day).not.toBe(6); // Not Saturday
  });
});

describe('getNextMarketClose', () => {
  it('returns null or a Date', () => {
    const nextClose = getNextMarketClose();
    if (nextClose !== null) {
      expect(nextClose).toBeInstanceOf(Date);
    } else {
      expect(nextClose).toBeNull();
    }
  });

  it('returns null when market is not open', () => {
    // If market is closed, nextClose should be null
    if (!isMarketOpen()) {
      expect(getNextMarketClose()).toBeNull();
    }
  });
});

describe('getMarketStatus', () => {
  it('returns a valid market status object', () => {
    const status = getMarketStatus();

    expect(status).toHaveProperty('isOpen');
    expect(status).toHaveProperty('session');
    expect(status).toHaveProperty('nextOpen');
    expect(status).toHaveProperty('nextClose');
    expect(status).toHaveProperty('message');
  });

  it('has consistent isOpen and session values', () => {
    const status = getMarketStatus();
    expect(status.isOpen).toBe(status.session === 'regular');
  });

  it('has a non-empty message', () => {
    const status = getMarketStatus();
    expect(status.message).toBeTruthy();
    expect(status.message.length).toBeGreaterThan(0);
  });

  it('returns appropriate message for each session', () => {
    const status = getMarketStatus();

    switch (status.session) {
      case 'regular':
        expect(status.message).toContain('open');
        break;
      case 'premarket':
        expect(status.message.toLowerCase()).toContain('pre-market');
        break;
      case 'afterhours':
        expect(status.message.toLowerCase()).toContain('after');
        break;
      case 'closed':
        expect(status.message.toLowerCase()).toContain('closed');
        break;
    }
  });

  it('has nextOpen as null when market is open', () => {
    const status = getMarketStatus();
    if (status.isOpen) {
      expect(status.nextOpen).toBeNull();
    }
  });

  it('has nextClose as null when market is closed', () => {
    const status = getMarketStatus();
    if (!status.isOpen) {
      expect(status.nextClose).toBeNull();
    }
  });
});
