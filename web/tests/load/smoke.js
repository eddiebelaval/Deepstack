/**
 * Smoke Test
 *
 * Quick sanity check to verify system works under minimal load.
 * Run before other tests to catch basic issues.
 *
 * Usage: k6 run tests/load/smoke.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { config, endpoints } from './config.js';
import { makeRequest, checkResponse, logTestInfo } from './utils.js';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],     // <1% errors
    http_req_duration: ['p(95)<1000'],  // 95% requests under 1s
  },
};

export function setup() {
  logTestInfo('SMOKE TEST', { vus: 1, duration: '30s' });

  // Verify base URL is reachable
  const res = http.get(config.baseUrl);
  if (res.status !== 200) {
    throw new Error(`Base URL not reachable: ${config.baseUrl} returned ${res.status}`);
  }

  console.log('Base URL verified, starting smoke test...');
  return { startTime: Date.now() };
}

export default function () {
  // Test each critical endpoint once
  const criticalEndpoints = [
    { name: 'quotes', ...endpoints.market.quotes },
    { name: 'bars', ...endpoints.market.bars },
    { name: 'journal', ...endpoints.trading.journalGet },
    { name: 'predictions', ...endpoints.predictions.list },
    { name: 'news', ...endpoints.utility.news },
  ];

  for (const endpoint of criticalEndpoints) {
    const response = makeRequest(endpoint);

    check(response, {
      [`${endpoint.name}: status 2xx`]: (r) => r.status >= 200 && r.status < 300,
      [`${endpoint.name}: response time < 1s`]: (r) => r.timings.duration < 1000,
    });

    sleep(1);
  }
}

export function teardown(data) {
  const duration = ((Date.now() - data.startTime) / 1000).toFixed(2);
  console.log(`\nSmoke test completed in ${duration}s`);
}
