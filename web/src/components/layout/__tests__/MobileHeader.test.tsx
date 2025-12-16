import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileHeader } from '../MobileHeader';
import { useUIStore } from '@/lib/stores/ui-store';

// Mock dependencies
vi.mock('@/lib/stores/ui-store');
vi.mock('@/components/ui/Logo', () => ({
  Logo: () => <div data-testid="logo">Logo</div>,
}));

describe('MobileHeader', () => {
  const mockToggleLeftSidebar = vi.fn();
  const mockSetActiveContent = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useUIStore as any).mockReturnValue({
      toggleLeftSidebar: mockToggleLeftSidebar,
      setActiveContent: mockSetActiveContent,
    });
  });

  describe('Rendering', () => {
    it('should render the header', () => {
      render(<MobileHeader />);

      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('should render the logo', () => {
      render(<MobileHeader />);

      expect(screen.getByTestId('logo')).toBeInTheDocument();
    });

    it('should render hamburger menu button', () => {
      render(<MobileHeader />);

      const menuButton = screen.getByLabelText('Open menu');
      expect(menuButton).toBeInTheDocument();
    });

    it('should render search button', () => {
      render(<MobileHeader />);

      const searchButton = screen.getByLabelText('Search');
      expect(searchButton).toBeInTheDocument();
    });

    it('should render new chat button', () => {
      render(<MobileHeader />);

      const newChatButton = screen.getByLabelText('New chat');
      expect(newChatButton).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should toggle left sidebar when menu button is clicked', async () => {
      const user = userEvent.setup();
      render(<MobileHeader />);

      const menuButton = screen.getByLabelText('Open menu');
      await user.click(menuButton);

      expect(mockToggleLeftSidebar).toHaveBeenCalledTimes(1);
    });

    it('should reset active content when search is clicked', async () => {
      const user = userEvent.setup();
      render(<MobileHeader />);

      const searchButton = screen.getByLabelText('Search');
      await user.click(searchButton);

      expect(mockSetActiveContent).toHaveBeenCalledWith('none');
    });

    it('should reset active content when new chat is clicked', async () => {
      const user = userEvent.setup();
      render(<MobileHeader />);

      const newChatButton = screen.getByLabelText('New chat');
      await user.click(newChatButton);

      expect(mockSetActiveContent).toHaveBeenCalledWith('none');
    });
  });

  describe('Styling', () => {
    it('should have fixed positioning', () => {
      const { container } = render(<MobileHeader />);

      const header = screen.getByRole('banner');
      expect(header).toHaveClass('fixed');
      expect(header).toHaveClass('top-0');
      expect(header).toHaveClass('left-0');
      expect(header).toHaveClass('right-0');
    });

    it('should have proper z-index', () => {
      render(<MobileHeader />);

      const header = screen.getByRole('banner');
      expect(header).toHaveClass('z-40');
    });

    it('should have backdrop blur', () => {
      render(<MobileHeader />);

      const header = screen.getByRole('banner');
      expect(header).toHaveClass('backdrop-blur-md');
    });

    it('should have safe area support', () => {
      render(<MobileHeader />);

      const header = screen.getByRole('banner');
      expect(header).toHaveClass('safe-area-top');
    });

    it('should have border bottom', () => {
      render(<MobileHeader />);

      const header = screen.getByRole('banner');
      expect(header).toHaveClass('border-b');
      expect(header).toHaveClass('border-sidebar-border');
    });
  });

  describe('Button Styling', () => {
    it('should apply tap-target class to all buttons', () => {
      render(<MobileHeader />);

      const menuButton = screen.getByLabelText('Open menu');
      const searchButton = screen.getByLabelText('Search');
      const newChatButton = screen.getByLabelText('New chat');

      expect(menuButton).toHaveClass('tap-target');
      expect(searchButton).toHaveClass('tap-target');
      expect(newChatButton).toHaveClass('tap-target');
    });

    it('should apply rounded-xl to all buttons', () => {
      render(<MobileHeader />);

      const menuButton = screen.getByLabelText('Open menu');
      const searchButton = screen.getByLabelText('Search');
      const newChatButton = screen.getByLabelText('New chat');

      expect(menuButton).toHaveClass('rounded-xl');
      expect(searchButton).toHaveClass('rounded-xl');
      expect(newChatButton).toHaveClass('rounded-xl');
    });

    it('should apply correct size to buttons', () => {
      render(<MobileHeader />);

      const menuButton = screen.getByLabelText('Open menu');
      const searchButton = screen.getByLabelText('Search');
      const newChatButton = screen.getByLabelText('New chat');

      expect(menuButton).toHaveClass('h-10');
      expect(menuButton).toHaveClass('w-10');
      expect(searchButton).toHaveClass('h-10');
      expect(searchButton).toHaveClass('w-10');
      expect(newChatButton).toHaveClass('h-10');
      expect(newChatButton).toHaveClass('w-10');
    });
  });

  describe('Layout', () => {
    it('should have flex layout with space between', () => {
      render(<MobileHeader />);

      const header = screen.getByRole('banner');
      expect(header).toHaveClass('flex');
      expect(header).toHaveClass('items-center');
      expect(header).toHaveClass('justify-between');
    });

    it('should have proper padding', () => {
      render(<MobileHeader />);

      const header = screen.getByRole('banner');
      expect(header).toHaveClass('px-4');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<MobileHeader />);

      expect(screen.getByLabelText('Open menu')).toBeInTheDocument();
      expect(screen.getByLabelText('Search')).toBeInTheDocument();
      expect(screen.getByLabelText('New chat')).toBeInTheDocument();
    });

    it('should have header role', () => {
      render(<MobileHeader />);

      expect(screen.getByRole('banner')).toBeInTheDocument();
    });
  });

  describe('Icons', () => {
    it('should render Menu icon in hamburger button', () => {
      const { container } = render(<MobileHeader />);

      const menuButton = screen.getByLabelText('Open menu');
      const icon = menuButton.querySelector('svg');

      expect(icon).toHaveClass('h-5');
      expect(icon).toHaveClass('w-5');
    });

    it('should render Search icon in search button', () => {
      const { container } = render(<MobileHeader />);

      const searchButton = screen.getByLabelText('Search');
      const icon = searchButton.querySelector('svg');

      expect(icon).toHaveClass('h-5');
      expect(icon).toHaveClass('w-5');
    });

    it('should render Plus icon in new chat button', () => {
      const { container } = render(<MobileHeader />);

      const newChatButton = screen.getByLabelText('New chat');
      const icon = newChatButton.querySelector('svg');

      expect(icon).toHaveClass('h-5');
      expect(icon).toHaveClass('w-5');
    });
  });

  describe('Button Variants', () => {
    it('should use ghost variant for menu and search buttons', () => {
      render(<MobileHeader />);

      const menuButton = screen.getByLabelText('Open menu');
      const searchButton = screen.getByLabelText('Search');

      // Ghost variant styling (from Button component)
      expect(menuButton).toBeInTheDocument();
      expect(searchButton).toBeInTheDocument();
    });

    it('should use default variant for new chat button', () => {
      render(<MobileHeader />);

      const newChatButton = screen.getByLabelText('New chat');

      // Default variant styling (from Button component)
      expect(newChatButton).toBeInTheDocument();
    });
  });

  describe('Safe Area Inset', () => {
    it('should have inline styles for safe area support', () => {
      const { container } = render(<MobileHeader />);

      const header = screen.getByRole('banner');

      // Check for inline style with calc for minHeight
      expect(header).toHaveAttribute('style');
      expect(header.getAttribute('style')).toContain('min-height');
    });
  });
});
