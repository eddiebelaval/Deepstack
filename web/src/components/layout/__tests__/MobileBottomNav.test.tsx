import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileBottomNav } from '../MobileBottomNav';
import { useUIStore } from '@/lib/stores/ui-store';
import { useIsMobile } from '@/hooks/useIsMobile';

// Mock dependencies
vi.mock('@/lib/stores/ui-store');
vi.mock('@/hooks/useIsMobile');

describe('MobileBottomNav', () => {
  const mockSetActiveContent = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useUIStore as any).mockReturnValue({
      activeContent: 'none',
      setActiveContent: mockSetActiveContent,
    });

    (useIsMobile as any).mockReturnValue({
      isMobile: true,
      isTablet: false,
    });
  });

  describe('Visibility', () => {
    it('should render on mobile', () => {
      render(<MobileBottomNav />);

      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should render on tablet', () => {
      (useIsMobile as any).mockReturnValue({
        isMobile: false,
        isTablet: true,
      });

      render(<MobileBottomNav />);

      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should not render on desktop', () => {
      (useIsMobile as any).mockReturnValue({
        isMobile: false,
        isTablet: false,
      });

      render(<MobileBottomNav />);

      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    });
  });

  describe('Primary Tools', () => {
    it('should render all primary tools', () => {
      render(<MobileBottomNav />);

      expect(screen.getByText('Chart')).toBeInTheDocument();
      expect(screen.getByText('Portfolio')).toBeInTheDocument();
      expect(screen.getByText('News')).toBeInTheDocument();
      expect(screen.getByText('Calendar')).toBeInTheDocument();
      expect(screen.getByText('More')).toBeInTheDocument();
    });

    it('should activate tool when clicked', async () => {
      const user = userEvent.setup();
      render(<MobileBottomNav />);

      const chartButton = screen.getByText('Chart');
      await user.click(chartButton);

      expect(mockSetActiveContent).toHaveBeenCalledWith('chart');
    });

    it('should deactivate tool when clicked again', async () => {
      const user = userEvent.setup();
      (useUIStore as any).mockReturnValue({
        activeContent: 'chart',
        setActiveContent: mockSetActiveContent,
      });

      render(<MobileBottomNav />);

      const chartButton = screen.getByText('Chart');
      await user.click(chartButton);

      expect(mockSetActiveContent).toHaveBeenCalledWith('none');
    });

    it('should highlight active tool', () => {
      (useUIStore as any).mockReturnValue({
        activeContent: 'chart',
        setActiveContent: mockSetActiveContent,
      });

      render(<MobileBottomNav />);

      const chartButton = screen.getByText('Chart').closest('button');
      expect(chartButton).toHaveClass('text-primary');
    });
  });

  describe('More Menu', () => {
    it('should show more menu when More button is clicked', async () => {
      const user = userEvent.setup();
      render(<MobileBottomNav />);

      const moreButton = screen.getByText('More');
      await user.click(moreButton);

      expect(screen.getByText('More Tools')).toBeInTheDocument();
    });

    it('should display all secondary tools in more menu', async () => {
      const user = userEvent.setup();
      render(<MobileBottomNav />);

      const moreButton = screen.getByText('More');
      await user.click(moreButton);

      expect(screen.getByText('Screener')).toBeInTheDocument();
      expect(screen.getByText('Alerts')).toBeInTheDocument();
      expect(screen.getByText('Deep Value')).toBeInTheDocument();
      expect(screen.getByText('Hedged')).toBeInTheDocument();
      expect(screen.getByText('Options')).toBeInTheDocument();
      expect(screen.getByText('Builder')).toBeInTheDocument();
    });

    it('should close more menu when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<MobileBottomNav />);

      const moreButton = screen.getByText('More');
      await user.click(moreButton);

      expect(screen.getByText('More Tools')).toBeInTheDocument();

      const closeButton = screen.getByRole('button', { name: '' }); // X button
      await user.click(closeButton);

      expect(screen.queryByText('More Tools')).not.toBeInTheDocument();
    });

    it('should close more menu when backdrop is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(<MobileBottomNav />);

      const moreButton = screen.getByText('More');
      await user.click(moreButton);

      const backdrop = container.querySelector('.bg-black\\/50');
      if (backdrop) {
        await user.click(backdrop);
      }

      expect(screen.queryByText('More Tools')).not.toBeInTheDocument();
    });

    it('should activate secondary tool and close menu', async () => {
      const user = userEvent.setup();
      render(<MobileBottomNav />);

      const moreButton = screen.getByText('More');
      await user.click(moreButton);

      const screenerButton = screen.getByText('Screener');
      await user.click(screenerButton);

      expect(mockSetActiveContent).toHaveBeenCalledWith('screener');
      expect(screen.queryByText('More Tools')).not.toBeInTheDocument();
    });

    it('should highlight More button when menu is open', async () => {
      const user = userEvent.setup();
      render(<MobileBottomNav />);

      const moreButton = screen.getByText('More').closest('button');
      expect(moreButton).toHaveClass('text-muted-foreground');

      await user.click(moreButton!);

      expect(moreButton).toHaveClass('text-primary');
    });
  });

  describe('Active States', () => {
    it('should show active state for primary tools', () => {
      (useUIStore as any).mockReturnValue({
        activeContent: 'portfolio',
        setActiveContent: mockSetActiveContent,
      });

      render(<MobileBottomNav />);

      const portfolioButton = screen.getByText('Portfolio').closest('button');
      expect(portfolioButton).toHaveClass('text-primary');
    });

    it('should show active state for secondary tools in more menu', async () => {
      const user = userEvent.setup();
      (useUIStore as any).mockReturnValue({
        activeContent: 'screener',
        setActiveContent: mockSetActiveContent,
      });

      render(<MobileBottomNav />);

      const moreButton = screen.getByText('More');
      await user.click(moreButton);

      const screenerButton = screen.getByText('Screener').closest('button');
      expect(screenerButton).toHaveClass('bg-primary/20');
    });
  });

  describe('Accessibility', () => {
    it('should have navigation role', () => {
      render(<MobileBottomNav />);

      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should have proper tap targets', () => {
      render(<MobileBottomNav />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveClass('tap-target');
      });
    });
  });

  describe('Safe Area Support', () => {
    it('should include safe-area-bottom class', () => {
      const { container } = render(<MobileBottomNav />);

      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('safe-area-bottom');
    });
  });

  describe('Grid Layout', () => {
    it('should render secondary tools in 3-column grid', async () => {
      const user = userEvent.setup();
      const { container } = render(<MobileBottomNav />);

      const moreButton = screen.getByText('More');
      await user.click(moreButton);

      const grid = container.querySelector('.grid-cols-3');
      expect(grid).toBeInTheDocument();
    });
  });

  describe('Icon Scaling', () => {
    it('should scale active tool icons', () => {
      (useUIStore as any).mockReturnValue({
        activeContent: 'chart',
        setActiveContent: mockSetActiveContent,
      });

      render(<MobileBottomNav />);

      const chartButton = screen.getByText('Chart').closest('button');
      const icon = chartButton?.querySelector('svg');

      expect(icon).toHaveClass('scale-110');
    });

    it('should not scale inactive tool icons', () => {
      render(<MobileBottomNav />);

      const chartButton = screen.getByText('Chart').closest('button');
      const icon = chartButton?.querySelector('svg');

      expect(icon).not.toHaveClass('scale-110');
    });
  });
});
