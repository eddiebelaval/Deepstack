/**
 * Performance Analysis & Bottleneck Detection
 *
 * Analyzes k6 test results to identify performance issues.
 * Run after load tests to get optimization recommendations.
 *
 * Usage: node tests/load/analyze.js results/load-results.json
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');

// Thresholds for bottleneck detection
const THRESHOLDS = {
  responseTime: {
    good: 200,      // ms
    acceptable: 500,
    poor: 1000,
    critical: 2000,
  },
  errorRate: {
    good: 0.01,     // 1%
    acceptable: 0.05,
    poor: 0.10,
    critical: 0.20,
  },
  throughput: {
    good: 100,      // rps
    acceptable: 50,
    poor: 20,
    critical: 10,
  },
};

function analyzeResults(resultsPath) {
  if (!fs.existsSync(resultsPath)) {
    console.error(`Results file not found: ${resultsPath}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(resultsPath, 'utf8');
  const lines = rawData.trim().split('\n');

  // Parse JSONL format (k6 JSON output)
  const metrics = {
    http_req_duration: [],
    http_req_failed: [],
    http_reqs: [],
    vus: [],
    iterations: [],
  };

  const endpoints = {};

  for (const line of lines) {
    try {
      const data = JSON.parse(line);

      if (data.type === 'Point') {
        const { metric, data: point } = data;

        if (metrics[metric]) {
          metrics[metric].push(point.value);
        }

        // Track per-endpoint metrics
        if (data.data.tags?.endpoint) {
          const endpoint = data.data.tags.endpoint;
          if (!endpoints[endpoint]) {
            endpoints[endpoint] = { durations: [], errors: 0, requests: 0 };
          }

          if (metric === 'http_req_duration') {
            endpoints[endpoint].durations.push(point.value);
            endpoints[endpoint].requests++;
          }
          if (metric === 'http_req_failed' && point.value === 1) {
            endpoints[endpoint].errors++;
          }
        }
      }
    } catch {
      // Skip non-JSON lines
    }
  }

  return { metrics, endpoints };
}

function calculateStats(values) {
  if (!values.length) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: sum / sorted.length,
    median: sorted[Math.floor(sorted.length / 2)],
    p90: sorted[Math.floor(sorted.length * 0.9)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
    count: sorted.length,
  };
}

function classifyPerformance(value, type) {
  const threshold = THRESHOLDS[type];
  if (!threshold) return 'unknown';

  if (value <= threshold.good) return 'good';
  if (value <= threshold.acceptable) return 'acceptable';
  if (value <= threshold.poor) return 'poor';
  return 'critical';
}

function identifyBottlenecks(analysis) {
  const bottlenecks = [];
  const { metrics, endpoints } = analysis;

  // Check overall response time
  const durationStats = calculateStats(metrics.http_req_duration);
  if (durationStats) {
    const classification = classifyPerformance(durationStats.p95, 'responseTime');
    if (classification === 'poor' || classification === 'critical') {
      bottlenecks.push({
        type: 'RESPONSE_TIME',
        severity: classification,
        message: `P95 response time is ${durationStats.p95.toFixed(2)}ms`,
        recommendation: 'Consider caching, query optimization, or horizontal scaling',
      });
    }
  }

  // Check error rate
  const totalRequests = metrics.http_reqs.length || 1;
  const totalErrors = metrics.http_req_failed.filter(v => v === 1).length;
  const errorRate = totalErrors / totalRequests;

  if (errorRate > THRESHOLDS.errorRate.acceptable) {
    bottlenecks.push({
      type: 'ERROR_RATE',
      severity: classifyPerformance(errorRate, 'errorRate'),
      message: `Error rate is ${(errorRate * 100).toFixed(2)}%`,
      recommendation: 'Check server logs, increase timeouts, or add retry logic',
    });
  }

  // Check per-endpoint performance
  for (const [name, data] of Object.entries(endpoints)) {
    const stats = calculateStats(data.durations);
    if (!stats) continue;

    const endpointErrorRate = data.errors / (data.requests || 1);

    if (stats.p95 > THRESHOLDS.responseTime.poor) {
      bottlenecks.push({
        type: 'SLOW_ENDPOINT',
        severity: classifyPerformance(stats.p95, 'responseTime'),
        endpoint: name,
        message: `Endpoint ${name} P95: ${stats.p95.toFixed(2)}ms`,
        recommendation: `Optimize ${name} - check database queries, external API calls`,
      });
    }

    if (endpointErrorRate > THRESHOLDS.errorRate.acceptable) {
      bottlenecks.push({
        type: 'UNRELIABLE_ENDPOINT',
        severity: classifyPerformance(endpointErrorRate, 'errorRate'),
        endpoint: name,
        message: `Endpoint ${name} error rate: ${(endpointErrorRate * 100).toFixed(2)}%`,
        recommendation: `Investigate ${name} failures - check logs and dependencies`,
      });
    }
  }

  return bottlenecks;
}

function generateReport(analysis, bottlenecks) {
  const { metrics, endpoints } = analysis;
  const durationStats = calculateStats(metrics.http_req_duration);

  console.log('\n' + '='.repeat(60));
  console.log('  LOAD TEST PERFORMANCE ANALYSIS');
  console.log('='.repeat(60));

  // Overall metrics
  console.log('\n## Overall Metrics\n');
  if (durationStats) {
    console.log(`  Total Requests: ${durationStats.count}`);
    console.log(`  Avg Response Time: ${durationStats.avg.toFixed(2)}ms`);
    console.log(`  P50 Response Time: ${durationStats.median.toFixed(2)}ms`);
    console.log(`  P95 Response Time: ${durationStats.p95.toFixed(2)}ms`);
    console.log(`  P99 Response Time: ${durationStats.p99.toFixed(2)}ms`);
    console.log(`  Max Response Time: ${durationStats.max.toFixed(2)}ms`);
  }

  const totalErrors = metrics.http_req_failed.filter(v => v === 1).length;
  const totalReqs = metrics.http_reqs.length || 1;
  console.log(`  Error Rate: ${((totalErrors / totalReqs) * 100).toFixed(2)}%`);

  // Per-endpoint breakdown
  console.log('\n## Endpoint Performance\n');
  const endpointTable = [];
  for (const [name, data] of Object.entries(endpoints)) {
    const stats = calculateStats(data.durations);
    if (stats) {
      endpointTable.push({
        endpoint: name,
        requests: data.requests,
        avgMs: stats.avg.toFixed(1),
        p95Ms: stats.p95.toFixed(1),
        errors: data.errors,
        errorRate: ((data.errors / data.requests) * 100).toFixed(1) + '%',
      });
    }
  }

  console.table(endpointTable);

  // Bottlenecks
  if (bottlenecks.length > 0) {
    console.log('\n## Bottlenecks Detected\n');
    for (const bottleneck of bottlenecks) {
      const icon = bottleneck.severity === 'critical' ? '🔴' :
                   bottleneck.severity === 'poor' ? '🟠' : '🟡';
      console.log(`  ${icon} [${bottleneck.severity.toUpperCase()}] ${bottleneck.type}`);
      console.log(`     ${bottleneck.message}`);
      console.log(`     → ${bottleneck.recommendation}`);
      console.log();
    }
  } else {
    console.log('\n## No Bottlenecks Detected ✅\n');
    console.log('  System is performing within acceptable thresholds.');
  }

  // Recommendations
  console.log('\n## Optimization Recommendations\n');
  console.log('  1. Consider Redis caching for frequently accessed endpoints');
  console.log('  2. Implement connection pooling for database connections');
  console.log('  3. Add CDN for static assets');
  console.log('  4. Review N+1 queries in slow endpoints');
  console.log('  5. Implement rate limiting to prevent abuse');

  console.log('\n' + '='.repeat(60) + '\n');
}

// Main execution
const args = process.argv.slice(2);
const resultsPath = args[0] || 'tests/load/results/load-results.json';

console.log(`Analyzing: ${resultsPath}`);
const analysis = analyzeResults(resultsPath);
const bottlenecks = identifyBottlenecks(analysis);
generateReport(analysis, bottlenecks);

// Exit with error if critical bottlenecks found
const criticalCount = bottlenecks.filter(b => b.severity === 'critical').length;
if (criticalCount > 0) {
  console.error(`Found ${criticalCount} critical bottleneck(s)`);
  process.exit(1);
}
