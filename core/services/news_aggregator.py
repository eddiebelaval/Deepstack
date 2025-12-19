"""
News Aggregator Service

Aggregates news from multiple sources with:
- Concurrent fetching from all providers
- Deduplication by URL and headline similarity
- Unified article format
- Caching with 5-minute TTL
- Graceful degradation if sources fail
- Hybrid StockTwits: API + Playwright fallback

Sources:
- API: Finnhub, NewsAPI, Alpha Vantage, Alpaca
- RSS: Reuters, CNBC, Yahoo Finance, Seeking Alpha, MarketWatch
- Social: StockTwits (hybrid: API with browser fallback)
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

    Supports Perplexity Intelligence as the primary AI-powered source,
    with traditional sources as fallback.
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
        stocktwits_scraper=None,
        perplexity_intelligence=None,
        cache_ttl: int = 900,
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
            stocktwits_scraper: StockTwitsScraper instance for hybrid mode (optional)
            perplexity_intelligence: PerplexityIntelligence instance (optional)
            cache_ttl: Cache time-to-live in seconds (default: 15 minutes)
        """
        self.finnhub_client = finnhub_client
        self.newsapi_client = newsapi_client
        self.alphavantage_client = alphavantage_client
        self.alpaca_client = alpaca_client
        self.rss_aggregator = rss_aggregator
        self.stocktwits_client = stocktwits_client
        self.stocktwits_scraper = stocktwits_scraper
        self.perplexity_intelligence = perplexity_intelligence
        self.cache_ttl = cache_ttl

        # Cache storage: {cache_key: (data, timestamp)}
        self.cache: Dict[str, tuple] = {}

        # Track source health
        self.source_health: Dict[str, bool] = {}

        # Track pending scrapes (for hybrid StockTwits)
        self.pending_scrapes: Dict[str, Dict] = {}

        # Count active sources
        active_sources = sum(
            [
                self.finnhub_client is not None,
                self.newsapi_client is not None,
                self.alphavantage_client is not None,
                self.alpaca_client is not None,
                self.rss_aggregator is not None,
                self.stocktwits_client is not None
                or self.stocktwits_scraper is not None,
                self.perplexity_intelligence is not None,
            ]
        )

        logger.info(
            f"NewsAggregator initialized with {active_sources} sources, "
            f"cache_ttl={cache_ttl}s, "
            f"hybrid_stocktwits={self.stocktwits_scraper is not None}, "
            f"perplexity={self.perplexity_intelligence is not None}"
        )

    def _get_cache_key(
        self, symbol: Optional[str], source_filter: Optional[str], include_social: bool
    ) -> str:
        """Generate cache key from parameters (excludes offset/limit for reuse)."""
        key_parts = [
            f"symbol:{symbol or 'all'}",
            f"source:{source_filter or 'all'}",
            f"social:{include_social}",
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
        """
        Fetch posts from StockTwits using hybrid approach.

        1. Try hybrid scraper first (API + fallback)
        2. Fall back to direct API client if scraper not available
        3. Store pending scrape info if browser scraping needed
        """
        # Try hybrid scraper first (preferred)
        if self.stocktwits_scraper:
            try:
                result = await self.stocktwits_scraper.get_posts(
                    symbol=symbol, limit=limit
                )

                # Check if scrape is pending (API blocked, need browser)
                if result.get("method") == "scrape_pending":
                    scrape_key = f"stocktwits:{symbol or 'trending'}"
                    self.pending_scrapes[scrape_key] = {
                        "url": result.get("scrape_url"),
                        "script": result.get("scrape_script"),
                        "symbol": symbol,
                        "limit": limit,
                    }
                    logger.info(f"StockTwits scrape pending for {symbol or 'trending'}")
                    self.source_health["stocktwits"] = False
                    return []

                # API succeeded via scraper
                self.source_health["stocktwits"] = True
                return result.get("articles", [])

            except Exception as e:
                logger.warning(f"StockTwits scraper failed: {e}")
                self.source_health["stocktwits"] = False
                return []

        # Fall back to direct API client
        if self.stocktwits_client:
            try:
                result = await self.stocktwits_client.get_posts(
                    symbol=symbol, limit=limit
                )
                self.source_health["stocktwits"] = True
                return result.get("articles", [])
            except Exception as e:
                logger.warning(f"StockTwits API failed: {e}")
                self.source_health["stocktwits"] = False
                return []

        return []

    async def _fetch_from_perplexity(
        self, symbol: Optional[str], limit: int
    ) -> List[Dict]:
        """
        Fetch AI-synthesized news from Perplexity Intelligence.

        This is the primary/preferred source when configured.
        """
        if not self.perplexity_intelligence:
            return []
        try:
            result = await self.perplexity_intelligence.get_market_intelligence(
                symbol=symbol, limit=limit
            )
            articles = result.get("articles", [])
            self.source_health["perplexity"] = len(articles) > 0 and not result.get(
                "mock", True
            )
            return articles
        except Exception as e:
            logger.warning(f"Perplexity fetch failed: {e}")
            self.source_health["perplexity"] = False
            return []

    def get_pending_scrapes(self) -> Dict[str, Dict]:
        """
        Get pending browser scrapes that need execution.

        Returns:
            Dict mapping scrape keys to scrape info (url, script, symbol)
        """
        return self.pending_scrapes.copy()

    def add_scraped_stocktwits(
        self, symbol: Optional[str], scraped_data: Dict[str, Any]
    ) -> List[Dict]:
        """
        Add scraped StockTwits data to the aggregator.

        Call this after executing the scrape script via Playwright.

        Args:
            symbol: Symbol that was scraped (or None for trending)
            scraped_data: Raw result from browser evaluate

        Returns:
            List of normalized articles
        """
        if not self.stocktwits_scraper:
            logger.warning("No scraper available to parse scraped data")
            return []

        try:
            result = self.stocktwits_scraper.parse_scraped_data(scraped_data, symbol)
            articles = result.get("articles", [])

            if articles:
                self.source_health["stocktwits"] = True
                # Clear pending scrape
                scrape_key = f"stocktwits:{symbol or 'trending'}"
                self.pending_scrapes.pop(scrape_key, None)

            logger.info(f"Added {len(articles)} scraped StockTwits articles")
            return articles

        except Exception as e:
            logger.error(f"Failed to parse scraped StockTwits data: {e}")
            return []

    async def get_aggregated_news(
        self,
        symbol: Optional[str] = None,
        source_filter: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
        include_social: bool = True,
    ) -> Dict[str, Any]:
        """
        Get aggregated news from all sources with pagination support.

        Args:
            symbol: Optional ticker symbol to filter by (e.g., 'AAPL')
            source_filter: Optional source type filter:
                - 'perplexity': Only Perplexity AI Intelligence (primary)
                - 'api': Only API sources (Finnhub, NewsAPI, Alpha Vantage, Alpaca)
                - 'rss': Only RSS feeds
                - 'social': Only StockTwits
                - None: All sources (default)
            limit: Maximum number of articles to return (default: 50)
            offset: Number of articles to skip for pagination (default: 0)
            include_social: Include StockTwits social posts (default: True)

        Returns:
            Dict with:
                - articles: List of normalized, deduplicated articles
                - sources: Dict mapping source names to article counts
                - total_fetched: Total articles before deduplication
                - total_returned: Final article count after pagination
                - total_available: Total unique articles available (for has_more)
                - has_more: Whether more articles are available
                - offset: Current offset
        """
        # Check cache first (cache key excludes offset/limit for reuse)
        cache_key = self._get_cache_key(symbol, source_filter, include_social)
        cached_data = self._get_from_cache(cache_key)

        if cached_data:
            # Cache hit - slice from cached full result
            unique_articles = cached_data.get("_unique_articles", [])
            source_counts = cached_data.get("sources", {})
            total_fetched = cached_data.get("total_fetched", 0)
        else:
            # Cache miss - fetch from all sources
            fetch_tasks = []
            source_names = []

            # Fetch more articles for caching (up to 200 per source)
            per_source_limit = 100

            # Perplexity AI Intelligence (primary source when available)
            if source_filter in (None, "perplexity"):
                fetch_tasks.append(
                    self._fetch_from_perplexity(symbol, per_source_limit)
                )
                source_names.append("perplexity")

            if source_filter in (None, "api"):
                # API sources
                fetch_tasks.append(self._fetch_from_finnhub(symbol, per_source_limit))
                source_names.append("finnhub")

                fetch_tasks.append(self._fetch_from_newsapi(symbol, per_source_limit))
                source_names.append("newsapi")

                fetch_tasks.append(
                    self._fetch_from_alphavantage(symbol, per_source_limit)
                )
                source_names.append("alphavantage")

                fetch_tasks.append(self._fetch_from_alpaca(symbol, per_source_limit))
                source_names.append("alpaca")

            if source_filter in (None, "rss"):
                # RSS sources
                fetch_tasks.append(self._fetch_from_rss(symbol, per_source_limit))
                source_names.append("rss")

            if source_filter in (None, "social") and include_social:
                # Social sources
                fetch_tasks.append(
                    self._fetch_from_stocktwits(symbol, per_source_limit)
                )
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

            # Deduplicate (keep full list in cache for pagination)
            unique_articles = self._deduplicate_articles(all_articles)

            # Cache the full deduplicated result (for pagination reuse)
            cache_data = {
                "_unique_articles": unique_articles,
                "sources": source_counts,
                "total_fetched": total_fetched,
            }
            self._set_cache(cache_key, cache_data)

            logger.info(
                f"Aggregated news: {total_fetched} fetched -> "
                f"{len(unique_articles)} unique (cached for pagination)"
            )

        # Apply offset and limit for pagination
        total_available = len(unique_articles)
        paginated_articles = unique_articles[offset : offset + limit]
        has_more = (offset + limit) < total_available

        result = {
            "articles": paginated_articles,
            "sources": source_counts,
            "total_fetched": total_fetched,
            "total_returned": len(paginated_articles),
            "total_available": total_available,
            "has_more": has_more,
            "offset": offset,
        }

        logger.debug(
            f"Returning {len(paginated_articles)} articles "
            f"(offset={offset}, has_more={has_more})"
        )

        return result

    async def get_source_health(self) -> Dict[str, Any]:
        """
        Get health status of all news sources.

        Returns:
            Dict with source health status, pending scrapes, and timestamps
        """
        health = {
            "sources": {},
            "overall_healthy": False,
            "total_sources": 0,
            "healthy_sources": 0,
            "pending_scrapes": list(self.pending_scrapes.keys()),
        }

        # Check each source (Perplexity first as primary)
        sources = [
            ("perplexity", self.perplexity_intelligence),
            ("finnhub", self.finnhub_client),
            ("newsapi", self.newsapi_client),
            ("alphavantage", self.alphavantage_client),
            ("alpaca", self.alpaca_client),
            ("rss", self.rss_aggregator),
            ("stocktwits", self.stocktwits_client or self.stocktwits_scraper),
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

                # Add extra info for StockTwits hybrid mode
                source_info = {
                    "configured": True,
                    "healthy": is_healthy,
                }
                if source_name == "stocktwits":
                    source_info["hybrid_mode"] = self.stocktwits_scraper is not None
                    source_info["scrape_pending"] = any(
                        "stocktwits" in k for k in self.pending_scrapes
                    )

                health["sources"][source_name] = source_info
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
            self.perplexity_intelligence,
            self.finnhub_client,
            self.newsapi_client,
            self.alphavantage_client,
            self.alpaca_client,
            self.rss_aggregator,
            self.stocktwits_client,
            self.stocktwits_scraper,
        ]

        for client in clients:
            if client and hasattr(client, "close"):
                try:
                    await client.close()
                except Exception as e:
                    logger.warning(f"Error closing client: {e}")

        # Clear pending scrapes
        self.pending_scrapes.clear()

        logger.info("NewsAggregator closed all client connections")

    async def prefetch_news(
        self,
        symbols: Optional[List[str]] = None,
        include_general: bool = True,
    ) -> Dict[str, Any]:
        """
        Pre-fetch news to warm the cache for faster subsequent requests.

        Args:
            symbols: Optional list of symbols to prefetch news for
            include_general: Whether to also prefetch general market news

        Returns:
            Dict with prefetch results and timing
        """
        import time

        start_time = time.time()
        results = {"prefetched": [], "errors": [], "duration_seconds": 0}

        try:
            # Prefetch general market news (no symbol filter)
            if include_general:
                try:
                    await self.get_aggregated_news(
                        symbol=None, limit=50, include_social=True
                    )
                    results["prefetched"].append("general")
                    logger.info("Prefetched general market news")
                except Exception as e:
                    results["errors"].append(f"general: {str(e)}")
                    logger.warning(f"Failed to prefetch general news: {e}")

            # Prefetch news for specific symbols
            if symbols:
                for symbol in symbols[:10]:  # Limit to 10 symbols to avoid overload
                    try:
                        await self.get_aggregated_news(
                            symbol=symbol, limit=20, include_social=True
                        )
                        results["prefetched"].append(symbol)
                        logger.debug(f"Prefetched news for {symbol}")
                    except Exception as e:
                        results["errors"].append(f"{symbol}: {str(e)}")
                        logger.warning(f"Failed to prefetch news for {symbol}: {e}")

        except Exception as e:
            logger.error(f"Prefetch error: {e}")
            results["errors"].append(f"prefetch: {str(e)}")

        results["duration_seconds"] = round(time.time() - start_time, 2)
        logger.info(
            f"News prefetch complete: {len(results['prefetched'])} cached, "
            f"{len(results['errors'])} errors, {results['duration_seconds']}s"
        )
        return results

    async def start_background_prefetch(
        self,
        interval_seconds: int = 600,
        symbols: Optional[List[str]] = None,
    ) -> asyncio.Task:
        """
        Start a background task that periodically prefetches news.

        Args:
            interval_seconds: Time between prefetch runs (default: 10 minutes)
            symbols: Optional list of symbols to prefetch

        Returns:
            The background task (can be cancelled with task.cancel())
        """
        self._prefetch_running = True
        self._prefetch_symbols = symbols or []

        async def _prefetch_loop():
            logger.info(
                f"Starting news prefetch loop (interval: {interval_seconds}s, "
                f"symbols: {len(self._prefetch_symbols)})"
            )
            while self._prefetch_running:
                try:
                    await self.prefetch_news(
                        symbols=self._prefetch_symbols, include_general=True
                    )
                except Exception as e:
                    logger.error(f"Background prefetch error: {e}")

                # Wait for next interval
                await asyncio.sleep(interval_seconds)

        task = asyncio.create_task(_prefetch_loop())
        self._prefetch_task = task
        return task

    def stop_background_prefetch(self) -> None:
        """Stop the background prefetch task."""
        self._prefetch_running = False
        if hasattr(self, "_prefetch_task") and self._prefetch_task:
            self._prefetch_task.cancel()
            logger.info("Background news prefetch stopped")
