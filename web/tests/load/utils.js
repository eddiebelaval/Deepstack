/**
 * Load Testing Utilities
 *
 * Helper functions for k6 load tests.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { config } from './config.js';

// Custom metrics
export const errorRate = new Rate('errors');
export const requestDuration = new Trend('request_duration');
export const requestsPerEndpoint = new Counter('requests_per_endpoint');

/**
 * Make an HTTP request with standard headers and error handling
 */
export function makeRequest(endpoint, options = {}) {
  const url = buildUrl(endpoint.url, endpoint.params);
  const headers = Object.assign(
    {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    config.authToken ? { 'Authorization': 'Bearer ' + config.authToken } : {},
    options.headers || {}
  );

  const params = {
    headers,
    tags: {
      endpoint: endpoint.name || extractEndpointName(endpoint.url),
      method: endpoint.method,
    },
    timeout: options.timeout || '30s',
  };

  let response;
  const startTime = Date.now();

  try {
    switch (endpoint.method) {
      case 'GET':
        response = http.get(url, params);
        break;
      case 'POST':
        response = http.post(url, JSON.stringify(endpoint.body || {}), params);
        break;
      case 'PUT':
        response = http.put(url, JSON.stringify(endpoint.body || {}), params);
        break;
      case 'DELETE':
        response = http.del(url, null, params);
        break;
      default:
        response = http.get(url, params);
    }
  } catch (error) {
    errorRate.add(1);
    return { error: error.message };
  }

  const duration = Date.now() - startTime;
  requestDuration.add(duration);
  requestsPerEndpoint.add(1, { endpoint: params.tags.endpoint });

  // Check response
  const success = checkResponse(response, endpoint);
  errorRate.add(!success);

  return response;
}

/**
 * Build URL with query parameters
 */
export function buildUrl(path, params = {}) {
  let url = config.baseUrl + path;

  const queryParts = [];
  for (const key in params) {
    if (params.hasOwnProperty(key)) {
      queryParts.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
    }
  }

  if (queryParts.length > 0) {
    url += '?' + queryParts.join('&');
  }

  return url;
}

/**
 * Extract endpoint name from URL path
 */
export function extractEndpointName(url) {
  const parts = url.split('/').filter(Boolean);
  return parts[parts.length - 1] || 'root';
}

/**
 * Standard response checks
 */
export function checkResponse(response, endpoint = {}) {
  const checks = {
    'status is 2xx': (r) => r.status >= 200 && r.status < 300,
    'response time < 2s': (r) => r.timings.duration < 2000,
    'has response body': (r) => r.body && r.body.length > 0,
  };

  // Add endpoint-specific checks
  if (endpoint.expectedStatus) {
    checks[`status is ${endpoint.expectedStatus}`] = (r) => r.status === endpoint.expectedStatus;
  }

  if (endpoint.validateBody) {
    checks['body validation'] = (r) => {
      try {
        const body = JSON.parse(r.body);
        return endpoint.validateBody(body);
      } catch (e) {
        return false;
      }
    };
  }

  return check(response, checks);
}

/**
 * Random sleep with jitter
 */
export function randomSleep(min = 0.5, max = 2) {
  const duration = min + Math.random() * (max - min);
  sleep(duration);
}

/**
 * Generate random test data
 */
export const testData = {
  symbols: ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'META', 'TSLA', 'NVDA', 'AMD', 'NFLX', 'SPY'],

  getRandomSymbol() {
    return this.symbols[Math.floor(Math.random() * this.symbols.length)];
  },

  getRandomSymbols(count = 3) {
    const shuffled = [...this.symbols].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count).join(',');
  },

  timeframes: ['1Min', '5Min', '15Min', '1H', '1D'],

  getRandomTimeframe() {
    return this.timeframes[Math.floor(Math.random() * this.timeframes.length)];
  },

  journalEntry() {
    return {
      symbol: this.getRandomSymbol(),
      action: Math.random() > 0.5 ? 'BUY' : 'SELL',
      quantity: Math.floor(Math.random() * 100) + 1,
      price: (Math.random() * 500 + 50).toFixed(2),
      notes: `Load test entry ${Date.now()}`,
    };
  },

  chatMessage() {
    const prompts = [
      'What is the current market sentiment?',
      'Analyze AAPL technical indicators',
      'What are the top movers today?',
      'Should I buy TSLA at current levels?',
      'What is the options flow for SPY?',
    ];
    return {
      messages: [{
        role: 'user',
        content: prompts[Math.floor(Math.random() * prompts.length)],
      }],
    };
  },
};

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Log test info
 */
export function logTestInfo(name, info = {}) {
  console.log(`\n=== ${name} ===`);
  console.log(`Base URL: ${config.baseUrl}`);
  console.log(`VUs: ${info.vus || 'N/A'}`);
  console.log(`Duration: ${info.duration || 'N/A'}`);
  console.log('==================\n');
}
