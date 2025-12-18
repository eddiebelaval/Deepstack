import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AlertsActiveWidget, type PriceAlertData } from '../AlertsActiveWidget';

// Mock stores
const mockGetActiveAlerts = vi.fn();
const mockQuotes = new Map<string, { last: number }>();

vi.mock('@/lib/stores/alerts-store', () => ({
  useAlertsStore: () => ({
    getActiveAlerts: mockGetActiveAlerts,
  }),
}));

vi.mock('@/lib/stores/market-data-store', () => ({
  useMarketDataStore: (selector: (state: any) => any) => {
    const state = { quotes: Object.fromEntries(mockQuotes) };
    return typeof selector === 'function' ? selector(state) : state;
  },
}));

describe('AlertsActiveWidget', () => {
  const mockAlerts: PriceAlertData[] = [
    {
      id: '1',
      symbol: 'AAPL',
      targetPrice: 195.00,
      type: 'above',
      currentPrice: 189.50,
    },
    {
      id: '2',
      symbol: 'NVDA',
      targetPrice: 480.00,
      type: 'below',
      currentPrice: 495.75,
    },
    {
      id: '3',
      symbol: 'TSLA',
      targetPrice: 250.00,
      type: 'above',
      currentPrice: 242.30,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockQuotes.clear();

    // Default setup with alerts
    mockGetActiveAlerts.mockReturnValue(mockAlerts);
    mockQuotes.set('AAPL', { last: 189.50 });
    mockQuotes.set('NVDA', { last: 495.75 });
    mockQuotes.set('TSLA', { last: 242.30 });
  });

  describe('Rendering with Data', () => {
    it('renders price alerts header', () => {
      render(<AlertsActiveWidget />);
      expect(screen.getByText('Price Alerts')).toBeInTheDocument();
    });

    it('displays active alerts count', () => {
      render(<AlertsActiveWidget />);
      expect(screen.getByText('3 active')).toBeInTheDocument();
    });

    it('displays alert symbols', () => {
      render(<AlertsActiveWidget />);
      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('NVDA')).toBeInTheDocument();
      expect(screen.getByText('TSLA')).toBeInTheDocument();
    });

    it('displays target prices', () => {
      render(<AlertsActiveWidget />);
      expect(screen.getByText('$195.00')).toBeInTheDocument();
      expect(screen.getByText('$480.00')).toBeInTheDocument();
      expect(screen.getByText('$250.00')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no alerts', () => {
      mockGetActiveAlerts.mockReturnValue([]);
      render(<AlertsActiveWidget />);
      expect(screen.getByText('No active alerts')).toBeInTheDocument();
    });

    it('shows 0 active count when empty', () => {
      mockGetActiveAlerts.mockReturnValue([]);
      render(<AlertsActiveWidget />);
      expect(screen.getByText('0 active')).toBeInTheDocument();
    });
  });

  describe('Alert Limit', () => {
    it('limits display to 3 alerts', () => {
      const manyAlerts: PriceAlertData[] = Array.from({ length: 10 }, (_, i) => ({
        id: `${i + 1}`,
        symbol: `SYM${i + 1}`,
        targetPrice: 100.00,
        type: 'above' as const,
        currentPrice: 95.00,
      }));
      mockGetActiveAlerts.mockReturnValue(manyAlerts);

      render(<AlertsActiveWidget />);

      // Should show first 3
      expect(screen.getByText('SYM1')).toBeInTheDocument();
      expect(screen.getByText('SYM2')).toBeInTheDocument();
      expect(screen.getByText('SYM3')).toBeInTheDocument();

      // Should not show 4th
      expect(screen.queryByText('SYM4')).not.toBeInTheDocument();
    });

    it('shows "see more" link when more than 3 alerts', () => {
      const manyAlerts: PriceAlertData[] = Array.from({ length: 5 }, (_, i) => ({
        id: `${i + 1}`,
        symbol: `SYM${i + 1}`,
        targetPrice: 100.00,
        type: 'above' as const,
        currentPrice: 95.00,
      }));
      mockGetActiveAlerts.mockReturnValue(manyAlerts);

      render(<AlertsActiveWidget />);
      expect(screen.getByText('+2 more alerts')).toBeInTheDocument();
    });

    it('does not show "see more" link for 3 or fewer alerts', () => {
      render(<AlertsActiveWidget />);
      expect(screen.queryByText(/more alerts/)).not.toBeInTheDocument();
    });
  });

  describe('Layout and Styling', () => {
    it('applies glass surface styling', () => {
      const { container } = render(<AlertsActiveWidget />);
      const glassElement = container.querySelector('.glass-surface');
      expect(glassElement).toBeInTheDocument();
    });

    it('applies rounded corners', () => {
      const { container } = render(<AlertsActiveWidget />);
      const rounded = container.querySelector('.rounded-2xl');
      expect(rounded).toBeInTheDocument();
    });
  });

  describe('Custom ClassName', () => {
    it('accepts and applies custom className', () => {
      const { container } = render(<AlertsActiveWidget className="custom-class" />);
      const mainContainer = container.querySelector('.custom-class');
      expect(mainContainer).toBeInTheDocument();
    });
  });
});
