"""
StockTwits Hybrid Scraper

Hybrid approach for StockTwits data:
1. Primary: Try the official API (fast, low overhead)
2. Fallback: Use Playwright browser scraping when Cloudflare blocks API

Features:
- Automatic fallback when API returns 403/Cloudflare challenge
- Browser-based scraping bypasses bot detection
- Same normalized output format as API client
- Configurable scraping depth and rate limiting
"""

import hashlib
import logging
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

from core.data.stocktwits_client import StockTwitsClient

logger = logging.getLogger(__name__)


class StockTwitsScraper:
    """
    Hybrid StockTwits data fetcher with API + Playwright fallback.

    Tries the StockTwits API first for speed, falls back to browser
    scraping when Cloudflare blocks the request.

    Example:
        >>> scraper = StockTwitsScraper()
        >>> posts = await scraper.get_posts(symbol="AAPL", limit=30)
        >>> await scraper.close()
    """

    def __init__(
        self,
        api_client: Optional[StockTwitsClient] = None,
        playwright_endpoint: Optional[str] = None,
        use_api_first: bool = True,
        scrape_delay: float = 1.0,
    ):
        """
        Initialize the hybrid scraper.

        Args:
            api_client: Optional existing StockTwitsClient instance
            playwright_endpoint: MCP Playwright server endpoint (if available)
            use_api_first: Try API before falling back to scraping
            scrape_delay: Delay between scrape requests (rate limiting)
        """
        self.api_client = api_client or StockTwitsClient()
        self.playwright_endpoint = playwright_endpoint
        self.use_api_first = use_api_first
        self.scrape_delay = scrape_delay

        # Track which method succeeded last (for optimization)
        self.last_successful_method: Optional[str] = None

        # Cloudflare detection patterns
        self.cloudflare_patterns = [
            "cloudflare",
            "cf-ray",
            "challenge-platform",
            "attention required",
        ]

        logger.info(
            f"StockTwitsScraper initialized "
            f"use_api_first={use_api_first}, "
            f"scrape_delay={scrape_delay}s"
        )

    def _is_cloudflare_blocked(self, response: Any) -> bool:
        """Check if response indicates Cloudflare blocking."""
        if response is None:
            return True

        # Check for empty response (API blocked)
        if isinstance(response, dict):
            articles = response.get("articles", [])
            if not articles:
                return True

        return False

    def _extract_username_from_url(self, url: str) -> str:
        """Extract username from StockTwits URL."""
        # URL format: https://stocktwits.com/username
        match = re.search(r"stocktwits\.com/([^/]+)$", url)
        if match:
            return match.group(1)
        return "unknown"

    def _extract_message_id_from_url(self, url: str) -> str:
        """Extract message ID from StockTwits message URL."""
        # URL format: https://stocktwits.com/username/message/12345
        match = re.search(r"/message/(\d+)", url)
        if match:
            return match.group(1)
        # Generate hash if no ID found
        return hashlib.md5(url.encode(), usedforsecurity=False).hexdigest()[:12]

    def _extract_sentiment_from_body(self, body: str) -> tuple[str, float]:
        """
        Extract sentiment from message body text.

        StockTwits shows sentiment badge at end of message text.

        Returns:
            Tuple of (sentiment_label, sentiment_score)
        """
        body_lower = body.lower().strip()

        if body_lower.endswith("bullish"):
            return "bullish", 1.0
        elif body_lower.endswith("bearish"):
            return "bearish", -1.0
        else:
            return "neutral", 0.0

    def _clean_body_text(self, body: str) -> str:
        """Remove sentiment badge from body text."""
        # Remove trailing sentiment labels
        body = re.sub(r"\s*(Bullish|Bearish)\s*$", "", body, flags=re.IGNORECASE)
        return body.strip()

    def _extract_symbols_from_body(self, body: str) -> List[str]:
        """Extract stock symbols ($XXX) from message body."""
        symbols = re.findall(r"\$([A-Z]{1,5})", body.upper())
        return list(set(symbols))  # Remove duplicates

    def _normalize_scraped_message(
        self, raw_message: Dict[str, Any], symbol: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Normalize scraped message to standard article format.

        Args:
            raw_message: Raw scraped message data
            symbol: Optional symbol context

        Returns:
            Normalized article dict
        """
        body = raw_message.get("body", "")
        links = raw_message.get("links", [])

        # Extract username from links (second link is usually username)
        username = "unknown"
        message_url = ""
        for link in links:
            href = link.get("href", "")
            text = link.get("text", "")
            if "/message/" in href:
                message_url = href
            elif text and not message_url:
                username = text

        # Extract message ID
        msg_id = self._extract_message_id_from_url(message_url) if message_url else ""
        if not msg_id:
            msg_id = hashlib.md5(body.encode(), usedforsecurity=False).hexdigest()[:12]

        # Extract sentiment
        sentiment, sentiment_score = self._extract_sentiment_from_body(body)

        # Clean body text
        clean_body = self._clean_body_text(body)

        # Create headline (first 100 chars)
        headline = clean_body[:100]
        if len(clean_body) > 100:
            headline = headline.rsplit(" ", 1)[0] + "..."

        # Extract symbols
        symbols = self._extract_symbols_from_body(body)
        if not symbols and symbol:
            symbols = [symbol.upper()]

        # Parse timestamp
        published_at = raw_message.get("time", "")
        if not published_at:
            published_at = datetime.utcnow().isoformat() + "Z"

        # Build URL
        if not message_url:
            message_url = f"https://stocktwits.com/{username}/message/{msg_id}"

        return {
            "id": f"stocktwits_{msg_id}",
            "headline": headline,
            "summary": clean_body,
            "url": message_url,
            "source": "StockTwits",
            "source_provider": "stocktwits",
            "publishedAt": published_at,
            "symbols": symbols,
            "author": f"@{username}",
            "sentiment": sentiment,
            "sentiment_score": sentiment_score,
            "imageUrl": "",
            "engagement": {
                "likes": 0,  # Not available in scraped data
                "comments": 0,
            },
        }

    def get_scrape_script(self, limit: int = 30) -> str:
        """
        Generate JavaScript for scraping StockTwits messages.

        This script extracts message data from the DOM.

        Args:
            limit: Maximum messages to extract

        Returns:
            JavaScript code string
        """
        return f"""
        () => {{
            const articles = document.querySelectorAll('article');
            const messages = [];

            articles.forEach((article, idx) => {{
                if (idx >= {limit}) return;

                // Skip ad articles
                if (article.className.includes('Ad') ||
                    article.className.includes('sponsored')) return;

                // Extract body text (includes sentiment at end)
                const bodyEl = article.querySelector('[class*="body"]') ||
                               article.querySelector('[class*="Body"]') ||
                               article.querySelector('[class*="text"]');
                const body = bodyEl?.textContent?.trim() || '';

                // Skip empty messages
                if (!body || body.length < 3) return;

                // Get time
                const timeEl = article.querySelector('time');
                const time = timeEl?.getAttribute('datetime') ||
                             timeEl?.textContent || '';

                // Get all links for username and message URL
                const links = Array.from(article.querySelectorAll('a'))
                    .map(a => ({{
                        href: a.href,
                        text: a.textContent?.trim()
                    }}))
                    .filter(l => l.href.includes('stocktwits.com'))
                    .slice(0, 4);

                messages.push({{
                    body,
                    time,
                    links
                }});
            }});

            return {{
                success: true,
                count: messages.length,
                messages
            }};
        }}
        """

    async def scrape_with_playwright(
        self, symbol: Optional[str] = None, limit: int = 30
    ) -> Dict[str, Any]:
        """
        Scrape StockTwits using Playwright MCP.

        Note: This method assumes Playwright MCP is available and
        the browser is already on the correct page or will navigate.

        Args:
            symbol: Stock symbol to scrape
            limit: Maximum messages to return

        Returns:
            Dict with 'articles' list
        """
        try:
            # This is a placeholder - actual implementation would use
            # Playwright MCP tools which are called from the orchestrator

            logger.info(
                f"Playwright scrape requested for " f"symbol={symbol}, limit={limit}"
            )

            # Return empty result - actual scraping happens via MCP
            return {
                "articles": [],
                "next_page_token": None,
                "scrape_method": "playwright",
                "note": "Use MCP tools to execute scrape_script on page",
            }

        except Exception as e:
            logger.error(f"Playwright scrape failed: {e}")
            return {"articles": [], "next_page_token": None}

    async def get_posts(
        self, symbol: Optional[str] = None, limit: int = 30
    ) -> Dict[str, Any]:
        """
        Get StockTwits posts with automatic fallback.

        Tries API first (if enabled), falls back to scraping if blocked.

        Args:
            symbol: Stock symbol to get posts for
            limit: Maximum posts to return

        Returns:
            Dict with 'articles' list and metadata
        """
        result = {"articles": [], "next_page_token": None, "method": None}

        # Strategy 1: Try API first (if enabled and not known to be blocked)
        if self.use_api_first and self.last_successful_method != "scrape_only":
            try:
                logger.debug(f"Trying StockTwits API for {symbol}")
                api_result = await self.api_client.get_posts(symbol=symbol, limit=limit)

                if not self._is_cloudflare_blocked(api_result):
                    result = api_result
                    result["method"] = "api"
                    self.last_successful_method = "api"
                    logger.info(
                        f"StockTwits API success: "
                        f"{len(result.get('articles', []))} posts"
                    )
                    return result
                else:
                    logger.warning("StockTwits API returned empty/blocked response")

            except Exception as e:
                logger.warning(f"StockTwits API failed: {e}")

        # Strategy 2: Fallback to scraping
        logger.info("Falling back to Playwright scraping for StockTwits")
        result["method"] = "scrape_pending"
        result["scrape_url"] = (
            f"https://stocktwits.com/symbol/{symbol}"
            if symbol
            else "https://stocktwits.com/trending"
        )
        result["scrape_script"] = self.get_scrape_script(limit)

        return result

    async def get_trending(self, limit: int = 30) -> Dict[str, Any]:
        """Get trending posts."""
        return await self.get_posts(symbol=None, limit=limit)

    def parse_scraped_data(
        self, scraped_data: Dict[str, Any], symbol: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Parse raw scraped data into normalized format.

        Call this after executing scrape_script via Playwright MCP.

        Args:
            scraped_data: Raw result from browser evaluate
            symbol: Symbol context for the scrape

        Returns:
            Dict with normalized 'articles' list
        """
        if not scraped_data.get("success"):
            return {"articles": [], "next_page_token": None}

        messages = scraped_data.get("messages", [])
        articles = []

        for msg in messages:
            try:
                normalized = self._normalize_scraped_message(msg, symbol)
                articles.append(normalized)
            except Exception as e:
                logger.warning(f"Failed to normalize message: {e}")
                continue

        logger.info(f"Parsed {len(articles)} articles from scraped data")

        return {
            "articles": articles,
            "next_page_token": None,
            "method": "scraped",
        }

    async def close(self) -> None:
        """Close the API client."""
        if self.api_client:
            await self.api_client.close()
        logger.info("StockTwitsScraper closed")

    def clear_cache(self) -> None:
        """Clear API client cache."""
        if self.api_client:
            self.api_client.clear_cache()

    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        stats = {
            "last_successful_method": self.last_successful_method,
            "use_api_first": self.use_api_first,
        }
        if self.api_client:
            stats["api_client"] = self.api_client.get_cache_stats()
        return stats
