"""
Lightweight Market Data API Server

Exposes Alpaca market data via REST endpoints for the web frontend.
"""

import logging
import os
from datetime import datetime, timedelta
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Load environment variables (override=True ensures fresh values from .env file)
load_dotenv(override=True)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Alpaca imports
from alpaca.data.historical import CryptoHistoricalDataClient, StockHistoricalDataClient
from alpaca.data.requests import (
    CryptoBarsRequest,
    CryptoLatestQuoteRequest,
    StockBarsRequest,
    StockLatestQuoteRequest,
)
from alpaca.data.timeframe import TimeFrame

# Initialize FastAPI
app = FastAPI(title="DeepStack Market Data API", version="1.0.0")

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Command Router
from core.api.router import router as command_router

app.include_router(command_router)

# Initialize Alpaca clients
api_key = os.getenv("ALPACA_API_KEY")
secret_key = os.getenv("ALPACA_SECRET_KEY")

if not api_key or not secret_key:
    logger.warning("Alpaca API keys not found - using demo mode")
    stock_client = None
    crypto_client = None
else:
    logger.info("Initializing Alpaca data clients...")
    stock_client = StockHistoricalDataClient(api_key=api_key, secret_key=secret_key)
    crypto_client = CryptoHistoricalDataClient(api_key=api_key, secret_key=secret_key)
    logger.info("Alpaca clients initialized successfully")


# Response models
class BarData(BaseModel):
    t: str
    o: float
    h: float
    l: float
    c: float
    v: float  # Changed to float for crypto


class QuoteData(BaseModel):
    symbol: str
    bid: Optional[float] = None
    ask: Optional[float] = None
    last: Optional[float] = None
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    close: Optional[float] = None
    volume: Optional[float] = None  # Changed to float for crypto
    change: Optional[float] = None
    changePercent: Optional[float] = None
    timestamp: str


# Timeframe mapping
TIMEFRAME_MAP = {
    "1min": TimeFrame.Minute,
    "5min": TimeFrame(5, "Min"),
    "15min": TimeFrame(15, "Min"),
    "30min": TimeFrame(30, "Min"),
    "1h": TimeFrame.Hour,
    "1d": TimeFrame.Day,
    "1w": TimeFrame.Week,
    "1mo": TimeFrame.Month,
}


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "alpaca_connected": stock_client is not None,
    }


@app.get("/api/market/bars")
async def get_bars(
    symbol: str = Query(..., description="Stock or Crypto symbol"),
    timeframe: str = Query(
        "1d", description="Timeframe (1min, 5min, 15min, 30min, 1h, 1d, 1w, 1mo)"
    ),
    limit: int = Query(100, description="Number of bars to return"),
):
    """Get historical OHLCV bars for a symbol."""
    is_crypto = "/" in symbol

    if not stock_client:  # Check if clients are initialized (both or neither)
        # Return demo data if no client
        return {"bars": generate_demo_bars(symbol, limit, is_crypto)}

    try:
        tf = TIMEFRAME_MAP.get(timeframe, TimeFrame.Day)

        # Calculate start date based on timeframe and limit
        if timeframe in ["1min", "5min", "15min", "30min"]:
            start = datetime.now() - timedelta(days=7)
        elif timeframe == "1h":
            start = datetime.now() - timedelta(days=30)
        elif timeframe == "1d":
            start = datetime.now() - timedelta(days=limit * 2)
        else:
            start = datetime.now() - timedelta(days=limit * 7)

        logger.info(
            f"Fetching bars for {symbol}, tf={timeframe}, start={start}, lim={limit}"
        )

        bars_list = []
        symbol_upper = symbol.upper()

        if is_crypto:
            request = CryptoBarsRequest(
                symbol_or_symbols=[symbol_upper],
                timeframe=tf,
                start=start,
            )
            bars_data = crypto_client.get_crypto_bars(request)
        else:
            request = StockBarsRequest(
                symbol_or_symbols=[symbol_upper],
                timeframe=tf,
                start=start,
            )
            bars_data = stock_client.get_stock_bars(request)

        logger.info(f"Bars data type: {type(bars_data)}")

        # Helper to extract bars from response
        if hasattr(bars_data, "data") and symbol_upper in bars_data.data:
            bars_list = bars_data.data[symbol_upper]
        elif hasattr(bars_data, "__getitem__"):
            try:
                bars_list = bars_data[symbol_upper]
            except (KeyError, TypeError):
                pass

        if not bars_list:
            logger.warning(f"No bars found for {symbol_upper}")
            return {"bars": []}

        logger.info(f"Found {len(bars_list)} bars for {symbol_upper}")

        result = []
        for bar in bars_list:
            result.append(
                {
                    "t": bar.timestamp.isoformat(),
                    "o": float(bar.open),
                    "h": float(bar.high),
                    "l": float(bar.low),
                    "c": float(bar.close),
                    "v": float(bar.volume),
                }
            )

        return {"bars": result}

    except Exception as e:
        logger.error(f"Error fetching bars for {symbol}: {e}")
        # Fallback to demo data on error
        logger.warning(f"Falling back to demo data for {symbol}")
        return {"bars": generate_demo_bars(symbol, limit, is_crypto)}


@app.get("/api/market/quotes")
async def get_quotes(
    symbols: str = Query(..., description="Comma-separated list of symbols"),
):
    """Get latest quotes for multiple symbols."""
    symbol_list = [s.strip().upper() for s in symbols.split(",")]

    if not stock_client:
        # Return demo data if no client
        return {"quotes": {s: generate_demo_quote(s, "/" in s) for s in symbol_list}}

    try:
        result = {}
        stock_symbols = [s for s in symbol_list if "/" not in s]
        crypto_symbols = [s for s in symbol_list if "/" in s]

        # Fetch Stock Quotes
        if stock_symbols:
            request = StockLatestQuoteRequest(symbol_or_symbols=stock_symbols)
            quotes = stock_client.get_stock_latest_quote(request)
            for symbol in stock_symbols:
                if symbol in quotes:
                    q = quotes[symbol]
                    result[symbol] = {
                        "bid": float(q.bid_price) if q.bid_price else None,
                        "ask": float(q.ask_price) if q.ask_price else None,
                        "last": (
                            float(q.ask_price) if q.ask_price else None
                        ),  # Use ask as last
                        "timestamp": (
                            q.timestamp.isoformat()
                            if q.timestamp
                            else datetime.now().isoformat()
                        ),
                    }
                else:
                    result[symbol] = generate_demo_quote(symbol, False)

        # Fetch Crypto Quotes
        if crypto_symbols:
            request = CryptoLatestQuoteRequest(symbol_or_symbols=crypto_symbols)
            quotes = crypto_client.get_crypto_latest_quote(request)
            for symbol in crypto_symbols:
                if symbol in quotes:
                    q = quotes[symbol]
                    result[symbol] = {
                        "bid": float(q.bid_price) if q.bid_price else None,
                        "ask": float(q.ask_price) if q.ask_price else None,
                        "last": (
                            float(q.ask_price) if q.ask_price else None
                        ),  # Use ask as last
                        "timestamp": (
                            q.timestamp.isoformat()
                            if q.timestamp
                            else datetime.now().isoformat()
                        ),
                    }
                else:
                    result[symbol] = generate_demo_quote(symbol, True)

        return {"quotes": result}

    except Exception as e:
        logger.error(f"Error fetching quotes: {e}")
        # Fallback to demo data on error
        logger.warning("Falling back to demo data for quotes")
        return {"quotes": {s: generate_demo_quote(s, "/" in s) for s in symbol_list}}


def generate_demo_bars(
    symbol: str, count: int = 100, is_crypto: bool = False
) -> List[dict]:
    """Generate demo bar data for testing."""
    import random  # nosec B311 - demo data only, not security-critical

    bars = []
    base_price = 100.0 + hash(symbol) % 400
    if is_crypto:
        base_price = 30000.0 + hash(symbol) % 20000  # Higher base for crypto like BTC

    for i in range(count):
        timestamp = datetime.now() - timedelta(days=count - i)
        volatility = base_price * 0.05 if is_crypto else 2.0

        open_price = base_price + random.uniform(-volatility, volatility)  # nosec B311
        high_price = open_price + random.uniform(0, volatility)  # nosec B311
        low_price = open_price - random.uniform(0, volatility)  # nosec B311
        close_price = random.uniform(low_price, high_price)  # nosec B311

        bars.append(
            {
                "t": timestamp.isoformat(),
                "o": round(open_price, 2),
                "h": round(high_price, 2),
                "l": round(low_price, 2),
                "c": round(close_price, 2),
                "v": (
                    random.uniform(0.1, 100.0)  # nosec B311
                    if is_crypto
                    else random.randint(100000, 10000000)  # nosec B311
                ),
            }
        )

        base_price = close_price

    return bars


def generate_demo_quote(symbol: str, is_crypto: bool = False) -> dict:
    """Generate demo quote data for testing."""
    import random  # nosec B311 - demo data only, not security-critical

    base_price = 100.0 + hash(symbol) % 400
    if is_crypto:
        base_price = 30000.0 + hash(symbol) % 20000

    volatility = base_price * 0.02 if is_crypto else 5.0
    price = base_price + random.uniform(-volatility, volatility)  # nosec B311

    return {
        "bid": round(price * 0.999, 2),
        "ask": round(price * 1.001, 2),
        "last": round(price, 2),
        "change": round(random.uniform(-volatility, volatility), 2),  # nosec B311
        "changePercent": round(random.uniform(-5, 5), 2),  # nosec B311
        "volume": (
            random.uniform(0.1, 100.0)  # nosec B311
            if is_crypto
            else random.randint(100000, 10000000)  # nosec B311
        ),
        "timestamp": datetime.now().isoformat(),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
