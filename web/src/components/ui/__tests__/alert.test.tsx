import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Alert, AlertTitle, AlertDescription } from '../alert';

describe('Alert', () => {
  describe('Alert component', () => {
    it('renders with children', () => {
      render(<Alert>Alert message</Alert>);
      expect(screen.getByText('Alert message')).toBeInTheDocument();
    });

    it('renders as div element', () => {
      render(<Alert data-testid="alert">Alert</Alert>);
      const alert = screen.getByTestId('alert');
      expect(alert.tagName).toBe('DIV');
    });

    it('has role="alert" for accessibility', () => {
      render(<Alert>Alert</Alert>);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('has default alert styles', () => {
      render(<Alert data-testid="alert">Alert</Alert>);
      const alert = screen.getByTestId('alert');
      expect(alert).toHaveClass('relative');
      expect(alert).toHaveClass('w-full');
      expect(alert).toHaveClass('rounded-lg');
      expect(alert).toHaveClass('border');
      expect(alert).toHaveClass('p-4');
    });
  });

  describe('variants', () => {
    it('renders default variant', () => {
      render(
        <Alert variant="default" data-testid="alert">
          Default alert
        </Alert>
      );
      const alert = screen.getByTestId('alert');
      expect(alert).toHaveClass('bg-background');
      expect(alert).toHaveClass('text-foreground');
    });

    it('renders destructive variant', () => {
      render(
        <Alert variant="destructive" data-testid="alert">
          Error alert
        </Alert>
      );
      const alert = screen.getByTestId('alert');
      expect(alert).toHaveClass('border-destructive/50');
      expect(alert).toHaveClass('text-destructive');
    });

    it('applies default variant when no variant is specified', () => {
      render(<Alert data-testid="alert">Alert</Alert>);
      const alert = screen.getByTestId('alert');
      expect(alert).toHaveClass('bg-background');
    });
  });

  describe('AlertTitle', () => {
    it('renders title text', () => {
      render(<AlertTitle>Alert Title</AlertTitle>);
      expect(screen.getByText('Alert Title')).toBeInTheDocument();
    });

    it('renders as h5 element', () => {
      render(<AlertTitle data-testid="title">Title</AlertTitle>);
      const title = screen.getByTestId('title');
      expect(title.tagName).toBe('H5');
    });

    it('has title styles', () => {
      render(<AlertTitle data-testid="title">Title</AlertTitle>);
      const title = screen.getByTestId('title');
      expect(title).toHaveClass('mb-1');
      expect(title).toHaveClass('font-medium');
      expect(title).toHaveClass('leading-none');
      expect(title).toHaveClass('tracking-tight');
    });

    it('merges custom className', () => {
      render(
        <AlertTitle className="custom-title" data-testid="title">
          Title
        </AlertTitle>
      );
      const title = screen.getByTestId('title');
      expect(title).toHaveClass('custom-title');
      expect(title).toHaveClass('font-medium');
    });

    it('forwards ref', async () => {
      const React = await import('react');
      const ref = React.createRef<HTMLHeadingElement>();
      render(<AlertTitle ref={ref}>Title</AlertTitle>);
      expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
    });
  });

  describe('AlertDescription', () => {
    it('renders description text', () => {
      render(<AlertDescription>Alert description</AlertDescription>);
      expect(screen.getByText('Alert description')).toBeInTheDocument();
    });

    it('renders as div element', () => {
      render(<AlertDescription data-testid="desc">Description</AlertDescription>);
      const desc = screen.getByTestId('desc');
      expect(desc.tagName).toBe('DIV');
    });

    it('has description styles', () => {
      render(<AlertDescription data-testid="desc">Description</AlertDescription>);
      const desc = screen.getByTestId('desc');
      expect(desc).toHaveClass('text-sm');
    });

    it('merges custom className', () => {
      render(
        <AlertDescription className="custom-desc" data-testid="desc">
          Description
        </AlertDescription>
      );
      const desc = screen.getByTestId('desc');
      expect(desc).toHaveClass('custom-desc');
      expect(desc).toHaveClass('text-sm');
    });

    it('forwards ref', async () => {
      const React = await import('react');
      const ref = React.createRef<HTMLParagraphElement>();
      render(<AlertDescription ref={ref}>Description</AlertDescription>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('composed Alert', () => {
    it('renders complete alert with title and description', () => {
      render(
        <Alert>
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>
            Please review your changes before submitting.
          </AlertDescription>
        </Alert>
      );

      expect(screen.getByText('Warning')).toBeInTheDocument();
      expect(
        screen.getByText('Please review your changes before submitting.')
      ).toBeInTheDocument();
    });

    it('renders alert with icon', () => {
      const Icon = () => <svg data-testid="icon">Icon</svg>;

      render(
        <Alert>
          <Icon />
          <AlertTitle>Alert with icon</AlertTitle>
          <AlertDescription>Description text</AlertDescription>
        </Alert>
      );

      expect(screen.getByTestId('icon')).toBeInTheDocument();
      expect(screen.getByText('Alert with icon')).toBeInTheDocument();
    });

    it('maintains proper DOM hierarchy', () => {
      render(
        <Alert data-testid="alert">
          <AlertTitle data-testid="title">Title</AlertTitle>
          <AlertDescription data-testid="desc">Description</AlertDescription>
        </Alert>
      );

      const alert = screen.getByTestId('alert');
      const title = screen.getByTestId('title');
      const desc = screen.getByTestId('desc');

      expect(alert).toContainElement(title);
      expect(alert).toContainElement(desc);
    });

    it('renders destructive alert with all components', () => {
      render(
        <Alert variant="destructive" data-testid="alert">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Something went wrong</AlertDescription>
        </Alert>
      );

      const alert = screen.getByTestId('alert');
      expect(alert).toHaveClass('text-destructive');
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('custom className', () => {
    it('merges custom className with defaults', () => {
      render(
        <Alert className="custom-alert" data-testid="alert">
          Alert
        </Alert>
      );
      const alert = screen.getByTestId('alert');

      expect(alert).toHaveClass('custom-alert');
      expect(alert).toHaveClass('w-full');
      expect(alert).toHaveClass('rounded-lg');
    });
  });

  describe('HTML attributes', () => {
    it('passes through HTML attributes', () => {
      render(
        <Alert data-testid="alert" id="my-alert">
          Alert
        </Alert>
      );

      const alert = screen.getByTestId('alert');
      expect(alert).toHaveAttribute('id', 'my-alert');
    });

    it('maintains role="alert" even with custom attributes', () => {
      render(
        <Alert data-testid="alert" id="custom">
          Alert
        </Alert>
      );

      const alert = screen.getByTestId('alert');
      expect(alert).toHaveAttribute('role', 'alert');
    });
  });

  describe('ref forwarding', () => {
    it('forwards ref to Alert component', async () => {
      const React = await import('react');
      const ref = React.createRef<HTMLDivElement>();
      render(<Alert ref={ref}>Alert</Alert>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('icon positioning styles', () => {
    it('has styles for icon positioning', () => {
      render(<Alert data-testid="alert">Alert with icon</Alert>);
      const alert = screen.getByTestId('alert');

      // Check that the component has the SVG positioning classes
      expect(alert.className).toContain('[&>svg]:absolute');
      expect(alert.className).toContain('[&>svg]:left-4');
      expect(alert.className).toContain('[&>svg]:top-4');
    });

    it('has styles for content with icon', () => {
      render(<Alert data-testid="alert">Alert with icon</Alert>);
      const alert = screen.getByTestId('alert');

      // Check that the component has the content positioning classes
      expect(alert.className).toContain('[&>svg~*]:pl-7');
    });
  });
});
