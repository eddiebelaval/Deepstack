import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DisclaimerBanner } from '../disclaimer-banner';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('DisclaimerBanner', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render when not previously dismissed', () => {
      render(<DisclaimerBanner />);
      expect(screen.getByText(/Disclaimer: Research Only/i)).toBeInTheDocument();
    });

    it('should not render when previously dismissed', () => {
      localStorageMock.getItem.mockReturnValue('true');
      render(<DisclaimerBanner />);
      expect(screen.queryByText(/Disclaimer: Research Only/i)).not.toBeInTheDocument();
    });

    it('should show disclaimer text', () => {
      render(<DisclaimerBanner />);
      expect(screen.getByText(/deepstack is a financial research/i)).toBeInTheDocument();
    });

    it('should show terms and privacy links', () => {
      render(<DisclaimerBanner />);
      expect(screen.getByText('Terms')).toBeInTheDocument();
      expect(screen.getByText('Privacy')).toBeInTheDocument();
    });

    it('should show trade execution warning', () => {
      render(<DisclaimerBanner />);
      expect(screen.getByText(/This platform does NOT execute trades/i)).toBeInTheDocument();
    });
  });

  describe('Dismiss Functionality', () => {
    it('should render dismiss button', () => {
      render(<DisclaimerBanner />);
      expect(screen.getByRole('button', { name: /dismiss disclaimer/i })).toBeInTheDocument();
    });

    it('should hide banner when dismiss is clicked', async () => {
      const user = userEvent.setup();
      render(<DisclaimerBanner />);

      await user.click(screen.getByRole('button', { name: /dismiss disclaimer/i }));

      expect(screen.queryByText(/Disclaimer: Research Only/i)).not.toBeInTheDocument();
    });

    it('should save dismissed state to localStorage', async () => {
      const user = userEvent.setup();
      render(<DisclaimerBanner />);

      await user.click(screen.getByRole('button', { name: /dismiss disclaimer/i }));

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'deepstack_disclaimer_dismissed',
        'true'
      );
    });
  });

  describe('Styling', () => {
    it('should be fixed to bottom of screen', () => {
      const { container } = render(<DisclaimerBanner />);
      const banner = container.firstChild;
      expect(banner).toHaveClass('fixed', 'bottom-0');
    });

    it('should have amber color scheme', () => {
      const { container } = render(<DisclaimerBanner />);
      const banner = container.firstChild;
      expect(banner).toHaveClass('bg-amber-950/90');
    });
  });
});
