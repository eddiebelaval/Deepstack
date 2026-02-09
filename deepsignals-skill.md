# DeepSignals API — Market Intelligence Signals

> Free, open-source alternative to Unusual Whales. Built on public data.

## Overview

DeepSignals is the market intelligence layer of the DeepStack Trading System. It aggregates options flow, gamma exposure, dark pool activity, insider trading, congressional disclosures, implied volatility, and sentiment into a unified REST API. Every data source is either free (CBOE, FINRA, SEC EDGAR) or low-cost (Alpaca, Quiver), making institutional-grade signal intelligence accessible without an Unusual Whales subscription.

## Base URL

- **Development:** `http://localhost:8000/api/signals`
- **Production:** `https://api.deepstack.trade/api/signals`

All endpoints are prefixed with `/api/signals`. Authentication is handled at the application level via the credits system (all signal endpoints are currently free-tier).

---

## Data Sources

| Source | Client | Data | Auth Required |
|--------|--------|------|---------------|
| **CBOE** | `CBOEClient` | Put/call ratios (equity, index, total) | No (free CSV) |
| **FINRA** | `FINRAClient` | Daily short sale volume / dark pool proxy | No (free, no auth) |
| **SEC EDGAR** | `SECEdgarClient` | Form 4 insider trading filings | No (free, User-Agent required) |
| **Quiver Quantitative** | `QuiverClient` | Congressional trading (STOCK Act disclosures) | Yes (free tier, API key) |
| **Alpaca Markets** | `AlpacaOptionsClient` | Options chains, greeks, volume, OI | Yes (API key + secret) |

All clients use aiohttp with sliding-window rate limiting, exponential backoff retry, and dict-based caching with TTL timestamps.

---

## Rate Limits & Caching

| Source | Rate Limit | Cache TTL | Notes |
|--------|-----------|-----------|-------|
| Alpaca | Per API key tier | 5 min | Options chain data for flow, GEX, sentiment, IV |
| CBOE | No explicit limit (public CSV) | 5 min | Put/call ratios updated daily |
| FINRA | No explicit limit (public endpoint) | 60 min | Short volume published T+1 |
| SEC EDGAR | 10 requests/sec | 30 min | Must include `User-Agent: DeepStack/1.0` header |
| Quiver | Per API key tier | 60 min | Congressional disclosures lag 45 days |

HTTP response caching is also applied at the API layer:
- Flow, GEX, Sentiment, IV endpoints: `Cache-Control: public, max-age=300` (5 min)
- Dark pool, Insider, Congress endpoints: `Cache-Control: public, max-age=3600` (60 min)

---

## API Endpoints

### 1. GET /api/signals/flow

Get recent options flow alerts for a symbol.

**Query Parameters:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `ticker` | string | Yes | - | Stock symbol |
| `limit` | int | No | 50 | Max alerts (1-500) |

**Response:** `List[FlowAlertResponse]`
```json
[
  {
    "id": "uuid",
    "symbol": "AAPL",
    "alert_type": "volume_spike",
    "option_type": "call",
    "strike": 200.0,
    "expiry": "2026-03-21",
    "volume": 15000,
    "open_interest": 2000,
    "volume_oi_ratio": 7.5,
    "premium": 450000.0,
    "confidence": 72,
    "detected_at": "2026-02-08T14:30:00",
    "metadata": null
  }
]
```

**Cache:** 5 minutes

---

### 2. GET /api/signals/flow/summary

Get aggregated flow summary for a symbol.

**Query Parameters:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `ticker` | string | Yes | - | Stock symbol |

**Response:** `FlowSummaryResponse`
```json
{
  "symbol": "AAPL",
  "total_alerts": 12,
  "call_flow": 85000,
  "put_flow": 32000,
  "net_flow": 1250000.0,
  "dominant_side": "bullish",
  "top_strikes": [
    {
      "strike": 200.0,
      "type": "call",
      "volume": 15000,
      "premium": 450000.0
    }
  ],
  "summary_period": "24h"
}
```

`dominant_side` is derived from bullish/bearish scores: "bullish" if bullish_score > 60, "bearish" if bearish_score > 60, else "neutral".

**Cache:** 5 minutes

---

### 3. GET /api/signals/gex

Get GEX (Gamma Exposure) data by strike for a symbol.

**Query Parameters:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `ticker` | string | Yes | - | Stock symbol |

**Response:** `GEXDataResponse`
```json
{
  "symbol": "AAPL",
  "total_gex": 125000000.0,
  "call_gex": 200000000.0,
  "put_gex": -75000000.0,
  "net_gex": 125000000.0,
  "gex_by_strike": [
    {
      "strike": 200.0,
      "call_gex": 50000000.0,
      "put_gex": -12000000.0,
      "total_gex": 38000000.0,
      "call_oi": 25000,
      "put_oi": 8000
    }
  ],
  "flip_point": 195.50,
  "timestamp": "2026-02-08T14:30:00"
}
```

Positive `total_gex` = long gamma regime (mean-reverting). Negative = short gamma (trending).

**Cache:** 5 minutes

---

### 4. GET /api/signals/gex/levels

Get key GEX levels: gamma flip, call wall, put wall, max gamma strike.

**Query Parameters:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `ticker` | string | Yes | - | Stock symbol |

**Response:** `GEXLevelsResponse`
```json
{
  "symbol": "AAPL",
  "gamma_flip": 195.50,
  "call_wall": 210.0,
  "put_wall": 185.0,
  "max_gamma_strike": 200.0,
  "key_levels": [
    {
      "strike": 200.0,
      "total_gex": 38000000.0,
      "type": "call_wall"
    }
  ],
  "timestamp": "2026-02-08T14:30:00"
}
```

- **Call wall**: Strike with highest positive GEX (resistance from dealer selling)
- **Put wall**: Strike with most negative GEX (support from dealer buying)
- **Max gamma strike**: Highest absolute GEX (strongest dealer hedging activity)

**Cache:** 5 minutes

---

### 5. GET /api/signals/darkpool

Get FINRA short volume data for a symbol.

**Query Parameters:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `ticker` | string | Yes | - | Stock symbol |
| `days` | int | No | 30 | Days of history (1-365) |

**Response:** `List[DarkPoolEntryResponse]`
```json
[
  {
    "symbol": "AAPL",
    "date": "2026-02-07",
    "short_volume": 12500000,
    "short_exempt_volume": 50000,
    "total_volume": 25000000,
    "short_ratio": 0.5000,
    "market": "NYSE"
  }
]
```

Short ratios above 0.50 indicate elevated short interest. Sustained high ratios may indicate dark pool accumulation or bearish positioning.

**Cache:** 60 minutes

---

### 6. GET /api/signals/darkpool/top

Get top symbols by dark pool short ratio (today's most shorted).

**Query Parameters:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `limit` | int | No | 20 | Max symbols (1-100) |

**Response:** `List[DarkPoolTopResponse]`
```json
[
  {
    "symbol": "GME",
    "short_ratio": 0.7200,
    "short_volume": 8500000,
    "total_volume": 11800000,
    "date": "2026-02-07"
  }
]
```

**Cache:** 60 minutes

---

### 7. GET /api/signals/insider

Get SEC Form 4 insider trades for a symbol.

**Query Parameters:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `ticker` | string | Yes | - | Stock symbol |
| `limit` | int | No | 50 | Max trades (1-500) |

**Response:** `List[InsiderTradeResponse]`
```json
[
  {
    "id": "uuid",
    "filer_name": "John Smith",
    "filer_cik": "0001234567",
    "company": "Apple Inc.",
    "symbol": "AAPL",
    "filing_date": "2026-02-05",
    "transaction_type": "buy",
    "shares": 10000.0,
    "price_per_share": 195.50,
    "total_value": 1955000.0,
    "ownership_type": "direct",
    "source_url": "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=..."
  }
]
```

Cluster buying (3+ distinct insiders purchasing within a short window) is one of the strongest conviction signals in value investing.

**Cache:** 60 minutes

---

### 8. GET /api/signals/congress

Get congressional trading disclosures (STOCK Act) for a symbol.

**Query Parameters:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `ticker` | string | Yes | - | Stock symbol |
| `limit` | int | No | 50 | Max trades (1-500) |

**Response:** `List[CongressTradeResponse]`
```json
[
  {
    "id": "uuid",
    "politician": "Nancy Pelosi",
    "party": "Democrat",
    "chamber": "House",
    "state": "CA",
    "symbol": "AAPL",
    "company_name": "Apple Inc.",
    "transaction_type": "purchase",
    "transaction_date": "2026-01-15",
    "disclosure_date": "2026-02-01",
    "amount_min": 500001.0,
    "amount_max": 1000000.0
  }
]
```

STOCK Act disclosures have a 45-day reporting lag. The `disclosure_date` minus `transaction_date` delta reveals the information asymmetry window.

**Cache:** 60 minutes

---

### 9. GET /api/signals/sentiment/market

Get broad market sentiment overview.

**Query Parameters:** None

**Response:** `MarketSentimentResponse`
```json
{
  "overall_score": -40.0,
  "put_call_ratio": 1.05,
  "vix_level": null,
  "dark_pool_aggregate": null,
  "insider_aggregate": null,
  "congress_aggregate": null,
  "top_bullish": [],
  "top_bearish": [],
  "timestamp": "2026-02-08T14:30:00"
}
```

`overall_score` maps from sentiment labels: extreme_greed=80, greed=40, neutral=0, fear=-40, extreme_fear=-80.

**Cache:** 5 minutes

---

### 10. GET /api/signals/sentiment

Get aggregated sentiment for a specific symbol.

**Query Parameters:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `ticker` | string | Yes | - | Stock symbol |

**Response:** `SentimentResponse`
```json
{
  "symbol": "AAPL",
  "overall_score": 65.0,
  "dark_pool_signal": null,
  "insider_signal": null,
  "congress_signal": null,
  "flow_signal": "bullish",
  "components": {
    "flow_bullish": 72,
    "flow_bearish": 35,
    "put_call_ratio": 0.65,
    "net_premium": 1250000.0,
    "call_volume": 85000,
    "put_volume": 32000
  },
  "timestamp": "2026-02-08T14:30:00"
}
```

`flow_signal` is derived: "bullish" if (bullish - bearish) > 30, "bearish" if < -30, else "neutral".

**Cache:** 5 minutes

---

### 11. GET /api/signals/iv

Get implied volatility data, percentile, and rank for a symbol.

**Query Parameters:**
| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `ticker` | string | Yes | - | Stock symbol |

**Response:** `IVDataResponse`
```json
{
  "symbol": "AAPL",
  "current_iv": 0.285,
  "iv_percentile": 72.0,
  "iv_rank": 45.0,
  "iv_high_52w": 0.52,
  "iv_low_52w": 0.18,
  "history": [
    {"date": "2026-02-07", "iv": 0.28},
    {"date": "2026-02-06", "iv": 0.27}
  ],
  "timestamp": "2026-02-08T14:30:00"
}
```

- **IV percentile > 80**: Options are expensive relative to history. Consider selling premium.
- **IV percentile < 20**: Options are cheap. Consider buying premium ahead of catalysts.
- **IV rank** normalizes within the 52-week high/low range.

History returns up to 60 days of daily IV snapshots.

**Cache:** 5 minutes

---

## Strategy Integration

DeepSignals feeds into three strategy engines:

### Squeeze Hunter (`core/strategies/squeeze_hunter.py`)
`enhance_with_signals()` adjusts squeeze opportunity scores:
- Short gamma regime (GEX): +10 (trending = squeeze-friendly)
- OTM call sweeps (flow): +15 (smart money positioning)
- Bearish put flow: -10 (headwind)

### Deep Value (`core/strategies/deep_value.py`)
`enhance_with_insider_signal()` adjusts value opportunity scores:
- Cluster buying (3+ distinct insiders): +15
- Single/double insider buys: +10
- Insider sells present: -5

### Hedged Position (`core/strategies/hedged_position.py`)
`adjust_for_gex_regime()` modifies position management:
- Short gamma: Widen tactical exit targets by 20%, shift to 70/30 conviction/tactical
- Long gamma: Tighten tactical targets by 10%, shift to 55/45 conviction/tactical

---

## Error Handling

All endpoints return standard HTTP error codes:
- `404`: No options data found for the requested symbol
- `500`: Internal server error (check logs)
- `503`: Data source not configured (missing API keys)

Error responses follow the format:
```json
{"detail": "Error description"}
```

---

## Environment Variables

| Variable | Required For | Description |
|----------|-------------|-------------|
| `ALPACA_API_KEY` | Flow, GEX, Sentiment, IV | Alpaca Markets API key |
| `ALPACA_SECRET_KEY` | Flow, GEX, Sentiment, IV | Alpaca Markets secret key |
| `ALPACA_OPTIONS_FEED` | Flow, GEX, Sentiment, IV | Options feed tier (default: "indicative") |
| `QUIVER_API_KEY` | Congress | Quiver Quantitative API key |
| `SUPABASE_URL` | IV | Supabase project URL (for IV persistence) |
| `SUPABASE_SERVICE_KEY` | IV | Supabase service role key |

SEC EDGAR and FINRA endpoints are free public APIs that do not require API keys, but EDGAR requires a User-Agent header identifying the application (`DeepStack/1.0`).

---

## Signal Methodology

### Gamma Exposure (GEX)

**Formula:**
- `call_gex = gamma x OI x 100 x spot_price`
- `put_gex = gamma x OI x 100 x spot_price x -1`

**Regimes:**
- Positive total GEX = **long gamma** (mean-reverting). Dealers sell rallies, buy dips.
- Negative total GEX = **short gamma** (trending). Dealers buy rallies, sell dips.

**Flip point:** Linear interpolation between adjacent strikes where cumulative GEX changes sign. Price above flip = long gamma territory; below = short gamma.

**Key levels:**
- Call wall: Strike with highest positive GEX (dealer resistance)
- Put wall: Strike with most negative GEX (dealer support)
- Max gamma strike: Highest absolute GEX (strongest hedging magnet)

Source: `core/signals/gex_calculator.py`

### Flow Detection

Four detection rules, each producing independent alerts:

| Rule | Trigger | Base Confidence | Scaling |
|------|---------|-----------------|---------|
| Volume spike | Volume/OI > 5x | 60 | +5 per unit above threshold, cap 95 |
| Large premium | Notional > $100K | 70 | +10 per log unit above threshold, cap 95 |
| OTM sweep | OTM + volume > 10x avg + price near ask | 80 | Fixed |
| P/C imbalance | Put or call volume > 3x the other side | 50 | Fixed |

A single contract can trigger multiple alert types. Alerts are sorted by confidence descending.

Source: `core/signals/flow_detector.py`

### IV Percentile & Rank

- **IV percentile:** `(days_below_current / 252) x 100` — what percentage of the past year had lower IV
- **IV rank:** `(current_iv - 252d_low) / (252d_high - 252d_low) x 100` — where current IV sits in its annual range

Both are persisted to Supabase via daily snapshots for historical tracking.

Source: `core/signals/iv_tracker.py`

### Sentiment Aggregation

**Blending formula:** `overall = flow_score x 0.6 + pcr_score x 0.4`

**PCR thresholds (CBOE put/call ratio):**
- `> 1.2` = extreme_fear (-80)
- `> 1.0` = fear (-40)
- `> 0.7` = neutral (0)
- `> 0.5` = greed (+40)
- `<= 0.5` = extreme_greed (+80)

**Flow scoring components** (each +/- up to 20 points from 50-point neutral base):
- Volume split: call% vs put% of total volume
- Premium split: call premium vs put premium
- Alert split: call-side alerts vs put-side alerts

Scale: -100 (extreme bearish) to +100 (extreme bullish).

Source: `core/signals/sentiment_aggregator.py`

---

## Usage Examples

### Check if a stock is in a squeeze-friendly environment
```bash
# Get GEX regime (short gamma = squeeze-friendly)
curl "http://localhost:8000/api/signals/gex?ticker=GME"

# Get unusual flow (look for OTM call sweeps)
curl "http://localhost:8000/api/signals/flow?ticker=GME&limit=20"

# Get dark pool activity (elevated short ratio = fuel)
curl "http://localhost:8000/api/signals/darkpool?ticker=GME&days=7"
```
If GEX is negative (short gamma), flow shows OTM call sweeps, and dark pool short ratio is elevated, conditions favor a squeeze.

### Evaluate a deep value opportunity
```bash
# Check for insider cluster buying (3+ buyers = strong signal)
curl "http://localhost:8000/api/signals/insider?ticker=INTC"

# Cross-reference with congressional trades
curl "http://localhost:8000/api/signals/congress?ticker=INTC"
```
If 3+ insiders are buying and congressional trades show purchases, conviction is high.

### Assess broad market conditions before trading
```bash
# Market-wide sentiment from CBOE put/call ratios
curl "http://localhost:8000/api/signals/sentiment/market"

# IV percentile for SPY (>80 = expensive options, expect vol)
curl "http://localhost:8000/api/signals/iv?ticker=SPY"

# Aggregated flow summary for a specific ticker
curl "http://localhost:8000/api/signals/flow/summary?ticker=AAPL"
```
If market sentiment is in "fear" territory and IV percentile is high, expect elevated volatility. Consider tightening position sizes.

### Get all GEX levels for support/resistance
```bash
# Key levels: gamma flip, call wall, put wall
curl "http://localhost:8000/api/signals/gex/levels?ticker=TSLA"
```
Use `gamma_flip` as the pivot. Price above flip = expect mean reversion. Price below = expect trend continuation.

### Find the most shorted stocks today
```bash
curl "http://localhost:8000/api/signals/darkpool/top?limit=10"
```
