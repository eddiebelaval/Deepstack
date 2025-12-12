/**
 * Spike Test
 *
 * Test system behavior under sudden traffic bursts.
 * Simulates viral content, news events, or flash sales.
 *
 * Usage: k6 run tests/load/spike.js
 */

import { sleep } from 'k6';
import { config, endpoints } from './config.js';
import { makeRequest, testData, logTestInfo } from './utils.js';
import { Trend, Counter } from 'k6/metrics';

// Metrics for spike analysis
const spikeRecoveryTime = new Trend('spike_recovery_time');
const requestsDuringSpike = new Counter('requests_during_spike');
const errorsDuringSpike = new Counter('errors_during_spike');

export const options = {
  stages: config.scenarios.spike.stages,
  thresholds: {
    http_req_failed: ['rate<0.15'],          // Allow up to 15% during spike
    http_req_duration: ['p(95)<3000'],       // 95% under 3s during spike
  },
};

export function setup() {
  logTestInfo('SPIKE TEST', {
    stages: options.stages.length,
    spikeVUs: 100,
  });
  return { startTime: Date.now(), spikeStart: null, spikeEnd: null };
}

export default function () {
  // Simulate news-driven traffic - everyone checking quotes
  const isSpike = __VU > 50;  // During spike phase

  if (isSpike) {
    requestsDuringSpike.add(1);
  }

  // Primary traffic during spike: market data
  const endpoint = isSpike
    ? {
        name: 'quotes-spike',
        method: 'GET',
        url: '/api/market/quotes',
        params: { symbols: 'AAPL,GOOGL,MSFT,AMZN,TSLA' },  // Popular symbols
      }
    : {
        name: 'quotes-normal',
        method: 'GET',
        url: '/api/market/quotes',
        params: { symbols: testData.getRandomSymbols(2) },
      };

  const response = makeRequest(endpoint);

  if (isSpike && (!response || response.status >= 400)) {
    errorsDuringSpike.add(1);
  }

  // Very short sleep during spike to simulate burst
  sleep(isSpike ? 0.05 : 0.5);
}

export function teardown(data) {
  const duration = ((Date.now() - data.startTime) / 1000).toFixed(2);
  console.log(`\n=== SPIKE TEST COMPLETE ===`);
  console.log(`Total duration: ${duration}s`);
  console.log(`Analyze spike_recovery_time metric for system resilience`);
  console.log(`============================\n`);
}
