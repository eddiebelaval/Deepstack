import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectionStatusIndicator, ConnectionDot } from '../ConnectionStatusIndicator';

// Mock the realtime status hook
const mockRealtimeStatus = vi.fn();

vi.mock('@/hooks/useRealtimePositions', () => ({
  useRealtimeStatus: () => mockRealtimeStatus(),
}));

describe('ConnectionStatusIndicator', () => {
  describe('rendering', () => {
    it('renders indicator', () => {
      mockRealtimeStatus.mockReturnValue('connected');
      const { container } = render(<ConnectionStatusIndicator />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('accepts custom className', () => {
      mockRealtimeStatus.mockReturnValue('connected');
      const { container } = render(
        <ConnectionStatusIndicator className="custom-indicator" />
      );
      const element = container.querySelector('.custom-indicator');
      expect(element).toBeInTheDocument();
    });

    it('renders without label by default', () => {
      mockRealtimeStatus.mockReturnValue('connected');
      render(<ConnectionStatusIndicator />);
      expect(screen.queryByText('Connected')).not.toBeInTheDocument();
    });

    it('renders with label when showLabel is true', () => {
      mockRealtimeStatus.mockReturnValue('connected');
      render(<ConnectionStatusIndicator showLabel={true} />);
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });
  });

  describe('connected state', () => {
    it('shows connected status', () => {
      mockRealtimeStatus.mockReturnValue('connected');
      render(<ConnectionStatusIndicator showLabel={true} />);
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    it('shows Wifi icon', () => {
      mockRealtimeStatus.mockReturnValue('connected');
      const { container } = render(<ConnectionStatusIndicator />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('text-profit');
    });

    it('has profit color', () => {
      mockRealtimeStatus.mockReturnValue('connected');
      const { container } = render(<ConnectionStatusIndicator />);
      const icon = container.querySelector('.text-profit');
      expect(icon).toBeInTheDocument();
    });

    it('has profit background', () => {
      mockRealtimeStatus.mockReturnValue('connected');
      const { container } = render(<ConnectionStatusIndicator />);
      const indicator = container.querySelector('.bg-profit\\/20');
      expect(indicator).toBeInTheDocument();
    });

    it('does not animate', () => {
      mockRealtimeStatus.mockReturnValue('connected');
      const { container } = render(<ConnectionStatusIndicator />);
      const icon = container.querySelector('.animate-spin');
      expect(icon).not.toBeInTheDocument();
    });
  });

  describe('connecting state', () => {
    it('shows connecting status', () => {
      mockRealtimeStatus.mockReturnValue('connecting');
      render(<ConnectionStatusIndicator showLabel={true} />);
      expect(screen.getByText('Connecting')).toBeInTheDocument();
    });

    it('shows Loader2 icon', () => {
      mockRealtimeStatus.mockReturnValue('connecting');
      const { container } = render(<ConnectionStatusIndicator />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('text-yellow-500');
    });

    it('animates spinner', () => {
      mockRealtimeStatus.mockReturnValue('connecting');
      const { container } = render(<ConnectionStatusIndicator />);
      const icon = container.querySelector('.animate-spin');
      expect(icon).toBeInTheDocument();
    });

    it('has yellow background', () => {
      mockRealtimeStatus.mockReturnValue('connecting');
      const { container } = render(<ConnectionStatusIndicator />);
      const indicator = container.querySelector('.bg-yellow-500\\/20');
      expect(indicator).toBeInTheDocument();
    });
  });

  describe('disconnected state', () => {
    it('shows disconnected status', () => {
      mockRealtimeStatus.mockReturnValue('disconnected');
      render(<ConnectionStatusIndicator showLabel={true} />);
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });

    it('shows WifiOff icon', () => {
      mockRealtimeStatus.mockReturnValue('disconnected');
      const { container } = render(<ConnectionStatusIndicator />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('text-muted-foreground');
    });

    it('has muted background', () => {
      mockRealtimeStatus.mockReturnValue('disconnected');
      const { container } = render(<ConnectionStatusIndicator />);
      const indicator = container.querySelector('.bg-muted');
      expect(indicator).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows error status', () => {
      mockRealtimeStatus.mockReturnValue('error');
      render(<ConnectionStatusIndicator showLabel={true} />);
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('shows AlertCircle icon', () => {
      mockRealtimeStatus.mockReturnValue('error');
      const { container } = render(<ConnectionStatusIndicator />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('text-loss');
    });

    it('has loss color', () => {
      mockRealtimeStatus.mockReturnValue('error');
      const { container } = render(<ConnectionStatusIndicator />);
      const icon = container.querySelector('.text-loss');
      expect(icon).toBeInTheDocument();
    });

    it('has loss background', () => {
      mockRealtimeStatus.mockReturnValue('error');
      const { container } = render(<ConnectionStatusIndicator />);
      const indicator = container.querySelector('.bg-loss\\/20');
      expect(indicator).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('has rounded-full class', () => {
      mockRealtimeStatus.mockReturnValue('connected');
      const { container } = render(<ConnectionStatusIndicator />);
      const indicator = container.querySelector('.rounded-full');
      expect(indicator).toBeInTheDocument();
    });

    it('has flex layout', () => {
      mockRealtimeStatus.mockReturnValue('connected');
      const { container } = render(<ConnectionStatusIndicator />);
      const indicator = container.querySelector('.flex.items-center');
      expect(indicator).toBeInTheDocument();
    });

    it('has appropriate padding', () => {
      mockRealtimeStatus.mockReturnValue('connected');
      const { container } = render(<ConnectionStatusIndicator />);
      const indicator = container.querySelector('.px-2.py-1');
      expect(indicator).toBeInTheDocument();
    });
  });

  describe('tooltip', () => {
    it('renders with tooltip trigger', () => {
      mockRealtimeStatus.mockReturnValue('connected');
      const { container } = render(<ConnectionStatusIndicator />);
      // Tooltip provider and trigger are rendered
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});

describe('ConnectionDot', () => {
  describe('rendering', () => {
    it('renders dot indicator', () => {
      mockRealtimeStatus.mockReturnValue('connected');
      const { container } = render(<ConnectionDot />);
      const dot = container.querySelector('.h-2.w-2.rounded-full');
      expect(dot).toBeInTheDocument();
    });

    it('accepts custom className', () => {
      mockRealtimeStatus.mockReturnValue('connected');
      const { container } = render(<ConnectionDot className="custom-dot" />);
      const dot = container.querySelector('.custom-dot');
      expect(dot).toBeInTheDocument();
    });
  });

  describe('connected state', () => {
    it('has profit color', () => {
      mockRealtimeStatus.mockReturnValue('connected');
      const { container } = render(<ConnectionDot />);
      const dot = container.querySelector('.bg-profit');
      expect(dot).toBeInTheDocument();
    });

    it('does not pulse', () => {
      mockRealtimeStatus.mockReturnValue('connected');
      const { container } = render(<ConnectionDot />);
      const dot = container.querySelector('.animate-pulse');
      expect(dot).not.toBeInTheDocument();
    });
  });

  describe('connecting state', () => {
    it('has yellow color', () => {
      mockRealtimeStatus.mockReturnValue('connecting');
      const { container } = render(<ConnectionDot />);
      const dot = container.querySelector('.bg-yellow-500');
      expect(dot).toBeInTheDocument();
    });

    it('pulses', () => {
      mockRealtimeStatus.mockReturnValue('connecting');
      const { container } = render(<ConnectionDot />);
      const dot = container.querySelector('.animate-pulse');
      expect(dot).toBeInTheDocument();
    });
  });

  describe('disconnected state', () => {
    it('has muted color', () => {
      mockRealtimeStatus.mockReturnValue('disconnected');
      const { container } = render(<ConnectionDot />);
      const dot = container.querySelector('.bg-muted-foreground');
      expect(dot).toBeInTheDocument();
    });

    it('does not pulse', () => {
      mockRealtimeStatus.mockReturnValue('disconnected');
      const { container } = render(<ConnectionDot />);
      const dot = container.querySelector('.animate-pulse');
      expect(dot).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('has loss color', () => {
      mockRealtimeStatus.mockReturnValue('error');
      const { container } = render(<ConnectionDot />);
      const dot = container.querySelector('.bg-loss');
      expect(dot).toBeInTheDocument();
    });

    it('pulses', () => {
      mockRealtimeStatus.mockReturnValue('error');
      const { container } = render(<ConnectionDot />);
      const dot = container.querySelector('.animate-pulse');
      expect(dot).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('is small size (h-2 w-2)', () => {
      mockRealtimeStatus.mockReturnValue('connected');
      const { container } = render(<ConnectionDot />);
      const dot = container.querySelector('.h-2.w-2');
      expect(dot).toBeInTheDocument();
    });

    it('is rounded-full', () => {
      mockRealtimeStatus.mockReturnValue('connected');
      const { container } = render(<ConnectionDot />);
      const dot = container.querySelector('.rounded-full');
      expect(dot).toBeInTheDocument();
    });
  });

  describe('tooltip', () => {
    it('renders with tooltip trigger', () => {
      mockRealtimeStatus.mockReturnValue('connected');
      const { container } = render(<ConnectionDot />);
      // Tooltip provider and trigger are rendered
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
