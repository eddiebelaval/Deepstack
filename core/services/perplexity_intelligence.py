"""
Perplexity Intelligence Service

Provides AI-synthesized market intelligence using Perplexity Finance API.
This replaces raw news feeds with intelligent, contextualized market insights.

Key features:
- Real-time market summary with sector analysis
- Symbol-specific news synthesis
- Automatic sentiment analysis
- Source citations for transparency
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from ..data.perplexity_finance_client import (
    PerplexityFinanceClient,
    get_perplexity_finance_client,
)

logger = logging.getLogger(__name__)


class PerplexityIntelligence:
    """
    AI-powered market intelligence service using Perplexity Finance.

    Synthesizes market news and analysis into actionable intelligence.
    """

    def __init__(
        self,
        client: Optional[PerplexityFinanceClient] = None,
        cache_ttl: int = 900,  # 15 minutes
    ):
        """
        Initialize Perplexity Intelligence service.

        Args:
            client: PerplexityFinanceClient instance (uses singleton if not provided)
            cache_ttl: Cache time-to-live in seconds (default: 15 minutes)
        """
        self.client = client or get_perplexity_finance_client()
        self.cache_ttl = cache_ttl

        # Local cache for intelligence articles
        self._cache: Dict[str, tuple] = {}

        logger.info(
            f"PerplexityIntelligence initialized "
            f"configured={self.client.is_configured()} "
            f"cache_ttl={cache_ttl}s"
        )

    def is_configured(self) -> bool:
        """Check if Perplexity API is configured."""
        return self.client.is_configured()

    def _get_cache_key(self, symbol: Optional[str], topics: Optional[List[str]]) -> str:
        """Generate cache key."""
        symbol_part = symbol.upper() if symbol else "market"
        topics_part = "-".join(sorted(topics)) if topics else "all"
        return f"intelligence:{symbol_part}:{topics_part}"

    def _get_from_cache(self, cache_key: str) -> Optional[Dict]:
        """Get data from cache if not expired."""
        if cache_key not in self._cache:
            return None

        data, timestamp = self._cache[cache_key]
        from datetime import timedelta

        if datetime.now() - timestamp < timedelta(seconds=self.cache_ttl):
            logger.debug(f"Cache hit for intelligence: {cache_key}")
            return data

        del self._cache[cache_key]
        return None

    def _set_cache(self, cache_key: str, data: Dict) -> None:
        """Store data in cache."""
        self._cache[cache_key] = (data, datetime.now())

    async def get_market_intelligence(
        self,
        symbol: Optional[str] = None,
        topics: Optional[List[str]] = None,
        limit: int = 10,
    ) -> Dict[str, Any]:
        """
        Get AI-synthesized market intelligence.

        For general market news, provides comprehensive analysis.
        For symbol-specific news, focuses on that company's developments.

        Args:
            symbol: Optional ticker symbol for company-specific news
            topics: Optional topic filters (e.g., ['earnings', 'macro', 'tech'])
            limit: Max number of synthesized articles to return

        Returns:
            Dict with:
                - articles: List of AI-synthesized articles
                - source_type: 'perplexity'
                - mock: Whether using mock data
                - generated_at: Timestamp
        """
        cache_key = self._get_cache_key(symbol, topics)

        # Check cache
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached

        try:
            if symbol:
                # Get company-specific intelligence
                articles = await self._get_company_intelligence(symbol, limit)
            else:
                # Get general market intelligence
                articles = await self._get_general_intelligence(topics, limit)

            result = {
                "articles": articles,
                "source_type": "perplexity",
                "mock": not self.client.is_configured(),
                "generated_at": datetime.now().isoformat(),
                "total": len(articles),
            }

            self._set_cache(cache_key, result)
            return result

        except Exception as e:
            logger.error(f"Failed to get market intelligence: {e}", exc_info=True)
            return {
                "articles": [],
                "source_type": "perplexity",
                "mock": True,
                "error": str(e),
                "generated_at": datetime.now().isoformat(),
                "total": 0,
            }

    async def _get_general_intelligence(
        self, topics: Optional[List[str]], limit: int
    ) -> List[Dict[str, Any]]:
        """Get general market intelligence articles."""
        result = await self.client.get_market_summary(topics=topics)

        # Parse the content into article format
        articles = self._parse_summary_to_articles(
            content=result["content"],
            citations=result["citations"],
            mock=result["mock"],
            topics=topics,
        )

        return articles[:limit]

    async def _get_company_intelligence(
        self, symbol: str, limit: int
    ) -> List[Dict[str, Any]]:
        """Get company-specific intelligence articles."""
        # Get market summary focused on the company
        market_result = await self.client.get_market_summary(
            topics=[symbol.upper(), "sector analysis"]
        )

        # Get recent SEC filings if available
        sec_result = await self.client.search_sec_filings(
            symbol=symbol.upper(),
            filing_type="8-K",  # Most recent material events
        )

        # Get recent earnings insights
        earnings_result = await self.client.search_earnings_transcripts(
            symbol=symbol.upper()
        )

        articles = []

        # Parse market news
        market_articles = self._parse_summary_to_articles(
            content=market_result["content"],
            citations=market_result["citations"],
            mock=market_result["mock"],
            symbol=symbol,
            article_type="market",
        )
        articles.extend(market_articles)

        # Add SEC filing article if content available
        if sec_result["content"] and not sec_result["mock"]:
            articles.append(
                {
                    "id": f"perplexity_sec_{symbol}_{datetime.now():%Y%m%d}",
                    "headline": f"SEC Filing Analysis: {symbol.upper()}",
                    "summary": self._truncate_content(sec_result["content"], 500),
                    "url": (
                        sec_result["citations"][0] if sec_result["citations"] else ""
                    ),
                    "source": "SEC EDGAR via Perplexity",
                    "source_provider": "perplexity",
                    "source_type": "sec",
                    "publishedAt": datetime.now().isoformat(),
                    "symbols": [symbol.upper()],
                    "sentiment": "neutral",
                    "sentiment_score": 0.0,
                    "citations": sec_result["citations"],
                    "ai_generated": True,
                }
            )

        # Add earnings article if content available
        if earnings_result["content"] and not earnings_result["mock"]:
            articles.append(
                {
                    "id": f"perplexity_earnings_{symbol}_{datetime.now():%Y%m%d}",
                    "headline": f"Earnings Insights: {symbol.upper()}",
                    "summary": self._truncate_content(earnings_result["content"], 500),
                    "url": (
                        earnings_result["citations"][0]
                        if earnings_result["citations"]
                        else ""
                    ),
                    "source": "Earnings Transcript via Perplexity",
                    "source_provider": "perplexity",
                    "source_type": "earnings",
                    "publishedAt": datetime.now().isoformat(),
                    "symbols": [symbol.upper()],
                    "sentiment": self._detect_sentiment(earnings_result["content"]),
                    "sentiment_score": 0.0,
                    "citations": earnings_result["citations"],
                    "ai_generated": True,
                }
            )

        return articles[:limit]

    def _parse_summary_to_articles(
        self,
        content: str,
        citations: List[str],
        mock: bool,
        symbol: Optional[str] = None,
        topics: Optional[List[str]] = None,
        article_type: str = "summary",
    ) -> List[Dict[str, Any]]:
        """
        Parse Perplexity summary content into article format.

        Creates a unified article from the AI summary plus individual
        topic articles if content can be segmented.
        """
        articles = []
        timestamp = datetime.now().isoformat()

        # Main summary article
        main_headline = "AI Market Intelligence"
        if symbol:
            main_headline = f"{symbol.upper()}: AI Market Analysis"
        elif topics:
            main_headline = f"Market Analysis: {', '.join(topics[:3])}"

        articles.append(
            {
                "id": f"perplexity_{article_type}_{datetime.now():%Y%m%d%H%M}",
                "headline": main_headline,
                "summary": self._truncate_content(content, 800),
                "full_content": content,
                "url": citations[0] if citations else "",
                "source": "Perplexity AI",
                "source_provider": "perplexity",
                "source_type": "ai_intelligence",
                "publishedAt": timestamp,
                "symbols": [symbol.upper()] if symbol else [],
                "sentiment": self._detect_sentiment(content),
                "sentiment_score": 0.0,
                "citations": citations,
                "ai_generated": True,
                "mock": mock,
            }
        )

        return articles

    def _truncate_content(self, content: str, max_length: int) -> str:
        """Truncate content to max length at word boundary."""
        if len(content) <= max_length:
            return content

        truncated = content[:max_length]
        # Find last space to avoid cutting words
        last_space = truncated.rfind(" ")
        if last_space > max_length * 0.8:
            truncated = truncated[:last_space]

        return truncated + "..."

    def _detect_sentiment(self, content: str) -> str:
        """
        Simple sentiment detection from content.

        Returns: 'bullish', 'bearish', or 'neutral'
        """
        content_lower = content.lower()

        bullish_keywords = [
            "growth",
            "beat",
            "exceed",
            "strong",
            "positive",
            "surge",
            "rally",
            "optimistic",
            "bullish",
            "upgrade",
            "outperform",
            "record",
            "momentum",
            "expanding",
        ]

        bearish_keywords = [
            "decline",
            "miss",
            "weak",
            "negative",
            "drop",
            "fall",
            "bearish",
            "downgrade",
            "underperform",
            "risk",
            "concern",
            "slowdown",
            "recession",
            "cut",
        ]

        bullish_count = sum(1 for kw in bullish_keywords if kw in content_lower)
        bearish_count = sum(1 for kw in bearish_keywords if kw in content_lower)

        if bullish_count > bearish_count + 2:
            return "bullish"
        elif bearish_count > bullish_count + 2:
            return "bearish"
        return "neutral"

    async def get_quick_summary(
        self,
        symbol: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Get a quick one-paragraph market summary.

        Useful for widgets and quick views.

        Args:
            symbol: Optional ticker for company-specific summary

        Returns:
            Dict with summary text and metadata
        """
        try:
            topics = [symbol.upper(), "latest"] if symbol else ["market overview"]
            result = await self.client.get_market_summary(topics=topics)

            # Extract first paragraph or first 200 chars
            content = result["content"]
            first_para = (
                content.split("\n\n")[0] if "\n\n" in content else content[:200]
            )

            return {
                "summary": first_para,
                "symbol": symbol,
                "source": "Perplexity AI",
                "mock": result["mock"],
                "generated_at": datetime.now().isoformat(),
            }

        except Exception as e:
            logger.error(f"Failed to get quick summary: {e}")
            return {
                "summary": "Market summary unavailable.",
                "symbol": symbol,
                "source": "Perplexity AI",
                "mock": True,
                "error": str(e),
            }

    def clear_cache(self) -> None:
        """Clear the intelligence cache."""
        count = len(self._cache)
        self._cache.clear()
        logger.info(f"Cleared intelligence cache ({count} entries)")

    async def close(self) -> None:
        """Close the underlying client."""
        await self.client.close()
        logger.info("PerplexityIntelligence closed")


# Singleton instance
_intelligence: Optional[PerplexityIntelligence] = None


def get_perplexity_intelligence() -> PerplexityIntelligence:
    """Get or create the Perplexity Intelligence singleton."""
    global _intelligence
    if _intelligence is None:
        _intelligence = PerplexityIntelligence()
    return _intelligence
