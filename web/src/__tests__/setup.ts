import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.matchMedia for components that use media queries
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock ResizeObserver
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
Object.defineProperty(window, 'ResizeObserver', { value: ResizeObserverMock });

// Mock requestAnimationFrame for store tests
Object.defineProperty(window, 'requestAnimationFrame', {
  value: (callback: FrameRequestCallback) => {
    return setTimeout(() => callback(Date.now()), 0);
  },
});

Object.defineProperty(window, 'cancelAnimationFrame', {
  value: (id: number) => clearTimeout(id),
});

// Mock IntersectionObserver
class IntersectionObserverMock {
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds: ReadonlyArray<number> = [];
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn().mockReturnValue([]);
}
Object.defineProperty(window, 'IntersectionObserver', { value: IntersectionObserverMock });

// Mock PointerEvent for Radix UI components
class PointerEventMock extends Event {
  button: number;
  pointerId: number;

  constructor(type: string, params: any = {}) {
    super(type, params);
    this.button = params.button || 0;
    this.pointerId = params.pointerId || 1;
  }
}

if (typeof window !== 'undefined') {
  (window as any).PointerEvent = PointerEventMock;
}

// Mock hasPointerCapture and pointer capture methods
if (typeof HTMLElement !== 'undefined') {
  HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
}
