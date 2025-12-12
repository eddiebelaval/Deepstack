# DeepStack Load Testing

Comprehensive load testing suite using k6 for performance analysis and bottleneck identification.

## Installation

```bash
# macOS
brew install k6

# Windows
choco install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Docker
docker pull grafana/k6
```

## Test Types

| Test Type | Purpose | Script |
|-----------|---------|--------|
| **Smoke** | Verify system works under minimal load | `smoke.js` |
| **Load** | Assess performance under expected load | `load.js` |
| **Stress** | Find breaking point | `stress.js` |
| **Spike** | Test sudden traffic bursts | `spike.js` |
| **Soak/Endurance** | Check for memory leaks over time | `soak.js` |

## Quick Start

```bash
# Run smoke test (sanity check)
npm run load:smoke

# Run standard load test
npm run load:test

# Run stress test
npm run load:stress

# Run with HTML report
npm run load:report
```

## Test Scenarios

### API Endpoints Tested

1. **Market Data** (High frequency)
   - GET /api/market/quotes
   - GET /api/market/bars
   - GET /api/market/assets

2. **Trading Operations** (Critical path)
   - GET/POST /api/journal
   - GET/POST /api/thesis
   - POST /api/chat

3. **Prediction Markets**
   - GET /api/prediction-markets
   - GET /api/prediction-markets/search

4. **Analysis**
   - POST /api/analyze
   - POST /api/embeddings

## Performance Thresholds

| Metric | Target | Critical |
|--------|--------|----------|
| p95 Response Time | < 500ms | < 1000ms |
| p99 Response Time | < 1000ms | < 2000ms |
| Error Rate | < 1% | < 5% |
| Throughput | > 100 rps | > 50 rps |

## Environment Variables

```bash
# Required
export BASE_URL=http://localhost:3000
export K6_CLOUD_TOKEN=your-token  # For cloud runs

# Optional
export VUS=10                      # Virtual users
export DURATION=30s                # Test duration
export RAMP_UP=10s                 # Ramp up time
```

## CI/CD Integration

Tests run automatically on:
- Pull requests (smoke test only)
- Merges to main (full load test)
- Scheduled (nightly soak tests)

## Results Analysis

After running tests, check:
1. `tests/load/results/` - JSON results
2. `tests/load/reports/` - HTML reports
3. Grafana dashboard (if configured)

## Troubleshooting

### Common Issues

1. **Connection refused**: Ensure dev server is running
2. **High error rate**: Check API rate limits
3. **Memory issues**: Reduce VUs or duration
