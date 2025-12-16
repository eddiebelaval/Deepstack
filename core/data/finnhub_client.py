"""
Finnhub API Integration

Provides news aggregation from Finnhub with:
- General market news
- Company-specific news
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


class FinnhubClient:
    """
    Finnhub API client for DeepStack Trading System.

    Provides unified interface for:
    - General market news
    - Company-specific news
    - Rate limiting to respect API limits (60 req/min free tier)
    - Error handling with retry logic
    - Smart caching with configurable TTL
    """

    BASE_URL = "https://finnhub.io/api/v1"

    def __init__(
        self,
        api_key: str,
        rate_limit: int = 60,
        rate_limit_window: int = 60,
        max_retries: int = 3,
    ):
        """
        Initialize Finnhub client.

        Args:
            api_key: Finnhub API key
            rate_limit: Max requests per window (default: 60 for free tier)
            rate_limit_window: Time window in seconds (default: 60)
            max_retries: Maximum number of retry attempts (default: 3)
        """
        if not api_key:
            raise ValueError("API key is required")

        self.api_key = api_key
        self.max_retries = max_retries

        # Cache TTL values (5 minutes for news)
        self.cache_ttl = {
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
            f"FinnhubClient initialized "
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
            logger.info("Finnhub session closed")

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
            endpoint: API endpoint
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
            ttl_type: Type of data for TTL lookup ('news')

        Returns:
            Cached data or None if expired/missing
        """
        if cache_key not in self.cache:
            return None

        data, timestamp = self.cache[cache_key]
        ttl = self.cache_ttl.get(ttl_type, 300)

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
        self, endpoint: str, params: Dict[str, str], retry_count: int = 0
    ) -> Optional[Any]:
        """
        Make HTTP request to Finnhub API with retry logic.

        Args:
            endpoint: API endpoint (e.g., '/news', '/company-news')
            params: Query parameters
            retry_count: Current retry attempt

        Returns:
            Response data (list or dict) or None on error
        """
        try:
            await self._check_rate_limit()

            # Add API key to params (Finnhub uses 'token' parameter)
            params["token"] = self.api_key

            url = f"{self.BASE_URL}{endpoint}"

            session = await self._ensure_session()
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()

                    # Check for API error messages
                    if isinstance(data, dict) and "error" in data:
                        logger.error(f"API error: {data['error']}")
                        return None

                    return data

                elif response.status == 429:  # Too Many Requests
                    if retry_count < self.max_retries:
                        wait_time = min(60 * (2**retry_count), 300)
                        logger.warning(
                            f"429 Too Many Requests. Retrying in {wait_time}s"
                        )
                        await asyncio.sleep(wait_time)
                        return await self._make_request(
                            endpoint, params, retry_count + 1
                        )
                    raise RateLimitError(
                        "Rate limit exceeded, max retries reached",
                        service="finnhub",
                        retry_after=60,
                    )

                elif response.status == 401:
                    logger.error("Finnhub API authentication failed - invalid API key")
                    return None

                elif response.status == 403:
                    logger.error("Finnhub API access forbidden - check API permissions")
                    return None

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
                return await self._make_request(endpoint, params, retry_count + 1)
            return None

        except RateLimitError:
            # Re-raise rate limit errors
            raise

        except Exception as e:
            logger.error(f"Unexpected error making request: {e}")
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

    def _normalize_article(
        self, item: Dict[str, Any], symbol: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Normalize Finnhub article to standard format.

        Args:
            item: Raw Finnhub article data
            symbol: Optional symbol for filtering

        Returns:
            Normalized article dictionary
        """
        # Extract symbols from 'related' field (comma-separated)
        related = item.get("related", "")
        symbols = (
            [s.strip() for s in related.split(",") if s.strip()] if related else []
        )

        # If a specific symbol was requested and it's in related, ensure it's included
        if symbol and symbol not in symbols:
            symbols.insert(0, symbol)

        # Convert Unix timestamp to ISO format
        timestamp = item.get("datetime", 0)
        published_at = ""
        if timestamp:
            try:
                dt = datetime.utcfromtimestamp(timestamp)
                published_at = dt.isoformat() + "Z"
            except (ValueError, OSError) as e:
                logger.warning(f"Invalid timestamp {timestamp}: {e}")
                published_at = ""

        return {
            "id": f"finnhub_{item.get('id', '')}",
            "headline": item.get("headline", ""),
            "summary": item.get("summary", ""),
            "url": item.get("url", ""),
            "source": item.get("source", ""),
            "source_provider": "finnhub",
            "publishedAt": published_at,
            "symbols": symbols,
            "author": "",  # Finnhub doesn't provide author
            "sentiment": "neutral",  # Finnhub doesn't provide sentiment
            "sentiment_score": 0.0,
            "imageUrl": item.get("image", ""),
        }

    async def get_news(
        self,
        symbol: Optional[str] = None,
        category: str = "general",
        limit: int = 50,
    ) -> Dict[str, Any]:
        """
        Get market news from Finnhub.

        Uses either the general market news endpoint or company-specific news
        depending on whether a symbol is provided.

        Args:
            symbol: Optional ticker to filter by (e.g., 'AAPL')
            category: News category for general news (default 'general')
                      Options: 'general', 'forex', 'crypto', 'merger'
            limit: Max number of articles (default 50)

        Returns:
            Dict with 'articles' list containing normalized news data

            Example article:
            {
                'id': 'finnhub_12345',
                'headline': 'Apple Reports Record Quarter',
                'summary': 'Apple Inc announced...',
                'url': 'https://example.com/article',
                'source': 'Reuters',
                'source_provider': 'finnhub',
                'publishedAt': '2024-01-15T10:30:00Z',
                'symbols': ['AAPL'],
                'author': '',
                'sentiment': 'neutral',
                'sentiment_score': 0.0,
                'imageUrl': 'https://...'
            }
        """
        try:
            # Build cache key
            cache_params = {"limit": limit}
            if symbol:
                cache_params["symbol"] = symbol
            else:
                cache_params["category"] = category

            cache_key = self._get_cache_key("NEWS", cache_params)

            # Check cache (5 minute TTL for news)
            cached = self._get_from_cache(cache_key, "news")
            if cached:
                return cached

            # Determine endpoint and parameters based on symbol
            if symbol:
                # Company-specific news
                symbol = self._validate_symbol(symbol)
                endpoint = "/company-news"

                # Finnhub company news requires date range
                # Get news from last 7 days
                to_date = datetime.now()
                from_date = to_date - timedelta(days=7)

                params = {
                    "symbol": symbol,
                    "from": from_date.strftime("%Y-%m-%d"),
                    "to": to_date.strftime("%Y-%m-%d"),
                }
            else:
                # General market news
                endpoint = "/news"
                params = {
                    "category": category,
                }

            # Make API request
            data = await self._make_request(endpoint, params)

            if data is None:
                logger.warning("No news data from Finnhub")
                return {"articles": [], "next_page_token": None}

            # Finnhub returns a list of articles directly
            if not isinstance(data, list):
                logger.warning(f"Unexpected Finnhub response format: {type(data)}")
                return {"articles": [], "next_page_token": None}

            # Normalize articles to match standard format
            articles = []
            for item in data[:limit]:  # Apply limit
                article = self._normalize_article(item, symbol)
                articles.append(article)

            result = {"articles": articles, "next_page_token": None}

            # Cache with 5 minute TTL for news
            self._set_cache(cache_key, result)

            logger.info(f"Retrieved {len(articles)} news articles from Finnhub")
            return result

        except ValueError as e:
            logger.error(f"Validation error: {e}")
            return {"articles": [], "next_page_token": None}
        except RateLimitError:
            # Re-raise rate limit errors for proper handling upstream
            raise
        except Exception as e:
            logger.error(f"Error getting news from Finnhub: {e}")
            return {"articles": [], "next_page_token": None}

    def clear_cache(self, cache_type: Optional[str] = None) -> None:
        """
        Clear cached data.

        Args:
            cache_type: Specific cache type to clear ('news')
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

    async def health_check(self) -> bool:
        """
        Check API connectivity and credentials.

        Returns:
            True if API is accessible and credentials are valid
        """
        try:
            # Try to get general news (requires minimal permissions)
            result = await self.get_news(category="general", limit=1)
            return result is not None and "articles" in result
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False
