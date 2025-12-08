# Prediction Markets Integration

DeepStack's prediction market data clients for Kalshi and Polymarket.

## Overview

The prediction markets module provides a unified API to access prediction market data from:

- **Kalshi** - CFTC-regulated prediction market exchange (US-based)
- **Polymarket** - Crypto-based prediction markets (global)

## Architecture

```
┌─────────────────────────────────────────────┐
│     FastAPI Router                          │
│  /api/predictions/*                         │
└────────────┬────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────┐
│  PredictionMarketManager                    │
│  - Unified interface                        │
│  - Cross-platform aggregation               │
│  - Caching layer                            │
└─────────┬───────────────────────┬───────────┘
          │                       │
          ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│  KalshiClient    │    │ PolymarketClient │
│  - HTTP client   │    │  - HTTP client   │
│  - Rate limiting │    │  - Rate limiting │
│  - Normalization │    │  - Normalization │
└──────────────────┘    └──────────────────┘
```

## File Structure

```
core/
├── data/
│   └── prediction_markets.py       # Core clients and models
└── api/
    └── prediction_markets_router.py # FastAPI endpoints
```

## API Endpoints

### 1. Get Trending Markets

```bash
GET /api/predictions/trending?limit=20&category=politics
```

**Response:**
```json
{
  "markets": [
    {
      "id": "FED-25JAN-T0.625",
      "platform": "kalshi",
      "title": "Will the Fed cut rates to 0.625% in January 2025?",
      "category": "Economics",
      "yes_price": 0.73,
      "no_price": 0.27,
      "volume": 125000,
      "volume_24h": 15000,
      "open_interest": 50000,
      "end_date": "2025-01-31T00:00:00Z",
      "status": "active",
      "url": "https://kalshi.com/markets/FED-25JAN-T0.625",
      "description": "This market resolves to Yes if..."
    }
  ],
  "count": 20
}
```

### 2. Search Markets

```bash
GET /api/predictions/search?q=election
```

**Response:**
```json
{
  "markets": [...],
  "query": "election",
  "count": 15
}
```

### 3. Get Market Detail

```bash
GET /api/predictions/market/kalshi/FED-25JAN-T0.625
GET /api/predictions/market/polymarket/0x123abc...
```

**Response:**
```json
{
  "market": {
    "id": "FED-25JAN-T0.625",
    "platform": "kalshi",
    "title": "Will the Fed cut rates to 0.625% in January 2025?",
    ...
  }
}
```

### 4. Get Market History

```bash
GET /api/predictions/market/kalshi/FED-25JAN-T0.625/history?timeframe=1d
```

**Parameters:**
- `timeframe`: `1h`, `1d`, `1w`

**Response:**
```json
{
  "platform": "kalshi",
  "market_id": "FED-25JAN-T0.625",
  "history": [
    {
      "timestamp": "2025-01-01T12:00:00Z",
      "price": 0.72,
      "volume": 5000
    }
  ]
}
```

### 5. Get Categories

```bash
GET /api/predictions/categories
```

**Response:**
```json
{
  "kalshi": ["Economics", "Politics", "Sports"],
  "polymarket": ["Crypto", "Politics", "Sports"]
}
```

### 6. Health Check

```bash
GET /api/predictions/health
```

## Data Models

### PredictionMarket

Unified model representing a prediction market across platforms.

```python
class PredictionMarket(BaseModel):
    id: str                           # Platform-specific identifier
    platform: Platform                # KALSHI or POLYMARKET
    title: str                        # Market question/title
    category: str                     # Market category
    yes_price: float                  # Probability 0.00-1.00
    no_price: float                   # Probability 0.00-1.00
    volume: float                     # Total volume
    volume_24h: Optional[float]       # 24h volume
    open_interest: Optional[float]    # Open interest (Kalshi only)
    end_date: Optional[datetime]      # Market close date
    status: str                       # active, closed, settled
    url: str                          # Direct link to market
    description: Optional[str]        # Market description/rules
```

### Platform-Specific Formats

**Kalshi:**
- Prices: Converted from cents (0-100) to decimal (0.00-1.00)
- Market ID: Ticker format (e.g., `FED-25JAN-T0.625`)
- Rate limit: 1000 requests/hour

**Polymarket:**
- Prices: Native decimal format (0.00-1.00)
- Market ID: Condition ID (hex string)
- Rate limit: 1000 requests/hour

## Caching Strategy

### Market Data
- TTL: 5 minutes
- Cache size: 100 markets
- Key: `market:{ticker/id}`

### Quote Data
- TTL: 30 seconds
- Cache size: 500 quotes
- Key: `quote:{ticker/id}`

## Usage Examples

### Python Client

```python
from core.data.prediction_markets import PredictionMarketManager

async def get_markets():
    manager = PredictionMarketManager()

    try:
        # Get trending markets
        markets = await manager.get_trending_markets(limit=10)

        # Search across platforms
        results = await manager.search("fed rates")

        # Get market detail
        market = await manager.get_market_detail(
            Platform.KALSHI,
            "FED-25JAN-T0.625"
        )

        # Get categories
        categories = await manager.get_categories()

    finally:
        await manager.close()
```

### HTTP Request (cURL)

```bash
# Get trending markets
curl "http://localhost:8000/api/predictions/trending?limit=10"

# Search markets
curl "http://localhost:8000/api/predictions/search?q=election"

# Get market detail
curl "http://localhost:8000/api/predictions/market/kalshi/FED-25JAN-T0.625"

# Get history
curl "http://localhost:8000/api/predictions/market/kalshi/FED-25JAN-T0.625/history?timeframe=1d"

# Get categories
curl "http://localhost:8000/api/predictions/categories"

# Health check
curl "http://localhost:8000/api/predictions/health"
```

## Testing

Run the test suite:

```bash
# Install dependencies first
pip install httpx cachetools

# Run tests
python3 test_prediction_markets.py
```

## Error Handling

All API endpoints return standard error responses:

```json
{
  "detail": "Error message here"
}
```

**Status Codes:**
- `200` - Success
- `400` - Bad request (invalid parameters)
- `404` - Market not found
- `500` - Server error

## Performance Considerations

### Caching
- In-memory TTL cache reduces API calls
- Market lists cached for 5 minutes
- Individual prices cached for 30 seconds

### Rate Limiting
- Both platforms: ~1000 requests/hour
- Built-in exponential backoff (future enhancement)
- Request timestamps tracked per client

### Optimization Tips
1. Use trending endpoint instead of fetching all markets
2. Cache market IDs client-side
3. Use category filters to reduce data volume
4. Batch requests when possible

## Future Enhancements

### Phase 2 (Not Yet Implemented)
- [ ] WebSocket streaming for real-time prices
- [ ] Historical data aggregation
- [ ] Sentiment analysis from market descriptions
- [ ] Portfolio tracking (user positions)
- [ ] Price alerts and notifications
- [ ] Advanced filtering (IV rank, volume spikes, etc.)
- [ ] Market correlation analysis

### Phase 3
- [ ] Add more platforms (Manifold, Metaculus)
- [ ] ML-based price prediction
- [ ] Arbitrage detection across platforms
- [ ] Social sentiment integration

## API Documentation

Full OpenAPI documentation available at:
```
http://localhost:8000/docs#/predictions
```

## Dependencies

```txt
httpx>=0.25.0      # Async HTTP client
cachetools>=5.3.0  # In-memory caching
pydantic>=2.5.0    # Data validation
fastapi>=0.104.0   # Web framework
```

## Notes

- **No Authentication Required**: Both APIs allow public market data access
- **CORS Enabled**: API supports cross-origin requests
- **Async First**: All operations use async/await for performance
- **Type Safe**: Full Pydantic validation on all models
- **Production Ready**: Error handling, logging, health checks included

## Troubleshooting

### Markets Not Loading
1. Check internet connectivity
2. Verify API endpoints are accessible
3. Check health endpoint: `GET /api/predictions/health`

### Slow Response Times
1. Check cache TTL settings
2. Reduce limit parameter
3. Use category filters

### Invalid Market IDs
- Kalshi: Use ticker format (e.g., `FED-25JAN-T0.625`)
- Polymarket: Use condition ID (hex string from API)

## Support

For issues or questions:
1. Check API health endpoint
2. Review logs for detailed error messages
3. Verify request parameters match API spec

---

**Version**: 1.0.0
**Last Updated**: 2025-12-08
**Status**: Phase 1 Complete
