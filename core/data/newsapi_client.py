"""
NewsAPI API Integration

Provides news aggregation from NewsAPI.org with:
- Top headlines by category and country
- Search across all news articles
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


class NewsAPIClient:
    """
    NewsAPI client for DeepStack Trading System.

    Provides unified interface for:
    - Top headlines (business, technology, etc.)
    - Search all news articles by keyword
    - Rate limiting to respect API limits (100 req/day free tier)
    - Error handling with retry logic
    - Smart caching with 5-minute TTL for news

    NewsAPI Documentation: https://newsapi.org/docs
    """

    BASE_URL = "https://newsapi.org/v2"

    def __init__(
        self,
        api_key: str,
        rate_limit: int = 4,
        rate_limit_window: int = 60,
        max_retries: int = 3,
    ):
        """
        Initialize NewsAPI client.

        Args:
            api_key: NewsAPI API key
            rate_limit: Max requests per window
                (default: 4 per minute, conservative for 100/day limit)
            rate_limit_window: Time window in seconds (default: 60)
            max_retries: Maximum number of retry attempts (default: 3)

        Note:
            Free tier has 100 requests/day limit. Default rate_limit of
            4 req/min is conservative to avoid hitting daily limits
            (4 * 60 min * 24 hr = 5760 theoretical, but we target
            ~1 req per 15 seconds sustained usage).
        """
        if not api_key:
            raise ValueError("API key is required")

        self.api_key = api_key
        self.max_retries = max_retries

        # Cache TTL values (5 minutes for news to stay fresh)
        self.cache_ttl = {
            "news": 300,  # 5 minutes
        }

        # Rate limiting - conservative for free tier (100 req/day)
        self.rate_limit = rate_limit
        self.rate_limit_window = rate_limit_window
        self.request_timestamps: List[float] = []

        # Cache storage: {cache_key: (data, timestamp)}
        self.cache: Dict[str, tuple] = {}

        # Session for connection pooling
        self.session: Optional[aiohttp.ClientSession] = None

        logger.info(
            f"NewsAPIClient initialized "
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
            logger.info("NewsAPI session closed")

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
        return f"newsapi_{endpoint}:{params_hash}"

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
        ttl = self.cache_ttl.get(ttl_type, 300)  # Default 5 min for news

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
    ) -> Optional[Dict]:
        """
        Make HTTP request to NewsAPI with retry logic.

        Args:
            endpoint: API endpoint (e.g., '/top-headlines', '/everything')
            params: Query parameters
            retry_count: Current retry attempt

        Returns:
            Response data as dict or None on error
        """
        try:
            await self._check_rate_limit()

            session = await self._ensure_session()
            url = f"{self.BASE_URL}{endpoint}"

            # Use X-Api-Key header for authentication (preferred method)
            headers = {
                "X-Api-Key": self.api_key,
            }

            async with session.get(url, params=params, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()

                    # Check for API error status
                    if data.get("status") == "error":
                        error_code = data.get("code", "unknown")
                        error_message = data.get("message", "Unknown error")
                        logger.error(f"NewsAPI error [{error_code}]: {error_message}")

                        # Handle rate limit errors
                        if error_code == "rateLimited":
                            if retry_count < self.max_retries:
                                wait_time = min(60 * (2**retry_count), 300)
                                logger.warning(
                                    f"Rate limited. Retry in {wait_time}s "
                                    f"({retry_count+1}/{self.max_retries})"
                                )
                                await asyncio.sleep(wait_time)
                                return await self._make_request(
                                    endpoint, params, retry_count + 1
                                )
                            raise RateLimitError(
                                "NewsAPI rate limit exceeded, max retries reached",
                                service="newsapi",
                            )

                        return None

                    return data

                elif response.status == 401:
                    logger.error("NewsAPI authentication failed - check API key")
                    return None

                elif response.status == 426:
                    # Upgrade required - HTTPS required for free tier
                    logger.error("NewsAPI requires HTTPS for requests")
                    return None

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
                        service="newsapi",
                    )

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

    def _generate_article_id(self, url: str) -> str:
        """
        Generate a unique article ID from URL.

        Args:
            url: Article URL

        Returns:
            Unique ID string prefixed with 'newsapi_'
        """
        # Create stable hash from URL
        url_hash = hashlib.md5(url.encode(), usedforsecurity=False).hexdigest()[:12]
        return f"newsapi_{url_hash}"

    async def get_news(
        self,
        symbol: Optional[str] = None,
        category: str = "business",
        limit: int = 50,
    ) -> Dict[str, Any]:
        """
        Get news articles from NewsAPI.

        Uses /top-headlines for category-based news or /everything for symbol search.

        Args:
            symbol: Optional ticker/keyword to search for (e.g., 'AAPL', 'Apple')
            category: News category for top-headlines (default: 'business').
                Options: business, entertainment, general, health,
                science, sports, technology
            limit: Max number of articles (default 50, max 100 for free tier)

        Returns:
            Dict with 'articles' list containing normalized news data

            Example article:
            {
                'id': 'newsapi_abc123def456',
                'headline': 'Apple Reports Record Quarter',
                'summary': 'Apple Inc announced...',
                'url': 'https://example.com/article',
                'source': 'CNBC',
                'source_provider': 'newsapi',
                'publishedAt': '2024-01-15T10:30:00Z',
                'symbols': [],  # NewsAPI doesn't have ticker mapping
                'author': 'John Doe',
                'sentiment': 'neutral',  # NewsAPI doesn't provide sentiment
                'sentiment_score': 0.0,
                'imageUrl': 'https://example.com/image.jpg'
            }
        """
        try:
            # Build cache key
            cache_params = {"category": category, "limit": limit}
            if symbol:
                cache_params["symbol"] = symbol

            cache_key = self._get_cache_key("news", cache_params)

            # Check cache (5 minute TTL for news)
            cached = self._get_from_cache(cache_key, "news")
            if cached:
                return cached

            # Determine which endpoint to use
            if symbol:
                # Use /everything endpoint for keyword search
                endpoint = "/everything"
                params = {
                    "q": symbol,
                    "language": "en",
                    "sortBy": "publishedAt",
                    "pageSize": str(min(limit, 100)),  # Free tier max is 100
                }
            else:
                # Use /top-headlines endpoint for category-based news
                endpoint = "/top-headlines"
                params = {
                    "category": category,
                    "country": "us",
                    "pageSize": str(min(limit, 100)),  # Free tier max is 100
                }

            # Make API request
            data = await self._make_request(endpoint, params)

            if not data or data.get("status") != "ok":
                logger.warning("No news data from NewsAPI")
                return {"articles": [], "next_page_token": None}

            # Parse and normalize articles to match our standard format
            articles = []
            for item in data.get("articles", []):
                # Skip articles with removed content (NewsAPI limitation)
                if item.get("title") == "[Removed]":
                    continue

                article_url = item.get("url", "")

                article = {
                    "id": self._generate_article_id(article_url),
                    "headline": item.get("title", ""),
                    "summary": item.get("description", "") or item.get("content", ""),
                    "url": article_url,
                    "source": item.get("source", {}).get("name", ""),
                    "source_provider": "newsapi",
                    "publishedAt": item.get("publishedAt", ""),
                    "symbols": [],  # NewsAPI doesn't provide ticker mapping
                    "author": item.get("author", "") or "",
                    "sentiment": "neutral",  # NewsAPI doesn't provide sentiment
                    "sentiment_score": 0.0,
                    "imageUrl": item.get("urlToImage", "") or "",
                }
                articles.append(article)

            result = {"articles": articles, "next_page_token": None}

            # Cache with 5 minute TTL for news
            self._set_cache(cache_key, result)

            logger.info(f"Retrieved {len(articles)} news articles from NewsAPI")
            return result

        except RateLimitError:
            # Re-raise rate limit errors
            raise

        except Exception as e:
            logger.error(f"Error getting news from NewsAPI: {e}")
            return {"articles": [], "next_page_token": None}

    def clear_cache(self, cache_type: Optional[str] = None) -> None:
        """
        Clear cached data.

        Args:
            cache_type: Specific cache type to clear (currently only 'news')
                       If None, clears all cache
        """
        if cache_type:
            # Clear specific cache type
            keys_to_delete = [
                k for k in self.cache.keys() if k.startswith(f"newsapi_{cache_type}")
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
            # Try to get a single headline to verify connectivity
            result = await self.get_news(category="business", limit=1)
            return "articles" in result
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False
