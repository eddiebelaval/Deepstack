"""
FastAPI server for DeepStack Trading System

Provides REST/WebSocket API for the CLI interface to communicate with
the trading engine, agents, and market data.
"""

import json
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import stripe
import yfinance as yf
from fastapi import (
    Depends,
    FastAPI,
    HTTPException,
    Request,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from .api.auth import AuthenticatedUser, get_current_user
from .api.credits import ActionCost, free_action, require_action
from .api.options_router import router as options_router
from .api.perplexity_finance_router import router as perplexity_finance_router
from .api.prediction_markets_router import router as prediction_markets_router
from .broker.ibkr_client import IBKRClient
from .broker.order_manager import OrderManager
from .broker.paper_trader import PaperTrader
from .config import get_config
from .data.alpaca_client import AlpacaClient, TimeFrameEnum
from .data.alphavantage_client import AlphaVantageClient
from .data.finnhub_client import FinnhubClient
from .data.market_data import MarketDataManager
from .data.newsapi_client import NewsAPIClient
from .data.rss_aggregator import RSSAggregator
from .data.stocktwits_client import StockTwitsClient
from .data.stocktwits_scraper import StockTwitsScraper
from .exceptions import (
    AuthenticationError,
    CircuitBreakerTrippedError,
    DataError,
    DeepStackError,
    MarketDataError,
    MissingAPIKeyError,
    OrderError,
    OrderExecutionError,
    QuoteUnavailableError,
    RateLimitError,
    RiskError,
    ValidationError,
    create_error_response,
)
from .services.news_aggregator import NewsAggregator
from .strategies.deep_value import DeepValueStrategy
from .strategies.hedged_position import HedgedPositionConfig, HedgedPositionManager

logger = logging.getLogger(__name__)


# Pydantic models for API requests/responses


class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    version: str = "1.0.0"


class QuoteRequest(BaseModel):
    symbol: str


class QuoteResponse(BaseModel):
    symbol: str
    bid: Optional[float]
    ask: Optional[float]
    last: Optional[float]
    volume: Optional[int]
    timestamp: datetime
    source: Optional[str] = None  # Track data source


class PositionResponse(BaseModel):
    symbol: str
    position: int
    avg_cost: float
    market_value: float
    unrealized_pnl: float
    realized_pnl: float


class PositionItemResponse(BaseModel):
    symbol: str
    quantity: float
    avg_cost: float
    current_price: float
    unrealized_pnl: float
    market_value: float


class PositionsListResponse(BaseModel):
    positions: List[PositionItemResponse]
    total_value: float


class OrderRequest(BaseModel):
    symbol: str
    quantity: int
    action: str  # 'BUY' or 'SELL'
    order_type: str = "MKT"  # 'MKT', 'LMT', 'STP'
    limit_price: Optional[float] = None
    stop_price: Optional[float] = None


class OrderResponse(BaseModel):
    order_id: Optional[str]
    status: str
    message: str


class AccountSummaryResponse(BaseModel):
    cash: float
    buying_power: float
    portfolio_value: float
    day_pnl: float
    total_pnl: float


class ErrorResponse(BaseModel):
    """Standardized error response format."""

    success: bool = False
    error: str
    error_code: str
    request_id: str
    timestamp: datetime
    details: Optional[Dict[str, Any]] = None


class HedgedPositionRequest(BaseModel):
    symbol: str
    entry_price: float
    total_shares: int
    conviction_pct: float = 0.60
    tactical_pct: float = 0.40


class ManualPositionRequest(BaseModel):
    symbol: str
    quantity: int
    avg_cost: float


class CheckoutSessionRequest(BaseModel):
    tier: str  # 'pro' or 'elite'
    user_id: str
    user_email: str


class CheckoutSessionResponse(BaseModel):
    url: str


class DeepStackAPIServer:
    """
    FastAPI server for DeepStack trading system.

    Provides endpoints for:
    - Health checks
    - Market data
    - Order placement
    - Position/portfolio queries
    - Real-time updates via WebSocket
    """

    def __init__(self):
        self.config = get_config()
        self.app = FastAPI(title="DeepStack Trading API", version="1.0.0")

        # Initialize components
        self.ibkr_client: Optional[IBKRClient] = None
        self.paper_trader: Optional[PaperTrader] = None
        self.order_manager: Optional[OrderManager] = None
        self.av_client: Optional[AlphaVantageClient] = None
        self.alpaca_client: Optional[AlpacaClient] = None
        self.deep_value_strategy: Optional[DeepValueStrategy] = None
        self.hedged_position_manager: Optional[HedgedPositionManager] = None
        self.market_data_manager: Optional[MarketDataManager] = None

        # News aggregation clients
        self.finnhub_client: Optional[FinnhubClient] = None
        self.newsapi_client: Optional[NewsAPIClient] = None
        self.stocktwits_client: Optional[StockTwitsClient] = None
        self.stocktwits_scraper: Optional[StockTwitsScraper] = None
        self.rss_aggregator: Optional[RSSAggregator] = None
        self.news_aggregator: Optional[NewsAggregator] = None

        # WebSocket connections
        self.websocket_connections: List[WebSocket] = []

        self._setup_middleware()
        self._setup_exception_handlers()
        self._setup_routes()
        self._setup_websocket()

        # Initialize trading components synchronously
        self._initialize_components()

        logger.info("DeepStack API Server initialized")

    def _setup_exception_handlers(self):
        """Setup global exception handlers for consistent error responses."""

        @self.app.exception_handler(DeepStackError)
        async def deepstack_error_handler(request: Request, exc: DeepStackError):
            """Handle all custom DeepStack errors."""
            logger.error(f"{exc.error_code}: {exc.message} - {exc.to_dict()}")
            return JSONResponse(
                status_code=self._get_status_code(exc),
                content=create_error_response(exc),
            )

        @self.app.exception_handler(Exception)
        async def generic_error_handler(request: Request, exc: Exception):
            """Handle unexpected errors - hide internal details."""
            request_id = str(uuid.uuid4())
            logger.error(f"Unexpected error [{request_id}]: {exc}", exc_info=True)
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "error": "An unexpected error occurred. Please try again.",
                    "error_code": "INTERNAL_ERROR",
                    "request_id": request_id,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
            )

    def _get_status_code(self, exc: DeepStackError) -> int:
        """Map exception types to HTTP status codes."""
        if isinstance(exc, ValidationError):
            return 400
        elif isinstance(exc, (AuthenticationError, MissingAPIKeyError)):
            return 401
        elif isinstance(exc, (CircuitBreakerTrippedError, RiskError)):
            return 403
        elif isinstance(exc, (QuoteUnavailableError, MarketDataError)):
            return 404
        elif isinstance(exc, RateLimitError):
            return 429
        return 500

    def _setup_middleware(self):
        """Setup CORS and other middleware."""
        # Security: CORS origins are validated in config to prevent
        # wildcard (*) being used with credentials
        #
        # We use allow_origin_regex to support Vercel preview deployments
        # which have dynamic URLs like: deepstack-{hash}-{team}.vercel.app
        vercel_preview_regex = r"https://deepstack-.*\.vercel\.app"

        # Log CORS configuration at startup for debugging
        print(f"CORS Origins configured: {self.config.api.cors_origins}")
        print(f"CORS Regex: {vercel_preview_regex}")

        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=self.config.api.cors_origins,
            allow_origin_regex=vercel_preview_regex,
            allow_credentials=self.config.api.cors_allow_credentials,
            allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
        )

    def _setup_routes(self):
        """Setup API routes."""

        @self.app.get("/health", response_model=HealthResponse)
        async def health_check():
            """Health check endpoint."""
            return HealthResponse(status="healthy", timestamp=datetime.now())

        @self.app.get("/api/news", dependencies=[Depends(free_action(ActionCost.NEWS))])
        async def get_news(
            symbol: Optional[str] = None,
            limit: int = 10,
            page_token: Optional[str] = None,
        ):
            """Get market news with pagination support (legacy endpoint)."""
            try:
                if not self.alpaca_client:
                    # Debug: log config values to understand why client is None
                    key = bool(self.config.alpaca_api_key)
                    secret = bool(self.config.alpaca_secret_key)
                    logger.warning(
                        f"Alpaca client not initialized. "
                        f"Config key={key}, secret={secret}"
                    )
                    return {"news": [], "next_page_token": None}

                result = await self.alpaca_client.get_news(
                    symbol=symbol, limit=limit, page_token=page_token
                )
                return {
                    "news": result.get("articles", []),
                    "next_page_token": result.get("next_page_token"),
                }
            except Exception as e:
                logger.error(f"News error: {e}")
                return JSONResponse(
                    status_code=500,
                    content={"error": "Failed to fetch news", "details": str(e)},
                )

        @self.app.get(
            "/api/news/aggregated",
            dependencies=[Depends(free_action(ActionCost.NEWS_AGGREGATED))],
        )
        async def get_aggregated_news(
            symbol: Optional[str] = None,
            source: Optional[str] = None,
            limit: int = 50,
            offset: int = 0,
            include_social: bool = True,
        ):
            """
            Get aggregated news from all configured sources with pagination.

            Args:
                symbol: Optional ticker symbol to filter by (e.g., 'AAPL')
                source: Optional source filter ('api', 'rss', 'social', or None for all)
                limit: Maximum number of articles to return (default: 50)
                offset: Number of articles to skip for pagination (default: 0)
                include_social: Include StockTwits social posts (default: True)

            Returns:
                Aggregated, deduplicated news with pagination metadata:
                - articles: List of news articles
                - has_more: Whether more articles are available
                - total_available: Total unique articles
                - offset: Current offset
            """
            try:
                if not self.news_aggregator:
                    logger.warning("News aggregator not initialized")
                    return {
                        "articles": [],
                        "sources": {},
                        "total_fetched": 0,
                        "total_returned": 0,
                        "has_more": False,
                        "offset": 0,
                    }

                result = await self.news_aggregator.get_aggregated_news(
                    symbol=symbol,
                    source_filter=source,
                    limit=limit,
                    offset=offset,
                    include_social=include_social,
                )

                return result

            except Exception as e:
                logger.error(f"Aggregated news error: {e}", exc_info=True)
                return JSONResponse(
                    status_code=500,
                    content={
                        "error": "Failed to fetch aggregated news",
                        "details": str(e),
                    },
                )

        @self.app.get(
            "/api/news/sources/health",
            dependencies=[Depends(free_action(ActionCost.NEWS_SOURCES_HEALTH))],
        )
        async def get_news_sources_health():
            """
            Get health status of all news sources.

            Returns:
                Health status for each configured news source
            """
            try:
                if not self.news_aggregator:
                    return {
                        "sources": {},
                        "overall_healthy": False,
                        "total_sources": 0,
                        "healthy_sources": 0,
                    }

                return await self.news_aggregator.get_source_health()

            except Exception as e:
                logger.error(f"News health check error: {e}")
                return JSONResponse(
                    status_code=500,
                    content={"error": "Failed to check news source health"},
                )

        @self.app.post("/api/news/stocktwits/parse-scraped")
        async def parse_scraped_stocktwits(request: Request):
            """
            Parse scraped StockTwits data from Playwright browser.

            This endpoint accepts raw DOM-scraped data and normalizes it
            to the standard article format.

            Body:
                symbol: Optional stock symbol context
                scraped_data: Raw scrape result from browser evaluate

            Returns:
                Normalized articles list
            """
            try:
                body = await request.json()
                symbol = body.get("symbol")
                scraped_data = body.get("scraped_data")

                if not scraped_data:
                    return JSONResponse(
                        status_code=400,
                        content={"error": "Missing scraped_data in request body"},
                    )

                if not self.stocktwits_scraper:
                    return JSONResponse(
                        status_code=503,
                        content={"error": "StockTwits scraper not initialized"},
                    )

                # Parse the scraped data using the scraper's normalization
                result = self.stocktwits_scraper.parse_scraped_data(
                    scraped_data, symbol=symbol
                )

                # If news aggregator has pending scrapes, add them
                if self.news_aggregator:
                    self.news_aggregator.add_scraped_stocktwits(symbol, scraped_data)

                return {
                    "articles": result.get("articles", []),
                    "count": len(result.get("articles", [])),
                    "source": "scraped",
                }

            except Exception as e:
                logger.error(f"Error parsing scraped StockTwits data: {e}")
                return JSONResponse(
                    status_code=500,
                    content={"error": "Failed to parse scraped data"},
                )

        @self.app.get("/api/calendar")
        async def get_calendar(
            start: Optional[str] = None,
            end: Optional[str] = None,
            horizon: str = "3month",
        ):
            """
            Get earnings calendar events from Alpha Vantage.

            Args:
                start: Optional start date filter (YYYY-MM-DD)
                end: Optional end date filter (YYYY-MM-DD)
                horizon: Time horizon - '3month', '6month', or '12month'

            Returns:
                List of calendar events
            """
            try:
                events = []

                # Try to fetch real earnings data from Alpha Vantage
                if self.av_client:
                    try:
                        earnings_events = await self.av_client.get_earnings_calendar(
                            horizon=horizon
                        )

                        if earnings_events:
                            for event in earnings_events:
                                report_date = event.get("report_date", "")

                                # Apply date filters if provided
                                if start and report_date < start:
                                    continue
                                if end and report_date > end:
                                    continue

                                symbol = event.get("symbol", "")
                                name = event.get("name", "")
                                events.append(
                                    {
                                        "id": f"earnings-{symbol}-{report_date}",
                                        "type": "earnings",
                                        "symbol": symbol,
                                        "title": f"{name} Earnings",
                                        "date": report_date,
                                        "time": "TBD",  # AV no time
                                        "importance": "medium",
                                        "estimate": (
                                            f"${event.get('estimate', 0):.2f}"
                                            if event.get("estimate")
                                            else None
                                        ),
                                        "fiscalQuarter": event.get(
                                            "fiscal_date_ending", ""
                                        ),
                                    }
                                )

                            logger.info(f"Returning {len(events)} earnings from AV")
                    except Exception as e:
                        logger.warning(f"Alpha Vantage calendar failed: {e}")
                        # Fall through to return empty events
                else:
                    logger.warning("Alpha Vantage client not initialized for calendar")

                # Sort events by date
                events.sort(key=lambda x: x.get("date", ""))

                return {"events": events}

            except Exception as e:
                logger.error(f"Calendar error: {e}")
                return JSONResponse(
                    status_code=500,
                    content={"error": "Failed to fetch calendar", "details": str(e)},
                )

        # Simple quote cache at endpoint level for faster responses
        _quote_cache: Dict[str, tuple] = {}
        _quote_cache_ttl = 10  # 10 seconds

        @self.app.get(
            "/api/market/quotes",
            dependencies=[Depends(free_action(ActionCost.QUOTE))],
        )
        async def get_quotes_batch(symbols: str):
            """
            Get current quotes for multiple symbols in a single batch request.

            This endpoint reduces API calls from N to 1, avoiding rate limiting.

            Args:
                symbols: Comma-separated list of symbols (e.g., "AAPL,GOOGL,MSFT")

            Returns:
                Dictionary mapping symbols to quote data
            """

            # Parse symbols from comma-separated string
            symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]

            if not symbol_list:
                raise ValidationError(
                    message="At least one symbol is required", field="symbols"
                )

            # Validate symbol format
            for symbol in symbol_list:
                if (
                    not symbol.replace("/", "")
                    .replace("-", "")
                    .replace(".", "")
                    .isalnum()
                ):
                    raise ValidationError(
                        message=f"Invalid symbol format: {symbol}",
                        field="symbols",
                        value=symbol,
                    )

            quotes_result = {}

            try:
                # Try Alpaca first (batch request - most efficient)
                if self.alpaca_client:
                    try:
                        alpaca_quotes = await self.alpaca_client.get_quotes_batch(
                            symbol_list
                        )
                        for symbol, quote in alpaca_quotes.items():
                            if quote and quote.get("last"):
                                quotes_result[symbol] = {
                                    "symbol": symbol,
                                    "bid": quote.get("bid", quote["last"] - 0.02),
                                    "ask": quote.get("ask", quote["last"] + 0.02),
                                    "last": quote["last"],
                                    "volume": quote.get("bid_volume", 0),
                                    "timestamp": quote.get("timestamp"),
                                    "source": "alpaca",
                                }
                        logger.info(
                            f"Batch quotes from Alpaca: "
                            f"{len(quotes_result)}/{len(symbol_list)}"
                        )
                    except Exception as e:
                        logger.warning(f"Alpaca batch quotes failed: {e}")

                # Fallback to IBKR for missing symbols (if connected)
                missing_symbols = [s for s in symbol_list if s not in quotes_result]
                if missing_symbols and self.ibkr_client and self.ibkr_client.connected:
                    for symbol in missing_symbols:
                        try:
                            quote = await self.ibkr_client.get_quote(symbol)
                            if quote:
                                quotes_result[symbol] = {
                                    **quote,
                                    "source": "ibkr",
                                }
                        except Exception as e:
                            logger.warning(f"IBKR quote failed for {symbol}: {e}")

                # Return results
                return {
                    "quotes": quotes_result,
                    "requested": len(symbol_list),
                    "returned": len(quotes_result),
                    "mock": False,
                }

            except DeepStackError:
                raise
            except Exception as e:
                logger.error(f"Unexpected error in batch quotes: {e}", exc_info=True)
                raise DataError(message="Unable to fetch batch quotes")

        @self.app.get(
            "/quote/{symbol}",
            response_model=QuoteResponse,
            dependencies=[Depends(free_action(ActionCost.QUOTE))],
        )
        async def get_quote(symbol: str):
            """Get current quote for symbol with optimized source selection."""
            import asyncio

            # Check endpoint-level cache first
            if symbol in _quote_cache:
                cached_quote, cached_time = _quote_cache[symbol]
                if datetime.now() - cached_time < timedelta(seconds=_quote_cache_ttl):
                    logger.debug(f"Quote for {symbol} from endpoint cache")
                    return QuoteResponse(**cached_quote)

            quote = None
            source = None

            try:
                # Priority 1: Alpaca (fastest and most reliable for stocks)
                if not quote and self.alpaca_client:
                    try:
                        alpaca_quote = await self.alpaca_client.get_quote(symbol)
                        if alpaca_quote and alpaca_quote.get("last"):
                            quote = {
                                "symbol": symbol,
                                "bid": alpaca_quote.get(
                                    "bid", alpaca_quote["last"] - 0.02
                                ),
                                "ask": alpaca_quote.get(
                                    "ask", alpaca_quote["last"] + 0.02
                                ),
                                "last": alpaca_quote["last"],
                                "volume": alpaca_quote.get("bid_volume", 0),
                                "timestamp": datetime.now(),
                            }
                            source = "alpaca"
                            logger.debug(f"Quote for {symbol} from Alpaca")
                    except Exception as e:
                        logger.warning(f"Alpaca quote failed for {symbol}: {e}")

                # Priority 2: IBKR (if connected)
                if not quote and self.ibkr_client and self.ibkr_client.connected:
                    try:
                        quote = await self.ibkr_client.get_quote(symbol)
                        if quote:
                            source = "ibkr"
                            logger.debug(f"Quote for {symbol} from IBKR")
                    except Exception as e:
                        logger.warning(f"IBKR quote failed for {symbol}: {e}")

                # Priority 3: Yahoo Finance (slow, use with timeout)
                if not quote:
                    try:
                        logger.info(f"Falling back to Yahoo Finance for {symbol}")

                        # Run yfinance in executor with timeout
                        def get_yf_quote():
                            ticker = yf.Ticker(symbol)
                            return ticker.info

                        loop = asyncio.get_event_loop()
                        info = await asyncio.wait_for(
                            loop.run_in_executor(None, get_yf_quote),
                            timeout=5.0,  # 5 second timeout for Yahoo
                        )

                        if info:
                            current_price = (
                                info.get("currentPrice")
                                or info.get("regularMarketPrice")
                                or info.get("previousClose")
                            )

                            if current_price:
                                quote = {
                                    "symbol": symbol,
                                    "bid": info.get("bid"),
                                    "ask": info.get("ask"),
                                    "last": current_price,
                                    "volume": info.get("regularMarketVolume")
                                    or info.get("volume"),
                                    "timestamp": datetime.now(),
                                }
                                source = "yahoo_finance"
                                logger.info(
                                    f"Yahoo quote {symbol}: ${current_price:.2f}"
                                )
                    except asyncio.TimeoutError:
                        logger.warning(f"Yahoo Finance timeout for {symbol}")
                    except Exception as e:
                        logger.error(f"Yahoo Finance quote failed for {symbol}: {e}")

                # Return quote if we got one
                if quote:
                    quote["source"] = source
                    # Cache the successful quote
                    _quote_cache[symbol] = (quote, datetime.now())
                    return QuoteResponse(**quote)
                else:
                    raise QuoteUnavailableError(
                        message=f"Quote not available for {symbol} from any source",
                        symbol=symbol,
                    )

            except DeepStackError:
                raise  # Let exception handler handle it
            except HTTPException:
                raise  # Let FastAPI handle HTTPException as-is
            except Exception as e:
                logger.error(
                    f"Unexpected error getting quote for {symbol}: {e}", exc_info=True
                )
                raise QuoteUnavailableError(
                    message=f"Unable to fetch quote for {symbol}", symbol=symbol
                )

        @self.app.get(
            "/api/market/bars", dependencies=[Depends(free_action(ActionCost.BARS))]
        )
        async def get_market_bars(symbol: str, timeframe: str = "1d", limit: int = 100):
            """Get historical market bars from Alpaca (stocks and crypto)."""
            try:
                if not self.alpaca_client:
                    logger.warning("Alpaca client not available for bars request")
                    raise DataError(message="Market data service not available")

                # Detect if this is a crypto symbol (contains '/')
                is_crypto = "/" in symbol

                # Map timeframe string to TimeFrameEnum
                timeframe_map = {
                    "1m": TimeFrameEnum.MINUTE_1,
                    "1min": TimeFrameEnum.MINUTE_1,
                    "5m": TimeFrameEnum.MINUTE_5,
                    "5min": TimeFrameEnum.MINUTE_5,
                    "15m": TimeFrameEnum.MINUTE_15,
                    "15min": TimeFrameEnum.MINUTE_15,
                    "30m": TimeFrameEnum.MINUTE_30,
                    "30min": TimeFrameEnum.MINUTE_30,
                    "1h": TimeFrameEnum.HOUR_1,
                    "1H": TimeFrameEnum.HOUR_1,
                    "4h": TimeFrameEnum.HOUR_1,  # Alpaca doesn't support 4h
                    "4H": TimeFrameEnum.HOUR_1,
                    "1d": TimeFrameEnum.DAY_1,
                    "1D": TimeFrameEnum.DAY_1,
                    "1w": TimeFrameEnum.WEEK_1,
                    "1W": TimeFrameEnum.WEEK_1,
                    "1wk": TimeFrameEnum.WEEK_1,
                    "1mo": TimeFrameEnum.MONTH_1,
                    "1M": TimeFrameEnum.MONTH_1,
                }

                tf_enum = timeframe_map.get(timeframe, TimeFrameEnum.DAY_1)

                # Calculate start date based on timeframe to get enough history
                now = datetime.now()
                if tf_enum in [TimeFrameEnum.MINUTE_1, TimeFrameEnum.MINUTE_5]:
                    start_date = now - timedelta(days=7)  # ~1 week of minute data
                elif tf_enum in [TimeFrameEnum.MINUTE_15, TimeFrameEnum.MINUTE_30]:
                    start_date = now - timedelta(days=30)  # 1 month
                elif tf_enum == TimeFrameEnum.HOUR_1:
                    start_date = now - timedelta(days=90)  # 3 months
                elif tf_enum == TimeFrameEnum.DAY_1:
                    start_date = now - timedelta(days=365 * 2)  # 2 years
                elif tf_enum == TimeFrameEnum.WEEK_1:
                    start_date = now - timedelta(days=365 * 5)  # 5 years
                else:  # MONTH_1
                    start_date = now - timedelta(days=365 * 10)  # 10 years

                # Fetch only what we need - add a small buffer for safety
                # Alpaca returns bars in ascending order (oldest first)
                fetch_limit = min(limit + 10, 1000)  # Don't over-fetch, cap at 1000
                if is_crypto:
                    bars = await self.alpaca_client.get_crypto_bars(
                        symbol=symbol,
                        timeframe=tf_enum,
                        start_date=start_date,
                        end_date=now,
                        limit=fetch_limit,
                    )
                else:
                    bars = await self.alpaca_client.get_bars(
                        symbol=symbol,
                        timeframe=tf_enum,
                        start_date=start_date,
                        end_date=now,
                        limit=fetch_limit,
                    )

                if not bars:
                    logger.warning(f"No bar data returned for {symbol}")
                    return []

                # Take the most recent N bars (last N since ascending order)
                bars = bars[-limit:] if len(bars) > limit else bars

                # Format for frontend (time as Unix timestamp)
                return [
                    {
                        "time": int(
                            datetime.fromisoformat(
                                bar["timestamp"].replace("Z", "+00:00")
                            ).timestamp()
                        ),
                        "open": bar["open"],
                        "high": bar["high"],
                        "low": bar["low"],
                        "close": bar["close"],
                        "volume": bar["volume"],
                    }
                    for bar in bars
                ]
            except DataError:
                raise
            except Exception as e:
                logger.error(
                    f"Error getting market bars for {symbol}: {e}", exc_info=True
                )
                raise DataError(message=f"Unable to fetch market bars for {symbol}")

        @self.app.get("/api/market/assets")
        async def search_assets(
            search: str = "",
            limit: int = 20,
            asset_class: Optional[str] = None,
        ):
            """
            Search for tradeable assets by symbol or company name.

            Args:
                search: Search query (matches symbol or name)
                limit: Maximum results (default 20)
                asset_class: Filter by 'us_equity' or 'crypto'

            Returns:
                List of matching assets with symbol, name, class, exchange
            """
            try:
                if not self.alpaca_client:
                    logger.warning("Alpaca client not available for assets search")
                    raise DataError(message="Market data service not available")

                assets = await self.alpaca_client.search_assets(
                    search=search,
                    asset_class=asset_class,
                    limit=limit,
                )

                return {"assets": assets}
            except DataError:
                raise
            except Exception as e:
                logger.error(f"Error searching assets: {e}", exc_info=True)
                raise DataError(message="Unable to search assets")

        async def get_positions():
            """Get current positions."""
            try:
                positions = []
                if self.config.trading.mode == "live" and self.ibkr_client:
                    ibkr_positions = await self.ibkr_client.get_positions()
                    positions = [PositionResponse(**pos) for pos in ibkr_positions]
                elif self.config.trading.mode == "paper" and self.paper_trader:
                    paper_positions = self.paper_trader.get_positions()
                    positions = [PositionResponse(**pos) for pos in paper_positions]

                return positions
            except DeepStackError:
                raise  # Let exception handler handle it
            except Exception as e:
                logger.error(f"Error getting positions: {e}", exc_info=True)
                raise DataError(message="Unable to retrieve positions")

        @self.app.get("/account", response_model=AccountSummaryResponse)
        async def get_account_summary(
            user: AuthenticatedUser = Depends(get_current_user),
        ):
            """Get account summary."""
            try:
                summary = AccountSummaryResponse(
                    cash=0.0,
                    buying_power=0.0,
                    portfolio_value=0.0,
                    day_pnl=0.0,
                    total_pnl=0.0,
                )

                if self.config.trading.mode == "live" and self.ibkr_client:
                    account_data = await self.ibkr_client.get_account_summary()
                    summary.cash = float(account_data.get("TotalCashValue", 0))
                    summary.buying_power = await self.ibkr_client.get_buying_power()
                elif self.config.trading.mode == "paper" and self.paper_trader:
                    summary.cash = self.paper_trader.cash
                    summary.buying_power = self.paper_trader.get_buying_power()
                    summary.portfolio_value = self.paper_trader.get_portfolio_value()

                return summary
            except DeepStackError:
                raise  # Let exception handler handle it
            except Exception as e:
                logger.error(f"Error getting account summary: {e}", exc_info=True)
                raise DataError(message="Unable to retrieve account summary")

        @self.app.post("/orders", response_model=OrderResponse)
        async def place_order(
            order: OrderRequest,
            user: AuthenticatedUser = Depends(get_current_user),
        ):
            """Place an order."""
            try:
                if not self.order_manager:
                    raise OrderExecutionError(
                        message="Order manager not initialized",
                        symbol=order.symbol,
                        order_type=order.order_type,
                        side=order.action,
                    )

                order_id = None

                if order.order_type == "MKT":
                    order_id = await self.order_manager.place_market_order(
                        order.symbol, order.quantity, order.action
                    )
                elif order.order_type == "LMT":
                    if order.limit_price is None:
                        raise ValidationError(
                            message="Limit price required for limit orders",
                            field="limit_price",
                        )
                    order_id = await self.order_manager.place_limit_order(
                        order.symbol, order.quantity, order.action, order.limit_price
                    )
                elif order.order_type == "STP":
                    if order.stop_price is None:
                        raise ValidationError(
                            message="Stop price required for stop orders",
                            field="stop_price",
                        )
                    order_id = await self.order_manager.place_stop_order(
                        order.symbol, order.quantity, order.action, order.stop_price
                    )
                else:
                    raise ValidationError(
                        message=f"Unsupported order type: {order.order_type}",
                        field="order_type",
                        value=order.order_type,
                    )

                if order_id:
                    return OrderResponse(
                        order_id=order_id,
                        status="submitted",
                        message=f"Order {order_id} submitted successfully",
                    )
                else:
                    return OrderResponse(
                        order_id=None,
                        status="failed",
                        message="Order submission failed",
                    )

            except DeepStackError:
                raise  # Let exception handler handle it
            except HTTPException:
                raise  # Let FastAPI handle HTTPException as-is
            except Exception as e:
                logger.error(f"Error placing order: {e}", exc_info=True)
                raise OrderExecutionError(
                    message="Unable to process order",
                    symbol=order.symbol,
                    order_type=order.order_type,
                    side=order.action,
                )

        @self.app.delete("/orders/{order_id}")
        async def cancel_order(
            order_id: str,
            user: AuthenticatedUser = Depends(get_current_user),
        ):
            """Cancel an order."""
            try:
                if not self.order_manager:
                    raise OrderExecutionError(
                        message="Order manager not initialized", order_id=order_id
                    )

                success = await self.order_manager.cancel_order(order_id)

                if success:
                    return {"status": "cancelled", "order_id": order_id}
                else:
                    raise OrderError(
                        message=f"Order {order_id} not found or could not be cancelled"
                    )

            except DeepStackError:
                raise  # Let exception handler handle it
            except HTTPException:
                raise  # Let FastAPI handle HTTPException as-is
            except Exception as e:
                logger.error(f"Error cancelling order {order_id}: {e}", exc_info=True)
                raise OrderExecutionError(
                    message="Unable to cancel order", order_id=order_id
                )

        @self.app.get(
            "/strategies/deep-value/screen",
            dependencies=[Depends(require_action(ActionCost.DEEP_VALUE_SCREEN))],
        )
        async def run_deep_value_screen():
            """Run Deep Value screener."""
            try:
                if not self.deep_value_strategy:
                    # Initialize with client if available
                    self.deep_value_strategy = DeepValueStrategy(client=self.av_client)

                # Define universe to screen
                # (e.g., S&P 500 top holdings or user watchlist)
                # For demonstration, we'll use a small list of popular stocks
                universe = [
                    "AAPL",
                    "MSFT",
                    "GOOGL",
                    "AMZN",
                    "TSLA",
                    "NVDA",
                    "META",
                    "BRK.B",
                    "JPM",
                    "JNJ",
                    "GME",
                    "AMC",
                    "INTC",
                    "AMD",
                ]

                opportunities = await self.deep_value_strategy.screen_market(universe)
                return [opp.to_dict() for opp in opportunities]
            except Exception as e:
                logger.error(f"Error running deep value screen: {e}", exc_info=True)
                raise DeepStackError(
                    message="Failed to run deep value screen", error_code="SCREEN_ERROR"
                )

        @self.app.post("/positions/hedged/create")
        async def create_hedged_position(
            request: HedgedPositionRequest,
            user: AuthenticatedUser = Depends(get_current_user),
        ):
            """Create a new hedged position."""
            try:
                if not self.hedged_position_manager:
                    self.hedged_position_manager = HedgedPositionManager()

                config = HedgedPositionConfig(
                    symbol=request.symbol,
                    entry_price=request.entry_price,
                    total_shares=request.total_shares,
                    conviction_pct=request.conviction_pct,
                    tactical_pct=request.tactical_pct,
                )

                position = self.hedged_position_manager.create_position(config)
                return position.to_dict()
            except Exception as e:
                logger.error(f"Error creating hedged position: {e}", exc_info=True)
                raise DeepStackError(
                    message="Failed to create hedged position",
                    error_code="POSITION_ERROR",
                )

        @self.app.get("/positions/hedged/{symbol}")
        async def get_hedged_position(symbol: str):
            """Get details of a hedged position."""
            try:
                if not self.hedged_position_manager:
                    self.hedged_position_manager = HedgedPositionManager()

                position = self.hedged_position_manager.get_position(symbol)
                if position:
                    return position.to_dict()
                else:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Hedged position for {symbol} not found",
                    )
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error getting hedged position: {e}", exc_info=True)
                raise DeepStackError(
                    message="Failed to get hedged position", error_code="POSITION_ERROR"
                )

        @self.app.post("/positions/manual")
        async def add_manual_position(
            request: ManualPositionRequest,
            user: AuthenticatedUser = Depends(get_current_user),
        ):
            """Manually add a position."""
            try:
                if not self.paper_trader:
                    raise DeepStackError(
                        message="Manual positions only available in paper trading mode",
                        error_code="INVALID_MODE",
                    )

                position = await self.paper_trader.add_manual_position(
                    request.symbol, request.quantity, request.avg_cost
                )
                return position
            except ValueError as e:
                raise ValidationError(message=str(e), field="quantity/avg_cost")
            except Exception as e:
                logger.error(f"Error adding manual position: {e}", exc_info=True)
                raise DeepStackError(
                    message="Failed to add manual position", error_code="POSITION_ERROR"
                )

        @self.app.get("/positions", response_model=PositionsListResponse)
        async def get_all_positions(
            user: AuthenticatedUser = Depends(get_current_user),
        ):
            """Get all current positions."""
            try:
                if not self.paper_trader:
                    raise DeepStackError(
                        message="Positions unavailable - paper trader not initialized",
                        error_code="TRADER_NOT_INITIALIZED",
                    )

                # Get positions from paper trader
                positions = self.paper_trader.get_positions()

                if not positions:
                    return PositionsListResponse(positions=[], total_value=0.0)

                # Enrich position data with current prices
                position_items = []
                total_value = 0.0

                for pos in positions:
                    symbol = pos["symbol"]
                    quantity = pos.get("quantity", 0)
                    avg_cost = pos.get("avg_cost", 0.0)

                    # Get current market price
                    current_price = await self.paper_trader._get_market_price(symbol)
                    if current_price is None:
                        # Fallback to average cost if price unavailable
                        current_price = avg_cost

                    # Calculate values
                    market_value = quantity * current_price
                    unrealized_pnl = market_value - (quantity * avg_cost)
                    total_value += market_value

                    position_items.append(
                        PositionItemResponse(
                            symbol=symbol,
                            quantity=quantity,
                            avg_cost=avg_cost,
                            current_price=current_price,
                            unrealized_pnl=unrealized_pnl,
                            market_value=market_value,
                        )
                    )

                return PositionsListResponse(
                    positions=position_items, total_value=total_value
                )

            except DeepStackError:
                raise  # Let exception handler handle it
            except Exception as e:
                logger.error(f"Error getting positions: {e}", exc_info=True)
                raise DataError(message="Unable to retrieve positions")

        # ============================================
        # STRIPE SUBSCRIPTION ENDPOINTS
        # ============================================

        @self.app.post(
            "/api/checkout/create-session", response_model=CheckoutSessionResponse
        )
        async def create_checkout_session(request: CheckoutSessionRequest):
            """
            Create Stripe checkout session for subscription.

            Args:
                request: Checkout session request with tier, user_id, and user_email

            Returns:
                Checkout session URL
            """
            try:
                # Configure Stripe API key
                stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

                if not stripe.api_key:
                    raise DeepStackError(
                        message="Stripe not configured",
                        error_code="STRIPE_NOT_CONFIGURED",
                    )

                # Map tier to Stripe price ID
                price_ids = {
                    "pro": os.getenv("STRIPE_PRICE_PRO"),
                    "elite": os.getenv("STRIPE_PRICE_ELITE"),
                }

                if request.tier not in price_ids:
                    raise ValidationError(
                        message=f"Invalid tier: {request.tier}",
                        field="tier",
                        value=request.tier,
                    )

                price_id = price_ids[request.tier]
                if not price_id:
                    raise DeepStackError(
                        message=(
                            f"Stripe price ID not configured "
                            f"for tier: {request.tier}"
                        ),
                        error_code="STRIPE_PRICE_NOT_CONFIGURED",
                    )

                # Create checkout session
                session = stripe.checkout.Session.create(
                    customer_email=request.user_email,
                    line_items=[{"price": price_id, "quantity": 1}],
                    mode="subscription",
                    success_url=("https://deepstack.trade/app?upgraded=true"),
                    cancel_url="https://deepstack.trade/pricing",
                    metadata={"user_id": request.user_id, "tier": request.tier},
                )

                logger.info(
                    f"Created checkout session for user {request.user_id}, "
                    f"tier {request.tier}"
                )
                return CheckoutSessionResponse(url=session.url)

            except DeepStackError:
                raise
            except Exception as e:
                logger.error(f"Error creating checkout session: {e}", exc_info=True)
                raise DeepStackError(
                    message="Failed to create checkout session",
                    error_code="STRIPE_CHECKOUT_ERROR",
                )

        @self.app.post("/api/webhooks/stripe")
        async def stripe_webhook(request: Request):
            """
            Handle Stripe webhook events for subscription lifecycle.

            Events handled:
            - checkout.session.completed: Create/upgrade subscription
            - customer.subscription.updated: Update subscription status
            - customer.subscription.deleted: Downgrade to free tier
            - invoice.payment_failed: Mark subscription as past_due
            """
            try:
                payload = await request.body()
                sig_header = request.headers.get("stripe-signature")

                stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
                webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

                if not webhook_secret:
                    logger.error("Stripe webhook secret not configured")
                    raise HTTPException(
                        status_code=500, detail="Webhook not configured"
                    )

                # Verify webhook signature
                try:
                    event = stripe.Webhook.construct_event(
                        payload, sig_header, webhook_secret
                    )
                except ValueError as e:
                    logger.error(f"Invalid webhook payload: {e}")
                    raise HTTPException(status_code=400, detail="Invalid payload")
                except stripe.error.SignatureVerificationError as e:
                    logger.error(f"Invalid webhook signature: {e}")
                    raise HTTPException(status_code=400, detail="Invalid signature")

                # Handle different event types
                event_type = event["type"]
                logger.info(f"Received Stripe webhook: {event_type}")

                if event_type == "checkout.session.completed":
                    session = event["data"]["object"]
                    await self._handle_checkout_completed(session)

                elif event_type == "customer.subscription.updated":
                    subscription = event["data"]["object"]
                    await self._handle_subscription_updated(subscription)

                elif event_type == "customer.subscription.deleted":
                    subscription = event["data"]["object"]
                    await self._handle_subscription_deleted(subscription)

                elif event_type == "invoice.payment_failed":
                    invoice = event["data"]["object"]
                    await self._handle_payment_failed(invoice)

                return {"status": "success"}

            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error handling Stripe webhook: {e}", exc_info=True)
                raise HTTPException(status_code=500, detail="Webhook processing failed")

        # Include options router
        self.app.include_router(options_router)

        # Include prediction markets router
        self.app.include_router(prediction_markets_router)

        # Include Perplexity Finance router
        self.app.include_router(perplexity_finance_router)

    async def _handle_checkout_completed(self, session: Dict[str, Any]):
        """
        Handle successful checkout completion.

        Updates user profile with subscription data AND allocates tier credits.
        """
        try:
            from supabase import create_client

            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

            if not supabase_url or not supabase_key:
                logger.error("Supabase credentials not configured")
                return

            supabase = create_client(supabase_url, supabase_key)

            user_id = session["metadata"]["user_id"]
            tier = session["metadata"]["tier"]
            customer_id = session["customer"]
            subscription_id = session["subscription"]

            # Update user profile with Stripe IDs
            (
                supabase.table("profiles")
                .update(
                    {
                        "stripe_customer_id": customer_id,
                        "stripe_subscription_id": subscription_id,
                        "subscription_status": "active",
                        "subscription_starts_at": datetime.now(
                            timezone.utc
                        ).isoformat(),
                    }
                )
                .eq("id", user_id)
                .execute()
            )

            # Allocate tier credits using database function
            # This sets subscription_tier, credits, billing_cycle_anchor, etc.
            credit_result = supabase.rpc(
                "allocate_tier_credits", {"p_user_id": user_id, "p_new_tier": tier}
            ).execute()

            if credit_result.data and credit_result.data.get("success"):
                logger.info(
                    f"Allocated {credit_result.data.get('credits')} credits "
                    f"for user {user_id} (tier: {tier})"
                )
            else:
                logger.error(
                    f"Failed to allocate credits for user {user_id}: "
                    f"{credit_result.data}"
                )

            logger.info(f"Updated subscription for user {user_id} to {tier}")

        except Exception as e:
            logger.error(f"Error handling checkout completion: {e}", exc_info=True)

    async def _handle_subscription_updated(self, subscription: Dict[str, Any]):
        """Handle subscription updates."""
        try:
            from supabase import create_client

            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

            if not supabase_url or not supabase_key:
                return

            supabase = create_client(supabase_url, supabase_key)

            customer_id = subscription["customer"]
            status = subscription["status"]

            # Update subscription status
            supabase.table("profiles").update({"subscription_status": status}).eq(
                "stripe_customer_id", customer_id
            ).execute()

            logger.info(
                f"Updated subscription status for customer {customer_id} to {status}"
            )

        except Exception as e:
            logger.error(f"Error handling subscription update: {e}", exc_info=True)

    async def _handle_subscription_deleted(self, subscription: Dict[str, Any]):
        """Handle subscription cancellation - downgrade to free."""
        try:
            from supabase import create_client

            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

            if not supabase_url or not supabase_key:
                return

            supabase = create_client(supabase_url, supabase_key)

            customer_id = subscription["customer"]

            # Downgrade to free tier
            (
                supabase.table("profiles")
                .update(
                    {
                        "subscription_tier": "free",
                        "subscription_status": "canceled",
                        "subscription_ends_at": datetime.now(timezone.utc).isoformat(),
                    }
                )
                .eq("stripe_customer_id", customer_id)
                .execute()
            )

            logger.info(f"Downgraded customer {customer_id} to free tier")

        except Exception as e:
            logger.error(f"Error handling subscription deletion: {e}", exc_info=True)

    async def _handle_payment_failed(self, invoice: Dict[str, Any]):
        """Handle failed payment."""
        try:
            from supabase import create_client

            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

            if not supabase_url or not supabase_key:
                return

            supabase = create_client(supabase_url, supabase_key)

            customer_id = invoice["customer"]

            # Mark subscription as past_due
            supabase.table("profiles").update({"subscription_status": "past_due"}).eq(
                "stripe_customer_id", customer_id
            ).execute()

            logger.warning(
                f"Payment failed for customer {customer_id}, marked as past_due"
            )

        except Exception as e:
            logger.error(f"Error handling payment failure: {e}", exc_info=True)

    def _setup_websocket(self):
        """Setup WebSocket endpoint for real-time updates."""

        @self.app.websocket("/ws")
        async def websocket_endpoint(websocket: WebSocket):
            """WebSocket endpoint for real-time updates."""
            await websocket.accept()
            self.websocket_connections.append(websocket)

            try:
                while True:
                    # Keep connection alive and listen for messages
                    data = await websocket.receive_text()

                    # Parse incoming JSON message
                    try:
                        message = json.loads(data)
                        msg_type = message.get("type", "")

                        if msg_type == "ping":
                            # Respond to heartbeat with pong
                            await websocket.send_json(
                                {
                                    "type": "heartbeat",
                                    "timestamp": datetime.now().isoformat(),
                                }
                            )
                        elif msg_type == "subscribe":
                            # Handle symbol subscription (placeholder for now)
                            symbols = message.get("symbols", [])
                            logger.debug(
                                f"WebSocket subscription request for: {symbols}"
                            )
                            await websocket.send_json(
                                {
                                    "type": "subscribed",
                                    "symbols": symbols,
                                    "timestamp": datetime.now().isoformat(),
                                }
                            )
                        elif msg_type == "unsubscribe":
                            # Handle unsubscription
                            symbols = message.get("symbols", [])
                            logger.debug(
                                f"WebSocket unsubscription request for: {symbols}"
                            )
                            await websocket.send_json(
                                {
                                    "type": "unsubscribed",
                                    "symbols": symbols,
                                    "timestamp": datetime.now().isoformat(),
                                }
                            )
                        else:
                            # Unknown message type - log but don't error
                            logger.debug(f"Unknown WebSocket message type: {msg_type}")

                    except json.JSONDecodeError:
                        logger.warning(
                            f"Invalid JSON received on WebSocket: {data[:100]}"
                        )
                        await websocket.send_json(
                            {
                                "type": "error",
                                "timestamp": datetime.now().isoformat(),
                                "data": {"message": "Invalid JSON message"},
                            }
                        )

            except WebSocketDisconnect:
                if websocket in self.websocket_connections:
                    self.websocket_connections.remove(websocket)
            except Exception as e:
                logger.error(f"WebSocket error: {e}")
                if websocket in self.websocket_connections:
                    self.websocket_connections.remove(websocket)

    async def broadcast_update(self, update_type: str, data: Dict[str, Any]):
        """
        Broadcast update to all connected WebSocket clients.

        Args:
            update_type: Type of update (e.g., 'position', 'quote', 'order')
            data: Update data
        """
        message = {
            "type": update_type,
            "timestamp": datetime.now().isoformat(),
            "data": data,
        }

        disconnected = []
        for websocket in self.websocket_connections:
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.warning(f"WebSocket broadcast failed: {type(e).__name__}: {e}")
                disconnected.append(websocket)

        if disconnected:
            logger.info(
                f"Cleaned up {len(disconnected)} disconnected WebSocket clients"
            )
        # Clean up disconnected clients
        for websocket in disconnected:
            if websocket in self.websocket_connections:
                self.websocket_connections.remove(websocket)

    def _initialize_news_clients(self):
        """Initialize news aggregation clients."""
        # Initialize Finnhub client (optional - needs API key)
        try:
            finnhub_key = self.config.finnhub_api_key
            if finnhub_key:
                self.finnhub_client = FinnhubClient(api_key=finnhub_key)
                logger.info("Finnhub client initialized")
            else:
                logger.info("Finnhub API key not configured - skipping")
        except Exception as e:
            logger.warning(f"Finnhub client init failed: {e}")

        # Initialize NewsAPI client (optional - needs API key)
        try:
            newsapi_key = self.config.newsapi_api_key
            if newsapi_key:
                self.newsapi_client = NewsAPIClient(api_key=newsapi_key)
                logger.info("NewsAPI client initialized")
            else:
                logger.info("NewsAPI key not configured - skipping")
        except Exception as e:
            logger.warning(f"NewsAPI client init failed: {e}")

        # Initialize StockTwits client (no API key needed)
        try:
            self.stocktwits_client = StockTwitsClient()
            logger.info("StockTwits client initialized")
        except Exception as e:
            logger.warning(f"StockTwits client init failed: {e}")

        # Initialize StockTwits hybrid scraper (API + Playwright fallback)
        try:
            self.stocktwits_scraper = StockTwitsScraper(
                api_client=self.stocktwits_client,
                use_api_first=True,
            )
            logger.info("StockTwits scraper initialized (hybrid mode)")
        except Exception as e:
            logger.warning(f"StockTwits scraper init failed: {e}")

        # Initialize RSS aggregator
        try:
            self.rss_aggregator = RSSAggregator()
            logger.info("RSS aggregator initialized")
        except Exception as e:
            logger.warning(f"RSS aggregator init failed: {e}")

        # Initialize the central news aggregator with all clients
        try:
            self.news_aggregator = NewsAggregator(
                finnhub_client=self.finnhub_client,
                newsapi_client=self.newsapi_client,
                alphavantage_client=self.av_client,
                alpaca_client=self.alpaca_client,
                rss_aggregator=self.rss_aggregator,
                stocktwits_client=self.stocktwits_client,
                stocktwits_scraper=self.stocktwits_scraper,
            )
            logger.info("News aggregator initialized with all available sources")
        except Exception as e:
            logger.warning(f"News aggregator init failed: {e}")

    def _initialize_components(self):
        """Initialize trading components synchronously."""
        # Initialize IBKR client (optional - may fail if IBKR not available)
        try:
            if (
                self.config.trading.mode == "live"
                or self.config.trading.mode == "paper"
            ):
                self.ibkr_client = IBKRClient(self.config)
                logger.info("IBKR client initialized")
        except Exception as e:
            logger.warning(f"IBKR client init failed (optional): {e}")
            # Continue - IBKR is not required for data-only operations

        # Initialize Alpaca client (required for market data/news)
        try:
            alpaca_key = self.config.alpaca_api_key
            alpaca_secret = self.config.alpaca_secret_key
            has_key = bool(alpaca_key)
            has_secret = bool(alpaca_secret)
            # Use print + logger to ensure visibility in Railway logs
            print(f"Alpaca config check: key={has_key}, secret={has_secret}")
            logger.warning(f"Alpaca config: key={has_key}, secret={has_secret}")
            if alpaca_key and alpaca_secret:
                self.alpaca_client = AlpacaClient(
                    api_key=alpaca_key,
                    secret_key=alpaca_secret,
                )
                print("Alpaca client initialized successfully")
                logger.warning("Alpaca client initialized successfully")
            else:
                logger.warning("Alpaca credentials not provided")
        except Exception as e:
            print(f"Alpaca client init failed: {e}")
            logger.error(f"Alpaca client init failed: {e}")

        # Initialize news aggregation clients
        self._initialize_news_clients()

        # Initialize paper trader (optional)
        try:
            if self.config.trading.mode == "paper" and self.alpaca_client:
                self.paper_trader = PaperTrader(self.config, self.alpaca_client)
                logger.info("Paper trader initialized with Alpaca client")
        except Exception as e:
            logger.warning(f"Paper trader init failed (optional): {e}")

        # Initialize order manager (optional)
        try:
            from ..risk.portfolio_risk import PortfolioRisk

            risk_manager = PortfolioRisk(self.config)
            self.order_manager = OrderManager(
                self.config, self.ibkr_client, self.paper_trader, risk_manager
            )
            logger.info("Order manager initialized")
        except Exception as e:
            logger.warning(f"Order manager init failed (optional): {e}")

        logger.info("Component initialization complete")

    async def initialize_trading_components(self):
        """Initialize trading components (IBKR client, paper trader, etc.)."""
        try:
            # Initialize IBKR client
            if (
                self.config.trading.mode == "live"
                or self.config.trading.mode == "paper"
            ):
                self.ibkr_client = IBKRClient(self.config)
                if self.config.trading.mode == "live":
                    # Only connect for live trading
                    connected = await self.ibkr_client.connect()
                    if not connected:
                        logger.warning("Failed to connect to IBKR for live trading")

            # Initialize paper trader
            if self.config.trading.mode == "paper" and self.alpaca_client:
                self.paper_trader = PaperTrader(self.config, self.alpaca_client)

            # Initialize order manager
            from ..risk.portfolio_risk import PortfolioRisk

            risk_manager = PortfolioRisk(self.config)
            self.order_manager = OrderManager(
                self.config, self.ibkr_client, self.paper_trader, risk_manager
            )

            logger.info("Trading components initialized successfully")

        except Exception as e:
            logger.error(f"Error initializing trading components: {e}")
            raise

    async def shutdown(self):
        """Shutdown the server and cleanup connections."""
        logger.info("Shutting down DeepStack API Server")

        # Close WebSocket connections
        for websocket in self.websocket_connections:
            try:
                await websocket.close()
            except Exception:
                pass  # nosec

        # Disconnect IBKR client
        if self.ibkr_client:
            await self.ibkr_client.disconnect()

        # Close Alpaca client (WebSocket streams and caches)
        if self.alpaca_client:
            try:
                await self.alpaca_client.close()
            except Exception as e:
                logger.error(f"Error closing Alpaca client: {e}")

    def get_app(self) -> FastAPI:
        """Get the FastAPI application instance."""
        return self.app


# Global server instance
_server_instance: Optional[DeepStackAPIServer] = None


def get_server() -> DeepStackAPIServer:
    """Get the global API server instance."""
    global _server_instance
    if _server_instance is None:
        _server_instance = DeepStackAPIServer()
    return _server_instance


def create_app() -> FastAPI:
    """Create and return FastAPI application."""
    server = get_server()
    return server.get_app()


app = create_app()
