/**
 * E2E Test Utilities - Index
 *
 * Central export point for all test utilities.
 * Import everything you need from this single file.
 *
 * @example
 * ```typescript
 * import {
 *   mockMarketData,
 *   mockAccountData,
 *   expectLoadingComplete,
 *   expectMarketDataVisible,
 *   generateTestEmail,
 *   mockPortfolioData
 * } from '../utils';
 * ```
 */

// Re-export test data (use named exports to avoid conflicts)
export {
  mockUsers,
  mockMarketData as mockMarketDataSet,
  mockPortfolioData,
  mockTradeOrders,
  mockChatResponses,
  mockApiResponses,
  timeframes,
  marketRegions,
  commonTickers,
  generateTestEmail,
  generateTestUser,
  generateMarketBars,
  generateWatchlist,
  generatePositions,
  generateOrderHistory
} from './test-data';

// Re-export API mocks (functions have different names, so no conflict)
export * from './api-mocks';

// Re-export assertions
export * from './assertions';
