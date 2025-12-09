import { describe, it, expect } from 'vitest';
import {
  isMarketHoliday,
  isWeekend,
  formatTimeUntil,
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
