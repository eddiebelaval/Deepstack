import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AlertsActiveWidget, PriceAlertData } from '../AlertsActiveWidget';

describe('AlertsActiveWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  describe('Rendering with Data', () => {
    it('renders price alerts header', () => {
      render(<AlertsActiveWidget alerts={mockAlerts} />);

      expect(screen.getByText('Price Alerts')).toBeInTheDocument();
    });

    it('displays active alerts count', () => {
      render(<AlertsActiveWidget alerts={mockAlerts} />);

      expect(screen.getByText('3 active')).toBeInTheDocument();
    });

    it('displays alert symbols', () => {
      render(<AlertsActiveWidget alerts={mockAlerts} />);

      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('NVDA')).toBeInTheDocument();
      expect(screen.getByText('TSLA')).toBeInTheDocument();
    });

    it('displays target prices', () => {
      render(<AlertsActiveWidget alerts={mockAlerts} />);

      expect(screen.getByText('$195.00')).toBeInTheDocument();
      expect(screen.getByText('$480.00')).toBeInTheDocument();
      expect(screen.getByText('$250.00')).toBeInTheDocument();
    });

    it('displays alert types', () => {
      render(<AlertsActiveWidget alerts={mockAlerts} />);

      const aboveAlerts = screen.getAllByText('above');
      const belowAlerts = screen.getAllByText('below');

      expect(aboveAlerts.length).toBe(2); // AAPL and TSLA
      expect(belowAlerts.length).toBe(1); // NVDA
    });
  });

  describe('Distance Calculation', () => {
    it('displays distance to target as percentage', () => {
      render(<AlertsActiveWidget alerts={mockAlerts} />);

      // AAPL: (195 - 189.50) / 189.50 = ~2.9%
      expect(screen.getByText('+2.9%')).toBeInTheDocument();
    });

    it('shows positive percentage for prices below target (above alerts)', () => {
      const alerts: PriceAlertData[] = [
        {
          id: '1',
          symbol: 'TEST',
          targetPrice: 100.00,
          type: 'above',
          currentPrice: 95.00,
        },
      ];

      render(<AlertsActiveWidget alerts={alerts} />);

      // (100 - 95) / 95 = 5.26%
      expect(screen.getByText('+5.3%')).toBeInTheDocument();
    });

    it('shows negative percentage for prices above target (below alerts)', () => {
      const alerts: PriceAlertData[] = [
        {
          id: '1',
          symbol: 'TEST',
          targetPrice: 100.00,
          type: 'below',
          currentPrice: 105.00,
        },
      ];

      render(<AlertsActiveWidget alerts={alerts} />);

      // (100 - 105) / 105 = -4.76%
      expect(screen.getByText('-4.8%')).toBeInTheDocument();
    });

    it('formats distance to 1 decimal place', () => {
      const alerts: PriceAlertData[] = [
        {
          id: '1',
          symbol: 'TEST',
          targetPrice: 100.123,
          type: 'above',
          currentPrice: 98.456,
        },
      ];

      render(<AlertsActiveWidget alerts={alerts} />);

      const distanceText = screen.getByText(/\+1\.7%/);
      expect(distanceText).toBeInTheDocument();
    });
  });

  describe('Alert Type Styling', () => {
    it('applies green styling for above alerts', () => {
      render(<AlertsActiveWidget alerts={mockAlerts} />);

      const { container } = render(<AlertsActiveWidget alerts={mockAlerts} />);

      const aboveBadges = container.querySelectorAll('.text-green-500');
      expect(aboveBadges.length).toBeGreaterThan(0);
    });

    it('applies red styling for below alerts', () => {
      const { container } = render(<AlertsActiveWidget alerts={mockAlerts} />);

      const belowBadges = container.querySelectorAll('.text-red-500');
      expect(belowBadges.length).toBeGreaterThan(0);
    });

    it('displays trending up icon for above alerts', () => {
      const alerts: PriceAlertData[] = [
        {
          id: '1',
          symbol: 'TEST',
          targetPrice: 100.00,
          type: 'above',
          currentPrice: 95.00,
        },
      ];

      const { container } = render(<AlertsActiveWidget alerts={alerts} />);

      const trendingUpIcons = container.querySelectorAll('.h-2\\.5.w-2\\.5');
      expect(trendingUpIcons.length).toBeGreaterThan(0);
    });

    it('displays trending down icon for below alerts', () => {
      const alerts: PriceAlertData[] = [
        {
          id: '1',
          symbol: 'TEST',
          targetPrice: 100.00,
          type: 'below',
          currentPrice: 105.00,
        },
      ];

      const { container } = render(<AlertsActiveWidget alerts={alerts} />);

      const trendingIcons = container.querySelectorAll('.h-2\\.5.w-2\\.5');
      expect(trendingIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Close Alert Highlighting', () => {
    it('highlights alerts within 3% of target', () => {
      const alerts: PriceAlertData[] = [
        {
          id: '1',
          symbol: 'TEST',
          targetPrice: 100.00,
          type: 'above',
          currentPrice: 98.00, // 2.04% away
        },
      ];

      const { container } = render(<AlertsActiveWidget alerts={alerts} />);

      const yellowBackground = container.querySelector('.bg-yellow-500\\/10');
      expect(yellowBackground).toBeInTheDocument();
    });

    it('shows yellow text for close alerts', () => {
      const alerts: PriceAlertData[] = [
        {
          id: '1',
          symbol: 'TEST',
          targetPrice: 100.00,
          type: 'above',
          currentPrice: 98.00,
        },
      ];

      const { container } = render(<AlertsActiveWidget alerts={alerts} />);

      const yellowText = container.querySelector('.text-yellow-500.font-medium');
      expect(yellowText).toBeInTheDocument();
    });

    it('does not highlight alerts far from target', () => {
      const alerts: PriceAlertData[] = [
        {
          id: '1',
          symbol: 'TEST',
          targetPrice: 100.00,
          type: 'above',
          currentPrice: 90.00, // 11% away
        },
      ];

      const { container } = render(<AlertsActiveWidget alerts={alerts} />);

      const yellowBackground = container.querySelector('.bg-yellow-500\\/10');
      expect(yellowBackground).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no alerts', () => {
      render(<AlertsActiveWidget alerts={[]} />);

      expect(screen.getByText('No active alerts')).toBeInTheDocument();
    });

    it('displays empty state with proper styling', () => {
      const { container } = render(<AlertsActiveWidget alerts={[]} />);

      const emptyText = screen.getByText('No active alerts');
      expect(emptyText).toHaveClass('text-muted-foreground');
    });

    it('shows 0 active count when empty', () => {
      render(<AlertsActiveWidget alerts={[]} />);

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

      render(<AlertsActiveWidget alerts={manyAlerts} />);

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

      render(<AlertsActiveWidget alerts={manyAlerts} />);

      expect(screen.getByText('+2 more alerts')).toBeInTheDocument();
    });

    it('does not show "see more" link for 3 or fewer alerts', () => {
      render(<AlertsActiveWidget alerts={mockAlerts} />);

      expect(screen.queryByText(/more alerts/)).not.toBeInTheDocument();
    });

    it('calculates correct remaining alert count', () => {
      const manyAlerts: PriceAlertData[] = Array.from({ length: 8 }, (_, i) => ({
        id: `${i + 1}`,
        symbol: `SYM${i + 1}`,
        targetPrice: 100.00,
        type: 'above' as const,
        currentPrice: 95.00,
      }));

      render(<AlertsActiveWidget alerts={manyAlerts} />);

      expect(screen.getByText('+5 more alerts')).toBeInTheDocument();
    });
  });

  describe('Layout and Styling', () => {
    it('applies glass surface styling', () => {
      const { container } = render(<AlertsActiveWidget alerts={mockAlerts} />);

      const glassElement = container.querySelector('.glass-surface');
      expect(glassElement).toBeInTheDocument();
    });

    it('applies minimum height', () => {
      const { container } = render(<AlertsActiveWidget alerts={mockAlerts} />);

      const mainContainer = container.querySelector('.glass-surface');
      expect(mainContainer).toHaveStyle({ minHeight: '120px' });
    });

    it('applies rounded corners', () => {
      const { container } = render(<AlertsActiveWidget alerts={mockAlerts} />);

      const rounded = container.querySelector('.rounded-2xl');
      expect(rounded).toBeInTheDocument();
    });

    it('applies hover effects to alert rows', () => {
      const { container } = render(<AlertsActiveWidget alerts={mockAlerts} />);

      const hoverElements = container.querySelectorAll('.hover\\:bg-yellow-500\\/20, .hover\\:bg-muted\\/30');
      expect(hoverElements.length).toBeGreaterThan(0);
    });
  });

  describe('Data Formatting', () => {
    it('formats target price to 2 decimal places', () => {
      const alerts: PriceAlertData[] = [
        {
          id: '1',
          symbol: 'TEST',
          targetPrice: 195.5,
          type: 'above',
          currentPrice: 190.00,
        },
      ];

      render(<AlertsActiveWidget alerts={alerts} />);

      expect(screen.getByText('$195.50')).toBeInTheDocument();
    });

    it('uses monospace font for prices', () => {
      const { container } = render(<AlertsActiveWidget alerts={mockAlerts} />);

      const monoElements = container.querySelectorAll('.font-mono');
      expect(monoElements.length).toBeGreaterThan(0);
    });

    it('adds plus sign for positive distance', () => {
      const alerts: PriceAlertData[] = [
        {
          id: '1',
          symbol: 'TEST',
          targetPrice: 100.00,
          type: 'above',
          currentPrice: 95.00,
        },
      ];

      render(<AlertsActiveWidget alerts={alerts} />);

      expect(screen.getByText(/\+5\.3%/)).toBeInTheDocument();
    });

    it('does not add plus for negative distance', () => {
      const alerts: PriceAlertData[] = [
        {
          id: '1',
          symbol: 'TEST',
          targetPrice: 100.00,
          type: 'below',
          currentPrice: 105.00,
        },
      ];

      render(<AlertsActiveWidget alerts={alerts} />);

      const distanceText = screen.getByText(/-4\.8%/);
      expect(distanceText.textContent).not.toContain('+-');
    });
  });

  describe('Missing Current Price', () => {
    it('handles missing current price gracefully', () => {
      const alerts: PriceAlertData[] = [
        {
          id: '1',
          symbol: 'TEST',
          targetPrice: 100.00,
          type: 'above',
          // No currentPrice
        },
      ];

      render(<AlertsActiveWidget alerts={alerts} />);

      expect(screen.getByText('TEST')).toBeInTheDocument();
      expect(screen.getByText('$100.00')).toBeInTheDocument();
    });

    it('does not show distance when current price is missing', () => {
      const alerts: PriceAlertData[] = [
        {
          id: '1',
          symbol: 'TEST',
          targetPrice: 100.00,
          type: 'above',
        },
      ];

      const { container } = render(<AlertsActiveWidget alerts={alerts} />);

      const distanceElements = container.querySelectorAll('.text-\\[10px\\].font-mono');
      // Should not show distance percentage
      expect(distanceElements.length).toBe(0);
    });
  });

  describe('Icon Display', () => {
    it('displays bell icon in header', () => {
      const { container } = render(<AlertsActiveWidget alerts={mockAlerts} />);

      const bellIcon = container.querySelector('.text-primary');
      expect(bellIcon).toBeInTheDocument();
    });

    it('displays badge with outline variant', () => {
      const { container } = render(<AlertsActiveWidget alerts={mockAlerts} />);

      // Badge component should be rendered
      expect(screen.getByText('3 active')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('uses semantic text sizes', () => {
      const { container } = render(<AlertsActiveWidget alerts={mockAlerts} />);

      const smallText = container.querySelectorAll('.text-sm');
      const extraSmallText = container.querySelectorAll('.text-xs');

      expect(smallText.length).toBeGreaterThan(0);
      expect(extraSmallText.length).toBeGreaterThan(0);
    });

    it('provides visual and text indicators for alert types', () => {
      render(<AlertsActiveWidget alerts={mockAlerts} />);

      expect(screen.getAllByText('above').length).toBeGreaterThan(0);
      expect(screen.getAllByText('below').length).toBeGreaterThan(0);
    });
  });

  describe('Custom ClassName', () => {
    it('accepts and applies custom className', () => {
      const { container } = render(
        <AlertsActiveWidget alerts={mockAlerts} className="custom-class" />
      );

      const mainContainer = container.querySelector('.custom-class');
      expect(mainContainer).toBeInTheDocument();
    });
  });
});
