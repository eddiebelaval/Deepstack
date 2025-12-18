/**
 * CI Load Test
 *
 * Lightweight load test optimized for CI/CD pipelines.
 * Fast execution with strict thresholds for regression detection.
 *
 * Usage: k6 run tests/load/ci.js
 */

import { check, sleep } from 'k6';
import { makeRequest, testData, logTestInfo } from './utils.js';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

export const options = {
  // Quick ramp up, steady load, ramp down
  stages: [
    { duration: '30s', target: 5 },   // Ramp up
    { duration: '2m', target: 5 },    // Steady state
    { duration: '30s', target: 0 },   // Ramp down
  ],

  // Strict thresholds for CI - fail fast
  thresholds: {
    http_req_failed: ['rate<0.01'],           // <1% errors
    http_req_duration: ['p(95)<500'],         // 95% < 500ms
    http_req_duration: ['p(99)<1000'],        // 99% < 1s
    'http_req_duration{endpoint:quotes}': ['p(95)<200', 'p(99)<400'],
    'http_req_duration{endpoint:bars}': ['p(95)<300', 'p(99)<500'],
    checks: ['rate>0.95'],                    // >95% checks pass
  },

  // Output configuration
  noConnectionReuse: false,
  userAgent: 'DeepStack-LoadTest/1.0',
};

export function setup() {
  logTestInfo('CI LOAD TEST', { duration: '3m', vus: 5 });
  return { startTime: Date.now() };
}

export default function ciTest() {
  // Test critical endpoints only
  const criticalTests = [
    () => testQuotes(),
    () => testBars(),
    () => testJournal(),
    () => testPredictions(),
  ];

  // Run random critical test
  const test = criticalTests[Math.floor(Math.random() * criticalTests.length)];
  test();

  sleep(0.5 + Math.random() * 0.5);
}

function testQuotes() {
  const response = makeRequest({
    name: 'quotes',
    method: 'GET',
    url: '/api/market/quotes',
    params: { symbols: testData.getRandomSymbols(3) },
  });

  check(response, {
    'quotes: status 200': (r) => r.status === 200,
    'quotes: has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body && (Array.isArray(body) || typeof body === 'object');
      } catch {
        return false;
      }
    },
    'quotes: response < 200ms': (r) => r.timings.duration < 200,
  });
}

function testBars() {
  const response = makeRequest({
    name: 'bars',
    method: 'GET',
    url: '/api/market/bars',
    params: {
      symbol: testData.getRandomSymbol(),
      timeframe: '1D',
      limit: 50,
    },
  });

  check(response, {
    'bars: status 200': (r) => r.status === 200,
    'bars: has bars array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body && (Array.isArray(body.bars) || Array.isArray(body));
      } catch {
        return false;
      }
    },
    'bars: response < 300ms': (r) => r.timings.duration < 300,
  });
}

function testJournal() {
  const response = makeRequest({
    name: 'journal',
    method: 'GET',
    url: '/api/journal',
  });

  check(response, {
    'journal: status 200 or 401': (r) => r.status === 200 || r.status === 401,
    'journal: response < 500ms': (r) => r.timings.duration < 500,
  });
}

function testPredictions() {
  const response = makeRequest({
    name: 'predictions',
    method: 'GET',
    url: '/api/prediction-markets',
    params: { limit: 10 },
  });

  check(response, {
    'predictions: status 200': (r) => r.status === 200,
    'predictions: has markets': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body && (Array.isArray(body.markets) || Array.isArray(body));
      } catch {
        return false;
      }
    },
    'predictions: response < 500ms': (r) => r.timings.duration < 500,
  });
}

export function handleSummary(data) {
  const reportPath = 'tests/load/results';

  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    [`${reportPath}/ci-report.html`]: htmlReport(data),
    [`${reportPath}/ci-results.json`]: JSON.stringify(data, null, 2),
  };
}

export function teardown(data) {
  const duration = ((Date.now() - data.startTime) / 1000).toFixed(2);
  console.log(`\nCI Load test completed in ${duration}s`);
}
