import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MarketStatusWidget } from '../MarketStatusWidget';

// Mock the market data store
vi.mock('@/lib/stores/market-data-store', () => ({
  useMarketDataStore: vi.fn(),
}));

import { useMarketDataStore } from '@/lib/stores/market-data-store';

describe('MarketStatusWidget', () => {
  beforeEach(() => {
    // Mock default store state
    (useMarketDataStore as any).mockReturnValue({
      wsConnected: false,
    });
    vi.clearAllMocks();
  });

  describe('WebSocket Connection Status', () => {
    it('shows disconnected state when websocket is not connected', () => {
      (useMarketDataStore as any).mockReturnValue({
        wsConnected: false,
      });

      render(<MarketStatusWidget />);

      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });

    it('shows live data state when websocket is connected', () => {
      (useMarketDataStore as any).mockReturnValue({
        wsConnected: true,
      });

      render(<MarketStatusWidget />);

      expect(screen.getByText('Live Data')).toBeInTheDocument();
    });

    it('displays wifi icon when connected', () => {
      (useMarketDataStore as any).mockReturnValue({
        wsConnected: true,
      });

      const { container } = render(<MarketStatusWidget />);

      // Check for profit color class indicating connection
      const connectedIndicator = container.querySelector('.bg-profit');
      expect(connectedIndicator).toBeInTheDocument();
    });

    it('displays wifi-off icon when disconnected', () => {
      (useMarketDataStore as any).mockReturnValue({
        wsConnected: false,
      });

      const { container } = render(<MarketStatusWidget />);

      // Check for loss color class indicating disconnection
      const disconnectedIndicator = container.querySelector('.bg-loss');
      expect(disconnectedIndicator).toBeInTheDocument();
    });
  });

  describe('Market Hours Display', () => {
    it('renders market status indicator', async () => {
      render(<MarketStatusWidget />);

      // Wait for initial render to complete (handles useEffect)
      await waitFor(() => {
        const marketStatus = screen.queryByText(/Market (Open|Closed)/);
        expect(marketStatus).toBeInTheDocument();
      });
    });

    it('shows market hours information when closed', async () => {
      render(<MarketStatusWidget />);

      // Wait for state to update after mount
      await waitFor(() => {
        // Should show either weekend message or weekday hours
        const hasMarketInfo =
          screen.queryByText('Markets open Monday - Friday') ||
          screen.queryByText('Regular hours: 9:30 AM - 4:00 PM ET');
        // Only check if market is closed
        if (screen.queryByText('Market Closed')) {
          expect(hasMarketInfo).toBeInTheDocument();
        }
      });
    });
  });

  describe('Visual Indicators', () => {
    it('shows market status indicator', async () => {
      const { container } = render(<MarketStatusWidget />);

      await waitFor(() => {
        // Check for status indicator dot
        const indicator = container.querySelector('.bg-profit, .bg-muted-foreground');
        expect(indicator).toBeInTheDocument();
      });
    });
  });

  describe('Layout and Styling', () => {
    it('renders with proper spacing structure', () => {
      const { container } = render(<MarketStatusWidget />);

      const spacingContainer = container.querySelector('.space-y-3');
      expect(spacingContainer).toBeInTheDocument();
    });

    it('displays market status and connection status', async () => {
      render(<MarketStatusWidget />);

      // Wait for state to initialize
      await waitFor(() => {
        // Should have both status sections
        expect(screen.getByText(/Market (Open|Closed)/)).toBeInTheDocument();
        expect(screen.getByText(/Live Data|Disconnected/)).toBeInTheDocument();
      });
    });
  });

  describe('Icon Display', () => {
    it('shows clock icon for market status', () => {
      const { container } = render(<MarketStatusWidget />);

      // Check for presence of icon with size classes
      const iconContainer = container.querySelector('.h-3\\.5, .w-3\\.5');
      expect(iconContainer).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid connection state changes', () => {
      const { rerender } = render(<MarketStatusWidget />);

      (useMarketDataStore as any).mockReturnValue({
        wsConnected: true,
      });
      rerender(<MarketStatusWidget />);

      expect(screen.getByText('Live Data')).toBeInTheDocument();

      (useMarketDataStore as any).mockReturnValue({
        wsConnected: false,
      });
      rerender(<MarketStatusWidget />);

      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });

    it('handles initial render without errors', () => {
      expect(() => render(<MarketStatusWidget />)).not.toThrow();
    });
  });

  describe('Hydration Safety', () => {
    it('uses state to prevent hydration mismatch', async () => {
      render(<MarketStatusWidget />);

      // Initial render should complete without hydration errors
      await waitFor(() => {
        const marketStatus = screen.queryByText(/Market (Open|Closed)/);
        expect(marketStatus).toBeInTheDocument();
      });
    });
  });
});
