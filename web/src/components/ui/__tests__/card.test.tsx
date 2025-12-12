import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from '../card';

describe('Card', () => {
  describe('Card', () => {
    it('renders with children', () => {
      render(<Card>Card content</Card>);
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('renders as div element', () => {
      render(<Card data-testid="card">Card</Card>);
      const card = screen.getByTestId('card');
      expect(card.tagName).toBe('DIV');
    });

    it('renders with data-slot attribute', () => {
      render(<Card data-testid="card">Card</Card>);
      expect(screen.getByTestId('card')).toHaveAttribute('data-slot', 'card');
    });

    it('has default card styles', () => {
      render(<Card data-testid="card">Card</Card>);
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('bg-card');
      expect(card).toHaveClass('text-card-foreground');
      expect(card).toHaveClass('rounded-lg');
      expect(card).toHaveClass('border');
      expect(card).toHaveClass('shadow-sm');
      expect(card).toHaveClass('living-surface');
    });

    it('merges custom className', () => {
      render(<Card className="custom-card" data-testid="card">Card</Card>);
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('custom-card');
      expect(card).toHaveClass('bg-card');
    });
  });

  describe('CardHeader', () => {
    it('renders with children', () => {
      render(<CardHeader>Header content</CardHeader>);
      expect(screen.getByText('Header content')).toBeInTheDocument();
    });

    it('renders with data-slot attribute', () => {
      render(<CardHeader data-testid="header">Header</CardHeader>);
      expect(screen.getByTestId('header')).toHaveAttribute(
        'data-slot',
        'card-header'
      );
    });

    it('has grid layout styles', () => {
      render(<CardHeader data-testid="header">Header</CardHeader>);
      const header = screen.getByTestId('header');
      expect(header).toHaveClass('grid');
      expect(header).toHaveClass('auto-rows-min');
      expect(header).toHaveClass('px-3');
    });

    it('merges custom className', () => {
      render(
        <CardHeader className="custom-header" data-testid="header">
          Header
        </CardHeader>
      );
      expect(screen.getByTestId('header')).toHaveClass('custom-header');
    });
  });

  describe('CardTitle', () => {
    it('renders with children', () => {
      render(<CardTitle>Card Title</CardTitle>);
      expect(screen.getByText('Card Title')).toBeInTheDocument();
    });

    it('renders with data-slot attribute', () => {
      render(<CardTitle data-testid="title">Title</CardTitle>);
      expect(screen.getByTestId('title')).toHaveAttribute(
        'data-slot',
        'card-title'
      );
    });

    it('has title styles', () => {
      render(<CardTitle data-testid="title">Title</CardTitle>);
      const title = screen.getByTestId('title');
      expect(title).toHaveClass('leading-none');
      expect(title).toHaveClass('font-semibold');
    });

    it('merges custom className', () => {
      render(
        <CardTitle className="custom-title" data-testid="title">
          Title
        </CardTitle>
      );
      expect(screen.getByTestId('title')).toHaveClass('custom-title');
    });
  });

  describe('CardDescription', () => {
    it('renders with children', () => {
      render(<CardDescription>Description text</CardDescription>);
      expect(screen.getByText('Description text')).toBeInTheDocument();
    });

    it('renders with data-slot attribute', () => {
      render(<CardDescription data-testid="desc">Description</CardDescription>);
      expect(screen.getByTestId('desc')).toHaveAttribute(
        'data-slot',
        'card-description'
      );
    });

    it('has description styles', () => {
      render(<CardDescription data-testid="desc">Description</CardDescription>);
      const desc = screen.getByTestId('desc');
      expect(desc).toHaveClass('text-muted-foreground');
      expect(desc).toHaveClass('text-sm');
    });

    it('merges custom className', () => {
      render(
        <CardDescription className="custom-desc" data-testid="desc">
          Description
        </CardDescription>
      );
      expect(screen.getByTestId('desc')).toHaveClass('custom-desc');
    });
  });

  describe('CardAction', () => {
    it('renders with children', () => {
      render(<CardAction>Action button</CardAction>);
      expect(screen.getByText('Action button')).toBeInTheDocument();
    });

    it('renders with data-slot attribute', () => {
      render(<CardAction data-testid="action">Action</CardAction>);
      expect(screen.getByTestId('action')).toHaveAttribute(
        'data-slot',
        'card-action'
      );
    });

    it('has grid positioning styles', () => {
      render(<CardAction data-testid="action">Action</CardAction>);
      const action = screen.getByTestId('action');
      expect(action).toHaveClass('col-start-2');
      expect(action).toHaveClass('row-span-2');
      expect(action).toHaveClass('row-start-1');
      expect(action).toHaveClass('self-start');
      expect(action).toHaveClass('justify-self-end');
    });

    it('merges custom className', () => {
      render(
        <CardAction className="custom-action" data-testid="action">
          Action
        </CardAction>
      );
      expect(screen.getByTestId('action')).toHaveClass('custom-action');
    });
  });

  describe('CardContent', () => {
    it('renders with children', () => {
      render(<CardContent>Content area</CardContent>);
      expect(screen.getByText('Content area')).toBeInTheDocument();
    });

    it('renders with data-slot attribute', () => {
      render(<CardContent data-testid="content">Content</CardContent>);
      expect(screen.getByTestId('content')).toHaveAttribute(
        'data-slot',
        'card-content'
      );
    });

    it('has padding styles', () => {
      render(<CardContent data-testid="content">Content</CardContent>);
      expect(screen.getByTestId('content')).toHaveClass('px-3');
    });

    it('merges custom className', () => {
      render(
        <CardContent className="custom-content" data-testid="content">
          Content
        </CardContent>
      );
      expect(screen.getByTestId('content')).toHaveClass('custom-content');
    });
  });

  describe('CardFooter', () => {
    it('renders with children', () => {
      render(<CardFooter>Footer content</CardFooter>);
      expect(screen.getByText('Footer content')).toBeInTheDocument();
    });

    it('renders with data-slot attribute', () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>);
      expect(screen.getByTestId('footer')).toHaveAttribute(
        'data-slot',
        'card-footer'
      );
    });

    it('has flex layout styles', () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>);
      const footer = screen.getByTestId('footer');
      expect(footer).toHaveClass('flex');
      expect(footer).toHaveClass('items-center');
      expect(footer).toHaveClass('px-3');
    });

    it('merges custom className', () => {
      render(
        <CardFooter className="custom-footer" data-testid="footer">
          Footer
        </CardFooter>
      );
      expect(screen.getByTestId('footer')).toHaveClass('custom-footer');
    });
  });

  describe('composed Card', () => {
    it('renders a complete card with all components', () => {
      render(
        <Card data-testid="card">
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card description goes here</CardDescription>
            <CardAction>
              <button>Action</button>
            </CardAction>
          </CardHeader>
          <CardContent>Main content area</CardContent>
          <CardFooter>Footer content</CardFooter>
        </Card>
      );

      expect(screen.getByTestId('card')).toBeInTheDocument();
      expect(screen.getByText('Card Title')).toBeInTheDocument();
      expect(screen.getByText('Card description goes here')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
      expect(screen.getByText('Main content area')).toBeInTheDocument();
      expect(screen.getByText('Footer content')).toBeInTheDocument();
    });

    it('maintains proper DOM hierarchy', () => {
      render(
        <Card data-testid="card">
          <CardHeader data-testid="header">
            <CardTitle data-testid="title">Title</CardTitle>
          </CardHeader>
          <CardContent data-testid="content">Content</CardContent>
        </Card>
      );

      const card = screen.getByTestId('card');
      const header = screen.getByTestId('header');
      const title = screen.getByTestId('title');
      const content = screen.getByTestId('content');

      expect(card).toContainElement(header);
      expect(header).toContainElement(title);
      expect(card).toContainElement(content);
    });
  });

  describe('HTML attributes', () => {
    it('passes through HTML attributes to Card', () => {
      render(
        <Card data-testid="card" id="my-card" role="article">
          Card
        </Card>
      );

      const card = screen.getByTestId('card');
      expect(card).toHaveAttribute('id', 'my-card');
      expect(card).toHaveAttribute('role', 'article');
    });

    it('passes through HTML attributes to CardHeader', () => {
      render(<CardHeader data-testid="header" id="header">Header</CardHeader>);
      expect(screen.getByTestId('header')).toHaveAttribute('id', 'header');
    });
  });
});
