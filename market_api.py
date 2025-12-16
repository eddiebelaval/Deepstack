"""
Lightweight Market Data API Server

Exposes Alpaca market data via REST endpoints for the web frontend.
"""

import logging
import os
from datetime import datetime, timedelta
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import (
    Depends,
    FastAPI,
    Header,
    HTTPException,
    Query,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from supabase import Client, create_client

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

# Use shared AlpacaClient for consistent data access
from core.data.alpaca_client import AlpacaClient
from core.data.alphavantage_client import AlphaVantageClient

app.include_router(command_router)

# Initialize Clients
api_key = os.getenv("ALPACA_API_KEY")
secret_key = os.getenv("ALPACA_SECRET_KEY")
alphavantage_api_key = os.getenv("ALPHAVANTAGE_API_KEY")
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv(
    "SUPABASE_SERVICE_KEY"
)  # Use Service Role Key for decrementing credits securely

if not api_key or not secret_key:
    logger.warning("Alpaca API keys not found - using demo mode")
    stock_client = None

    crypto_client = None
    alpaca_client = None
else:
    logger.info("Initializing Alpaca data clients...")
    stock_client = StockHistoricalDataClient(api_key=api_key, secret_key=secret_key)
    crypto_client = CryptoHistoricalDataClient(api_key=api_key, secret_key=secret_key)
    # Initialize shared AlpacaClient wrapper
    alpaca_client = AlpacaClient(api_key=api_key, secret_key=secret_key)
    logger.info("Alpaca clients initialized successfully")

# Initialize Alpha Vantage client for additional news source
if alphavantage_api_key:
    alphavantage_client = AlphaVantageClient(api_key=alphavantage_api_key)
    logger.info("Alpha Vantage client initialized for news aggregation")
else:
    alphavantage_client = None
    logger.warning("Alpha Vantage API key not found - using Alpaca news only")

if not supabase_url or not supabase_key:
    logger.warning("Supabase credentials not found - Auth disabled (NOT SECURE)")
    supabase: Optional[Client] = None
else:
    supabase = create_client(supabase_url=supabase_url, supabase_key=supabase_key)
    logger.info("Supabase client initialized")

# --- DEMO MODE STATE ---
# In-memory credit tracker for when Supabase is not configured
DEMO_CREDITS = {"demo-user": 500}

# Auth & Usage Dependencies
from fastapi import Response


async def verify_token(authorization: str = Header(None)):
    """Verify Supabase JWT and return user ID. If no auth configured, allow bypass."""
    if not supabase:
        return "demo-user"  # Bypass if no Supabase configured

    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization Header")

    try:
        token = authorization.replace("Bearer ", "")
        user = supabase.auth.get_user(token)
        return user.user.id
    except Exception as e:
        logger.error(f"Auth error: {e}")
        raise HTTPException(status_code=401, detail="Invalid Token")


class CreditDeduction:
    """Dependency to check and deduct credits."""

    def __init__(self, cost: int):
        self.cost = cost

    async def __call__(self, response: Response, user_id: str = Depends(verify_token)):
        remaining_credits = 0
        cost = self.cost

        # --- DEMO MODE (No DB) ---
        if not supabase:
            current = DEMO_CREDITS.get(user_id, 0)
            if current < cost:
                raise HTTPException(
                    status_code=402, detail="Payment Required: Insufficient Credits"
                )

            DEMO_CREDITS[user_id] = current - cost
            remaining_credits = DEMO_CREDITS[user_id]

            # Inject Header
            response.headers["X-DeepStack-Credits"] = str(remaining_credits)
            return True

        # --- PRODUCTION MODE (Supabase) ---
        try:
            db_resp = (
                supabase.table("profiles")
                .select("credits")
                .eq("id", user_id)
                .single()
                .execute()
            )

            if not db_resp.data:
                logger.warning(
                    f"No profile found for user {user_id} - Creating default"
                )
                # Auto-create profile with 500 certs if missing? Or error?
                # For robustness, error 404 is safer, let signup handle creation.
                raise HTTPException(status_code=404, detail="User profile not found")

            current_credits = db_resp.data.get("credits", 0)
            if current_credits is None:
                current_credits = 0

            if current_credits < cost:
                raise HTTPException(
                    status_code=402, detail="Payment Required: Insufficient Credits"
                )

            # Deduct
            new_credits = current_credits - cost
            supabase.table("profiles").update({"credits": new_credits}).eq(
                "id", user_id
            ).execute()

            # Inject Header
            response.headers["X-DeepStack-Credits"] = str(new_credits)
            return True

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Usage check error: {e}")
            raise HTTPException(status_code=500, detail="Usage check failed")


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
        "supabase_connected": supabase is not None,
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates."""
    await websocket.accept()
    try:
        while True:
            # Keep connection alive and listen for messages
            data = await websocket.receive_text()

            # Simple heartbeat response
            if "ping" in data:
                await websocket.send_text('{"type":"heartbeat"}')

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WebSocket error: {e}")


@app.get("/api/market/assets")
async def search_assets(
    search: str = Query("", description="Search query for symbol or name"),
    limit: int = Query(20, description="Maximum number of results"),
    asset_class: Optional[str] = Query(
        None, alias="class", description="Asset class filter: us_equity or crypto"
    ),
    user_id: str = Depends(verify_token),
):
    """Search for tradeable assets from Alpaca."""
    try:
        import httpx

        headers = {
            "APCA-API-KEY-ID": api_key,
            "APCA-API-SECRET-KEY": secret_key,
        }

        assets = []

        # Fetch US equity assets
        if not asset_class or asset_class == "us_equity":
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://paper-api.alpaca.markets/v2/assets",
                    headers=headers,
                    params={"status": "active", "asset_class": "us_equity"},
                    timeout=10.0,
                )

                if response.status_code == 200:
                    all_assets = response.json()
                    # Filter by search term
                    search_lower = search.lower()
                    for asset in all_assets:
                        if asset.get("tradable") and (
                            not search
                            or search_lower in asset.get("symbol", "").lower()
                            or search_lower in asset.get("name", "").lower()
                        ):
                            assets.append(
                                {
                                    "symbol": asset.get("symbol"),
                                    "name": asset.get("name"),
                                    "class": "us_equity",
                                    "exchange": asset.get("exchange"),
                                    "tradable": asset.get("tradable"),
                                }
                            )

        # Fetch crypto assets
        if not asset_class or asset_class == "crypto":
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://paper-api.alpaca.markets/v2/assets",
                    headers=headers,
                    params={"status": "active", "asset_class": "crypto"},
                    timeout=10.0,
                )

                if response.status_code == 200:
                    all_crypto = response.json()
                    search_lower = search.lower()
                    for asset in all_crypto:
                        if asset.get("tradable") and (
                            not search
                            or search_lower in asset.get("symbol", "").lower()
                            or search_lower in asset.get("name", "").lower()
                        ):
                            assets.append(
                                {
                                    "symbol": asset.get("symbol"),
                                    "name": asset.get("name"),
                                    "class": "crypto",
                                    "exchange": "CRYPTO",
                                    "tradable": asset.get("tradable"),
                                }
                            )

        # Sort: exact symbol matches first, then partial matches
        search_upper = search.upper()
        assets.sort(
            key=lambda x: (
                0 if x["symbol"] == search_upper else 1,
                0 if x["symbol"].startswith(search_upper) else 1,
                x["symbol"],
            )
        )

        return {"assets": assets[:limit]}

    except Exception as e:
        logger.error(f"Error fetching assets: {e}")
        return {"assets": [], "error": str(e)}


@app.get("/api/market/bars", dependencies=[Depends(CreditDeduction(10))])
async def get_bars(
    symbol: str = Query(..., description="Stock or Crypto symbol"),
    timeframe: str = Query(
        "1d", description="Timeframe (1min, 5min, 15min, 30min, 1h, 1d, 1w, 1mo)"
    ),
    limit: int = Query(100, description="Number of bars to return"),
    user_id: str = Depends(verify_token),
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

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching bars for {symbol}: {e}")
        # Fallback to demo data on error
        logger.warning(f"Falling back to demo data for {symbol}")
        return {"bars": generate_demo_bars(symbol, limit, is_crypto)}


@app.get("/api/market/quotes", dependencies=[Depends(CreditDeduction(1))])
async def get_quotes(
    symbols: str = Query(..., description="Comma-separated list of symbols"),
    user_id: str = Depends(verify_token),
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

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching quotes: {e}")
        # Fallback to demo data on error
        logger.warning("Falling back to demo data for quotes")
        return {"quotes": {s: generate_demo_quote(s, "/" in s) for s in symbol_list}}


@app.get("/api/news", dependencies=[Depends(CreditDeduction(5))])
async def get_news(
    symbol: Optional[str] = Query(None, description="Filter by stock symbol"),
    limit: int = Query(20, description="Number of news items to return"),
    user_id: str = Depends(verify_token),
):
    """Get aggregated market news from multiple sources (Alpaca + Alpha Vantage)."""
    import asyncio

    all_articles = []

    # Create tasks for parallel fetching
    tasks = []

    # Alpaca news
    if alpaca_client:
        tasks.append(("alpaca", alpaca_client.get_news(symbol=symbol, limit=limit)))

    # Alpha Vantage news
    if alphavantage_client:
        tasks.append(
            ("alphavantage", alphavantage_client.get_news(symbol=symbol, limit=limit))
        )

    if not tasks:
        logger.warning("No news clients initialized - returning empty news")
        return {"news": {"articles": [], "next_page_token": None}}

    try:
        # Fetch from all sources in parallel
        results = await asyncio.gather(
            *[task[1] for task in tasks], return_exceptions=True
        )

        # Process results from each source
        seen_headlines = set()

        for i, result in enumerate(results):
            source_name = tasks[i][0]

            if isinstance(result, Exception):
                logger.error(f"Error fetching from {source_name}: {result}")
                continue

            # Handle different response formats
            articles = []
            if isinstance(result, dict):
                articles = result.get("articles", [])
            elif isinstance(result, list):
                articles = result

            for article in articles:
                # Tag with source provider if not already tagged
                if "source_provider" not in article:
                    article["source_provider"] = source_name

                # Deduplicate by headline (case-insensitive)
                headline = article.get("headline", "").lower().strip()
                if headline and headline not in seen_headlines:
                    seen_headlines.add(headline)
                    all_articles.append(article)

        # Sort by publish date (most recent first)
        all_articles.sort(key=lambda x: x.get("publishedAt", ""), reverse=True)

        # Limit results
        limited_articles = all_articles[:limit]

        logger.info(
            f"Aggregated {len(limited_articles)} news articles from "
            f"{len([t for t in tasks])} sources (requested {limit})"
        )

        return {"news": {"articles": limited_articles, "next_page_token": None}}

    except Exception as e:
        logger.error(f"Error aggregating news: {e}")
        return {"news": {"articles": [], "next_page_token": None}, "error": str(e)}


@app.get("/api/calendar")
async def get_calendar(
    start: Optional[str] = Query(None, description="Start date"),
    end: Optional[str] = Query(None, description="End date"),
    user_id: str = Depends(verify_token),
):
    """Get market calendar events from Alpaca."""
    # Calendar is cheap/free (0 credits)

    try:
        import httpx

        headers = {
            "APCA-API-KEY-ID": api_key,
            "APCA-API-SECRET-KEY": secret_key,
        }
        params = {}
        if start:
            params["start"] = start
        if end:
            params["end"] = end

        events = []
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://paper-api.alpaca.markets/v2/calendar",
                headers=headers,
                params=params,
                timeout=10.0,
            )

            if response.status_code == 200:
                for day in response.json()[:14]:
                    events.append(
                        {
                            "id": f"market-{day.get('date', '')}",
                            "type": "market",
                            "title": "Market Open",
                            "date": day.get("date", ""),
                            "time": (
                                f"{day.get('open', '09:30')} - "
                                f"{day.get('close', '16:00')} ET"
                            ),
                            "importance": "low",
                        }
                    )

        return {"events": events}

    except Exception as e:
        logger.error(f"Error fetching calendar: {e}")
        return {"events": [], "error": str(e)}


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
