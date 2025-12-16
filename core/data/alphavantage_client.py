"""
Alpha Vantage API Integration

Provides fundamental data and company metrics from Alpha Vantage with:
- Fundamental metrics (P/E, P/B, ROE, FCF yield)
- Earnings data (quarterly and annual)
- Insider transactions
- Company overview
- Rate limiting and error handling
- Async operations with caching
"""

import asyncio
import hashlib
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import aiohttp

from core.exceptions import RateLimitError

logger = logging.getLogger(__name__)


class AlphaVantageClient:
    """
    Alpha Vantage API client for DeepStack Trading System.

    Provides unified interface for:
    - Fundamental metrics (P/E, P/B, ROE, FCF yield)
    - Earnings data (quarterly and annual)
    - Insider transactions
    - Company overview
    - Rate limiting to respect API limits
    - Error handling with retry logic
    - Smart caching with configurable TTL
    """

    BASE_URL = "https://www.alphavantage.co/query"

    def __init__(
        self,
        api_key: str,
        cache_ttl: Optional[Dict[str, int]] = None,
        rate_limit: int = 5,
        rate_limit_window: int = 60,
        max_retries: int = 3,
    ):
        """
        Initialize Alpha Vantage client.

        Args:
            api_key: Alpha Vantage API key
            cache_ttl: Cache TTL in seconds for different data types
                Default: {
                    'fundamentals': 86400,  # 24 hours
                    'earnings': 21600,      # 6 hours
                    'insider': 3600,        # 1 hour
                    'overview': 86400       # 24 hours
                }
            rate_limit: Max requests per window (default: 5 for free tier)
            rate_limit_window: Time window in seconds (default: 60)
            max_retries: Maximum number of retry attempts (default: 3)
        """
        if not api_key:
            raise ValueError("API key is required")

        self.api_key = api_key
        self.max_retries = max_retries

        # Default cache TTL values
        self.cache_ttl = cache_ttl or {
            "fundamentals": 86400,  # 24 hours (slow-changing data)
            "earnings": 21600,  # 6 hours (quarterly updates)
            "insider": 3600,  # 1 hour (more frequent)
            "overview": 86400,  # 24 hours
            "news": 300,  # 5 minutes (news should be fresh)
        }

        # Rate limiting
        self.rate_limit = rate_limit
        self.rate_limit_window = rate_limit_window
        self.request_timestamps: List[float] = []

        # Cache storage: {cache_key: (data, timestamp)}
        self.cache: Dict[str, tuple] = {}

        # Session for connection pooling
        self.session: Optional[aiohttp.ClientSession] = None

        logger.info(
            f"AlphaVantageClient initialized "
            f"rate_limit={rate_limit}/{rate_limit_window}s"
        )

    async def _ensure_session(self) -> aiohttp.ClientSession:
        """Ensure aiohttp session exists."""
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession()
        return self.session

    async def close(self):
        """Close the HTTP session."""
        if self.session and not self.session.closed:
            await self.session.close()
            logger.info("AlphaVantage session closed")

    async def _check_rate_limit(self) -> None:
        """
        Check and enforce rate limits with exponential backoff.

        Raises:
            RateLimitError: If rate limit is exceeded beyond retry window
        """
        current_time = time.time()

        # Remove old timestamps outside the window
        self.request_timestamps = [
            ts
            for ts in self.request_timestamps
            if current_time - ts < self.rate_limit_window
        ]

        # Check if we've exceeded the limit
        if len(self.request_timestamps) >= self.rate_limit:
            wait_time = (
                self.request_timestamps[0] + self.rate_limit_window - current_time
            )
            logger.warning(
                f"Rate limit reached: {len(self.request_timestamps)}/{self.rate_limit} "
                f"in last {self.rate_limit_window}s. Waiting {wait_time:.2f}s"
            )
            await asyncio.sleep(wait_time + 0.1)
            return await self._check_rate_limit()

        # Record this request
        self.request_timestamps.append(current_time)

    def _get_cache_key(self, endpoint: str, params: Dict[str, Any]) -> str:
        """
        Generate cache key from endpoint and parameters.

        Args:
            endpoint: API endpoint/function
            params: Query parameters

        Returns:
            Cache key string
        """
        # Create stable hash of parameters
        # usedforsecurity=False: MD5 is safe here as it's only for cache key generation,
        # not for cryptographic verification. This silences security scanner warnings.
        params_str = json.dumps(params, sort_keys=True)
        params_hash = hashlib.md5(
            params_str.encode(), usedforsecurity=False
        ).hexdigest()[:8]
        return f"{endpoint}:{params_hash}"

    def _get_from_cache(self, cache_key: str, ttl_type: str) -> Optional[Dict]:
        """
        Get data from cache if not expired.

        Args:
            cache_key: Cache key
            ttl_type: Type of data for TTL lookup ('fundamentals', 'earnings', etc.)

        Returns:
            Cached data or None if expired/missing
        """
        if cache_key not in self.cache:
            return None

        data, timestamp = self.cache[cache_key]
        ttl = self.cache_ttl.get(ttl_type, 3600)

        if datetime.now() - timestamp < timedelta(seconds=ttl):
            logger.debug(f"Cache hit for {cache_key}")
            return data

        # Cache expired
        logger.debug(f"Cache expired for {cache_key}")
        del self.cache[cache_key]
        return None

    def _set_cache(self, cache_key: str, data: Dict) -> None:
        """
        Store data in cache.

        Args:
            cache_key: Cache key
            data: Data to cache
        """
        self.cache[cache_key] = (data, datetime.now())

    async def _make_request(
        self, params: Dict[str, str], retry_count: int = 0
    ) -> Optional[Dict]:
        """
        Make HTTP request to Alpha Vantage API with retry logic.

        Args:
            params: Query parameters
            retry_count: Current retry attempt

        Returns:
            Response data as dict or None on error
        """
        try:
            await self._check_rate_limit()

            # Add API key to params
            params["apikey"] = self.api_key

            session = await self._ensure_session()
            async with session.get(self.BASE_URL, params=params) as response:
                if response.status == 200:
                    data = await response.json()

                    # Check for API error messages
                    if "Error Message" in data:
                        logger.error(f"API error: {data['Error Message']}")
                        return None

                    # Check for rate limit message
                    if "Note" in data and "rate limit" in data["Note"].lower():
                        logger.warning(f"Rate limit message: {data['Note']}")
                        if retry_count < self.max_retries:
                            wait_time = min(60 * (2**retry_count), 300)
                            retries = self.max_retries
                            logger.info(
                                f"Retry in {wait_time}s ({retry_count+1}/{retries})"
                            )
                            await asyncio.sleep(wait_time)
                            return await self._make_request(params, retry_count + 1)
                        return None

                    return data

                elif response.status == 429:  # Too Many Requests
                    if retry_count < self.max_retries:
                        wait_time = min(60 * (2**retry_count), 300)
                        logger.warning(
                            f"429 Too Many Requests. Retrying in {wait_time}s"
                        )
                        await asyncio.sleep(wait_time)
                        return await self._make_request(params, retry_count + 1)
                    raise RateLimitError("Rate limit exceeded, max retries reached")

                else:
                    logger.error(
                        f"HTTP error {response.status}: {await response.text()}"
                    )
                    return None

        except aiohttp.ClientError as e:
            logger.error(f"Network error: {e}")
            if retry_count < self.max_retries:
                wait_time = min(10 * (2**retry_count), 60)
                logger.info(f"Retrying in {wait_time}s")
                await asyncio.sleep(wait_time)
                return await self._make_request(params, retry_count + 1)
            return None

        except Exception as e:
            logger.error(f"Unexpected error making request: {e}")
            return None

    def _parse_float(self, value: Any) -> Optional[float]:
        """
        Safely parse float value from API response.

        Handles: None, "None", "N/A", "-", empty string

        Args:
            value: Value to parse

        Returns:
            Float value or None
        """
        if value is None or value == "None" or value == "N/A" or value == "-":
            return None

        try:
            return float(value)
        except (ValueError, TypeError):
            return None

    def _parse_date(self, date_str: str) -> Optional[str]:
        """
        Parse and validate date string.

        Args:
            date_str: Date string (expected format: YYYY-MM-DD)

        Returns:
            Validated date string or None
        """
        if not date_str or date_str == "None":
            return None

        try:
            # Validate date format
            datetime.strptime(date_str, "%Y-%m-%d")
            return date_str
        except ValueError:
            logger.warning(f"Invalid date format: {date_str}")
            return None

    def _validate_symbol(self, symbol: str) -> str:
        """
        Validate and normalize stock symbol.

        Args:
            symbol: Stock symbol

        Returns:
            Normalized symbol

        Raises:
            ValueError: If symbol is invalid
        """
        if not symbol or not isinstance(symbol, str):
            raise ValueError("Symbol must be a non-empty string")

        symbol = symbol.strip().upper()

        # Basic validation: alphanumeric and dots only
        if not all(c.isalnum() or c == "." for c in symbol):
            raise ValueError(f"Invalid symbol format: {symbol}")

        return symbol

    async def get_company_overview(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        Get company overview data including sector, industry, market cap.

        Args:
            symbol: Stock symbol (e.g., 'AAPL')

        Returns:
            Company overview data or None on error

            Example response:
            {
                'symbol': 'AAPL',
                'name': 'Apple Inc',
                'exchange': 'NASDAQ',
                'sector': 'Technology',
                'industry': 'Consumer Electronics',
                'market_cap': 2800000000000,
                'pe_ratio': 28.5,
                'peg_ratio': 2.1,
                'book_value': 4.25,
                'dividend_yield': 0.0055,
                'eps': 6.15,
                'revenue_ttm': 385000000000,
                'profit_margin': 0.25,
                'operating_margin': 0.30,
                'roe': 0.45,
                'roa': 0.20,
                'debt_to_equity': 1.8
            }
        """
        try:
            symbol = self._validate_symbol(symbol)

            # Check cache
            cache_key = self._get_cache_key("OVERVIEW", {"symbol": symbol})
            cached = self._get_from_cache(cache_key, "overview")
            if cached:
                return cached

            # Make API request
            params = {"function": "OVERVIEW", "symbol": symbol}
            data = await self._make_request(params)

            if not data or not data.get("Symbol"):
                logger.warning(f"No overview data for {symbol}")
                return None

            # Parse response
            result = {
                "symbol": symbol,
                "name": data.get("Name"),
                "exchange": data.get("Exchange"),
                "sector": data.get("Sector"),
                "industry": data.get("Industry"),
                "market_cap": self._parse_float(data.get("MarketCapitalization")),
                "pe_ratio": self._parse_float(data.get("PERatio")),
                "peg_ratio": self._parse_float(data.get("PEGRatio")),
                "book_value": self._parse_float(data.get("BookValue")),
                "dividend_yield": self._parse_float(data.get("DividendYield")),
                "eps": self._parse_float(data.get("EPS")),
                "revenue_ttm": self._parse_float(data.get("RevenueTTM")),
                "profit_margin": self._parse_float(data.get("ProfitMargin")),
                "operating_margin": self._parse_float(data.get("OperatingMarginTTM")),
                "roe": self._parse_float(data.get("ReturnOnEquityTTM")),
                "roa": self._parse_float(data.get("ReturnOnAssetsTTM")),
                "debt_to_equity": self._parse_float(data.get("DebtToEquity")),
            }

            # Cache result
            self._set_cache(cache_key, result)

            logger.debug(f"Retrieved overview for {symbol}: {result['name']}")
            return result

        except ValueError as e:
            logger.error(f"Validation error: {e}")
            return None
        except Exception as e:
            logger.error(f"Error getting overview for {symbol}: {e}")
            return None

    async def get_fundamentals(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        Get fundamental metrics: P/E ratio, P/B ratio, ROE, FCF yield.

        Uses OVERVIEW endpoint and calculates derived metrics.

        Args:
            symbol: Stock symbol

        Returns:
            Fundamental metrics or None on error

            Example response:
            {
                'symbol': 'AAPL',
                'pe_ratio': 28.5,
                'pb_ratio': 40.2,
                'roe': 0.45,
                'fcf_yield': 0.035,
                'ev_ebitda': 22.3,
                'current_ratio': 1.07,
                'debt_to_equity': 1.8,
                'timestamp': '2024-01-15T10:30:00'
            }
        """
        try:
            symbol = self._validate_symbol(symbol)

            # Check cache
            cache_key = self._get_cache_key("FUNDAMENTALS", {"symbol": symbol})
            cached = self._get_from_cache(cache_key, "fundamentals")
            if cached:
                return cached

            # Get overview data
            overview = await self.get_company_overview(symbol)
            if not overview:
                return None

            # Calculate P/B ratio if we have market cap and book value
            pb_ratio = None
            if overview.get("market_cap") and overview.get("book_value"):
                # Get shares outstanding from earnings
                # For now, estimate from market cap / book value per share
                pb_ratio = overview["market_cap"] / (
                    overview["book_value"] * overview["market_cap"] / 1000000000
                )  # Rough estimate

            result = {
                "symbol": symbol,
                "pe_ratio": overview.get("pe_ratio"),
                "pb_ratio": pb_ratio,  # Calculated above
                "roe": overview.get("roe"),
                "fcf_yield": None,  # Would need cash flow statement
                "ev_ebitda": None,  # Would need EBITDA calculation
                "current_ratio": None,  # Would need balance sheet
                "debt_to_equity": overview.get("debt_to_equity"),
                "profit_margin": overview.get("profit_margin"),
                "operating_margin": overview.get("operating_margin"),
                "timestamp": datetime.now().isoformat(),
            }

            # Cache result
            self._set_cache(cache_key, result)

            logger.debug(f"Retrieved fundamentals for {symbol}")
            return result

        except Exception as e:
            logger.error(f"Error getting fundamentals for {symbol}: {e}")
            return None

    async def get_earnings(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        Get quarterly and annual earnings data.

        Args:
            symbol: Stock symbol

        Returns:
            Earnings data or None on error

            Example response:
            {
                'symbol': 'AAPL',
                'quarterly': [
                    {
                        'fiscal_date_ending': '2024-03-31',
                        'reported_date': '2024-04-28',
                        'reported_eps': 1.52,
                        'estimated_eps': 1.50,
                        'surprise': 0.02,
                        'surprise_percentage': 1.33
                    },
                    ...
                ],
                'annual': [
                    {
                        'fiscal_date_ending': '2023-12-31',
                        'reported_eps': 6.15
                    },
                    ...
                ]
            }
        """
        try:
            symbol = self._validate_symbol(symbol)

            # Check cache
            cache_key = self._get_cache_key("EARNINGS", {"symbol": symbol})
            cached = self._get_from_cache(cache_key, "earnings")
            if cached:
                return cached

            # Make API request
            params = {"function": "EARNINGS", "symbol": symbol}
            data = await self._make_request(params)

            if not data or (
                not data.get("quarterlyEarnings") and not data.get("annualEarnings")
            ):
                logger.warning(f"No earnings data for {symbol}")
                return None

            # Parse quarterly earnings
            quarterly = []
            for q in data.get("quarterlyEarnings", [])[:8]:  # Last 8 quarters
                quarterly.append(
                    {
                        "fiscal_date_ending": self._parse_date(
                            q.get("fiscalDateEnding")
                        ),
                        "reported_date": self._parse_date(q.get("reportedDate")),
                        "reported_eps": self._parse_float(q.get("reportedEPS")),
                        "estimated_eps": self._parse_float(q.get("estimatedEPS")),
                        "surprise": self._parse_float(q.get("surprise")),
                        "surprise_percentage": self._parse_float(
                            q.get("surprisePercentage")
                        ),
                    }
                )

            # Parse annual earnings
            annual = []
            for a in data.get("annualEarnings", [])[:5]:  # Last 5 years
                annual.append(
                    {
                        "fiscal_date_ending": self._parse_date(
                            a.get("fiscalDateEnding")
                        ),
                        "reported_eps": self._parse_float(a.get("reportedEPS")),
                    }
                )

            result = {"symbol": symbol, "quarterly": quarterly, "annual": annual}

            # Cache result
            self._set_cache(cache_key, result)

            logger.debug(f"Earnings {symbol}: {len(quarterly)} qtr, {len(annual)} ann")
            return result

        except ValueError as e:
            logger.error(f"Validation error: {e}")
            return None
        except Exception as e:
            logger.error(f"Error getting earnings for {symbol}: {e}")
            return None

    async def get_insider_transactions(
        self, symbol: str
    ) -> Optional[List[Dict[str, Any]]]:
        """
        Get insider transaction data (buying/selling activity).

        Note: Alpha Vantage doesn't have a direct insider transactions endpoint.
        This is a placeholder that would need a different data source or
        use the NEWS_SENTIMENT endpoint filtered for insider trading news.

        Args:
            symbol: Stock symbol

        Returns:
            List of insider transactions or None

            Example response:
            [
                {
                    'symbol': 'AAPL',
                    'insider_name': 'John Doe',
                    'relation': 'Chief Executive Officer',
                    'transaction_type': 'Purchase',
                    'shares': 10000,
                    'price_per_share': 150.25,
                    'transaction_date': '2024-01-15',
                    'value': 1502500
                },
                ...
            ]
        """
        try:
            symbol = self._validate_symbol(symbol)

            # Check cache
            cache_key = self._get_cache_key("INSIDER", {"symbol": symbol})
            cached = self._get_from_cache(cache_key, "insider")
            if cached:
                return cached

            # Alpha Vantage doesn't have direct insider transactions
            # Would need to integrate with SEC Edgar or another source
            # For now, return empty list with warning
            logger.warning(
                f"Insider transactions not available from Alpha Vantage for {symbol}. "
                "Consider integrating SEC Edgar API."
            )

            result = []

            # Cache result
            self._set_cache(cache_key, result)

            return result

        except ValueError as e:
            logger.error(f"Validation error: {e}")
            return None
        except Exception as e:
            logger.error(f"Error getting insider transactions for {symbol}: {e}")
            return None

    async def get_earnings_calendar(
        self,
        symbol: Optional[str] = None,
        horizon: str = "3month",
    ) -> Optional[List[Dict[str, Any]]]:
        """
        Get upcoming earnings calendar events.

        Uses Alpha Vantage's EARNINGS_CALENDAR API which returns CSV data
        with upcoming earnings announcements.

        Args:
            symbol: Optional stock symbol to filter by (e.g., 'AAPL')
            horizon: Time horizon - '3month', '6month', or '12month' (default: 3month)

        Returns:
            List of earnings events or None on error

            Example response:
            [
                {
                    'symbol': 'AAPL',
                    'name': 'Apple Inc',
                    'report_date': '2024-01-25',
                    'fiscal_date_ending': '2023-12-31',
                    'estimate': 2.10,
                    'currency': 'USD'
                },
                ...
            ]
        """
        try:
            # Validate horizon parameter
            valid_horizons = ["3month", "6month", "12month"]
            if horizon not in valid_horizons:
                logger.warning(f"Invalid horizon '{horizon}', using '3month'")
                horizon = "3month"

            # Validate symbol if provided
            if symbol:
                symbol = self._validate_symbol(symbol)

            # Check cache (use 6-hour TTL for calendar data to respect rate limits)
            cache_params = {"horizon": horizon}
            if symbol:
                cache_params["symbol"] = symbol
            cache_key = self._get_cache_key("EARNINGS_CALENDAR", cache_params)
            cached = self._get_from_cache(cache_key, "earnings")
            if cached:
                return cached

            # Build API request parameters
            params = {
                "function": "EARNINGS_CALENDAR",
                "horizon": horizon,
            }
            if symbol:
                params["symbol"] = symbol

            # Make API request (returns CSV, not JSON)
            await self._check_rate_limit()
            params["apikey"] = self.api_key

            session = await self._ensure_session()
            async with session.get(self.BASE_URL, params=params) as response:
                if response.status != 200:
                    logger.error(f"Earnings calendar API returned {response.status}")
                    return None

                csv_text = await response.text()

                # Check for API error messages in CSV
                if "Error" in csv_text or "Thank you" in csv_text:
                    logger.error(f"Earnings calendar API error: {csv_text[:200]}")
                    return None

                # Parse CSV response
                import csv
                import io

                reader = csv.DictReader(io.StringIO(csv_text))
                result = []

                for row in reader:
                    # Parse each row from CSV
                    event = {
                        "symbol": row.get("symbol", ""),
                        "name": row.get("name", ""),
                        "report_date": row.get("reportDate", ""),
                        "fiscal_date_ending": row.get("fiscalDateEnding", ""),
                        "estimate": self._parse_float(row.get("estimate")),
                        "currency": row.get("currency", "USD"),
                    }
                    result.append(event)

                logger.info(
                    f"Retrieved {len(result)} earnings calendar events "
                    f"(horizon={horizon}, symbol={symbol or 'all'})"
                )

                # Cache result
                self._set_cache(cache_key, result)

                return result

        except ValueError as e:
            logger.error(f"Validation error: {e}")
            return None
        except Exception as e:
            logger.error(f"Error getting earnings calendar: {e}")
            return None

    def clear_cache(self, cache_type: Optional[str] = None) -> None:
        """
        Clear cached data.

        Args:
            cache_type: Specific cache type to clear ('fundamentals', 'earnings', etc.)
                       If None, clears all cache
        """
        if cache_type:
            # Clear specific cache type
            keys_to_delete = [
                k for k in self.cache.keys() if k.startswith(cache_type.upper())
            ]
            for key in keys_to_delete:
                del self.cache[key]
            logger.info(f"Cleared {len(keys_to_delete)} {cache_type} cache entries")
        else:
            # Clear all cache
            count = len(self.cache)
            self.cache.clear()
            logger.info(f"Cleared all cache ({count} entries)")

    def get_cache_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics.

        Returns:
            Dictionary with cache info
        """
        return {
            "total_cached_items": len(self.cache),
            "rate_limit": self.rate_limit,
            "rate_limit_window": self.rate_limit_window,
            "recent_requests": len(self.request_timestamps),
            "cache_ttl": self.cache_ttl,
        }

    async def get_news(
        self,
        symbol: Optional[str] = None,
        topics: Optional[List[str]] = None,
        limit: int = 50,
        sort: str = "LATEST",
    ) -> Dict[str, Any]:
        """
        Get market news with sentiment from Alpha Vantage NEWS_SENTIMENT API.

        Args:
            symbol: Optional ticker to filter by (e.g., 'AAPL')
            topics: Optional list of topics (e.g., ['technology', 'earnings'])
            limit: Max number of articles (default 50, max 1000)
            sort: Sort order - 'LATEST', 'EARLIEST', or 'RELEVANCE'

        Returns:
            Dict with 'articles' list containing news with sentiment data

            Example article:
            {
                'id': 'av_12345',
                'headline': 'Apple Reports Record Quarter',
                'summary': 'Apple Inc announced...',
                'url': 'https://example.com/article',
                'source': 'Reuters',
                'publishedAt': '2024-01-15T10:30:00Z',
                'symbols': ['AAPL'],
                'author': 'John Doe',
                'sentiment': 'positive',
                'sentiment_score': 0.75,
                'source_provider': 'alphavantage'
            }
        """
        try:
            # Build cache key
            cache_params = {"limit": limit, "sort": sort}
            if symbol:
                cache_params["symbol"] = symbol
            if topics:
                cache_params["topics"] = ",".join(topics)

            cache_key = self._get_cache_key("NEWS_SENTIMENT", cache_params)

            # Use shorter TTL for news (5 minutes)
            cached = self._get_from_cache(cache_key, "news")
            if cached:
                return cached

            # Build API request parameters
            params = {
                "function": "NEWS_SENTIMENT",
                "limit": str(min(limit, 1000)),  # API max is 1000
                "sort": sort,
            }

            if symbol:
                # Alpha Vantage uses 'tickers' parameter
                params["tickers"] = self._validate_symbol(symbol)

            if topics:
                params["topics"] = ",".join(topics)

            # Make API request
            data = await self._make_request(params)

            if not data or "feed" not in data:
                logger.warning("No news feed data from Alpha Vantage")
                return {"articles": [], "next_page_token": None}

            # Parse and normalize articles to match Alpaca format
            articles = []
            for item in data.get("feed", []):
                # Extract sentiment label from score
                overall_score = self._parse_float(
                    item.get("overall_sentiment_score", 0)
                )
                if overall_score is None:
                    overall_score = 0

                if overall_score >= 0.15:
                    sentiment = "positive"
                elif overall_score <= -0.15:
                    sentiment = "negative"
                else:
                    sentiment = "neutral"

                # Extract ticker symbols from ticker_sentiment
                symbols = []
                for ticker_data in item.get("ticker_sentiment", []):
                    ticker = ticker_data.get("ticker", "")
                    # Skip crypto/forex prefixes for consistency
                    if ":" not in ticker:
                        symbols.append(ticker)

                # Parse time_published (format: YYYYMMDDTHHMMSS)
                time_published = item.get("time_published", "")
                published_at = ""
                if time_published:
                    try:
                        # Parse Alpha Vantage format: 20240115T103000
                        dt = datetime.strptime(time_published, "%Y%m%dT%H%M%S")
                        published_at = dt.isoformat() + "Z"
                    except ValueError:
                        published_at = time_published

                article = {
                    "id": f"av_{hash(item.get('url', '')) & 0xFFFFFFFF}",
                    "headline": item.get("title", ""),
                    "summary": item.get("summary", ""),
                    "url": item.get("url", ""),
                    "source": item.get("source", ""),
                    "publishedAt": published_at,
                    "symbols": symbols,
                    "author": ", ".join(item.get("authors", [])),
                    "sentiment": sentiment,
                    "sentiment_score": overall_score,
                    "source_provider": "alphavantage",
                }
                articles.append(article)

            result = {"articles": articles, "next_page_token": None}

            # Cache with 5 minute TTL for news
            self._set_cache(cache_key, result)

            logger.info(f"Retrieved {len(articles)} news articles from Alpha Vantage")
            return result

        except ValueError as e:
            logger.error(f"Validation error: {e}")
            return {"articles": [], "next_page_token": None}
        except Exception as e:
            logger.error(f"Error getting news from Alpha Vantage: {e}")
            return {"articles": [], "next_page_token": None}

    async def health_check(self) -> bool:
        """
        Check API connectivity and credentials.

        Returns:
            True if API is accessible and credentials are valid
        """
        try:
            # Try to get overview for a known symbol
            overview = await self.get_company_overview("AAPL")
            return overview is not None and overview.get("symbol") == "AAPL"
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False
