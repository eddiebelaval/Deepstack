"""
StockTwits API Integration

Provides social sentiment data from StockTwits with:
- Symbol-specific posts from traders
- Trending posts across the platform
- Sentiment analysis (bullish/bearish/neutral)
- Rate limiting and error handling
- Async operations with caching

Note: StockTwits API is free for public streams (no API key required).
Rate limit: 200 requests per hour.
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


class StockTwitsClient:
    """
    StockTwits API client for social sentiment data.

    Provides unified interface for:
    - Symbol-specific posts and sentiment
    - Trending posts across the platform
    - Sentiment scoring (bullish/bearish/neutral)
    - Rate limiting to respect API limits (200/hour)
    - Error handling with retry logic
    - Smart caching with 2-minute TTL (social is real-time)

    Note: No API key required for public streams.

    Example:
        >>> client = StockTwitsClient()
        >>> posts = await client.get_posts(symbol="AAPL", limit=30)
        >>> trending = await client.get_trending(limit=20)
        >>> await client.close()
    """

    BASE_URL = "https://api.stocktwits.com/api/2"

    def __init__(
        self,
        rate_limit: int = 200,
        rate_limit_window: int = 3600,
        max_retries: int = 3,
        cache_ttl: int = 120,
    ):
        """
        Initialize StockTwits client.

        Args:
            rate_limit: Max requests per window (default: 200 for free tier)
            rate_limit_window: Time window in seconds (default: 3600 = 1 hour)
            max_retries: Maximum number of retry attempts (default: 3)
            cache_ttl: Cache TTL in seconds
                (default: 120 = 2 minutes for real-time social)
        """
        self.rate_limit = rate_limit
        self.rate_limit_window = rate_limit_window
        self.max_retries = max_retries
        self.cache_ttl = cache_ttl

        # Rate limiting
        self.request_timestamps: List[float] = []

        # Cache storage: {cache_key: (data, timestamp)}
        self.cache: Dict[str, tuple] = {}

        # Session for connection pooling
        self.session: Optional[aiohttp.ClientSession] = None

        logger.info(
            f"StockTwitsClient initialized "
            f"rate_limit={rate_limit}/{rate_limit_window}s, "
            f"cache_ttl={cache_ttl}s"
        )

    async def _ensure_session(self) -> aiohttp.ClientSession:
        """Ensure aiohttp session exists with timeout configuration."""
        if self.session is None or self.session.closed:
            # 10 second timeout for API requests to prevent long hangs
            timeout = aiohttp.ClientTimeout(total=10, connect=5)
            self.session = aiohttp.ClientSession(timeout=timeout)
        return self.session

    async def close(self):
        """Close the HTTP session."""
        if self.session and not self.session.closed:
            await self.session.close()
            logger.info("StockTwits session closed")

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
            msg = (
                f"StockTwits rate limit reached: "
                f"{len(self.request_timestamps)}/{self.rate_limit} "
                f"in last {self.rate_limit_window}s. Waiting {wait_time:.2f}s"
            )
            logger.warning(msg)
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
        return f"stocktwits:{endpoint}:{params_hash}"

    def _get_from_cache(self, cache_key: str) -> Optional[Dict]:
        """
        Get data from cache if not expired.

        Args:
            cache_key: Cache key

        Returns:
            Cached data or None if expired/missing
        """
        if cache_key not in self.cache:
            return None

        data, timestamp = self.cache[cache_key]

        if datetime.now() - timestamp < timedelta(seconds=self.cache_ttl):
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
        self,
        endpoint: str,
        params: Optional[Dict[str, str]] = None,
        retry_count: int = 0,
    ) -> Optional[Dict]:
        """
        Make HTTP request to StockTwits API with retry logic.

        Args:
            endpoint: API endpoint path
            params: Query parameters
            retry_count: Current retry attempt

        Returns:
            Response data as dict or None on error
        """
        try:
            await self._check_rate_limit()

            url = f"{self.BASE_URL}/{endpoint}"

            session = await self._ensure_session()
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()

                    # Check for API error in response
                    if data.get("response", {}).get("status") != 200:
                        error_msg = data.get("errors", [{}])[0].get(
                            "message", "Unknown error"
                        )
                        logger.error(f"StockTwits API error: {error_msg}")
                        return None

                    return data

                elif response.status == 429:  # Too Many Requests
                    if retry_count < self.max_retries:
                        wait_time = min(60 * (2**retry_count), 300)
                        logger.warning(
                            f"StockTwits 429 Too Many Requests. Retrying "
                            f"in {wait_time}s ({retry_count + 1}/{self.max_retries})"
                        )
                        await asyncio.sleep(wait_time)
                        return await self._make_request(
                            endpoint, params, retry_count + 1
                        )
                    raise RateLimitError(
                        "StockTwits rate limit exceeded, max retries reached",
                        service="stocktwits",
                        retry_after=3600,
                    )

                elif response.status == 404:
                    logger.warning(f"StockTwits resource not found: {endpoint}")
                    return None

                else:
                    error_text = await response.text()
                    logger.error(
                        f"StockTwits HTTP error {response.status}: {error_text}"
                    )
                    return None

        except aiohttp.ClientError as e:
            logger.error(f"StockTwits network error: {e}")
            if retry_count < self.max_retries:
                wait_time = min(10 * (2**retry_count), 60)
                logger.info(f"Retrying in {wait_time}s")
                await asyncio.sleep(wait_time)
                return await self._make_request(endpoint, params, retry_count + 1)
            return None

        except RateLimitError:
            raise

        except Exception as e:
            logger.error(f"Unexpected error making StockTwits request: {e}")
            return None

    def _normalize_message(
        self, message: Dict[str, Any], symbol: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Normalize a StockTwits message to the standard article format.

        Args:
            message: Raw StockTwits message data
            symbol: Optional symbol context

        Returns:
            Normalized article dict matching the standard format
        """
        # Extract message ID
        msg_id = message.get("id", "")

        # Extract body text
        body = message.get("body", "")

        # Create headline from first 100 chars
        headline = body[:100] if len(body) > 100 else body
        if len(body) > 100:
            headline = headline.rsplit(" ", 1)[0] + "..."

        # Extract user info
        user = message.get("user", {})
        username = user.get("username", "unknown")

        # Extract sentiment
        entities = message.get("entities", {})
        sentiment_data = entities.get("sentiment", {})
        sentiment_basic = (
            sentiment_data.get("basic", "").lower() if sentiment_data else ""
        )

        # Map sentiment to standard values
        if sentiment_basic == "bullish":
            sentiment = "bullish"
            sentiment_score = 1.0
        elif sentiment_basic == "bearish":
            sentiment = "bearish"
            sentiment_score = -1.0
        else:
            sentiment = "neutral"
            sentiment_score = 0.0

        # Extract engagement metrics
        likes_data = message.get("likes", {})
        likes_total = likes_data.get("total", 0) if isinstance(likes_data, dict) else 0

        conversation = message.get("conversation", {})
        replies = (
            conversation.get("replies", 0) if isinstance(conversation, dict) else 0
        )

        # Extract symbols from message
        symbols_data = entities.get("symbols", [])
        symbols = [s.get("symbol", "").upper() for s in symbols_data if s.get("symbol")]

        # If no symbols in message but we have context, use that
        if not symbols and symbol:
            symbols = [symbol.upper()]

        # Parse created_at timestamp
        created_at = message.get("created_at", "")
        try:
            # StockTwits uses ISO 8601 format
            if created_at:
                # Ensure we have a proper ISO format with Z suffix
                if not created_at.endswith("Z"):
                    created_at = created_at + "Z"
        except Exception:
            created_at = datetime.utcnow().isoformat() + "Z"

        # Build the StockTwits URL
        url = f"https://stocktwits.com/{username}/message/{msg_id}"

        return {
            "id": f"stocktwits_{msg_id}",
            "headline": headline,
            "summary": body,
            "url": url,
            "source": "StockTwits",
            "source_provider": "stocktwits",
            "publishedAt": created_at,
            "symbols": symbols,
            "author": f"@{username}",
            "sentiment": sentiment,
            "sentiment_score": sentiment_score,
            "imageUrl": "",
            "engagement": {
                "likes": likes_total,
                "comments": replies,
            },
        }

    async def get_posts(
        self, symbol: Optional[str] = None, limit: int = 30
    ) -> Dict[str, Any]:
        """
        Get posts for a specific symbol or general stream.

        Args:
            symbol: Stock symbol to get posts for (e.g., 'AAPL')
                   If None, returns trending posts
            limit: Maximum number of posts to return (default: 30, max: 30)

        Returns:
            Dict with 'articles' list containing normalized post data

            Example:
            {
                "articles": [
                    {
                        "id": "stocktwits_12345",
                        "headline": "AAPL looking strong...",
                        "summary": (
                            "AAPL looking strong today! Breaking out above resistance."
                        ),
                        "url": "https://stocktwits.com/trader123/message/12345",
                        "source": "StockTwits",
                        "source_provider": "stocktwits",
                        "publishedAt": "2024-01-15T10:30:00Z",
                        "symbols": ["AAPL"],
                        "author": "@trader123",
                        "sentiment": "bullish",
                        "sentiment_score": 1.0,
                        "imageUrl": "",
                        "engagement": {
                            "likes": 42,
                            "comments": 5
                        }
                    }
                ],
                "next_page_token": None
            }
        """
        try:
            # If no symbol provided, return trending
            if not symbol:
                return await self.get_trending(limit=limit)

            # Validate and normalize symbol
            symbol = symbol.strip().upper()
            if not symbol or not all(c.isalnum() or c == "." for c in symbol):
                logger.error(f"Invalid symbol format: {symbol}")
                return {"articles": [], "next_page_token": None}

            # Check cache
            cache_params = {"symbol": symbol, "limit": limit}
            cache_key = self._get_cache_key("symbol_stream", cache_params)
            cached = self._get_from_cache(cache_key)
            if cached:
                return cached

            # Build endpoint and params
            endpoint = f"streams/symbol/{symbol}.json"
            params = {"limit": str(min(limit, 30))}  # API max is 30

            # Make request
            data = await self._make_request(endpoint, params)

            if not data or "messages" not in data:
                logger.warning(f"No messages found for symbol {symbol}")
                return {"articles": [], "next_page_token": None}

            # Normalize messages
            articles = []
            for message in data.get("messages", []):
                normalized = self._normalize_message(message, symbol)
                articles.append(normalized)

            result = {"articles": articles, "next_page_token": None}

            # Cache result
            self._set_cache(cache_key, result)

            logger.info(f"Retrieved {len(articles)} StockTwits posts for {symbol}")
            return result

        except Exception as e:
            logger.error(f"Error getting StockTwits posts for {symbol}: {e}")
            return {"articles": [], "next_page_token": None}

    async def get_trending(self, limit: int = 30) -> Dict[str, Any]:
        """
        Get trending posts from StockTwits.

        Args:
            limit: Maximum number of posts to return (default: 30, max: 30)

        Returns:
            Dict with 'articles' list containing normalized post data

            Example:
            {
                "articles": [
                    {
                        "id": "stocktwits_67890",
                        "headline": "Markets looking bullish...",
                        "summary": "Markets looking bullish after Fed comments!",
                        "url": "https://stocktwits.com/marketwatcher/message/67890",
                        "source": "StockTwits",
                        "source_provider": "stocktwits",
                        "publishedAt": "2024-01-15T11:00:00Z",
                        "symbols": ["SPY", "QQQ"],
                        "author": "@marketwatcher",
                        "sentiment": "bullish",
                        "sentiment_score": 1.0,
                        "imageUrl": "",
                        "engagement": {
                            "likes": 128,
                            "comments": 23
                        }
                    }
                ],
                "next_page_token": None
            }
        """
        try:
            # Check cache
            cache_params = {"limit": limit}
            cache_key = self._get_cache_key("trending", cache_params)
            cached = self._get_from_cache(cache_key)
            if cached:
                return cached

            # Build endpoint and params
            endpoint = "streams/trending.json"
            params = {"limit": str(min(limit, 30))}

            # Make request
            data = await self._make_request(endpoint, params)

            if not data or "messages" not in data:
                logger.warning("No trending messages found")
                return {"articles": [], "next_page_token": None}

            # Normalize messages
            articles = []
            for message in data.get("messages", []):
                normalized = self._normalize_message(message)
                articles.append(normalized)

            result = {"articles": articles, "next_page_token": None}

            # Cache result
            self._set_cache(cache_key, result)

            logger.info(f"Retrieved {len(articles)} trending StockTwits posts")
            return result

        except Exception as e:
            logger.error(f"Error getting trending StockTwits posts: {e}")
            return {"articles": [], "next_page_token": None}

    def clear_cache(self) -> None:
        """Clear all cached data."""
        count = len(self.cache)
        self.cache.clear()
        logger.info(f"Cleared StockTwits cache ({count} entries)")

    def get_cache_stats(self) -> Dict[str, Any]:
        """
        Get cache and rate limit statistics.

        Returns:
            Dictionary with cache and rate limit info
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
        Check API connectivity.

        Returns:
            True if API is accessible
        """
        try:
            # Try to get trending posts as a health check
            result = await self.get_trending(limit=1)
            return len(result.get("articles", [])) > 0
        except Exception as e:
            logger.error(f"StockTwits health check failed: {e}")
            return False
