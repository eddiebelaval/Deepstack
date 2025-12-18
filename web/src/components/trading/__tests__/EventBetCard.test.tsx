import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventBetCard } from '../EventBetCard';
import type { CalendarEvent } from '@/lib/stores/calendar-store';

describe('EventBetCard', () => {
  const mockOnSymbolClick = vi.fn();

  const createEarningsEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
    id: '1',
    symbol: 'AAPL',
    type: 'earnings',
    date: '2024-01-15',
    title: 'AAPL Q4 2024 Earnings',
    estimate: '$2.10',
    actual: undefined,
    prior: '$1.95',
    time: 'AMC',
    importance: 'high',
    currentPrice: 185.50,
    changeWeek: 3.5,
    changeMonth: 8.2,
    changeYear: 45.0,
    peRatio: 28.5,
    psRatio: 7.2,
    marketCap: 2850,
    revenueEstimate: 117.5,
    ...overrides,
  });

  const createEconomicEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
    id: '2',
    type: 'economic',
    date: '2024-01-17',
    title: 'Fed Interest Rate Decision',
    time: '2:00 PM ET',
    importance: 'high',
    ...overrides,
  });

  const createDividendEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
    id: '3',
    symbol: 'JNJ',
    type: 'dividend',
    date: '2024-01-20',
    title: 'JNJ Ex-Dividend Date',
    importance: 'medium',
    ...overrides,
  });

  const createIPOEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
    id: '4',
    symbol: 'NEWCO',
    type: 'ipo',
    date: '2024-01-25',
    title: 'NEWCO IPO',
    importance: 'low',
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Earnings Card', () => {
    it('renders large card for earnings events with symbol', () => {
      const event = createEarningsEvent();
      render(<EventBetCard event={event} onSymbolClick={mockOnSymbolClick} />);

      expect(screen.getByText('AAPL')).toBeInTheDocument();
    });

    it('displays current price and change', () => {
      const event = createEarningsEvent();
      render(<EventBetCard event={event} onSymbolClick={mockOnSymbolClick} />);

      expect(screen.getByText('$185.50')).toBeInTheDocument();
      expect(screen.getByText('+3.5%')).toBeInTheDocument();
    });

    it('displays EPS estimate', () => {
      const event = createEarningsEvent();
      render(<EventBetCard event={event} onSymbolClick={mockOnSymbolClick} />);

      expect(screen.getByText('Expected')).toBeInTheDocument();
      expect(screen.getByText('$2.10')).toBeInTheDocument();
    });

    it('displays prior EPS', () => {
      const event = createEarningsEvent();
      render(<EventBetCard event={event} onSymbolClick={mockOnSymbolClick} />);

      expect(screen.getByText('Prior')).toBeInTheDocument();
      expect(screen.getByText('$1.95')).toBeInTheDocument();
    });

    it('shows pending status when no actual EPS', () => {
      const event = createEarningsEvent({ actual: undefined });
      render(<EventBetCard event={event} onSymbolClick={mockOnSymbolClick} />);

      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('shows actual EPS when reported', () => {
      const event = createEarningsEvent({ actual: '$2.25' });
      render(<EventBetCard event={event} onSymbolClick={mockOnSymbolClick} />);

      expect(screen.getByText('Actual')).toBeInTheDocument();
      expect(screen.getByText('$2.25')).toBeInTheDocument();
    });

    it('displays time badge (BMO vs AMC)', () => {
      const eventBMO = createEarningsEvent({ time: 'BMO' });
      const { rerender } = render(
        <EventBetCard event={eventBMO} onSymbolClick={mockOnSymbolClick} />
      );

      expect(screen.getByText('Pre')).toBeInTheDocument();

      const eventAMC = createEarningsEvent({ time: 'AMC' });
      rerender(<EventBetCard event={eventAMC} onSymbolClick={mockOnSymbolClick} />);

      expect(screen.getByText('AH')).toBeInTheDocument();
    });

    it('displays importance indicator', () => {
      const event = createEarningsEvent({ importance: 'high' });
      render(<EventBetCard event={event} onSymbolClick={mockOnSymbolClick} />);

      expect(screen.getByText('high')).toBeInTheDocument();
    });

    it('displays financial metrics', () => {
      const event = createEarningsEvent();
      render(<EventBetCard event={event} onSymbolClick={mockOnSymbolClick} />);

      expect(screen.getByText('P/E')).toBeInTheDocument();
      expect(screen.getByText('28.5')).toBeInTheDocument();
      expect(screen.getByText('P/S')).toBeInTheDocument();
      expect(screen.getByText('7.2')).toBeInTheDocument();
      expect(screen.getByText('MCap')).toBeInTheDocument();
      expect(screen.getByText('$2.9T')).toBeInTheDocument();
    });

    it('displays month and year changes', () => {
      const event = createEarningsEvent();
      render(<EventBetCard event={event} onSymbolClick={mockOnSymbolClick} />);

      expect(screen.getByText(/1M:/)).toBeInTheDocument();
      expect(screen.getByText(/1Y:/)).toBeInTheDocument();
    });

    it('handles click on symbol', async () => {
      const user = userEvent.setup();
      const event = createEarningsEvent();
      render(<EventBetCard event={event} onSymbolClick={mockOnSymbolClick} />);

      const card = screen.getByText('AAPL').closest('.cursor-pointer');
      if (card) {
        await user.click(card);
        expect(mockOnSymbolClick).toHaveBeenCalledWith('AAPL');
      }
    });

    it('displays pre-market price when available', () => {
      const event = createEarningsEvent({
        time: 'BMO',
        preMarketPrice: 188.00,
      });
      render(<EventBetCard event={event} onSymbolClick={mockOnSymbolClick} />);

      expect(screen.getByText('$188.00')).toBeInTheDocument();
    });

    it('displays after-hours price when available', () => {
      const event = createEarningsEvent({
        time: 'AMC',
        afterHoursPrice: 190.25,
      });
      render(<EventBetCard event={event} onSymbolClick={mockOnSymbolClick} />);

      expect(screen.getByText('$190.25')).toBeInTheDocument();
    });
  });

  describe('Compact Event Card', () => {
    it('renders compact card for economic events', () => {
      const event = createEconomicEvent();
      render(<EventBetCard event={event} onSymbolClick={mockOnSymbolClick} />);

      expect(screen.getByText('Fed Interest Rate Decision')).toBeInTheDocument();
    });

    it('renders compact card for dividend events', () => {
      const event = createDividendEvent();
      render(<EventBetCard event={event} onSymbolClick={mockOnSymbolClick} />);

      expect(screen.getByText('JNJ Ex-Dividend Date')).toBeInTheDocument();
    });

    it('renders compact card for IPO events', () => {
      const event = createIPOEvent();
      render(<EventBetCard event={event} onSymbolClick={mockOnSymbolClick} />);

      expect(screen.getByText('NEWCO IPO')).toBeInTheDocument();
    });

    it('displays time for compact events', () => {
      const event = createEconomicEvent({ time: '2:00 PM ET' });
      render(<EventBetCard event={event} onSymbolClick={mockOnSymbolClick} />);

      expect(screen.getByText('2:00 PM ET')).toBeInTheDocument();
    });

    it('shows importance indicator for compact events', () => {
      const event = createDividendEvent({ importance: 'medium' });
      render(<EventBetCard event={event} onSymbolClick={mockOnSymbolClick} />);

      // Medium importance dot
      const importanceDot = document.querySelector('.bg-amber-500');
      expect(importanceDot).toBeInTheDocument();
    });

    it('handles click on compact card with symbol', async () => {
      const user = userEvent.setup();
      const event = createDividendEvent({ symbol: 'JNJ' });
      render(<EventBetCard event={event} onSymbolClick={mockOnSymbolClick} />);

      const card = screen.getByText('JNJ Ex-Dividend Date').closest('.cursor-pointer');
      if (card) {
        await user.click(card);
        expect(mockOnSymbolClick).toHaveBeenCalledWith('JNJ');
      }
    });

    it('does not trigger click for events without symbol', async () => {
      const user = userEvent.setup();
      const event = createEconomicEvent({ symbol: undefined });
      render(<EventBetCard event={event} onSymbolClick={mockOnSymbolClick} />);

      const card = screen.getByText('Fed Interest Rate Decision').closest('div');
      if (card) {
        await user.click(card);
        expect(mockOnSymbolClick).not.toHaveBeenCalled();
      }
    });
  });

  describe('Importance Colors', () => {
    it('shows red for high importance', () => {
      const event = createEarningsEvent({ importance: 'high' });
      render(<EventBetCard event={event} onSymbolClick={mockOnSymbolClick} />);

      const highDot = document.querySelector('.bg-red-500');
      expect(highDot).toBeInTheDocument();
    });

    it('shows amber for medium importance', () => {
      const event = createDividendEvent({ importance: 'medium' });
      render(<EventBetCard event={event} onSymbolClick={mockOnSymbolClick} />);

      const mediumDot = document.querySelector('.bg-amber-500');
      expect(mediumDot).toBeInTheDocument();
    });

    it('shows muted for low importance', () => {
      const event = createIPOEvent({ importance: 'low' });
      render(<EventBetCard event={event} onSymbolClick={mockOnSymbolClick} />);

      const lowDot = document.querySelector('.bg-muted-foreground\\/50');
      expect(lowDot).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles missing optional fields', () => {
      const event: CalendarEvent = {
        id: '5',
        type: 'earnings',
        symbol: 'TEST',
        date: '2024-01-30',
        title: 'TEST Earnings',
      };

      render(<EventBetCard event={event} onSymbolClick={mockOnSymbolClick} />);

      expect(screen.getByText('TEST')).toBeInTheDocument();
      expect(screen.getByText('—')).toBeInTheDocument(); // For missing estimate
    });

    it('handles earnings event without symbol (renders compact)', () => {
      const event = createEarningsEvent({ symbol: undefined });
      render(<EventBetCard event={event} onSymbolClick={mockOnSymbolClick} />);

      // Should render compact card instead
      expect(screen.getByText('AAPL Q4 2024 Earnings')).toBeInTheDocument();
    });
  });
});
