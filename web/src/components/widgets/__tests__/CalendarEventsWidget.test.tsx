import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CalendarEventsWidget, type EconomicEvent } from '../CalendarEventsWidget';

describe('CalendarEventsWidget', () => {
  const mockEvents: EconomicEvent[] = [
    { id: '1', title: 'FOMC Meeting', date: 'Dec 13', time: '2:00 PM', impact: 'high' },
    { id: '2', title: 'CPI Report', date: 'Dec 14', time: '8:30 AM', impact: 'medium' },
    { id: '3', title: 'Jobless Claims', date: 'Dec 15', time: '8:30 AM', impact: 'low' },
  ];

  describe('Rendering', () => {
    it('should render the widget header', () => {
      render(<CalendarEventsWidget events={mockEvents} />);
      expect(screen.getByText('Economic Calendar')).toBeInTheDocument();
    });

    it('should render events with titles', () => {
      render(<CalendarEventsWidget events={mockEvents} />);
      expect(screen.getByText('FOMC Meeting')).toBeInTheDocument();
      expect(screen.getByText('CPI Report')).toBeInTheDocument();
      expect(screen.getByText('Jobless Claims')).toBeInTheDocument();
    });

    it('should render event dates', () => {
      render(<CalendarEventsWidget events={mockEvents} />);
      expect(screen.getByText('Dec 13')).toBeInTheDocument();
      expect(screen.getByText('Dec 14')).toBeInTheDocument();
    });

    it('should render event times', () => {
      render(<CalendarEventsWidget events={mockEvents} />);
      expect(screen.getByText('2:00 PM')).toBeInTheDocument();
      // Two events have 8:30 AM time (CPI Report and Jobless Claims)
      const times830 = screen.getAllByText('8:30 AM');
      expect(times830.length).toBe(2);
    });
  });

  describe('Impact Badges', () => {
    it('should render high impact badge', () => {
      render(<CalendarEventsWidget events={mockEvents} />);
      expect(screen.getByText('High')).toBeInTheDocument();
    });

    it('should render medium impact badge', () => {
      render(<CalendarEventsWidget events={mockEvents} />);
      expect(screen.getByText('Med')).toBeInTheDocument();
    });

    it('should render low impact badge', () => {
      render(<CalendarEventsWidget events={mockEvents} />);
      expect(screen.getByText('Low')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no events', () => {
      render(<CalendarEventsWidget events={[]} />);
      expect(screen.getByText('No upcoming events')).toBeInTheDocument();
    });
  });

  describe('Event Limit', () => {
    it('should show maximum 4 events', () => {
      const manyEvents: EconomicEvent[] = [
        { id: '1', title: 'Event 1', date: 'Dec 1', time: '9:00 AM', impact: 'high' },
        { id: '2', title: 'Event 2', date: 'Dec 2', time: '9:00 AM', impact: 'medium' },
        { id: '3', title: 'Event 3', date: 'Dec 3', time: '9:00 AM', impact: 'low' },
        { id: '4', title: 'Event 4', date: 'Dec 4', time: '9:00 AM', impact: 'high' },
        { id: '5', title: 'Event 5', date: 'Dec 5', time: '9:00 AM', impact: 'medium' },
      ];

      render(<CalendarEventsWidget events={manyEvents} />);

      expect(screen.getByText('Event 1')).toBeInTheDocument();
      expect(screen.getByText('Event 4')).toBeInTheDocument();
      expect(screen.queryByText('Event 5')).not.toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <CalendarEventsWidget events={mockEvents} className="custom-class" />
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Default Props', () => {
    it('should render with default mock events when no events provided', () => {
      render(<CalendarEventsWidget />);
      // Should render default MOCK_EVENTS
      expect(screen.getByText('FOMC Meeting Minutes')).toBeInTheDocument();
    });
  });
});
