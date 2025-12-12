import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Avatar, AvatarImage, AvatarFallback } from '../avatar';

describe('Avatar', () => {
  describe('Avatar root', () => {
    it('renders with children', () => {
      render(
        <Avatar>
          <AvatarFallback>AB</AvatarFallback>
        </Avatar>
      );
      expect(screen.getByText('AB')).toBeInTheDocument();
    });

    it('renders with data-slot attribute', () => {
      render(<Avatar data-testid="avatar" />);
      expect(screen.getByTestId('avatar')).toHaveAttribute(
        'data-slot',
        'avatar'
      );
    });

    it('has default avatar styles', () => {
      render(<Avatar data-testid="avatar" />);
      const avatar = screen.getByTestId('avatar');
      expect(avatar).toHaveClass('relative');
      expect(avatar).toHaveClass('flex');
      expect(avatar).toHaveClass('size-8');
      expect(avatar).toHaveClass('shrink-0');
      expect(avatar).toHaveClass('overflow-hidden');
      expect(avatar).toHaveClass('rounded-full');
    });

    it('merges custom className', () => {
      render(<Avatar className="custom-avatar" data-testid="avatar" />);
      const avatar = screen.getByTestId('avatar');
      expect(avatar).toHaveClass('custom-avatar');
      expect(avatar).toHaveClass('size-8');
    });

    it('supports custom size via className', () => {
      render(<Avatar className="size-12" data-testid="avatar" />);
      const avatar = screen.getByTestId('avatar');
      expect(avatar).toHaveClass('size-12');
    });
  });

  describe('AvatarImage', () => {
    it('accepts image props', () => {
      const { container } = render(
        <Avatar>
          <AvatarImage
            src="https://example.com/avatar.jpg"
            alt="Avatar"
          />
          <AvatarFallback>AB</AvatarFallback>
        </Avatar>
      );

      // Avatar component should render
      expect(container.querySelector('[data-slot="avatar"]')).toBeInTheDocument();
    });
  });

  describe('AvatarFallback', () => {
    it('renders fallback text', () => {
      render(
        <Avatar>
          <AvatarFallback>AB</AvatarFallback>
        </Avatar>
      );

      expect(screen.getByText('AB')).toBeInTheDocument();
    });

    it('renders with data-slot attribute', () => {
      render(
        <Avatar>
          <AvatarFallback data-testid="fallback">AB</AvatarFallback>
        </Avatar>
      );

      expect(screen.getByTestId('fallback')).toHaveAttribute(
        'data-slot',
        'avatar-fallback'
      );
    });

    it('has fallback styles', () => {
      render(
        <Avatar>
          <AvatarFallback data-testid="fallback">AB</AvatarFallback>
        </Avatar>
      );

      const fallback = screen.getByTestId('fallback');
      expect(fallback).toHaveClass('bg-muted');
      expect(fallback).toHaveClass('flex');
      expect(fallback).toHaveClass('size-full');
      expect(fallback).toHaveClass('items-center');
      expect(fallback).toHaveClass('justify-center');
      expect(fallback).toHaveClass('rounded-full');
    });

    it('merges custom className', () => {
      render(
        <Avatar>
          <AvatarFallback className="custom-fallback" data-testid="fallback">
            AB
          </AvatarFallback>
        </Avatar>
      );

      expect(screen.getByTestId('fallback')).toHaveClass('custom-fallback');
    });

    it('renders icon as fallback', () => {
      const Icon = () => (
        <svg data-testid="icon">
          <title>User Icon</title>
        </svg>
      );

      render(
        <Avatar>
          <AvatarFallback>
            <Icon />
          </AvatarFallback>
        </Avatar>
      );

      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });
  });

  describe('composed Avatar', () => {
    it('centers fallback content', () => {
      render(
        <Avatar>
          <AvatarFallback data-testid="fallback">AB</AvatarFallback>
        </Avatar>
      );

      const fallback = screen.getByTestId('fallback');
      expect(fallback).toHaveClass('items-center');
      expect(fallback).toHaveClass('justify-center');
    });

    it('maintains circular shape', () => {
      render(
        <Avatar data-testid="avatar">
          <AvatarFallback>AB</AvatarFallback>
        </Avatar>
      );

      expect(screen.getByTestId('avatar')).toHaveClass('rounded-full');
    });
  });

  describe('HTML attributes', () => {
    it('passes through HTML attributes to Avatar', () => {
      render(
        <Avatar data-testid="avatar" id="user-avatar">
          <AvatarFallback>AB</AvatarFallback>
        </Avatar>
      );

      expect(screen.getByTestId('avatar')).toHaveAttribute(
        'id',
        'user-avatar'
      );
    });
  });

  describe('accessibility', () => {
    it('supports aria-label on Avatar', () => {
      render(
        <Avatar aria-label="User profile picture">
          <AvatarFallback>AB</AvatarFallback>
        </Avatar>
      );

      expect(
        screen.getByLabelText('User profile picture')
      ).toBeInTheDocument();
    });
  });

  describe('different sizes', () => {
    it('can render small avatar', () => {
      render(
        <Avatar className="size-6" data-testid="avatar">
          <AvatarFallback>S</AvatarFallback>
        </Avatar>
      );

      expect(screen.getByTestId('avatar')).toHaveClass('size-6');
    });

    it('can render large avatar', () => {
      render(
        <Avatar className="size-16" data-testid="avatar">
          <AvatarFallback>L</AvatarFallback>
        </Avatar>
      );

      expect(screen.getByTestId('avatar')).toHaveClass('size-16');
    });

    it('uses default size when no size is specified', () => {
      render(
        <Avatar data-testid="avatar">
          <AvatarFallback>D</AvatarFallback>
        </Avatar>
      );

      expect(screen.getByTestId('avatar')).toHaveClass('size-8');
    });
  });
});
