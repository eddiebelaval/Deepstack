import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CalendarEventsWidget, type EconomicEvent } from '../CalendarEventsWidget';

// Mock events data returned by hook
const mockEvents: EconomicEvent[] = [
  { id: '1', title: 'FOMC Meeting', date: '2024-12-13', time: '2:00 PM', impact: 'high' },
  { id: '2', title: 'CPI Report', date: '2024-12-14', time: '8:30 AM', impact: 'medium' },
  { id: '3', title: 'Jobless Claims', date: '2024-12-15', time: '8:30 AM', impact: 'low' },
];

// Mock the useEconomicCalendar hook
vi.mock('@/hooks/useEconomicCalendar', () => ({
  useEconomicCalendar: vi.fn(() => ({
    events: mockEvents,
    isLoading: false,
    error: null,
  })),
}));

describe('CalendarEventsWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the widget header', () => {
      render(<CalendarEventsWidget />);
      expect(screen.getByText('Economic Calendar')).toBeInTheDocument();
    });

    it('should render events with titles', () => {
      render(<CalendarEventsWidget />);
      expect(screen.getByText('FOMC Meeting')).toBeInTheDocument();
      expect(screen.getByText('CPI Report')).toBeInTheDocument();
      expect(screen.getByText('Jobless Claims')).toBeInTheDocument();
    });

    it('should render event times', () => {
      render(<CalendarEventsWidget />);
      expect(screen.getByText('2:00 PM')).toBeInTheDocument();
    });
  });

  describe('Impact Badges', () => {
    it('should render high impact badge', () => {
      render(<CalendarEventsWidget />);
      expect(screen.getByText('High')).toBeInTheDocument();
    });

    it('should render medium impact badge', () => {
      render(<CalendarEventsWidget />);
      expect(screen.getByText('Med')).toBeInTheDocument();
    });

    it('should render low impact badge', () => {
      render(<CalendarEventsWidget />);
      expect(screen.getByText('Low')).toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(<CalendarEventsWidget className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
