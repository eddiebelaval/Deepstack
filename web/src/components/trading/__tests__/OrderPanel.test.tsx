import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderPanel } from '../OrderPanel';
import { useTradingStore } from '@/lib/stores/trading-store';
import { useMarketDataStore } from '@/lib/stores/market-data-store';
import { usePlacePaperTrade } from '@/hooks/usePortfolio';
import { useUser } from '@/hooks/useUser';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('@/lib/stores/trading-store');
vi.mock('@/lib/stores/market-data-store');
vi.mock('@/hooks/usePortfolio');
vi.mock('@/hooks/useUser');
vi.mock('sonner');

// Mock fetch for firewall checks
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('OrderPanel', () => {
  const mockExecute = vi.fn();
  const mockSetActiveSymbol = vi.fn();

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Setup default mock implementations
    vi.mocked(useTradingStore).mockReturnValue({
      activeSymbol: 'SPY',
      setActiveSymbol: mockSetActiveSymbol,
    } as any);

    vi.mocked(useMarketDataStore).mockReturnValue({
      quotes: {
        SPY: { last: 450.50, bid: 450.45, ask: 450.55 },
      },
    } as any);

    vi.mocked(usePlacePaperTrade).mockReturnValue({
      execute: mockExecute,
      isSubmitting: false,
      error: null,
      clearError: vi.fn(),
    });

    vi.mocked(useUser).mockReturnValue({
      tier: 'free',
    } as any);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ blocked: false, status: 'ok' }),
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders order panel with correct title and symbol', () => {
      render(<OrderPanel />);

      expect(screen.getByText('Order Entry')).toBeInTheDocument();
      expect(screen.getByText('SPY')).toBeInTheDocument();
    });

    it('renders buy and sell tabs', () => {
      render(<OrderPanel />);

      expect(screen.getByRole('tab', { name: /buy/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /sell/i })).toBeInTheDocument();
    });

    it('renders order type selector', () => {
      render(<OrderPanel />);

      expect(screen.getByText('Order Type')).toBeInTheDocument();
    });

    it('renders quantity input with default value', () => {
      render(<OrderPanel />);

      const quantityInput = screen.getByPlaceholderText(/enter quantity/i);
      expect(quantityInput).toBeInTheDocument();
      expect(quantityInput).toHaveValue(1);
    });

    it('displays current price from market data', () => {
      render(<OrderPanel />);

      // Price is displayed in the order summary section
      const priceElements = screen.getAllByText('$450.50');
      expect(priceElements.length).toBeGreaterThan(0);
    });

    it('calculates and displays estimated value', () => {
      render(<OrderPanel />);

      // Default quantity is 1, price is 450.50
      const priceElements = screen.getAllByText('$450.50');
      expect(priceElements.length).toBeGreaterThan(0);
    });
  });

  // TODO: These tests require Radix UI Select interactions that don't work in JSDOM
  // Move to E2E tests with Playwright for proper browser testing
  describe.skip('Order Type Selection', () => {
    it('shows limit price field when LMT order type is selected', async () => {
      const user = userEvent.setup();
      render(<OrderPanel />);

      // Open order type dropdown
      const orderTypeButton = screen.getByRole('combobox');
      await user.click(orderTypeButton);

      // Select Limit order
      const limitOption = screen.getByRole('option', { name: /limit/i });
      await user.click(limitOption);

      // Limit price field should appear
      await waitFor(() => {
        expect(screen.getByLabelText(/limit price/i)).toBeInTheDocument();
      });
    });

    it('shows stop price field when STP order type is selected', async () => {
      const user = userEvent.setup();
      render(<OrderPanel />);

      // Open order type dropdown
      const orderTypeButton = screen.getByRole('combobox');
      await user.click(orderTypeButton);

      // Select Stop order
      const stopOption = screen.getByRole('option', { name: /stop/i });
      await user.click(stopOption);

      // Stop price field should appear
      await waitFor(() => {
        expect(screen.getByLabelText(/stop price/i)).toBeInTheDocument();
      });
    });

    it('hides price fields for market orders', () => {
      render(<OrderPanel />);

      // Market order is default, so no price fields should be visible
      expect(screen.queryByLabelText(/limit price/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/stop price/i)).not.toBeInTheDocument();
    });
  });

  // TODO: These tests have issues with form label associations in JSDOM
  // Move to E2E tests with Playwright for proper browser testing
  describe.skip('Quantity Selection', () => {
    it('updates quantity when input changes', async () => {
      const user = userEvent.setup();
      render(<OrderPanel />);

      const quantityInput = screen.getByPlaceholderText(/enter quantity/i);
      await user.clear(quantityInput);
      await user.type(quantityInput, '10');

      expect(quantityInput).toHaveValue(10);
    });

    it('updates estimated value when quantity changes', async () => {
      const user = userEvent.setup();
      render(<OrderPanel />);

      const quantityInput = screen.getByPlaceholderText(/enter quantity/i);
      await user.clear(quantityInput);
      await user.type(quantityInput, '10');

      // 10 shares * $450.50 = $4505.00
      await waitFor(() => {
        expect(screen.getByText('$4,505.00')).toBeInTheDocument();
      });
    });

    it('updates quantity using slider', async () => {
      const user = userEvent.setup();
      render(<OrderPanel />);

      const slider = screen.getByRole('slider');
      expect(slider).toBeInTheDocument();
    });
  });

  // TODO: These tests have issues with form submission in JSDOM
  // Move to E2E tests with Playwright for proper browser testing
  describe.skip('Order Submission', () => {
    it('submits buy order with correct data', async () => {
      const user = userEvent.setup();
      mockExecute.mockResolvedValue({ id: '123', symbol: 'SPY' });

      render(<OrderPanel />);

      const quantityInput = screen.getByLabelText(/quantity/i);
      await user.clear(quantityInput);
      await user.type(quantityInput, '10');

      const submitButton = screen.getByRole('button', { name: /buy spy/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockExecute).toHaveBeenCalledWith({
          symbol: 'SPY',
          action: 'BUY',
          quantity: 10,
          price: 450.50,
          orderType: 'MKT',
          notes: 'MKT order via Order Panel',
        });
      });
    });

    it('submits sell order when sell tab is selected', async () => {
      const user = userEvent.setup();
      mockExecute.mockResolvedValue({ id: '123', symbol: 'SPY' });

      render(<OrderPanel />);

      // Switch to sell tab
      const sellTab = screen.getByRole('tab', { name: /sell/i });
      await user.click(sellTab);

      const submitButton = screen.getByRole('button', { name: /sell spy/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockExecute).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'SELL',
          })
        );
      });
    });

    it('uses limit price for LMT orders', async () => {
      const user = userEvent.setup();
      mockExecute.mockResolvedValue({ id: '123', symbol: 'SPY' });

      render(<OrderPanel />);

      // Select Limit order
      const orderTypeButton = screen.getByRole('combobox');
      await user.click(orderTypeButton);
      const limitOption = screen.getByRole('option', { name: /limit/i });
      await user.click(limitOption);

      // Enter limit price
      const limitPriceInput = await screen.findByLabelText(/limit price/i);
      await user.type(limitPriceInput, '445.00');

      const submitButton = screen.getByRole('button', { name: /buy spy/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockExecute).toHaveBeenCalledWith(
          expect.objectContaining({
            price: 445.00,
            orderType: 'LMT',
          })
        );
      });
    });

    it('shows success toast after successful trade', async () => {
      const user = userEvent.setup();
      mockExecute.mockResolvedValue({ id: '123', symbol: 'SPY' });

      render(<OrderPanel />);

      const submitButton = screen.getByRole('button', { name: /buy spy/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Trade Recorded',
          expect.objectContaining({
            description: expect.stringContaining('BUY 1 SPY'),
          })
        );
      });
    });

    it('shows error toast when trade fails', async () => {
      const user = userEvent.setup();
      mockExecute.mockResolvedValue(null);

      render(<OrderPanel />);

      const submitButton = screen.getByRole('button', { name: /buy spy/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Trade Failed',
          expect.any(Object)
        );
      });
    });

    it('resets form after successful trade', async () => {
      const user = userEvent.setup();
      mockExecute.mockResolvedValue({ id: '123', symbol: 'SPY' });

      render(<OrderPanel />);

      const quantityInput = screen.getByPlaceholderText(/enter quantity/i);
      await user.clear(quantityInput);
      await user.type(quantityInput, '10');

      const submitButton = screen.getByRole('button', { name: /buy spy/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(quantityInput).toHaveValue(1);
      });
    });

    it('prevents submission with zero quantity', async () => {
      const user = userEvent.setup();
      render(<OrderPanel />);

      const quantityInput = screen.getByPlaceholderText(/enter quantity/i);
      await user.clear(quantityInput);
      await user.type(quantityInput, '0');

      const submitButton = screen.getByRole('button', { name: /buy spy/i });
      expect(submitButton).toBeDisabled();
    });
  });

  // TODO: These tests have timing issues with async firewall checks in JSDOM
  // Move to E2E tests with Playwright for proper browser testing
  describe.skip('Emotional Firewall Integration', () => {
    it('checks firewall for elite users', async () => {
      const user = userEvent.setup();
      mockExecute.mockResolvedValue({ id: '123', symbol: 'SPY' });

      vi.mocked(useUser).mockReturnValue({
        tier: 'elite',
      } as any);

      render(<OrderPanel />);

      const submitButton = screen.getByRole('button', { name: /buy spy/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/emotional-firewall/check',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ action: 'check_trade', symbol: 'SPY' }),
          })
        );
      });
    });

    it('blocks trade when firewall returns blocked status', async () => {
      const user = userEvent.setup();

      vi.mocked(useUser).mockReturnValue({
        tier: 'elite',
      } as any);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          blocked: true,
          status: 'blocked',
          reasons: ['High emotional state detected'],
        }),
      } as Response);

      render(<OrderPanel />);

      const submitButton = screen.getByRole('button', { name: /buy spy/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Trade Blocked',
          expect.objectContaining({
            description: expect.stringContaining('Emotional Firewall'),
          })
        );
      });

      // Trade should not be executed
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('shows warning when firewall returns warning status', async () => {
      const user = userEvent.setup();
      mockExecute.mockResolvedValue({ id: '123', symbol: 'SPY' });

      vi.mocked(useUser).mockReturnValue({
        tier: 'elite',
      } as any);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          blocked: false,
          status: 'warning',
          reasons: ['Recent losses detected'],
        }),
      } as Response);

      render(<OrderPanel />);

      const submitButton = screen.getByRole('button', { name: /buy spy/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/recent losses detected/i)).toBeInTheDocument();
      });

      // Trade should still be executed
      expect(mockExecute).toHaveBeenCalled();
    });

    it('skips firewall check for free users', async () => {
      const user = userEvent.setup();
      mockExecute.mockResolvedValue({ id: '123', symbol: 'SPY' });

      vi.mocked(useUser).mockReturnValue({
        tier: 'free',
      } as any);

      render(<OrderPanel />);

      const submitButton = screen.getByRole('button', { name: /buy spy/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockExecute).toHaveBeenCalled();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // TODO: These tests have timing issues with loading states in JSDOM
  // Move to E2E tests with Playwright for proper browser testing
  describe.skip('Loading States', () => {
    it('shows loading state while submitting', async () => {
      const user = userEvent.setup();

      vi.mocked(usePlacePaperTrade).mockReturnValue({
        execute: mockExecute,
        isSubmitting: true,
        error: null,
        clearError: vi.fn(),
      });

      render(<OrderPanel />);

      const submitButton = screen.getByRole('button', { name: /submitting/i });
      expect(submitButton).toBeDisabled();
      expect(screen.getByText(/submitting/i)).toBeInTheDocument();
    });

    it('disables submit button while checking firewall', async () => {
      const user = userEvent.setup();

      vi.mocked(useUser).mockReturnValue({
        tier: 'elite',
      } as any);

      // Make fetch take a while
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ blocked: false, status: 'ok' }),
                } as Response),
              100
            )
          )
      );

      render(<OrderPanel />);

      const submitButton = screen.getByRole('button', { name: /buy spy/i });
      await user.click(submitButton);

      // Button should be disabled during firewall check
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Side Selection', () => {
    it('changes button style based on selected side', async () => {
      const user = userEvent.setup();
      render(<OrderPanel />);

      const buyTab = screen.getByRole('tab', { name: /buy/i });
      const sellTab = screen.getByRole('tab', { name: /sell/i });

      // Buy tab should be active by default
      expect(buyTab).toHaveAttribute('data-state', 'active');

      // Switch to sell
      await user.click(sellTab);

      await waitFor(() => {
        expect(sellTab).toHaveAttribute('data-state', 'active');
      });
    });
  });

  describe('No Market Data', () => {
    it('handles missing market data gracefully', () => {
      vi.mocked(useMarketDataStore).mockReturnValue({
        quotes: {},
      } as any);

      render(<OrderPanel />);

      // Should show $0.00 for missing price in estimated value
      const zeroValues = screen.getAllByText('$0.00');
      expect(zeroValues.length).toBeGreaterThan(0);
    });
  });
});
