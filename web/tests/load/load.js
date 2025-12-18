/**
 * Load Test
 *
 * Assess system performance under expected normal load.
 * Simulates typical user behavior with realistic traffic patterns.
 *
 * Usage: k6 run tests/load/load.js
 */

import { config } from './config.js';
import { makeRequest, randomSleep, testData, logTestInfo } from './utils.js';

export const options = {
  stages: config.scenarios.load.stages,
  thresholds: {
    http_req_failed: ['rate<0.01'],           // <1% errors
    http_req_duration: ['p(95)<500'],         // 95% < 500ms
    'http_req_duration{endpoint:quotes}': ['p(95)<200'],
    'http_req_duration{endpoint:bars}': ['p(95)<300'],
    'http_req_duration{endpoint:chat}': ['p(95)<5000'],  // Chat is slower (AI)
    errors: ['rate<0.05'],                    // Custom error rate < 5%
  },
};

export function setup() {
  logTestInfo('LOAD TEST', { stages: options.stages.length });
  return { startTime: Date.now() };
}

export default function loadTest() {
  // Simulate realistic user session
  const sessionType = Math.random();

  if (sessionType < 0.4) {
    // 40% - Market data watchers (frequent quote checks)
    marketWatcherSession();
  } else if (sessionType < 0.7) {
    // 30% - Active traders (journal + thesis)
    traderSession();
  } else if (sessionType < 0.9) {
    // 20% - Prediction market users
    predictionSession();
  } else {
    // 10% - AI analysis users
    analysisSession();
  }
}

function marketWatcherSession() {
  // Check quotes multiple times
  for (let i = 0; i < 5; i++) {
    makeRequest({
      name: 'quotes',
      method: 'GET',
      url: '/api/market/quotes',
      params: { symbols: testData.getRandomSymbols(3) },
    });
    randomSleep(0.5, 1);
  }

  // Get bar data for a symbol
  makeRequest({
    name: 'bars',
    method: 'GET',
    url: '/api/market/bars',
    params: {
      symbol: testData.getRandomSymbol(),
      timeframe: testData.getRandomTimeframe(),
      limit: 100,
    },
  });

  randomSleep(1, 2);
}

function traderSession() {
  // Get journal entries
  makeRequest({
    name: 'journal-list',
    method: 'GET',
    url: '/api/journal',
  });
  randomSleep(0.5, 1);

  // Get thesis entries
  makeRequest({
    name: 'thesis-list',
    method: 'GET',
    url: '/api/thesis',
  });
  randomSleep(1, 2);

  // Maybe add a journal entry (20% chance)
  if (Math.random() < 0.2) {
    makeRequest({
      name: 'journal-create',
      method: 'POST',
      url: '/api/journal',
      body: testData.journalEntry(),
    });
  }

  randomSleep(1, 3);
}

function predictionSession() {
  // Browse prediction markets
  makeRequest({
    name: 'predictions-list',
    method: 'GET',
    url: '/api/prediction-markets',
    params: { limit: 20 },
  });
  randomSleep(1, 2);

  // Search for specific markets
  const searchTerms = ['election', 'crypto', 'sports', 'fed', 'bitcoin'];
  makeRequest({
    name: 'predictions-search',
    method: 'GET',
    url: '/api/prediction-markets/search',
    params: { q: searchTerms[Math.floor(Math.random() * searchTerms.length)] },
  });
  randomSleep(1, 3);

  // Get new markets
  makeRequest({
    name: 'predictions-new',
    method: 'GET',
    url: '/api/prediction-markets/new',
    params: { limit: 10 },
  });

  randomSleep(2, 4);
}

function analysisSession() {
  // Get news first
  makeRequest({
    name: 'news',
    method: 'GET',
    url: '/api/news',
    params: { symbols: testData.getRandomSymbol() },
  });
  randomSleep(1, 2);

  // Use AI chat (expensive operation - rate limited)
  if (Math.random() < 0.3) {  // Only 30% actually use chat
    makeRequest({
      name: 'chat',
      method: 'POST',
      url: '/api/chat',
      body: testData.chatMessage(),
    });
    randomSleep(3, 5);  // Longer wait after AI request
  }

  // Run analysis
  makeRequest({
    name: 'analyze',
    method: 'POST',
    url: '/api/analyze',
    body: {
      symbol: testData.getRandomSymbol(),
      type: 'technical',
    },
  });

  randomSleep(2, 4);
}

export function teardown(data) {
  const duration = ((Date.now() - data.startTime) / 1000 / 60).toFixed(2);
  console.log(`\nLoad test completed in ${duration} minutes`);
}
