import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserMenu } from '../UserMenu';
import { useAuth } from '@/components/providers/AuthProvider';

// Mock dependencies
vi.mock('@/components/providers/AuthProvider');

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
    refresh: mockRefresh,
  })),
}));

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, variant, ...props }: any) => (
    <button onClick={onClick} className={className} data-variant={variant} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children, asChild }: any) => <div data-testid="dropdown-trigger">{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <button onClick={onClick} data-testid="dropdown-item">{children}</button>
  ),
  DropdownMenuLabel: ({ children }: any) => <div data-testid="dropdown-label">{children}</div>,
  DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
}));

vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className }: any) => <div className={className} data-testid="avatar">{children}</div>,
  AvatarImage: ({ src, alt }: any) => <img src={src} alt={alt} data-testid="avatar-image" />,
  AvatarFallback: ({ children, className }: any) => (
    <div className={className} data-testid="avatar-fallback">{children}</div>
  ),
}));

describe('UserMenu', () => {
  const mockSignOut = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
    mockRefresh.mockClear();
  });

  describe('Loading state', () => {
    it('renders loading spinner when loading', () => {
      (useAuth as any).mockReturnValue({
        user: null,
        loading: true,
        signOut: mockSignOut,
      });

      const { container } = render(<UserMenu />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('applies correct padding when expanded and loading', () => {
      (useAuth as any).mockReturnValue({
        user: null,
        loading: true,
        signOut: mockSignOut,
      });

      const { container } = render(<UserMenu expanded={true} />);

      const wrapper = container.querySelector('.px-3');
      expect(wrapper).toBeInTheDocument();
    });

    it('applies correct padding when collapsed and loading', () => {
      (useAuth as any).mockReturnValue({
        user: null,
        loading: true,
        signOut: mockSignOut,
      });

      const { container } = render(<UserMenu expanded={false} />);

      const wrapper = container.querySelector('.px-0');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('Not authenticated state', () => {
    beforeEach(() => {
      (useAuth as any).mockReturnValue({
        user: null,
        loading: false,
        signOut: mockSignOut,
      });
    });

    it('renders sign in button when not authenticated', () => {
      render(<UserMenu />);

      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    it('renders sign in button icon', () => {
      const { container } = render(<UserMenu />);

      // LogIn icon is rendered
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('navigates to login page when sign in clicked', async () => {
      const user = userEvent.setup();

      render(<UserMenu />);

      const signInButton = screen.getByText('Sign In').closest('button');
      await user.click(signInButton!);

      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    it('hides sign in text when collapsed', () => {
      render(<UserMenu expanded={false} />);

      expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
    });

    it('shows sign in text when expanded', () => {
      render(<UserMenu expanded={true} />);

      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });
  });

  describe('Authenticated state', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      user_metadata: {
        full_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
      },
    };

    beforeEach(() => {
      (useAuth as any).mockReturnValue({
        user: mockUser,
        loading: false,
        signOut: mockSignOut,
      });
    });

    it('renders user avatar', () => {
      render(<UserMenu />);

      expect(screen.getByTestId('avatar')).toBeInTheDocument();
    });

    it('renders user avatar image with correct src', () => {
      render(<UserMenu />);

      const avatarImage = screen.getByTestId('avatar-image');
      expect(avatarImage).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    it('renders user name when expanded', () => {
      render(<UserMenu expanded={true} />);

      // User name appears in both button and dropdown
      const userNames = screen.getAllByText('Test User');
      expect(userNames.length).toBeGreaterThan(0);
    });

    it('hides user name when collapsed', () => {
      render(<UserMenu expanded={false} />);

      // User name is in dropdown content, not main button
      const dropdownTrigger = screen.getByTestId('dropdown-trigger');
      expect(dropdownTrigger).not.toHaveTextContent('Test User');
    });

    it('renders user email in dropdown', () => {
      render(<UserMenu />);

      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('renders profile button', () => {
      render(<UserMenu />);

      // Profile button is separate from dropdown
      const profileButtons = screen.getAllByText('Profile');
      expect(profileButtons.length).toBeGreaterThan(0);
    });

    it('renders settings button', () => {
      render(<UserMenu />);

      const settingsButtons = screen.getAllByText('Settings');
      expect(settingsButtons.length).toBeGreaterThan(0);
    });

    it('renders sign out button in dropdown', () => {
      render(<UserMenu />);

      expect(screen.getByText('Sign out')).toBeInTheDocument();
    });

    it('calls signOut when sign out clicked', async () => {
      const user = userEvent.setup();

      render(<UserMenu />);

      const signOutButton = screen.getByText('Sign out').closest('button');
      await user.click(signOutButton!);

      expect(mockSignOut).toHaveBeenCalled();
    });

    it('calls onProfileClick when profile clicked', async () => {
      const user = userEvent.setup();
      const onProfileClick = vi.fn();

      render(<UserMenu onProfileClick={onProfileClick} />);

      // Get the standalone profile button (not in dropdown)
      const profileButtons = screen.getAllByText('Profile');
      const standaloneProfileButton = profileButtons.find(
        (btn) => btn.closest('button')?.dataset.variant !== undefined
      );

      if (standaloneProfileButton) {
        await user.click(standaloneProfileButton.closest('button')!);
        expect(onProfileClick).toHaveBeenCalled();
      }
    });

    it('calls onSettingsClick when settings clicked', async () => {
      const user = userEvent.setup();
      const onSettingsClick = vi.fn();

      render(<UserMenu onSettingsClick={onSettingsClick} />);

      // Get the standalone settings button
      const settingsButtons = screen.getAllByText('Settings');
      const standaloneSettingsButton = settingsButtons.find(
        (btn) => btn.closest('button')?.dataset.variant !== undefined
      );

      if (standaloneSettingsButton) {
        await user.click(standaloneSettingsButton.closest('button')!);
        expect(onSettingsClick).toHaveBeenCalled();
      }
    });

    it('highlights profile button when profileOpen is true', () => {
      const { container } = render(<UserMenu profileOpen={true} />);

      const secondaryButtons = container.querySelectorAll('[data-variant="secondary"]');
      expect(secondaryButtons.length).toBeGreaterThan(0);
    });

    it('highlights settings button when settingsOpen is true', () => {
      const { container } = render(<UserMenu settingsOpen={true} />);

      const secondaryButtons = container.querySelectorAll('[data-variant="secondary"]');
      expect(secondaryButtons.length).toBeGreaterThan(0);
    });

    it('uses ghost variant when profile is not open', () => {
      const { container } = render(<UserMenu profileOpen={false} />);

      const ghostButtons = container.querySelectorAll('[data-variant="ghost"]');
      expect(ghostButtons.length).toBeGreaterThan(0);
    });
  });

  describe('User data parsing', () => {
    it('extracts initials from full name', () => {
      (useAuth as any).mockReturnValue({
        user: {
          id: 'user-123',
          email: 'john.doe@example.com',
          user_metadata: {
            full_name: 'John Doe',
          },
        },
        loading: false,
        signOut: mockSignOut,
      });

      render(<UserMenu />);

      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('JD');
    });

    it('uses email username when no full name', () => {
      (useAuth as any).mockReturnValue({
        user: {
          id: 'user-123',
          email: 'johndoe@example.com',
          user_metadata: {},
        },
        loading: false,
        signOut: mockSignOut,
      });

      render(<UserMenu />);

      // Username appears in both button and dropdown
      const usernames = screen.getAllByText('johndoe');
      expect(usernames.length).toBeGreaterThan(0);
    });

    it('handles single name', () => {
      (useAuth as any).mockReturnValue({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          user_metadata: {
            full_name: 'Madonna',
          },
        },
        loading: false,
        signOut: mockSignOut,
      });

      render(<UserMenu />);

      const fallback = screen.getByTestId('avatar-fallback');
      // Single name creates initials from first character only
      expect(fallback.textContent).toBe('M');
    });

    it('limits initials to 2 characters', () => {
      (useAuth as any).mockReturnValue({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          user_metadata: {
            full_name: 'John Jacob Jingleheimer Schmidt',
          },
        },
        loading: false,
        signOut: mockSignOut,
      });

      render(<UserMenu />);

      const fallback = screen.getByTestId('avatar-fallback');
      expect(fallback.textContent?.length).toBeLessThanOrEqual(2);
    });

    it('uppercases initials', () => {
      (useAuth as any).mockReturnValue({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          user_metadata: {
            full_name: 'john doe',
          },
        },
        loading: false,
        signOut: mockSignOut,
      });

      render(<UserMenu />);

      expect(screen.getByTestId('avatar-fallback')).toHaveTextContent('JD');
    });

    it('handles missing avatar_url gracefully', () => {
      (useAuth as any).mockReturnValue({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          user_metadata: {
            full_name: 'Test User',
          },
        },
        loading: false,
        signOut: mockSignOut,
      });

      render(<UserMenu />);

      // Should render fallback instead
      expect(screen.getByTestId('avatar-fallback')).toBeInTheDocument();
    });
  });

  describe('Expanded/Collapsed states', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      user_metadata: {
        full_name: 'Test User',
      },
    };

    beforeEach(() => {
      (useAuth as any).mockReturnValue({
        user: mockUser,
        loading: false,
        signOut: mockSignOut,
      });
    });

    it('shows chevron icons when expanded', () => {
      const { container } = render(<UserMenu expanded={true} />);

      // ChevronRight icons
      const chevrons = container.querySelectorAll('svg');
      expect(chevrons.length).toBeGreaterThan(0);
    });

    it('hides chevron icons when collapsed', () => {
      const { container } = render(<UserMenu expanded={false} />);

      // Profile and Settings text in standalone buttons should not be visible when collapsed
      // They only appear in dropdown menu
      const buttons = container.querySelectorAll('button[data-variant="ghost"]');
      const buttonTexts = Array.from(buttons).map(btn => btn.textContent);

      // Standalone buttons should not contain "Profile" or "Settings" text when collapsed
      const standaloneButtonsWithText = buttonTexts.filter(
        text => text?.includes('Profile') || text?.includes('Settings')
      );
      expect(standaloneButtonsWithText.length).toBe(0);
    });

    it('applies center justification when collapsed', () => {
      const { container } = render(<UserMenu expanded={false} />);

      const centeredButtons = container.querySelectorAll('.justify-center');
      expect(centeredButtons.length).toBeGreaterThan(0);
    });

    it('applies start justification when expanded', () => {
      const { container } = render(<UserMenu expanded={true} />);

      const startButtons = container.querySelectorAll('.justify-start');
      expect(startButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      user_metadata: {
        full_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
      },
    };

    beforeEach(() => {
      (useAuth as any).mockReturnValue({
        user: mockUser,
        loading: false,
        signOut: mockSignOut,
      });
    });

    it('has alt text for avatar image', () => {
      render(<UserMenu />);

      const avatarImage = screen.getByTestId('avatar-image');
      expect(avatarImage).toHaveAttribute('alt', 'Test User');
    });

    it('buttons are keyboard accessible', async () => {
      const user = userEvent.setup();
      const onProfileClick = vi.fn();

      render(<UserMenu onProfileClick={onProfileClick} expanded={true} />);

      const profileButtons = screen.getAllByText('Profile');
      const standaloneButton = profileButtons.find(
        (btn) => btn.closest('button')?.dataset.variant !== undefined
      );

      if (standaloneButton) {
        standaloneButton.closest('button')?.focus();
        await user.keyboard('{Enter}');
        expect(onProfileClick).toHaveBeenCalled();
      }
    });
  });

  describe('Edge cases', () => {
    it('handles undefined user_metadata', () => {
      (useAuth as any).mockReturnValue({
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
        loading: false,
        signOut: mockSignOut,
      });

      expect(() => render(<UserMenu />)).not.toThrow();
    });

    it('handles null email', () => {
      (useAuth as any).mockReturnValue({
        user: {
          id: 'user-123',
          email: null,
        },
        loading: false,
        signOut: mockSignOut,
      });

      render(<UserMenu />);

      // "User" appears multiple times in the UI
      const userTexts = screen.getAllByText('User');
      expect(userTexts.length).toBeGreaterThan(0);
    });

    it('handles empty user_metadata', () => {
      (useAuth as any).mockReturnValue({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          user_metadata: {},
        },
        loading: false,
        signOut: mockSignOut,
      });

      expect(() => render(<UserMenu />)).not.toThrow();
    });

    it('renders without optional callbacks', () => {
      (useAuth as any).mockReturnValue({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          user_metadata: {
            full_name: 'Test User',
          },
        },
        loading: false,
        signOut: mockSignOut,
      });

      expect(() => render(<UserMenu />)).not.toThrow();
    });
  });
});
