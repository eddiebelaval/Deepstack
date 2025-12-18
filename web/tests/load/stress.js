/**
 * Stress Test
 *
 * Find the breaking point of the system.
 * Gradually increases load until failures occur.
 *
 * Usage: k6 run tests/load/stress.js
 */

import { sleep } from 'k6';
import { config } from './config.js';
import { makeRequest, testData, logTestInfo } from './utils.js';
import { Trend, Rate } from 'k6/metrics';

// Custom metrics for stress analysis
const responseTimeAtLoad = new Trend('response_time_at_load');
const errorRateAtLoad = new Rate('error_rate_at_load');

export const options = {
  stages: config.scenarios.stress.stages,
  thresholds: {
    // More relaxed thresholds - we expect some failures
    http_req_failed: ['rate<0.1'],           // <10% errors (stress test)
    http_req_duration: ['p(95)<2000'],       // 95% < 2s
    http_req_duration: ['p(99)<5000'],       // 99% < 5s
  },
};

export function setup() {
  logTestInfo('STRESS TEST', {
    stages: options.stages.length,
    maxVUs: Math.max(...options.stages.map(s => s.target)),
  });
  return { startTime: Date.now(), errors: 0, requests: 0 };
}

export default function stressTest() {
  // High-frequency endpoint testing
  const endpoints_to_test = [
    {
      name: 'quotes-stress',
      method: 'GET',
      url: '/api/market/quotes',
      params: { symbols: testData.getRandomSymbols(5) },
    },
    {
      name: 'bars-stress',
      method: 'GET',
      url: '/api/market/bars',
      params: {
        symbol: testData.getRandomSymbol(),
        timeframe: '1Min',
        limit: 500,  // Larger payload
      },
    },
    {
      name: 'predictions-stress',
      method: 'GET',
      url: '/api/prediction-markets',
      params: { limit: 50 },  // Larger result set
    },
  ];

  // Pick random endpoint
  const endpoint = endpoints_to_test[Math.floor(Math.random() * endpoints_to_test.length)];
  const response = makeRequest(endpoint);

  // Track metrics at this load level
  if (response && !response.error) {
    responseTimeAtLoad.add(response.timings.duration);
    errorRateAtLoad.add(response.status >= 400 ? 1 : 0);
  } else {
    errorRateAtLoad.add(1);
  }

  // Minimal sleep - we're stress testing
  sleep(0.1 + Math.random() * 0.2);
}

export function teardown(data) {
  const duration = ((Date.now() - data.startTime) / 1000 / 60).toFixed(2);
  console.log(`\n=== STRESS TEST COMPLETE ===`);
  console.log(`Duration: ${duration} minutes`);
  console.log(`Check results for breaking point analysis`);
  console.log(`==============================\n`);
}
