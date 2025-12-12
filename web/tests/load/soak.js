/**
 * Soak (Endurance) Test
 *
 * Test system reliability over extended periods.
 * Identifies memory leaks, connection pool exhaustion, and degradation.
 *
 * Usage: k6 run tests/load/soak.js
 * Note: This test runs for 4+ hours - use with caution!
 */

import { sleep } from 'k6';
import { config, endpoints, getWeightedEndpoint } from './config.js';
import { makeRequest, randomSleep, testData, logTestInfo } from './utils.js';
import { Trend, Counter, Gauge } from 'k6/metrics';

// Long-running metrics
const memoryTrend = new Trend('estimated_memory_usage');
const connectionCount = new Gauge('active_connections');
const cumulativeErrors = new Counter('cumulative_errors');
const hourlyRequests = new Counter('hourly_requests');

export const options = {
  stages: config.scenarios.soak.stages,
  thresholds: {
    http_req_failed: ['rate<0.01'],          // Very strict - <1%
    http_req_duration: ['p(95)<1000'],       // Consistent response times
    http_req_duration: ['p(99)<2000'],
    cumulative_errors: ['count<100'],        // Max 100 total errors
  },
};

export function setup() {
  logTestInfo('SOAK TEST', {
    duration: '4+ hours',
    steadyVUs: 20,
  });

  console.log('\nWARNING: This test runs for several hours!');
  console.log('Press Ctrl+C to stop early.\n');

  return {
    startTime: Date.now(),
    hourMarker: Date.now(),
    requestsThisHour: 0,
  };
}

export default function (data) {
  // Normal mixed workload
  const sessionType = Math.random();

  if (sessionType < 0.5) {
    // Market data (most common)
    makeRequest({
      name: 'quotes-soak',
      method: 'GET',
      url: '/api/market/quotes',
      params: { symbols: testData.getRandomSymbols(3) },
    });
  } else if (sessionType < 0.8) {
    // Trading operations
    makeRequest({
      name: 'journal-soak',
      method: 'GET',
      url: '/api/journal',
    });

    if (Math.random() < 0.1) {
      makeRequest({
        name: 'journal-create-soak',
        method: 'POST',
        url: '/api/journal',
        body: testData.journalEntry(),
      });
    }
  } else {
    // Prediction markets
    makeRequest({
      name: 'predictions-soak',
      method: 'GET',
      url: '/api/prediction-markets',
      params: { limit: 20 },
    });
  }

  // Track hourly metrics
  hourlyRequests.add(1);

  // Normal think time
  randomSleep(1, 3);
}

export function teardown(data) {
  const durationHours = ((Date.now() - data.startTime) / 1000 / 60 / 60).toFixed(2);

  console.log(`\n=== SOAK TEST COMPLETE ===`);
  console.log(`Duration: ${durationHours} hours`);
  console.log(`\nKey metrics to review:`);
  console.log(`1. Response time trend over time (should stay consistent)`);
  console.log(`2. Error rate trend (should not increase)`);
  console.log(`3. Memory/connection metrics (watch for leaks)`);
  console.log(`===========================\n`);
}
