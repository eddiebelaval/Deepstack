"""
News Aggregator Service

Aggregates news from multiple sources with:
- Concurrent fetching from all providers
- Deduplication by URL and headline similarity
- Unified article format
- Caching with 5-minute TTL
- Graceful degradation if sources fail

Sources:
- API: Finnhub, NewsAPI, Alpha Vantage, Alpaca
- RSS: Reuters, CNBC, Yahoo Finance, Seeking Alpha, MarketWatch
- Social: StockTwits
"""

import asyncio
import hashlib
import logging
from datetime import datetime, timedelta
from difflib import SequenceMatcher
from typing import Any, Dict, List, Optional, Set

logger = logging.getLogger(__name__)


class NewsAggregator:
    """
    Multi-source news aggregator for financial news and social sentiment.

    Combines news from multiple APIs and RSS feeds into a unified stream
    with deduplication and sorting.
    """

    # Similarity threshold for headline deduplication (0.0 - 1.0)
    HEADLINE_SIMILARITY_THRESHOLD = 0.7

    def __init__(
        self,
        finnhub_client=None,
        newsapi_client=None,
        alphavantage_client=None,
        alpaca_client=None,
        rss_aggregator=None,
        stocktwits_client=None,
        cache_ttl: int = 300,
    ):
        """
        Initialize the news aggregator.

        Args:
            finnhub_client: FinnhubClient instance (optional)
            newsapi_client: NewsAPIClient instance (optional)
            alphavantage_client: AlphaVantageClient instance (optional)
            alpaca_client: AlpacaClient instance (optional)
            rss_aggregator: RSSAggregator instance (optional)
            stocktwits_client: StockTwitsClient instance (optional)
            cache_ttl: Cache time-to-live in seconds (default: 5 minutes)
        """
        self.finnhub_client = finnhub_client
        self.newsapi_client = newsapi_client
        self.alphavantage_client = alphavantage_client
        self.alpaca_client = alpaca_client
        self.rss_aggregator = rss_aggregator
        self.stocktwits_client = stocktwits_client
        self.cache_ttl = cache_ttl

        # Cache storage: {cache_key: (data, timestamp)}
        self.cache: Dict[str, tuple] = {}

        # Track source health
        self.source_health: Dict[str, bool] = {}

        # Count active sources
        active_sources = sum(
            [
                self.finnhub_client is not None,
                self.newsapi_client is not None,
                self.alphavantage_client is not None,
                self.alpaca_client is not None,
                self.rss_aggregator is not None,
                self.stocktwits_client is not None,
            ]
        )

        logger.info(
            f"NewsAggregator initialized with {active_sources} sources, "
            f"cache_ttl={cache_ttl}s"
        )

    def _get_cache_key(
        self, symbol: Optional[str], source_filter: Optional[str], limit: int
    ) -> str:
        """Generate cache key from parameters."""
        key_parts = [
            f"symbol:{symbol or 'all'}",
            f"source:{source_filter or 'all'}",
            f"limit:{limit}",
        ]
        return f"news_aggregated:{'|'.join(key_parts)}"

    def _get_from_cache(self, cache_key: str) -> Optional[Dict]:
        """Get data from cache if not expired."""
        if cache_key not in self.cache:
            return None

        data, timestamp = self.cache[cache_key]
        if datetime.now() - timestamp < timedelta(seconds=self.cache_ttl):
            logger.debug(f"Cache hit for aggregated news: {cache_key}")
            return data

        # Cache expired
        del self.cache[cache_key]
        return None

    def _set_cache(self, cache_key: str, data: Dict) -> None:
        """Store data in cache."""
        self.cache[cache_key] = (data, datetime.now())

    def _headline_similarity(self, h1: str, h2: str) -> float:
        """
        Calculate similarity between two headlines using SequenceMatcher.

        Returns a value between 0.0 (completely different) and 1.0 (identical).
        """
        if not h1 or not h2:
            return 0.0
        # Normalize: lowercase and remove common prefixes
        h1_norm = h1.lower().strip()
        h2_norm = h2.lower().strip()
        return SequenceMatcher(None, h1_norm, h2_norm).ratio()

    def _url_hash(self, url: str) -> str:
        """Generate a hash from URL for quick duplicate detection."""
        if not url:
            return ""
        # Normalize URL (remove trailing slashes, query params for comparison)
        normalized = url.split("?")[0].rstrip("/").lower()
        return hashlib.md5(normalized.encode(), usedforsecurity=False).hexdigest()[:16]

    def _deduplicate_articles(self, articles: List[Dict]) -> List[Dict]:
        """
        Remove duplicate articles using URL hash and headline similarity.

        Deduplication strategy:
        1. First pass: Remove exact URL matches (using hash)
        2. Second pass: Remove similar headlines (Jaccard > 0.7)

        Keeps the first occurrence (assumes sorted by timestamp desc).
        """
        if not articles:
            return []

        seen_urls: Set[str] = set()
        seen_headlines: List[str] = []
        unique_articles: List[Dict] = []

        for article in articles:
            url = article.get("url", "")
            headline = article.get("headline", "")

            # Skip if no URL or headline
            if not url and not headline:
                continue

            # Check URL duplicate
            url_hash = self._url_hash(url)
            if url_hash and url_hash in seen_urls:
                logger.debug(f"Skipping duplicate URL: {url[:50]}...")
                continue

            # Check headline similarity
            is_similar = False
            for seen_headline in seen_headlines:
                similarity = self._headline_similarity(headline, seen_headline)
                if similarity >= self.HEADLINE_SIMILARITY_THRESHOLD:
                    logger.debug(
                        f"Skipping similar headline (sim={similarity:.2f}): "
                        f"{headline[:50]}..."
                    )
                    is_similar = True
                    break

            if is_similar:
                continue

            # Add to unique list
            if url_hash:
                seen_urls.add(url_hash)
            if headline:
                seen_headlines.append(headline)
            unique_articles.append(article)

        logger.info(
            f"Deduplication: {len(articles)} -> {len(unique_articles)} articles "
            f"({len(articles) - len(unique_articles)} duplicates removed)"
        )
        return unique_articles

    async def _fetch_from_finnhub(
        self, symbol: Optional[str], limit: int
    ) -> List[Dict]:
        """Fetch news from Finnhub."""
        if not self.finnhub_client:
            return []
        try:
            result = await self.finnhub_client.get_news(symbol=symbol, limit=limit)
            self.source_health["finnhub"] = True
            return result.get("articles", [])
        except Exception as e:
            logger.warning(f"Finnhub fetch failed: {e}")
            self.source_health["finnhub"] = False
            return []

    async def _fetch_from_newsapi(
        self, symbol: Optional[str], limit: int
    ) -> List[Dict]:
        """Fetch news from NewsAPI."""
        if not self.newsapi_client:
            return []
        try:
            result = await self.newsapi_client.get_news(symbol=symbol, limit=limit)
            self.source_health["newsapi"] = True
            return result.get("articles", [])
        except Exception as e:
            logger.warning(f"NewsAPI fetch failed: {e}")
            self.source_health["newsapi"] = False
            return []

    async def _fetch_from_alphavantage(
        self, symbol: Optional[str], limit: int
    ) -> List[Dict]:
        """Fetch news from Alpha Vantage."""
        if not self.alphavantage_client:
            return []
        try:
            result = await self.alphavantage_client.get_news(symbol=symbol, limit=limit)
            self.source_health["alphavantage"] = True
            return result.get("articles", [])
        except Exception as e:
            logger.warning(f"Alpha Vantage fetch failed: {e}")
            self.source_health["alphavantage"] = False
            return []

    async def _fetch_from_alpaca(self, symbol: Optional[str], limit: int) -> List[Dict]:
        """Fetch news from Alpaca."""
        if not self.alpaca_client:
            return []
        try:
            result = await self.alpaca_client.get_news(symbol=symbol, limit=limit)
            self.source_health["alpaca"] = True
            return result.get("articles", [])
        except Exception as e:
            logger.warning(f"Alpaca fetch failed: {e}")
            self.source_health["alpaca"] = False
            return []

    async def _fetch_from_rss(self, symbol: Optional[str], limit: int) -> List[Dict]:
        """Fetch news from RSS feeds."""
        if not self.rss_aggregator:
            return []
        try:
            result = await self.rss_aggregator.get_news(symbol=symbol, limit=limit)
            self.source_health["rss"] = True
            return result.get("articles", [])
        except Exception as e:
            logger.warning(f"RSS fetch failed: {e}")
            self.source_health["rss"] = False
            return []

    async def _fetch_from_stocktwits(
        self, symbol: Optional[str], limit: int
    ) -> List[Dict]:
        """Fetch posts from StockTwits."""
        if not self.stocktwits_client:
            return []
        try:
            result = await self.stocktwits_client.get_posts(symbol=symbol, limit=limit)
            self.source_health["stocktwits"] = True
            return result.get("articles", [])
        except Exception as e:
            logger.warning(f"StockTwits fetch failed: {e}")
            self.source_health["stocktwits"] = False
            return []

    async def get_aggregated_news(
        self,
        symbol: Optional[str] = None,
        source_filter: Optional[str] = None,
        limit: int = 50,
        include_social: bool = True,
    ) -> Dict[str, Any]:
        """
        Get aggregated news from all sources.

        Args:
            symbol: Optional ticker symbol to filter by (e.g., 'AAPL')
            source_filter: Optional source type filter:
                - 'api': Only API sources (Finnhub, NewsAPI, Alpha Vantage, Alpaca)
                - 'rss': Only RSS feeds
                - 'social': Only StockTwits
                - None: All sources (default)
            limit: Maximum number of articles to return (default: 50)
            include_social: Include StockTwits social posts (default: True)

        Returns:
            Dict with:
                - articles: List of normalized, deduplicated articles
                - sources: Dict mapping source names to article counts
                - total_fetched: Total articles before deduplication
                - total_returned: Final article count
                - next_page_token: None (pagination not supported for aggregated)
        """
        # Check cache first
        cache_key = self._get_cache_key(symbol, source_filter, limit)
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached

        # Determine which sources to fetch from
        fetch_tasks = []
        source_names = []

        # Per-source limit (fetch more than needed for deduplication)
        per_source_limit = min(limit * 2, 100)

        if source_filter in (None, "api"):
            # API sources
            fetch_tasks.append(self._fetch_from_finnhub(symbol, per_source_limit))
            source_names.append("finnhub")

            fetch_tasks.append(self._fetch_from_newsapi(symbol, per_source_limit))
            source_names.append("newsapi")

            fetch_tasks.append(self._fetch_from_alphavantage(symbol, per_source_limit))
            source_names.append("alphavantage")

            fetch_tasks.append(self._fetch_from_alpaca(symbol, per_source_limit))
            source_names.append("alpaca")

        if source_filter in (None, "rss"):
            # RSS sources
            fetch_tasks.append(self._fetch_from_rss(symbol, per_source_limit))
            source_names.append("rss")

        if source_filter in (None, "social") and include_social:
            # Social sources
            fetch_tasks.append(self._fetch_from_stocktwits(symbol, per_source_limit))
            source_names.append("stocktwits")

        # Fetch from all sources concurrently
        results = await asyncio.gather(*fetch_tasks, return_exceptions=True)

        # Combine all articles and track source counts
        all_articles = []
        source_counts = {}

        for source_name, result in zip(source_names, results):
            if isinstance(result, Exception):
                logger.warning(f"Source {source_name} failed: {result}")
                source_counts[source_name] = 0
                continue

            articles = result if isinstance(result, list) else []
            source_counts[source_name] = len(articles)
            all_articles.extend(articles)

        total_fetched = len(all_articles)

        # Sort by publishedAt (newest first)
        all_articles.sort(key=lambda x: x.get("publishedAt", ""), reverse=True)

        # Deduplicate
        unique_articles = self._deduplicate_articles(all_articles)

        # Apply limit
        final_articles = unique_articles[:limit]

        result = {
            "articles": final_articles,
            "sources": source_counts,
            "total_fetched": total_fetched,
            "total_returned": len(final_articles),
            "next_page_token": None,
        }

        # Cache the result
        self._set_cache(cache_key, result)

        logger.info(
            f"Aggregated news: {total_fetched} fetched -> "
            f"{len(unique_articles)} unique -> {len(final_articles)} returned"
        )

        return result

    async def get_source_health(self) -> Dict[str, Any]:
        """
        Get health status of all news sources.

        Returns:
            Dict with source health status and last check timestamps
        """
        health = {
            "sources": {},
            "overall_healthy": False,
            "total_sources": 0,
            "healthy_sources": 0,
        }

        # Check each source
        sources = [
            ("finnhub", self.finnhub_client),
            ("newsapi", self.newsapi_client),
            ("alphavantage", self.alphavantage_client),
            ("alpaca", self.alpaca_client),
            ("rss", self.rss_aggregator),
            ("stocktwits", self.stocktwits_client),
        ]

        for source_name, client in sources:
            if client is None:
                health["sources"][source_name] = {
                    "configured": False,
                    "healthy": False,
                }
            else:
                health["total_sources"] += 1
                is_healthy = self.source_health.get(source_name, False)
                health["sources"][source_name] = {
                    "configured": True,
                    "healthy": is_healthy,
                }
                if is_healthy:
                    health["healthy_sources"] += 1

        health["overall_healthy"] = health["healthy_sources"] > 0
        return health

    def clear_cache(self) -> None:
        """Clear the aggregation cache."""
        count = len(self.cache)
        self.cache.clear()
        logger.info(f"Cleared aggregation cache ({count} entries)")

    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        return {
            "cached_queries": len(self.cache),
            "cache_ttl": self.cache_ttl,
            "source_health": self.source_health,
        }

    async def close(self) -> None:
        """Close all client connections."""
        clients = [
            self.finnhub_client,
            self.newsapi_client,
            self.alphavantage_client,
            self.alpaca_client,
            self.rss_aggregator,
            self.stocktwits_client,
        ]

        for client in clients:
            if client and hasattr(client, "close"):
                try:
                    await client.close()
                except Exception as e:
                    logger.warning(f"Error closing client: {e}")

        logger.info("NewsAggregator closed all client connections")
