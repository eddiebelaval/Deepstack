/**
 * Test utilities for async operations
 */

/**
 * Flush all pending promises in the microtask queue
 * Useful for ensuring all async operations complete in tests
 */
export const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

/**
 * Wait for a specific amount of time
 * @param ms milliseconds to wait
 */
export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wait for condition to be true with timeout
 * @param condition Function that returns boolean
 * @param timeout Max time to wait in ms (default 3000ms)
 * @param interval Check interval in ms (default 50ms)
 */
export const waitForCondition = async (
  condition: () => boolean,
  timeout = 3000,
  interval = 50
): Promise<void> => {
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await wait(interval);
  }
};
