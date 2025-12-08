# Yahoo Finance Fallback - Implementation Details

## Code Changes Overview

### 1. Import Statement (Line 13)

```python
import yfinance as yf
```

---

### 2. Updated QuoteResponse Model (Lines 68-75)

**Before:**
```python
class QuoteResponse(BaseModel):
    symbol: str
    bid: Optional[float]
    ask: Optional[float]
    last: Optional[float]
    volume: Optional[int]
    timestamp: datetime
```

**After:**
```python
class QuoteResponse(BaseModel):
    symbol: str
    bid: Optional[float]
    ask: Optional[float]
    last: Optional[float]
    volume: Optional[int]
    timestamp: datetime
    source: Optional[str] = None  # NEW: Track data source
```

---

### 3. Updated /quote/{symbol} Endpoint (Lines 270-353)

**Before:** Simple try IBKR → try PaperTrader → fail
```python
@self.app.get("/quote/{symbol}", response_model=QuoteResponse)
async def get_quote(symbol: str):
    """Get current quote for symbol."""
    try:
        quote = None
        if self.ibkr_client and self.ibkr_client.connected:
            quote = await self.ibkr_client.get_quote(symbol)
        elif self.paper_trader:
            price = await self.paper_trader._get_market_price(symbol)
            if price is not None:
                quote = {...}

        if quote:
            return QuoteResponse(**quote)
        else:
            raise QuoteUnavailableError(...)
```

**After:** Three-tier fallback with Yahoo Finance
```python
@self.app.get("/quote/{symbol}", response_model=QuoteResponse)
async def get_quote(symbol: str):
    """Get current quote for symbol with Yahoo Finance fallback."""
    quote = None
    source = None

    try:
        # Tier 1: Try IBKR first
        if self.ibkr_client and self.ibkr_client.connected:
            try:
                quote = await self.ibkr_client.get_quote(symbol)
                if quote:
                    source = "ibkr"
                    logger.debug(f"Quote for {symbol} from IBKR")
            except Exception as e:
                logger.warning(f"IBKR quote failed for {symbol}: {e}")

        # Tier 2: Try Alpaca via paper trader
        if not quote and self.paper_trader:
            try:
                price = await self.paper_trader._get_market_price(symbol)
                if price is not None:
                    quote = {
                        "symbol": symbol,
                        "bid": price - 0.02,
                        "ask": price + 0.02,
                        "last": price,
                        "volume": 0,
                        "timestamp": datetime.now(),
                    }
                    source = "alpaca"
                    logger.debug(f"Quote for {symbol} from Alpaca")
            except Exception as e:
                logger.warning(f"Alpaca quote failed for {symbol}: {e}")

        # Tier 3: Fallback to Yahoo Finance
        if not quote:
            try:
                logger.info(f"Falling back to Yahoo Finance for {symbol}")
                ticker = yf.Ticker(symbol)
                info = ticker.info

                if info:
                    # Get current price - try multiple fields
                    current_price = (
                        info.get("currentPrice") or
                        info.get("regularMarketPrice") or
                        info.get("previousClose")
                    )

                    if current_price:
                        quote = {
                            "symbol": symbol,
                            "bid": info.get("bid"),
                            "ask": info.get("ask"),
                            "last": current_price,
                            "volume": info.get("regularMarketVolume") or info.get("volume"),
                            "timestamp": datetime.now(),
                        }
                        source = "yahoo_finance"
                        logger.info(f"Quote for {symbol} from Yahoo Finance: ${current_price:.2f}")
            except Exception as e:
                logger.error(f"Yahoo Finance quote failed for {symbol}: {e}")

        # Return quote if we got one
        if quote:
            quote["source"] = source
            return QuoteResponse(**quote)
        else:
            raise QuoteUnavailableError(
                message=f"Quote not available for {symbol} from any source",
                symbol=symbol
            )

    except DeepStackError:
        raise  # Let exception handler handle it
    except HTTPException:
        raise  # Let FastAPI handle HTTPException as-is
    except Exception as e:
        logger.error(f"Unexpected error getting quote for {symbol}: {e}", exc_info=True)
        raise QuoteUnavailableError(
            message=f"Unable to fetch quote for {symbol}",
            symbol=symbol
        )
```

---

## Key Design Decisions

### 1. Independent Error Handling
Each data source has its own try/catch block. This ensures:
- One source failure doesn't stop the fallback chain
- Detailed logging per source
- Graceful degradation

### 2. Source Transparency
The `source` field in the response tells clients where the data came from:
- `"ibkr"` - Interactive Brokers (most accurate, real-time)
- `"alpaca"` - Alpaca Markets (real-time for paper trading)
- `"yahoo_finance"` - Yahoo Finance (delayed, but always available)

### 3. Price Field Fallback
Yahoo Finance has multiple price fields. We try them in order:
```python
current_price = (
    info.get("currentPrice") or        # Most accurate if available
    info.get("regularMarketPrice") or  # Regular trading price
    info.get("previousClose")          # Fallback to yesterday's close
)
```

### 4. Logging Strategy
- **DEBUG**: Successful quotes from primary sources (IBKR, Alpaca)
- **INFO**: Fallback to Yahoo Finance + successful retrieval
- **WARNING**: Individual source failures
- **ERROR**: Yahoo Finance failure or complete failure

---

## Example API Responses

### Response from IBKR
```json
{
  "symbol": "AAPL",
  "bid": 276.50,
  "ask": 276.52,
  "last": 276.51,
  "volume": 19547277,
  "timestamp": "2025-12-08T13:52:09.123456",
  "source": "ibkr"
}
```

### Response from Alpaca
```json
{
  "symbol": "AAPL",
  "bid": 276.48,
  "ask": 276.52,
  "last": 276.50,
  "volume": 0,
  "timestamp": "2025-12-08T13:52:09.123456",
  "source": "alpaca"
}
```

### Response from Yahoo Finance
```json
{
  "symbol": "AAPL",
  "bid": 277.03,
  "ask": 282.98,
  "last": 276.50,
  "volume": 19547277,
  "timestamp": "2025-12-08T13:52:09.123456",
  "source": "yahoo_finance"
}
```

### Error Response (All Sources Failed)
```json
{
  "success": false,
  "error": "Quote not available for AAPL from any source",
  "error_code": "QUOTE_UNAVAILABLE",
  "request_id": "abc123...",
  "timestamp": "2025-12-08T13:52:09.123456",
  "details": {
    "symbol": "AAPL"
  }
}
```

---

## Usage Examples

### cURL
```bash
# Get a quote
curl http://localhost:8000/quote/AAPL

# Pretty print with jq
curl -s http://localhost:8000/quote/AAPL | jq .
```

### Python
```python
import requests

response = requests.get("http://localhost:8000/quote/AAPL")
quote = response.json()

print(f"{quote['symbol']}: ${quote['last']} (from {quote['source']})")
```

### JavaScript
```javascript
fetch('http://localhost:8000/quote/AAPL')
  .then(res => res.json())
  .then(quote => {
    console.log(`${quote.symbol}: $${quote.last} (from ${quote.source})`);
  });
```

---

## Monitoring Queries

### Count Quotes by Source
```bash
# IBKR quotes
grep "Quote for.*from IBKR" logs/api_server.log | wc -l

# Alpaca quotes
grep "Quote for.*from Alpaca" logs/api_server.log | wc -l

# Yahoo Finance quotes
grep "Quote for.*from Yahoo Finance" logs/api_server.log | wc -l
```

### Track Fallback Usage
```bash
# How often do we fall back to Yahoo?
grep "Falling back to Yahoo Finance" logs/api_server.log | wc -l

# Which symbols require fallback?
grep "Falling back to Yahoo Finance for" logs/api_server.log | \
  awk '{print $NF}' | sort | uniq -c | sort -rn
```

### Monitor Failures
```bash
# Complete failures (all sources)
grep "Quote not available.*from any source" logs/api_server.log

# Yahoo Finance specific failures
grep "Yahoo Finance quote failed" logs/api_server.log
```

---

## Performance Considerations

### Latency
- **IBKR**: ~50-100ms (if connected)
- **Alpaca**: ~100-200ms (API call)
- **Yahoo Finance**: ~500-1000ms (API call + parsing)

### Caching Recommendation
```python
# Add a simple cache to reduce API calls
from datetime import datetime, timedelta

class QuoteCache:
    def __init__(self, ttl_seconds=60):
        self.cache = {}
        self.ttl = timedelta(seconds=ttl_seconds)

    def get(self, symbol):
        if symbol in self.cache:
            quote, timestamp = self.cache[symbol]
            if datetime.now() - timestamp < self.ttl:
                return quote
        return None

    def set(self, symbol, quote):
        self.cache[symbol] = (quote, datetime.now())
```

---

## Troubleshooting

### Yahoo Finance returns None
**Cause**: Symbol not found or invalid
**Solution**: Validate symbol format (Yahoo uses different conventions for some assets)

### Slow response times
**Cause**: Network latency or Yahoo Finance API slow
**Solution**: Implement caching or reduce fallback timeout

### Bid/Ask spread too wide
**Cause**: Yahoo Finance data quality
**Solution**: Accept as limitation of free tier or use paid data source

---

## Future Improvements

1. **Add Redis caching** for production deployments
2. **Implement circuit breaker** to skip consistently failing sources
3. **Add metrics/telemetry** for source performance monitoring
4. **Support batch quotes** for multiple symbols
5. **Add quote staleness indicator** in response
6. **Support crypto/forex** with Yahoo Finance format conversion

---

## Related Files

- `/Users/eddiebelaval/Development/deepstack/core/api_server.py` - Main implementation
- `/Users/eddiebelaval/Development/deepstack/core/data/market_data.py` - MarketDataManager (also uses Yahoo Finance)
- `/Users/eddiebelaval/Development/deepstack/core/broker/paper_trader.py` - PaperTrader._get_market_price()
- `/Users/eddiebelaval/Development/deepstack/core/exceptions.py` - QuoteUnavailableError definition
