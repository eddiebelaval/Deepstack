import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OptionsStrategyBuilder } from '../OptionsStrategyBuilder';
import { useOptionsStrategyStore } from '@/lib/stores/options-strategy-store';
import { type OptionLeg, type StrategyCalculation } from '@/lib/types/options';

// Mock the store
vi.mock('@/lib/stores/options-strategy-store');

// Mock fetch for price data
global.fetch = vi.fn();

const mockLeg: OptionLeg = {
  strike: 450,
  option_type: 'call',
  action: 'buy',
  quantity: 1,
  premium: 2.50,
};

const mockCalculation: StrategyCalculation = {
  strategy_name: 'Long Call',
  net_debit_credit: -250,
  max_profit: Infinity,
  max_loss: 250,
  breakeven_points: [452.50],
  risk_reward_ratio: Infinity,
  pnl_at_expiration: [
    { price: 440, pnl: -250 },
    { price: 450, pnl: -250 },
    { price: 460, pnl: 750 },
  ],
  pnl_current: [
    { price: 440, pnl: -200 },
    { price: 450, pnl: -150 },
    { price: 460, pnl: 600 },
  ],
  greeks: {
    delta: 0.55,
    gamma: 0.05,
    theta: -0.03,
    vega: 0.12,
  },
  greeks_over_price: [
    { price: 440, delta: 0.52, gamma: 0.05, theta: -0.03, vega: 0.12 },
    { price: 450, delta: 0.55, gamma: 0.05, theta: -0.03, vega: 0.12 },
    { price: 460, delta: 0.58, gamma: 0.05, theta: -0.03, vega: 0.12 },
  ],
  mock: false,
};

describe('OptionsStrategyBuilder', () => {
  const mockSetSymbol = vi.fn();
  const mockSetUnderlyingPrice = vi.fn();
  const mockSetExpirationDate = vi.fn();
  const mockSelectTemplate = vi.fn();
  const mockAddLeg = vi.fn();
  const mockUpdateLeg = vi.fn();
  const mockRemoveLeg = vi.fn();
  const mockClearLegs = vi.fn();
  const mockCalculate = vi.fn();
  const mockSetShowGreeks = vi.fn();
  const mockReset = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ last: 450.50 }),
    });

    (useOptionsStrategyStore as any).mockReturnValue({
      symbol: 'SPY',
      underlyingPrice: 450,
      expirationDate: '2024-12-20',
      selectedTemplate: 'custom',
      legs: [],
      calculation: null,
      isCalculating: false,
      error: null,
      showGreeks: false,
      setSymbol: mockSetSymbol,
      setUnderlyingPrice: mockSetUnderlyingPrice,
      setExpirationDate: mockSetExpirationDate,
      selectTemplate: mockSelectTemplate,
      addLeg: mockAddLeg,
      updateLeg: mockUpdateLeg,
      removeLeg: mockRemoveLeg,
      clearLegs: mockClearLegs,
      calculate: mockCalculate,
      setShowGreeks: mockSetShowGreeks,
      reset: mockReset,
    });
  });

  describe('rendering', () => {
    it('renders title and description', () => {
      render(<OptionsStrategyBuilder />);
      expect(screen.getByText('Strategy Builder')).toBeInTheDocument();
      expect(screen.getByText(/Build and analyze options strategies/)).toBeInTheDocument();
    });

    it('renders position setup section', () => {
      render(<OptionsStrategyBuilder />);
      expect(screen.getByLabelText('Symbol')).toBeInTheDocument();
      expect(screen.getByLabelText('Underlying Price')).toBeInTheDocument();
      expect(screen.getByLabelText('Expiration Date')).toBeInTheDocument();
    });

    it('renders strategy templates section', () => {
      render(<OptionsStrategyBuilder />);
      expect(screen.getByText('Strategy Templates')).toBeInTheDocument();
    });

    it('renders position legs section', () => {
      render(<OptionsStrategyBuilder />);
      expect(screen.getByText('Position Legs')).toBeInTheDocument();
    });

    it('renders Calculate P&L button', () => {
      render(<OptionsStrategyBuilder />);
      expect(screen.getByText('Calculate P&L')).toBeInTheDocument();
    });

    it('renders Reset button', () => {
      render(<OptionsStrategyBuilder />);
      expect(screen.getByText('Reset')).toBeInTheDocument();
    });
  });

  describe('symbol input', () => {
    it('displays current symbol', () => {
      render(<OptionsStrategyBuilder />);
      expect(screen.getByDisplayValue('SPY')).toBeInTheDocument();
    });

    it('updates symbol on change', async () => {
      const user = userEvent.setup();
      render(<OptionsStrategyBuilder />);

      const symbolInput = screen.getByLabelText('Symbol');
      await user.clear(symbolInput);
      await user.type(symbolInput, 'AAPL');

      expect(mockSetSymbol).toHaveBeenCalledWith('AAPL');
    });

    it('fetches underlying price when symbol changes', async () => {
      render(<OptionsStrategyBuilder />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/market/quotes?symbol=SPY'));
      });
    });
  });

  describe('underlying price', () => {
    it('displays current underlying price', () => {
      render(<OptionsStrategyBuilder />);
      expect(screen.getByDisplayValue('450')).toBeInTheDocument();
    });

    it('updates underlying price on change', async () => {
      const user = userEvent.setup();
      render(<OptionsStrategyBuilder />);

      const priceInput = screen.getByLabelText('Underlying Price');
      await user.clear(priceInput);
      await user.type(priceInput, '500');

      expect(mockSetUnderlyingPrice).toHaveBeenCalledWith(500);
    });
  });

  describe('expiration date', () => {
    it('displays current expiration date', () => {
      render(<OptionsStrategyBuilder />);
      expect(screen.getByDisplayValue('2024-12-20')).toBeInTheDocument();
    });

    it('updates expiration date on change', async () => {
      const user = userEvent.setup();
      render(<OptionsStrategyBuilder />);

      const dateInput = screen.getByLabelText('Expiration Date');
      await user.clear(dateInput);
      await user.type(dateInput, '2025-01-15');

      expect(mockSetExpirationDate).toHaveBeenCalledWith('2025-01-15');
    });
  });

  describe('strategy templates', () => {
    it('renders template cards', () => {
      render(<OptionsStrategyBuilder />);
      // Templates from STRATEGY_TEMPLATES
      expect(screen.getByText(/Long Call/)).toBeInTheDocument();
      expect(screen.getByText(/Long Put/)).toBeInTheDocument();
    });

    it('selects template when clicked', async () => {
      const user = userEvent.setup();
      render(<OptionsStrategyBuilder />);

      const template = screen.getByText(/Long Call/);
      await user.click(template);

      expect(mockSelectTemplate).toHaveBeenCalled();
    });

    it('displays template details', () => {
      render(<OptionsStrategyBuilder />);
      // Should show direction badges
      expect(screen.getByText('Bullish')).toBeInTheDocument();
    });
  });

  describe('leg management', () => {
    it('shows empty state when no legs', () => {
      render(<OptionsStrategyBuilder />);
      expect(screen.getByText('No legs added')).toBeInTheDocument();
      expect(screen.getByText(/Select a template or add legs manually/)).toBeInTheDocument();
    });

    it('renders Add Leg button', () => {
      render(<OptionsStrategyBuilder />);
      expect(screen.getByText('Add Leg')).toBeInTheDocument();
    });

    it('adds leg when Add Leg is clicked', async () => {
      const user = userEvent.setup();
      render(<OptionsStrategyBuilder />);

      await user.click(screen.getByText('Add Leg'));

      expect(mockAddLeg).toHaveBeenCalledWith(
        expect.objectContaining({
          strike: expect.any(Number),
          option_type: 'call',
          action: 'buy',
          quantity: 1,
        })
      );
    });

    it('displays legs when present', () => {
      (useOptionsStrategyStore as any).mockReturnValue({
        ...useOptionsStrategyStore(),
        legs: [mockLeg],
      });

      render(<OptionsStrategyBuilder />);
      expect(screen.getByText('BUY')).toBeInTheDocument();
      expect(screen.getByText('CALL')).toBeInTheDocument();
    });

    it('shows leg count badge', () => {
      (useOptionsStrategyStore as any).mockReturnValue({
        ...useOptionsStrategyStore(),
        legs: [mockLeg, mockLeg],
      });

      render(<OptionsStrategyBuilder />);
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('leg editor', () => {
    beforeEach(() => {
      (useOptionsStrategyStore as any).mockReturnValue({
        ...useOptionsStrategyStore(),
        legs: [mockLeg],
      });
    });

    it('renders leg details', () => {
      render(<OptionsStrategyBuilder />);
      expect(screen.getByDisplayValue('450')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2.5')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1')).toBeInTheDocument();
    });

    it('allows editing strike price', async () => {
      const user = userEvent.setup();
      render(<OptionsStrategyBuilder />);

      const strikeInput = screen.getByDisplayValue('450');
      await user.clear(strikeInput);
      await user.type(strikeInput, '455');

      expect(mockUpdateLeg).toHaveBeenCalledWith(0, { strike: 455 });
    });

    it('allows editing premium', async () => {
      const user = userEvent.setup();
      render(<OptionsStrategyBuilder />);

      const premiumInput = screen.getByDisplayValue('2.5');
      await user.clear(premiumInput);
      await user.type(premiumInput, '3.0');

      expect(mockUpdateLeg).toHaveBeenCalledWith(0, { premium: 3.0 });
    });

    it('allows editing quantity', async () => {
      const user = userEvent.setup();
      render(<OptionsStrategyBuilder />);

      const quantityInput = screen.getByDisplayValue('1');
      await user.clear(quantityInput);
      await user.type(quantityInput, '2');

      expect(mockUpdateLeg).toHaveBeenCalledWith(0, { quantity: 2 });
    });

    it('allows removing leg', async () => {
      const user = userEvent.setup();
      render(<OptionsStrategyBuilder />);

      const removeButton = screen.getByRole('button', { name: /trash/i });
      await user.click(removeButton);

      expect(mockRemoveLeg).toHaveBeenCalledWith(0);
    });

    it('increments quantity with + button', async () => {
      const user = userEvent.setup();
      render(<OptionsStrategyBuilder />);

      const plusButton = screen.getByRole('button', { name: /plus/i });
      await user.click(plusButton);

      expect(mockUpdateLeg).toHaveBeenCalledWith(0, { quantity: 2 });
    });

    it('decrements quantity with - button', async () => {
      (useOptionsStrategyStore as any).mockReturnValue({
        ...useOptionsStrategyStore(),
        legs: [{ ...mockLeg, quantity: 2 }],
      });

      const user = userEvent.setup();
      render(<OptionsStrategyBuilder />);

      const minusButton = screen.getByRole('button', { name: /minus/i });
      await user.click(minusButton);

      expect(mockUpdateLeg).toHaveBeenCalledWith(0, { quantity: 1 });
    });

    it('does not allow quantity below 1', async () => {
      const user = userEvent.setup();
      render(<OptionsStrategyBuilder />);

      const minusButton = screen.getByRole('button', { name: /minus/i });
      await user.click(minusButton);

      expect(mockUpdateLeg).toHaveBeenCalledWith(0, { quantity: 1 });
    });
  });

  describe('calculation', () => {
    it('calls calculate when Calculate P&L is clicked', async () => {
      const user = userEvent.setup();
      render(<OptionsStrategyBuilder />);

      await user.click(screen.getByText('Calculate P&L'));

      expect(mockCalculate).toHaveBeenCalled();
    });

    it('disables Calculate button when no legs', () => {
      render(<OptionsStrategyBuilder />);
      expect(screen.getByText('Calculate P&L')).toBeDisabled();
    });

    it('disables Calculate button when calculating', () => {
      (useOptionsStrategyStore as any).mockReturnValue({
        ...useOptionsStrategyStore(),
        isCalculating: true,
        legs: [mockLeg],
      });

      render(<OptionsStrategyBuilder />);
      expect(screen.getByText('Calculating...')).toBeDisabled();
    });

    it('shows auto-calculating badge when calculating', () => {
      (useOptionsStrategyStore as any).mockReturnValue({
        ...useOptionsStrategyStore(),
        isCalculating: true,
      });

      render(<OptionsStrategyBuilder />);
      expect(screen.getByText('Auto-calculating...')).toBeInTheDocument();
    });

    it('triggers auto-calculate when legs change', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<OptionsStrategyBuilder />);

      // Add a leg
      await user.click(screen.getByText('Add Leg'));

      // Update store to have leg
      (useOptionsStrategyStore as any).mockReturnValue({
        ...useOptionsStrategyStore(),
        legs: [mockLeg],
      });

      rerender(<OptionsStrategyBuilder />);

      await waitFor(() => {
        expect(mockCalculate).toHaveBeenCalled();
      }, { timeout: 1000 });
    });
  });

  describe('display options', () => {
    it('renders Show Greeks toggle', () => {
      render(<OptionsStrategyBuilder />);
      expect(screen.getByText('Show Greeks')).toBeInTheDocument();
    });

    it('toggles Greeks display', async () => {
      const user = userEvent.setup();
      render(<OptionsStrategyBuilder />);

      const toggleButton = screen.getByText('Off');
      await user.click(toggleButton);

      expect(mockSetShowGreeks).toHaveBeenCalledWith(true);
    });

    it('shows On when Greeks are enabled', () => {
      (useOptionsStrategyStore as any).mockReturnValue({
        ...useOptionsStrategyStore(),
        showGreeks: true,
      });

      render(<OptionsStrategyBuilder />);
      expect(screen.getByText('On')).toBeInTheDocument();
    });
  });

  describe('reset functionality', () => {
    it('calls reset when Reset is clicked', async () => {
      const user = userEvent.setup();
      render(<OptionsStrategyBuilder />);

      await user.click(screen.getByText('Reset'));

      expect(mockReset).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('displays error message', () => {
      (useOptionsStrategyStore as any).mockReturnValue({
        ...useOptionsStrategyStore(),
        error: 'Calculation failed',
      });

      render(<OptionsStrategyBuilder />);
      expect(screen.getByText('Calculation failed')).toBeInTheDocument();
    });

    it('shows error in destructive styling', () => {
      (useOptionsStrategyStore as any).mockReturnValue({
        ...useOptionsStrategyStore(),
        error: 'Something went wrong',
      });

      const { container } = render(<OptionsStrategyBuilder />);
      expect(container.querySelector('.text-destructive')).toBeInTheDocument();
    });
  });

  describe('payoff diagram integration', () => {
    it('renders PayoffDiagram component', () => {
      render(<OptionsStrategyBuilder />);
      // PayoffDiagram should be in the DOM
      expect(screen.getByText(/Add legs to see payoff diagram/)).toBeInTheDocument();
    });

    it('passes calculation to PayoffDiagram', () => {
      (useOptionsStrategyStore as any).mockReturnValue({
        ...useOptionsStrategyStore(),
        calculation: mockCalculation,
      });

      render(<OptionsStrategyBuilder />);
      expect(screen.getByText('Long Call')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has labeled inputs', () => {
      render(<OptionsStrategyBuilder />);
      expect(screen.getByLabelText('Symbol')).toBeInTheDocument();
      expect(screen.getByLabelText('Underlying Price')).toBeInTheDocument();
      expect(screen.getByLabelText('Expiration Date')).toBeInTheDocument();
    });

    it('has proper heading structure', () => {
      render(<OptionsStrategyBuilder />);
      expect(screen.getByRole('heading', { level: 2, name: /Strategy Builder/ })).toBeInTheDocument();
    });
  });
});
