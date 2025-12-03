"""
Lightweight Market Data API Server

Exposes Alpaca market data via REST endpoints for the web frontend.
"""

import logging
import os
from datetime import datetime, timedelta
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Alpaca imports
from alpaca.data.historical import StockHistoricalDataClient
from alpaca.data.requests import StockBarsRequest, StockLatestQuoteRequest
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

# Initialize Alpaca client
api_key = os.getenv("ALPACA_API_KEY")
secret_key = os.getenv("ALPACA_SECRET_KEY")

if not api_key or not secret_key:
    logger.warning("Alpaca API keys not found - using demo mode")
    data_client = None
else:
    logger.info("Initializing Alpaca data client...")
    data_client = StockHistoricalDataClient(api_key=api_key, secret_key=secret_key)
    logger.info("Alpaca client initialized successfully")


# Response models
class BarData(BaseModel):
    t: str
    o: float
    h: float
    l: float
    c: float
    v: int


class QuoteData(BaseModel):
    symbol: str
    bid: Optional[float] = None
    ask: Optional[float] = None
    last: Optional[float] = None
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    close: Optional[float] = None
    volume: Optional[int] = None
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
        "alpaca_connected": data_client is not None,
    }


@app.get("/api/market/bars")
async def get_bars(
    symbol: str = Query(..., description="Stock symbol"),
    timeframe: str = Query(
        "1d", description="Timeframe (1min, 5min, 15min, 30min, 1h, 1d, 1w, 1mo)"
    ),
    limit: int = Query(100, description="Number of bars to return"),
):
    """Get historical OHLCV bars for a symbol."""
    if not data_client:
        # Return demo data if no client
        return {"bars": generate_demo_bars(symbol, limit)}

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

        request = StockBarsRequest(
            symbol_or_symbols=[symbol.upper()],
            timeframe=tf,
            start=start,
        )

        bars_data = data_client.get_stock_bars(request)

        logger.info(f"Bars data type: {type(bars_data)}")

        # BarSet is accessed like bars_data["SPY"] or bars_data.data["SPY"]
        symbol_upper = symbol.upper()

        # Try different access patterns
        bars_list = None
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
                    "v": int(bar.volume),
                }
            )

        return {"bars": result}

    except Exception as e:
        logger.error(f"Error fetching bars for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/market/quotes")
async def get_quotes(
    symbols: str = Query(..., description="Comma-separated list of symbols"),
):
    """Get latest quotes for multiple symbols."""
    symbol_list = [s.strip().upper() for s in symbols.split(",")]

    if not data_client:
        # Return demo data if no client
        return {"quotes": {s: generate_demo_quote(s) for s in symbol_list}}

    try:
        request = StockLatestQuoteRequest(symbol_or_symbols=symbol_list)
        quotes = data_client.get_stock_latest_quote(request)

        result = {}
        for symbol in symbol_list:
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
                result[symbol] = generate_demo_quote(symbol)

        return {"quotes": result}

    except Exception as e:
        logger.error(f"Error fetching quotes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def generate_demo_bars(symbol: str, count: int = 100) -> List[dict]:
    """Generate demo bar data for testing."""
    import random  # nosec B311 - demo data only, not security-critical

    bars = []
    base_price = 100.0 + hash(symbol) % 400

    for i in range(count):
        timestamp = datetime.now() - timedelta(days=count - i)
        open_price = base_price + random.uniform(-2, 2)  # nosec B311
        high_price = open_price + random.uniform(0, 3)  # nosec B311
        low_price = open_price - random.uniform(0, 3)  # nosec B311
        close_price = random.uniform(low_price, high_price)  # nosec B311

        bars.append(
            {
                "t": timestamp.isoformat(),
                "o": round(open_price, 2),
                "h": round(high_price, 2),
                "l": round(low_price, 2),
                "c": round(close_price, 2),
                "v": random.randint(100000, 10000000),  # nosec B311
            }
        )

        base_price = close_price

    return bars


def generate_demo_quote(symbol: str) -> dict:
    """Generate demo quote data for testing."""
    import random  # nosec B311 - demo data only, not security-critical

    base_price = 100.0 + hash(symbol) % 400
    price = base_price + random.uniform(-5, 5)  # nosec B311

    return {
        "bid": round(price - 0.01, 2),
        "ask": round(price + 0.01, 2),
        "last": round(price, 2),
        "change": round(random.uniform(-5, 5), 2),  # nosec B311
        "changePercent": round(random.uniform(-2, 2), 2),  # nosec B311
        "volume": random.randint(100000, 10000000),  # nosec B311
        "timestamp": datetime.now().isoformat(),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
