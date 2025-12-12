/**
 * Load Testing Configuration
 *
 * Centralized configuration for all k6 load tests.
 * Environment variables override defaults.
 */

export const config = {
  // Base URL for API requests
  baseUrl: __ENV.BASE_URL || 'http://localhost:3000',

  // Authentication (if needed)
  authToken: __ENV.AUTH_TOKEN || '',

  // Default thresholds for all tests
  thresholds: {
    // HTTP request duration
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    // HTTP request failures
    http_req_failed: ['rate<0.01'],
    // Custom metrics
    'http_req_duration{endpoint:quotes}': ['p(95)<200'],
    'http_req_duration{endpoint:bars}': ['p(95)<300'],
    'http_req_duration{endpoint:chat}': ['p(95)<2000'],
  },

  // Test scenarios
  scenarios: {
    smoke: {
      vus: 1,
      duration: '30s',
    },
    load: {
      stages: [
        { duration: '2m', target: 10 },   // Ramp up
        { duration: '5m', target: 10 },   // Stay at 10 users
        { duration: '2m', target: 20 },   // Ramp to 20
        { duration: '5m', target: 20 },   // Stay at 20
        { duration: '2m', target: 0 },    // Ramp down
      ],
    },
    stress: {
      stages: [
        { duration: '2m', target: 10 },
        { duration: '5m', target: 10 },
        { duration: '2m', target: 30 },
        { duration: '5m', target: 30 },
        { duration: '2m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '2m', target: 0 },
      ],
    },
    spike: {
      stages: [
        { duration: '1m', target: 5 },    // Normal load
        { duration: '10s', target: 100 }, // Spike!
        { duration: '1m', target: 100 },  // Stay at spike
        { duration: '10s', target: 5 },   // Scale down
        { duration: '2m', target: 5 },    // Recovery
        { duration: '1m', target: 0 },    // Ramp down
      ],
    },
    soak: {
      stages: [
        { duration: '5m', target: 20 },   // Ramp up
        { duration: '4h', target: 20 },   // Sustained load
        { duration: '5m', target: 0 },    // Ramp down
      ],
    },
  },
};

// API endpoint definitions
export const endpoints = {
  // Market data endpoints (high frequency)
  market: {
    quotes: {
      method: 'GET',
      url: '/api/market/quotes',
      params: { symbols: 'AAPL,GOOGL,MSFT' },
      weight: 30,  // 30% of requests
    },
    bars: {
      method: 'GET',
      url: '/api/market/bars',
      params: { symbol: 'AAPL', timeframe: '1D', limit: 100 },
      weight: 20,
    },
    assets: {
      method: 'GET',
      url: '/api/market/assets',
      weight: 5,
    },
  },

  // Trading operations (critical path)
  trading: {
    journalGet: {
      method: 'GET',
      url: '/api/journal',
      weight: 10,
    },
    journalPost: {
      method: 'POST',
      url: '/api/journal',
      body: {
        symbol: 'AAPL',
        action: 'BUY',
        quantity: 100,
        price: 150.00,
        notes: 'Load test entry',
      },
      weight: 5,
    },
    thesisGet: {
      method: 'GET',
      url: '/api/thesis',
      weight: 5,
    },
  },

  // Prediction markets
  predictions: {
    list: {
      method: 'GET',
      url: '/api/prediction-markets',
      params: { limit: 20 },
      weight: 10,
    },
    search: {
      method: 'GET',
      url: '/api/prediction-markets/search',
      params: { q: 'election' },
      weight: 5,
    },
  },

  // Analysis (AI-powered - slower)
  analysis: {
    chat: {
      method: 'POST',
      url: '/api/chat',
      body: {
        messages: [{ role: 'user', content: 'What is the market outlook for AAPL?' }],
      },
      weight: 5,  // Lower weight - expensive operation
    },
    analyze: {
      method: 'POST',
      url: '/api/analyze',
      body: {
        symbol: 'AAPL',
        type: 'technical',
      },
      weight: 5,
    },
  },

  // Utility endpoints
  utility: {
    news: {
      method: 'GET',
      url: '/api/news',
      params: { symbols: 'AAPL' },
      weight: 5,
    },
    calendar: {
      method: 'GET',
      url: '/api/calendar',
      weight: 5,
    },
  },
};

// Helper to get random endpoint based on weight
export function getWeightedEndpoint() {
  const allEndpoints = [];

  for (const category of Object.values(endpoints)) {
    for (const [name, endpoint] of Object.entries(category)) {
      for (let i = 0; i < endpoint.weight; i++) {
        allEndpoints.push(Object.assign({ name: name }, endpoint));
      }
    }
  }

  return allEndpoints[Math.floor(Math.random() * allEndpoints.length)];
}
