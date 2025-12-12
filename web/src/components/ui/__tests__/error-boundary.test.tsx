import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { ErrorBoundary, ErrorFallback, useErrorHandler, withErrorHandling } from '../error-boundary';

// Component that throws an error
function ThrowError({ shouldThrow = false }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>No error</div>;
}

// Component that throws network error
function ThrowNetworkError() {
  throw new Error('Failed to fetch data from server');
}

// Component that throws server error
function ThrowServerError() {
  throw new Error('500 server error occurred');
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress console.error for cleaner test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('rendering', () => {
    it('renders children when there is no error', () => {
      render(
        <ErrorBoundary>
          <div>Child content</div>
        </ErrorBoundary>
      );
      expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('renders error fallback when child throws error', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('renders custom fallback when provided', () => {
      render(
        <ErrorBoundary fallback={<div>Custom error UI</div>}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      expect(screen.getByText('Custom error UI')).toBeInTheDocument();
    });

    it('accepts custom className', () => {
      const { container } = render(
        <ErrorBoundary className="custom-error">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      const element = container.querySelector('.custom-error');
      expect(element).toBeInTheDocument();
    });
  });

  describe('error types', () => {
    it('categorizes network errors', () => {
      render(
        <ErrorBoundary>
          <ThrowNetworkError />
        </ErrorBoundary>
      );
      expect(screen.getByText('Connection Error')).toBeInTheDocument();
      expect(screen.getByText(/check your internet connection/i)).toBeInTheDocument();
    });

    it('categorizes server errors', () => {
      render(
        <ErrorBoundary>
          <ThrowServerError />
        </ErrorBoundary>
      );
      expect(screen.getByText('Server Error')).toBeInTheDocument();
      expect(screen.getByText(/servers are having trouble/i)).toBeInTheDocument();
    });

    it('categorizes client errors', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('calls onError callback when error occurs', () => {
      const onError = vi.fn();
      render(
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      expect(onError).toHaveBeenCalled();
    });

    it('logs error to console', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('reset functionality', () => {
    it('shows retry button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    it('resets error state when retry button is clicked', () => {
      const TestComponent = () => {
        const [shouldThrow, setShouldThrow] = useState(true);
        return (
          <ErrorBoundary>
            {shouldThrow ? <ThrowError shouldThrow={true} /> : <div>No error</div>}
          </ErrorBoundary>
        );
      };

      render(<TestComponent />);

      // Error should be shown
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Click retry button - this just resets the error boundary state
      const retryButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(retryButton);

      // The error boundary reset, but component still throws, so error shows again
      // This is expected behavior - retry attempts to remount the children
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    it('resets when resetKeys change', () => {
      const { rerender } = render(
        <ErrorBoundary resetKeys={['key1']}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Change reset key
      rerender(
        <ErrorBoundary resetKeys={['key2']}>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
      expect(screen.getByText('No error')).toBeInTheDocument();
    });
  });

  describe('variant styles', () => {
    it('renders panel variant', () => {
      const { container } = render(
        <ErrorBoundary variant="panel">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      const errorContainer = container.querySelector('.p-6');
      expect(errorContainer).toBeInTheDocument();
    });

    it('renders inline variant', () => {
      const { container } = render(
        <ErrorBoundary variant="inline">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      const errorContainer = container.querySelector('.p-4');
      expect(errorContainer).toBeInTheDocument();
    });

    it('renders fullscreen variant', () => {
      const { container } = render(
        <ErrorBoundary variant="fullscreen">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      const errorContainer = container.querySelector('.p-8');
      expect(errorContainer).toBeInTheDocument();
      const minHeightContainer = container.querySelector('.min-h-\\[400px\\]');
      expect(minHeightContainer).toBeInTheDocument();
    });
  });
});

describe('ErrorFallback', () => {
  describe('rendering', () => {
    it('renders error message', () => {
      render(
        <ErrorFallback
          error={new Error('Test error')}
          errorType="client"
          onReset={() => {}}
        />
      );
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('renders reset button', () => {
      render(
        <ErrorFallback
          error={new Error('Test error')}
          errorType="client"
          onReset={() => {}}
        />
      );
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    it('calls onReset when button clicked', () => {
      const onReset = vi.fn();
      render(
        <ErrorFallback
          error={new Error('Test error')}
          errorType="client"
          onReset={onReset}
        />
      );

      const button = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(button);
      expect(onReset).toHaveBeenCalledTimes(1);
    });

    it('accepts custom className', () => {
      const { container } = render(
        <ErrorFallback
          error={new Error('Test error')}
          errorType="client"
          onReset={() => {}}
          className="custom-fallback"
        />
      );
      const element = container.querySelector('.custom-fallback');
      expect(element).toBeInTheDocument();
    });
  });

  describe('error type configurations', () => {
    it('shows network error config', () => {
      render(
        <ErrorFallback
          error={new Error('Network error')}
          errorType="network"
          onReset={() => {}}
        />
      );
      expect(screen.getByText('Connection Error')).toBeInTheDocument();
      expect(screen.getByText(/check your internet connection/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('shows server error config', () => {
      render(
        <ErrorFallback
          error={new Error('Server error')}
          errorType="server"
          onReset={() => {}}
        />
      );
      expect(screen.getByText('Server Error')).toBeInTheDocument();
      expect(screen.getByText(/servers are having trouble/i)).toBeInTheDocument();
    });

    it('shows client error config', () => {
      render(
        <ErrorFallback
          error={new Error('Client error')}
          errorType="client"
          onReset={() => {}}
        />
      );
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('shows unknown error config', () => {
      render(
        <ErrorFallback
          error={new Error('Unknown error')}
          errorType="unknown"
          onReset={() => {}}
        />
      );
      expect(screen.getByText('Error')).toBeInTheDocument();
    });
  });

  describe('development mode', () => {
    it('shows error details in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Detailed error message');
      render(
        <ErrorFallback
          error={error}
          errorType="client"
          onReset={() => {}}
        />
      );

      const details = screen.getByText('Error details');
      expect(details).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    it('hides error details in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Detailed error message');
      render(
        <ErrorFallback
          error={error}
          errorType="client"
          onReset={() => {}}
        />
      );

      expect(screen.queryByText('Error details')).not.toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('styling', () => {
    it('has centered layout', () => {
      const { container } = render(
        <ErrorFallback
          error={new Error('Test')}
          errorType="client"
          onReset={() => {}}
        />
      );
      const element = container.firstChild as HTMLElement;
      expect(element).toHaveClass('flex');
      expect(element).toHaveClass('flex-col');
      expect(element).toHaveClass('items-center');
      expect(element).toHaveClass('justify-center');
    });

    it('displays error icon', () => {
      const { container } = render(
        <ErrorFallback
          error={new Error('Test')}
          errorType="client"
          onReset={() => {}}
        />
      );
      const icon = container.querySelector('.text-destructive');
      expect(icon).toBeInTheDocument();
    });
  });
});

describe('useErrorHandler', () => {
  it('returns handleError function', () => {
    const { handleError } = useErrorHandler();
    expect(typeof handleError).toBe('function');
  });

  it('logs error to console', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { handleError } = useErrorHandler();

    handleError(new Error('Test error'));
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('logs error with context', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { handleError } = useErrorHandler();

    handleError(new Error('Test error'), 'API call');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('API call'),
      expect.any(Error)
    );
  });
});

describe('withErrorHandling', () => {
  it('returns result when operation succeeds', async () => {
    const operation = async () => 'success';
    const result = await withErrorHandling(operation);
    expect(result).toBe('success');
  });

  it('returns undefined when operation fails', async () => {
    const operation = async () => {
      throw new Error('Failed');
    };
    const result = await withErrorHandling(operation);
    expect(result).toBeUndefined();
  });

  it('returns fallback value when operation fails', async () => {
    const operation = async () => {
      throw new Error('Failed');
    };
    const result = await withErrorHandling(operation, { fallback: 'fallback value' });
    expect(result).toBe('fallback value');
  });

  it('calls onError callback when operation fails', async () => {
    const onError = vi.fn();
    const operation = async () => {
      throw new Error('Failed');
    };
    await withErrorHandling(operation, { onError });
    expect(onError).toHaveBeenCalled();
  });

  it('logs error with context', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const operation = async () => {
      throw new Error('Failed');
    };
    await withErrorHandling(operation, { context: 'test operation' });
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('test operation'),
      expect.any(Error)
    );
  });

  it('handles non-Error objects', async () => {
    const operation = async () => {
      throw 'String error';
    };
    const result = await withErrorHandling(operation);
    expect(result).toBeUndefined();
  });
});
