import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToolUseCard } from '../ToolUseCard';

// Mock Card component
vi.mock('@/components/ui/card', () => ({
  Card: vi.fn(({ children, className }) => <div data-testid="card" className={className}>{children}</div>),
}));

vi.mock('@/components/ui/button', () => ({
  Button: vi.fn(({ children, ...props }) => <button {...props}>{children}</button>),
}));

describe('ToolUseCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Tool Name Display', () => {
    it('displays formatted tool name', () => {
      render(<ToolUseCard tool={{ toolName: 'get_quote', args: {}, state: 'call' }} />);

      expect(screen.getByText('Get Quote')).toBeInTheDocument();
    });

    it('displays symbol when present', () => {
      render(<ToolUseCard tool={{ toolName: 'get_quote', args: { symbol: 'aapl' }, state: 'call' }} />);

      expect(screen.getByText('AAPL')).toBeInTheDocument();
    });

    it('formats complex tool names', () => {
      render(<ToolUseCard tool={{ toolName: 'calculate_position_size', args: {}, state: 'call' }} />);

      expect(screen.getByText('Calculate Position Size')).toBeInTheDocument();
    });
  });

  describe('State Indicators', () => {
    it('shows Complete for result state', () => {
      render(<ToolUseCard tool={{ toolName: 'get_quote', args: {}, state: 'result', result: {} }} />);

      expect(screen.getByText('Complete')).toBeInTheDocument();
    });

    it('shows loading message for call state', () => {
      render(<ToolUseCard tool={{ toolName: 'get_quote', args: {}, state: 'call' }} />);

      expect(screen.getByText('Fetching real-time quote...')).toBeInTheDocument();
    });

    it('shows Preparing for partial-call state', () => {
      render(<ToolUseCard tool={{ toolName: 'get_quote', args: {}, state: 'partial-call' }} />);

      expect(screen.getByText('Preparing...')).toBeInTheDocument();
    });

    it('shows spinner for call state', () => {
      render(<ToolUseCard tool={{ toolName: 'get_quote', args: {}, state: 'call' }} />);

      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('shows check icon for result state', () => {
      render(<ToolUseCard tool={{ toolName: 'get_quote', args: {}, state: 'result', result: {} }} />);

      expect(document.querySelector('.lucide-check')).toBeInTheDocument();
    });
  });

  describe('Tool-Specific Loading Messages', () => {
    it('shows correct message for get_positions', () => {
      render(<ToolUseCard tool={{ toolName: 'get_positions', args: {}, state: 'call' }} />);

      expect(screen.getByText('Loading portfolio positions...')).toBeInTheDocument();
    });

    it('shows correct message for analyze_stock', () => {
      render(<ToolUseCard tool={{ toolName: 'analyze_stock', args: {}, state: 'call' }} />);

      expect(screen.getByText('Analyzing stock fundamentals and technicals...')).toBeInTheDocument();
    });

    it('shows default message for unknown tool', () => {
      render(<ToolUseCard tool={{ toolName: 'unknown_tool', args: {}, state: 'call' }} />);

      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });
  });

  describe('Mock Data Indicator', () => {
    it('shows Demo badge for mock data', () => {
      render(
        <ToolUseCard
          tool={{
            toolName: 'get_quote',
            args: {},
            state: 'result',
            result: { mock: true },
          }}
        />
      );

      expect(screen.getByText('Complete (Demo)')).toBeInTheDocument();
    });

    it('shows Demo badge for nested mock flag', () => {
      render(
        <ToolUseCard
          tool={{
            toolName: 'get_quote',
            args: {},
            state: 'result',
            result: { data: { mock: true } },
          }}
        />
      );

      expect(screen.getByText('Complete (Demo)')).toBeInTheDocument();
    });
  });

  describe('Expandable Content', () => {
    it('shows expand button', () => {
      render(<ToolUseCard tool={{ toolName: 'get_quote', args: {}, state: 'call' }} />);

      expect(document.querySelector('.lucide-chevron-right')).toBeInTheDocument();
    });

    it('expands on click', async () => {
      const user = userEvent.setup();
      render(
        <ToolUseCard
          tool={{
            toolName: 'get_quote',
            args: { symbol: 'AAPL' },
            state: 'result',
            result: { price: 150 },
          }}
        />
      );

      await user.click(screen.getByText('Get Quote'));

      expect(screen.getByText('Input:')).toBeInTheDocument();
    });

    it('shows input args when expanded', async () => {
      const user = userEvent.setup();
      render(
        <ToolUseCard
          tool={{
            toolName: 'get_quote',
            args: { symbol: 'AAPL' },
            state: 'call',
          }}
        />
      );

      await user.click(screen.getByText('Get Quote'));

      expect(screen.getByText(/"symbol": "AAPL"/)).toBeInTheDocument();
    });

    it('shows output when expanded and result available', async () => {
      const user = userEvent.setup();
      render(
        <ToolUseCard
          tool={{
            toolName: 'get_quote',
            args: { symbol: 'AAPL' },
            state: 'result',
            result: { price: 150 },
          }}
        />
      );

      await user.click(screen.getByText('Get Quote'));

      expect(screen.getByText('Output:')).toBeInTheDocument();
    });

    it('shows Demo Data badge when expanded with mock data', async () => {
      const user = userEvent.setup();
      render(
        <ToolUseCard
          tool={{
            toolName: 'get_quote',
            args: {},
            state: 'result',
            result: { mock: true, price: 150 },
          }}
        />
      );

      await user.click(screen.getByText('Get Quote'));

      expect(screen.getByText('Demo Data')).toBeInTheDocument();
    });

    it('collapses on second click', async () => {
      const user = userEvent.setup();
      render(
        <ToolUseCard
          tool={{
            toolName: 'get_quote',
            args: { symbol: 'AAPL' },
            state: 'call',
          }}
        />
      );

      await user.click(screen.getByText('Get Quote'));
      expect(screen.getByText('Input:')).toBeInTheDocument();

      await user.click(screen.getByText('Get Quote'));
      expect(screen.queryByText('Input:')).not.toBeInTheDocument();
    });
  });

  describe('Tool Icons', () => {
    it('renders icon for get_quote', () => {
      render(<ToolUseCard tool={{ toolName: 'get_quote', args: {}, state: 'call' }} />);

      // BarChart3 icon renders as svg with lucide class
      expect(document.querySelector('svg.lucide')).toBeInTheDocument();
    });

    it('renders icon for get_positions', () => {
      render(<ToolUseCard tool={{ toolName: 'get_positions', args: {}, state: 'call' }} />);

      expect(document.querySelector('svg.lucide')).toBeInTheDocument();
    });

    it('renders fallback icon for unknown tool', () => {
      render(<ToolUseCard tool={{ toolName: 'unknown_tool', args: {}, state: 'call' }} />);

      // Falls back to Wrench icon
      expect(document.querySelector('svg.lucide')).toBeInTheDocument();
    });
  });
});
