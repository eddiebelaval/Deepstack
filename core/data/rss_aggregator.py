"""
RSS Feed Aggregator for News Sources

Aggregates news from multiple RSS feeds:
- Reuters
- CNBC
- Yahoo Finance
- Seeking Alpha
- Bloomberg

Features:
- Concurrent fetching with asyncio
- Symbol extraction from titles
- Caching with TTL
- Graceful error handling per-feed
"""

import asyncio
import hashlib
import logging
import re
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from typing import Any, Dict, List, Optional, Set

import aiohttp

logger = logging.getLogger(__name__)

# Common stock ticker pattern
TICKER_PATTERN = re.compile(r"\b([A-Z]{1,5})\b")

# Known stock tickers to filter against (top 100 most common)
KNOWN_TICKERS: Set[str] = {
    "AAPL",
    "MSFT",
    "GOOGL",
    "GOOG",
    "AMZN",
    "NVDA",
    "META",
    "TSLA",
    "BRK",
    "UNH",
    "JNJ",
    "V",
    "XOM",
    "WMT",
    "JPM",
    "MA",
    "PG",
    "HD",
    "CVX",
    "MRK",
    "ABBV",
    "LLY",
    "PEP",
    "KO",
    "AVGO",
    "COST",
    "TMO",
    "MCD",
    "CSCO",
    "ACN",
    "ABT",
    "DHR",
    "WFC",
    "NEE",
    "VZ",
    "ADBE",
    "TXN",
    "CRM",
    "PM",
    "BMY",
    "RTX",
    "NKE",
    "UPS",
    "QCOM",
    "HON",
    "ORCL",
    "INTC",
    "T",
    "IBM",
    "CAT",
    "LOW",
    "GS",
    "MS",
    "SPGI",
    "BA",
    "DE",
    "AMGN",
    "AXP",
    "BLK",
    "SBUX",
    "PLD",
    "GILD",
    "ELV",
    "MDLZ",
    "ADI",
    "LMT",
    "MMC",
    "SYK",
    "TJX",
    "BKNG",
    "ISRG",
    "AMT",
    "CI",
    "CB",
    "ZTS",
    "VRTX",
    "MO",
    "TMUS",
    "SO",
    "DUK",
    "PNC",
    "USB",
    "TFC",
    "MMM",
    "CL",
    "CME",
    "BDX",
    "REGN",
    "APD",
    "SHW",
    "SPY",
    "QQQ",
    "IWM",
    "DIA",
    "VOO",
    "VTI",
    "GLD",
    "SLV",
    "TLT",
    "XLF",
}

# Words that look like tickers but aren't
FALSE_POSITIVES: Set[str] = {
    "CEO",
    "CFO",
    "IPO",
    "ETF",
    "GDP",
    "CPI",
    "FED",
    "SEC",
    "NYSE",
    "FDA",
    "US",
    "USA",
    "UK",
    "EU",
    "AI",
    "IT",
    "EV",
    "TV",
    "PC",
    "PR",
    "HR",
    "AT",
    "AS",
    "IS",
    "ON",
    "TO",
    "BE",
    "OR",
    "BY",
    "UP",
    "SO",
    "NO",
    "NEW",
    "FOR",
    "ARE",
    "THE",
    "AND",
    "BUT",
    "NOW",
    "ALL",
    "CAN",
    "HAS",
    "TOP",
    "BIG",
    "LOW",
    "HIT",
    "WIN",
    "MAY",
    "SAY",
    "SEE",
    "SET",
}


# RSS Feed configuration
RSS_FEEDS: Dict[str, Dict[str, str]] = {
    "reuters": {
        "url": (
            "https://www.reutersagency.com/feed/"
            "?best-topics=business-finance&post_type=best"
        ),
        "name": "Reuters",
        "backup_url": "https://feeds.reuters.com/reuters/businessNews",
    },
    "cnbc": {
        "url": "https://www.cnbc.com/id/100003114/device/rss/rss.html",
        "name": "CNBC",
        "backup_url": "https://www.cnbc.com/id/10001147/device/rss/rss.html",
    },
    "yahoo_finance": {
        "url": "https://finance.yahoo.com/news/rssindex",
        "name": "Yahoo Finance",
        "backup_url": "https://feeds.finance.yahoo.com/rss/2.0/headline",
    },
    "seeking_alpha": {
        "url": "https://seekingalpha.com/market_currents.xml",
        "name": "Seeking Alpha",
        "backup_url": "https://seekingalpha.com/feed.xml",
    },
    "marketwatch": {
        "url": "https://feeds.marketwatch.com/marketwatch/topstories/",
        "name": "MarketWatch",
        "backup_url": "https://feeds.marketwatch.com/marketwatch/marketpulse/",
    },
}


class RSSAggregator:
    """
    RSS Feed aggregator for financial news.

    Fetches and normalizes news from multiple RSS feeds concurrently.
    """

    def __init__(
        self,
        feeds: Optional[Dict[str, Dict[str, str]]] = None,
        cache_ttl: int = 300,
        request_timeout: int = 10,
    ):
        """
        Initialize RSS aggregator.

        Args:
            feeds: Dictionary of feed configurations. Defaults to RSS_FEEDS.
            cache_ttl: Cache time-to-live in seconds (default: 5 minutes)
            request_timeout: HTTP request timeout in seconds (default: 10)
        """
        self.feeds = feeds or RSS_FEEDS
        self.cache_ttl = cache_ttl
        self.request_timeout = request_timeout

        # Cache storage: {cache_key: (data, timestamp)}
        self.cache: Dict[str, tuple] = {}

        # Session for connection pooling
        self.session: Optional[aiohttp.ClientSession] = None

        logger.info(
            f"RSSAggregator initialized with {len(self.feeds)} feeds, "
            f"cache_ttl={cache_ttl}s"
        )

    async def _ensure_session(self) -> aiohttp.ClientSession:
        """Ensure aiohttp session exists."""
        if self.session is None or self.session.closed:
            timeout = aiohttp.ClientTimeout(total=self.request_timeout)
            self.session = aiohttp.ClientSession(timeout=timeout)
        return self.session

    async def close(self):
        """Close the HTTP session."""
        if self.session and not self.session.closed:
            await self.session.close()
            logger.info("RSSAggregator session closed")

    def _get_cache_key(self, feed_key: str) -> str:
        """Generate cache key for a feed."""
        return f"rss:{feed_key}"

    def _get_from_cache(self, cache_key: str) -> Optional[List[Dict]]:
        """Get data from cache if not expired."""
        if cache_key not in self.cache:
            return None

        data, timestamp = self.cache[cache_key]
        if datetime.now() - timestamp < timedelta(seconds=self.cache_ttl):
            logger.debug(f"Cache hit for {cache_key}")
            return data

        # Cache expired
        del self.cache[cache_key]
        return None

    def _set_cache(self, cache_key: str, data: List[Dict]) -> None:
        """Store data in cache."""
        self.cache[cache_key] = (data, datetime.now())

    def _extract_symbols(self, text: str) -> List[str]:
        """
        Extract stock ticker symbols from text.

        Args:
            text: Text to extract symbols from

        Returns:
            List of detected ticker symbols
        """
        if not text:
            return []

        # Find all potential tickers (1-5 uppercase letters)
        potential_tickers = TICKER_PATTERN.findall(text)

        # Filter to known tickers and remove false positives
        symbols = [
            t
            for t in potential_tickers
            if t in KNOWN_TICKERS and t not in FALSE_POSITIVES
        ]

        # Also check for $TICKER format
        dollar_tickers = re.findall(r"\$([A-Z]{1,5})\b", text)
        for ticker in dollar_tickers:
            if ticker not in symbols and ticker not in FALSE_POSITIVES:
                symbols.append(ticker)

        return list(set(symbols))  # Remove duplicates

    def _parse_date(self, date_str: str) -> str:
        """
        Parse various date formats to ISO8601.

        Args:
            date_str: Date string in various formats

        Returns:
            ISO8601 formatted date string
        """
        if not date_str:
            return datetime.now(timezone.utc).isoformat()

        try:
            # Try RFC 2822 format (common in RSS)
            dt = parsedate_to_datetime(date_str)
            return dt.isoformat()
        except (ValueError, TypeError):
            pass

        # Try common formats
        formats = [
            "%Y-%m-%dT%H:%M:%S%z",
            "%Y-%m-%dT%H:%M:%SZ",
            "%Y-%m-%d %H:%M:%S",
            "%a, %d %b %Y %H:%M:%S %Z",
            "%a, %d %b %Y %H:%M:%S %z",
        ]

        for fmt in formats:
            try:
                dt = datetime.strptime(date_str, fmt)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt.isoformat()
            except ValueError:
                continue

        # Fallback to current time
        logger.warning(f"Could not parse date: {date_str}")
        return datetime.now(timezone.utc).isoformat()

    def _generate_id(self, url: str, feed_key: str) -> str:
        """Generate unique article ID from URL."""
        hash_input = f"{feed_key}:{url}"
        hash_digest = hashlib.md5(
            hash_input.encode(), usedforsecurity=False
        ).hexdigest()[:12]
        return f"rss_{hash_digest}"

    async def _fetch_feed(self, feed_key: str, config: Dict[str, str]) -> List[Dict]:
        """
        Fetch and parse a single RSS feed.

        Args:
            feed_key: Feed identifier
            config: Feed configuration with url, name, and optional backup_url

        Returns:
            List of normalized articles
        """
        # Check cache first
        cache_key = self._get_cache_key(feed_key)
        cached = self._get_from_cache(cache_key)
        if cached is not None:
            return cached

        session = await self._ensure_session()
        articles = []

        # Try primary URL, then backup
        urls_to_try = [config["url"]]
        if "backup_url" in config:
            urls_to_try.append(config["backup_url"])

        for url in urls_to_try:
            try:
                async with session.get(url) as response:
                    if response.status != 200:
                        logger.warning(
                            f"RSS feed {feed_key} returned {response.status}"
                        )
                        continue

                    content = await response.text()
                    articles = self._parse_rss(content, feed_key, config["name"])

                    if articles:
                        logger.info(
                            f"Fetched {len(articles)} articles from {config['name']}"
                        )
                        break

            except asyncio.TimeoutError:
                logger.warning(f"Timeout fetching RSS feed {feed_key}")
            except aiohttp.ClientError as e:
                logger.warning(f"Error fetching RSS feed {feed_key}: {e}")
            except Exception as e:
                logger.error(f"Unexpected error fetching {feed_key}: {e}")

        # Cache the results (even if empty, to avoid hammering failed feeds)
        self._set_cache(cache_key, articles)
        return articles

    def _parse_rss(self, content: str, feed_key: str, source_name: str) -> List[Dict]:
        """
        Parse RSS XML content into normalized articles.

        Uses simple XML parsing without external dependencies.
        """
        articles = []

        try:
            # Simple XML parsing for RSS items
            # Find all <item> elements
            items = re.findall(
                r"<item[^>]*>(.*?)</item>", content, re.DOTALL | re.IGNORECASE
            )

            for item_content in items:
                try:
                    # Extract fields with regex
                    title_match = re.search(
                        r"<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</title>",
                        item_content,
                        re.DOTALL | re.IGNORECASE,
                    )
                    desc_pattern = (
                        r"<description[^>]*>(?:<!\[CDATA\[)?"
                        r"(.*?)(?:\]\]>)?</description>"
                    )
                    desc_match = re.search(
                        desc_pattern,
                        item_content,
                        re.DOTALL | re.IGNORECASE,
                    )
                    link_match = re.search(
                        r"<link[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</link>",
                        item_content,
                        re.DOTALL | re.IGNORECASE,
                    )
                    date_match = re.search(
                        r"<pubDate[^>]*>(.*?)</pubDate>",
                        item_content,
                        re.DOTALL | re.IGNORECASE,
                    )
                    author_pattern = (
                        r"<(?:author|dc:creator)[^>]*>"
                        r"(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?"
                        r"</(?:author|dc:creator)>"
                    )
                    author_match = re.search(
                        author_pattern,
                        item_content,
                        re.DOTALL | re.IGNORECASE,
                    )
                    image_match = re.search(
                        r'<(?:media:content|enclosure)[^>]*url=["\']([^"\']+)["\']',
                        item_content,
                        re.IGNORECASE,
                    )

                    title = title_match.group(1).strip() if title_match else ""
                    description = desc_match.group(1).strip() if desc_match else ""
                    link = link_match.group(1).strip() if link_match else ""
                    pub_date = date_match.group(1).strip() if date_match else ""
                    author = author_match.group(1).strip() if author_match else ""
                    image_url = image_match.group(1) if image_match else ""

                    # Skip items without title or link
                    if not title or not link:
                        continue

                    # Clean HTML from description
                    description = re.sub(r"<[^>]+>", "", description)
                    description = description[:500]  # Limit length

                    # Extract symbols from title and description
                    symbols = self._extract_symbols(f"{title} {description}")

                    article = {
                        "id": self._generate_id(link, feed_key),
                        "headline": title,
                        "summary": description,
                        "url": link,
                        "source": source_name,
                        "source_provider": "rss",
                        "publishedAt": self._parse_date(pub_date),
                        "symbols": symbols,
                        "author": author,
                        "sentiment": "neutral",  # RSS doesn't provide sentiment
                        "sentiment_score": 0.0,
                        "imageUrl": image_url,
                    }
                    articles.append(article)

                except Exception as e:
                    logger.debug(f"Error parsing RSS item: {e}")
                    continue

        except Exception as e:
            logger.error(f"Error parsing RSS content from {feed_key}: {e}")

        return articles

    async def get_news(
        self,
        symbol: Optional[str] = None,
        limit: int = 50,
        feeds: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Get aggregated news from all RSS feeds.

        Args:
            symbol: Optional symbol to filter articles by
            limit: Maximum number of articles to return
            feeds: Optional list of specific feed keys to fetch

        Returns:
            Dictionary with articles list and metadata
        """
        # Determine which feeds to fetch
        feeds_to_fetch = feeds or list(self.feeds.keys())

        # Fetch all feeds concurrently
        tasks = [
            self._fetch_feed(feed_key, self.feeds[feed_key])
            for feed_key in feeds_to_fetch
            if feed_key in self.feeds
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Combine all articles
        all_articles = []
        for result in results:
            if isinstance(result, Exception):
                logger.warning(f"Feed fetch failed: {result}")
                continue
            all_articles.extend(result)

        # Filter by symbol if provided
        if symbol:
            symbol_upper = symbol.upper()
            all_articles = [
                a for a in all_articles if symbol_upper in a.get("symbols", [])
            ]

        # Sort by published date (newest first)
        all_articles.sort(key=lambda x: x.get("publishedAt", ""), reverse=True)

        # Limit results
        all_articles = all_articles[:limit]

        logger.info(
            f"RSS aggregator returning {len(all_articles)} articles "
            f"(symbol={symbol}, limit={limit})"
        )

        return {
            "articles": all_articles,
            "next_page_token": None,  # RSS doesn't support pagination
        }

    async def health_check(self) -> Dict[str, bool]:
        """
        Check health of all RSS feeds.

        Returns:
            Dictionary mapping feed keys to health status
        """
        results = {}
        session = await self._ensure_session()

        for feed_key, config in self.feeds.items():
            try:
                async with session.head(
                    config["url"], allow_redirects=True
                ) as response:
                    results[feed_key] = response.status == 200
            except Exception:
                results[feed_key] = False

        return results
