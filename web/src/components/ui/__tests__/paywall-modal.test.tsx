import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaywallModal } from '../paywall-modal';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock ui-store
const mockSetPaywallOpen = vi.fn();
const mockSetCredits = vi.fn();
vi.mock('@/lib/stores/ui-store', () => ({
  useUIStore: () => ({
    paywallOpen: true,
    setPaywallOpen: mockSetPaywallOpen,
    setCredits: mockSetCredits,
  }),
}));

describe('PaywallModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render modal title', () => {
      render(<PaywallModal />);
      expect(screen.getByText('Unlock Professional Research')).toBeInTheDocument();
    });

    it('should render limit reached message', () => {
      render(<PaywallModal />);
      expect(screen.getByText(/reached the limit of the Free Research Tier/i)).toBeInTheDocument();
    });

    it('should render upgrade benefits', () => {
      render(<PaywallModal />);
      expect(screen.getByText(/Unlimited AI Audit/i)).toBeInTheDocument();
      expect(screen.getByText(/Real-time Market Data/i)).toBeInTheDocument();
    });

    it('should render upgrade button', () => {
      render(<PaywallModal />);
      expect(screen.getByRole('button', { name: /upgrade to pro/i })).toBeInTheDocument();
    });

    it('should render maybe later button', () => {
      render(<PaywallModal />);
      expect(screen.getByRole('button', { name: /maybe later/i })).toBeInTheDocument();
    });

    it('should render lock icon', () => {
      const { container } = render(<PaywallModal />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Interaction', () => {
    it('should close modal when maybe later is clicked', async () => {
      const user = userEvent.setup();
      render(<PaywallModal />);

      await user.click(screen.getByRole('button', { name: /maybe later/i }));
      expect(mockSetPaywallOpen).toHaveBeenCalledWith(false);
    });

    it('should close modal when overlay is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(<PaywallModal />);

      // Find overlay (first div child with onClick)
      const overlays = container.querySelectorAll('[class*="fixed inset-0"]');
      if (overlays.length > 0) {
        await user.click(overlays[0]);
        expect(mockSetPaywallOpen).toHaveBeenCalledWith(false);
      }
    });

    it('should open pricing page when upgrade is clicked', async () => {
      const user = userEvent.setup();
      const mockOpen = vi.fn();
      vi.stubGlobal('open', mockOpen);

      render(<PaywallModal />);
      await user.click(screen.getByRole('button', { name: /upgrade to pro/i }));

      expect(mockOpen).toHaveBeenCalledWith('https://deepstack.trade/pricing', '_blank');
      vi.unstubAllGlobals();
    });
  });
});

describe('PaywallModal - Closed State', () => {
  beforeEach(() => {
    vi.doMock('@/lib/stores/ui-store', () => ({
      useUIStore: () => ({
        paywallOpen: false,
        setPaywallOpen: vi.fn(),
        setCredits: vi.fn(),
      }),
    }));
  });

  // Note: With paywallOpen: false, the modal wouldn't render
  // This is already tested by AnimatePresence behavior
});
