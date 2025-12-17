"""
Perplexity Finance API Router for DeepStack Trading System

Provides REST endpoints for AI-powered financial research:
- SEC Filing Search
- Earnings Transcript Analysis
- Natural Language Stock Screening
- Company Profile Building
- Deep Research Reports
- Market Summary Intelligence
"""

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from ..data.perplexity_finance_client import (
    PerplexityFinanceClient,
    get_perplexity_finance_client,
)
from .credits import ActionCost, require_action

logger = logging.getLogger(__name__)

# Create router with prefix
router = APIRouter(prefix="/api/perplexity", tags=["perplexity-finance"])


# ============== Request/Response Models ==============


class SECSearchRequest(BaseModel):
    """Request for SEC filing search."""

    symbol: str = Field(..., description="Stock ticker symbol (e.g., AAPL)")
    filing_type: str = Field(
        default="all", description="Filing type (10-K, 10-Q, 8-K, S-1, all)"
    )
    query: Optional[str] = Field(
        default=None, description="Specific query to search within filings"
    )
    date_after: Optional[str] = Field(
        default=None, description="Only return filings after this date (YYYY-MM-DD)"
    )


class SECSearchResponse(BaseModel):
    """Response for SEC filing search."""

    symbol: str
    filing_type: str
    content: str
    citations: List[str]
    mock: bool
    credit_cost: int = 10


class MarketSummaryRequest(BaseModel):
    """Request for market summary."""

    topics: Optional[List[str]] = Field(
        default=None, description="Topics to focus on (e.g., ['tech', 'rates'])"
    )


class MarketSummaryResponse(BaseModel):
    """Response for market summary."""

    content: str
    citations: List[str]
    topics: Optional[List[str]]
    mock: bool
    credit_cost: int = 5


class EarningsRequest(BaseModel):
    """Request for earnings transcript search."""

    symbol: str = Field(..., description="Stock ticker symbol")
    quarter: Optional[str] = Field(
        default=None, description="Specific quarter (e.g., 'Q3 2024')"
    )
    query: Optional[str] = Field(
        default=None, description="Specific query to search in transcript"
    )


class EarningsResponse(BaseModel):
    """Response for earnings transcript search."""

    symbol: str
    quarter: Optional[str]
    content: str
    citations: List[str]
    mock: bool
    credit_cost: int = 15


class ScreenerRequest(BaseModel):
    """Request for natural language screening."""

    query: str = Field(
        ..., description="Natural language query (e.g., 'tech stocks with PE under 20')"
    )
    limit: int = Field(default=10, ge=1, le=50, description="Max results")


class ScreenerResponse(BaseModel):
    """Response for natural language screening."""

    query: str
    content: str
    citations: List[str]
    mock: bool
    credit_cost: int = 20


class ProfileRequest(BaseModel):
    """Request for company profile."""

    entity: str = Field(..., description="Company name or ticker symbol")
    focus_areas: Optional[List[str]] = Field(
        default=None, description="Areas to focus on"
    )


class ProfileResponse(BaseModel):
    """Response for company profile."""

    entity: str
    content: str
    citations: List[str]
    focus_areas: Optional[List[str]]
    mock: bool
    credit_cost: int = 15


class DeepResearchRequest(BaseModel):
    """Request for deep research."""

    topic: str = Field(..., description="Research topic")
    focus_areas: Optional[List[str]] = Field(
        default=None, description="Specific areas to investigate"
    )
    symbols: Optional[List[str]] = Field(
        default=None, description="Related stock symbols"
    )


class DeepResearchResponse(BaseModel):
    """Response for deep research."""

    topic: str
    content: str
    citations: List[str]
    focus_areas: Optional[List[str]]
    symbols: Optional[List[str]]
    mock: bool
    credit_cost: int = 50


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    configured: bool
    cache_stats: Dict[str, Any]


# ============== Dependency ==============


def get_client() -> PerplexityFinanceClient:
    """Get the Perplexity Finance client."""
    return get_perplexity_finance_client()


# ============== API Endpoints ==============


@router.post(
    "/sec/search",
    response_model=SECSearchResponse,
    dependencies=[Depends(require_action(ActionCost.SEC_SEARCH))],
)
async def search_sec_filings(
    request: SECSearchRequest,
    client: PerplexityFinanceClient = Depends(get_client),
):
    """
    Search SEC filings for a company using AI.

    Searches 10-K, 10-Q, 8-K, S-1, and other SEC filings with natural language
    queries. Returns AI-analyzed content with key findings, risk factors,
    and notable disclosures.

    Args:
        request: SECSearchRequest with symbol, filing_type, query, date_after

    Returns:
        SECSearchResponse with AI analysis and citations

    Credit Cost: 10 credits
    """
    try:
        result = await client.search_sec_filings(
            symbol=request.symbol.upper(),
            filing_type=request.filing_type,
            query=request.query,
            date_after=request.date_after,
        )

        return SECSearchResponse(
            symbol=request.symbol.upper(),
            filing_type=request.filing_type,
            content=result["content"],
            citations=result["citations"],
            mock=result["mock"],
        )

    except Exception as e:
        logger.error(f"SEC search error for {request.symbol}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to search SEC filings")


@router.get(
    "/sec/search",
    response_model=SECSearchResponse,
    dependencies=[Depends(require_action(ActionCost.SEC_SEARCH))],
)
async def search_sec_filings_get(
    symbol: str = Query(..., description="Stock ticker symbol"),
    filing_type: str = Query("all", description="Filing type filter"),
    query: Optional[str] = Query(None, description="Search query"),
    date_after: Optional[str] = Query(None, description="Date filter (YYYY-MM-DD)"),
    client: PerplexityFinanceClient = Depends(get_client),
):
    """GET endpoint for SEC filing search (convenience)."""
    request = SECSearchRequest(
        symbol=symbol,
        filing_type=filing_type,
        query=query,
        date_after=date_after,
    )
    return await search_sec_filings(request, client)


@router.post(
    "/market/summary",
    response_model=MarketSummaryResponse,
    dependencies=[Depends(require_action(ActionCost.MARKET_SUMMARY))],
)
async def get_market_summary(
    request: MarketSummaryRequest,
    client: PerplexityFinanceClient = Depends(get_client),
):
    """
    Get AI-synthesized market summary.

    Provides comprehensive market overview including:
    - Major indices performance
    - Sector highlights
    - Key economic data
    - Notable earnings
    - Market-moving news

    Args:
        request: MarketSummaryRequest with optional topics filter

    Returns:
        MarketSummaryResponse with AI analysis

    Credit Cost: 5 credits
    """
    try:
        result = await client.get_market_summary(topics=request.topics)

        return MarketSummaryResponse(
            content=result["content"],
            citations=result["citations"],
            topics=request.topics,
            mock=result["mock"],
        )

    except Exception as e:
        logger.error(f"Market summary error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to get market summary")


@router.get(
    "/market/summary",
    response_model=MarketSummaryResponse,
    dependencies=[Depends(require_action(ActionCost.MARKET_SUMMARY))],
)
async def get_market_summary_get(
    topics: Optional[str] = Query(None, description="Comma-separated topics"),
    client: PerplexityFinanceClient = Depends(get_client),
):
    """GET endpoint for market summary (convenience)."""
    topic_list = [t.strip() for t in topics.split(",")] if topics else None
    request = MarketSummaryRequest(topics=topic_list)
    return await get_market_summary(request, client)


@router.post(
    "/earnings/search",
    response_model=EarningsResponse,
    dependencies=[Depends(require_action(ActionCost.EARNINGS_TRANSCRIPT))],
)
async def search_earnings_transcripts(
    request: EarningsRequest,
    client: PerplexityFinanceClient = Depends(get_client),
):
    """
    Search earnings call transcripts using AI.

    Analyzes earnings call transcripts to extract:
    - Key takeaways
    - Guidance highlights
    - Management tone
    - Important Q&A moments
    - Unexpected disclosures

    Args:
        request: EarningsRequest with symbol, quarter, query

    Returns:
        EarningsResponse with AI analysis and citations

    Credit Cost: 15 credits
    """
    try:
        result = await client.search_earnings_transcripts(
            symbol=request.symbol.upper(),
            quarter=request.quarter,
            query=request.query,
        )

        return EarningsResponse(
            symbol=request.symbol.upper(),
            quarter=request.quarter,
            content=result["content"],
            citations=result["citations"],
            mock=result["mock"],
        )

    except Exception as e:
        logger.error(f"Earnings search error for {request.symbol}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail="Failed to search earnings transcripts"
        )


@router.get(
    "/earnings/search",
    response_model=EarningsResponse,
    dependencies=[Depends(require_action(ActionCost.EARNINGS_TRANSCRIPT))],
)
async def search_earnings_transcripts_get(
    symbol: str = Query(..., description="Stock ticker symbol"),
    quarter: Optional[str] = Query(None, description="Specific quarter"),
    query: Optional[str] = Query(None, description="Search query"),
    client: PerplexityFinanceClient = Depends(get_client),
):
    """GET endpoint for earnings transcript search (convenience)."""
    request = EarningsRequest(symbol=symbol, quarter=quarter, query=query)
    return await search_earnings_transcripts(request, client)


@router.post(
    "/screener",
    response_model=ScreenerResponse,
    dependencies=[Depends(require_action(ActionCost.NL_SCREENER))],
)
async def natural_language_screen(
    request: ScreenerRequest,
    client: PerplexityFinanceClient = Depends(get_client),
):
    """
    Screen stocks using natural language queries.

    Translate plain English criteria into stock matches:
    - "tech stocks with PE under 20"
    - "dividend stocks yielding over 4%"
    - "small cap biotech with recent FDA approvals"

    Returns matching stocks with relevant metrics and explanations.

    Args:
        request: ScreenerRequest with query and limit

    Returns:
        ScreenerResponse with matching stocks

    Credit Cost: 20 credits
    """
    try:
        result = await client.natural_language_screen(
            query=request.query,
            limit=request.limit,
        )

        return ScreenerResponse(
            query=request.query,
            content=result["content"],
            citations=result["citations"],
            mock=result["mock"],
        )

    except Exception as e:
        logger.error(f"Screener error for '{request.query}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to run stock screener")


@router.get(
    "/screener",
    response_model=ScreenerResponse,
    dependencies=[Depends(require_action(ActionCost.NL_SCREENER))],
)
async def natural_language_screen_get(
    q: str = Query(..., min_length=5, description="Natural language query"),
    limit: int = Query(10, ge=1, le=50, description="Max results"),
    client: PerplexityFinanceClient = Depends(get_client),
):
    """GET endpoint for natural language screening (convenience)."""
    request = ScreenerRequest(query=q, limit=limit)
    return await natural_language_screen(request, client)


@router.post(
    "/profile",
    response_model=ProfileResponse,
    dependencies=[Depends(require_action(ActionCost.COMPANY_PROFILE))],
)
async def build_company_profile(
    request: ProfileRequest,
    client: PerplexityFinanceClient = Depends(get_client),
):
    """
    Build comprehensive company profile using AI.

    Generates detailed profile including:
    - Company overview
    - Business model
    - Competitive position
    - Key executives
    - Recent developments
    - Financial highlights
    - Risk factors
    - Analyst sentiment

    Args:
        request: ProfileRequest with entity and focus_areas

    Returns:
        ProfileResponse with comprehensive profile

    Credit Cost: 15 credits
    """
    try:
        result = await client.build_profile(
            entity=request.entity,
            focus_areas=request.focus_areas,
        )

        return ProfileResponse(
            entity=request.entity,
            content=result["content"],
            citations=result["citations"],
            focus_areas=request.focus_areas,
            mock=result["mock"],
        )

    except Exception as e:
        logger.error(f"Profile error for {request.entity}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to build company profile")


@router.get(
    "/profile/{entity}",
    response_model=ProfileResponse,
    dependencies=[Depends(require_action(ActionCost.COMPANY_PROFILE))],
)
async def build_company_profile_get(
    entity: str,
    focus: Optional[str] = Query(None, description="Comma-separated focus areas"),
    client: PerplexityFinanceClient = Depends(get_client),
):
    """GET endpoint for company profile (convenience)."""
    focus_areas = [f.strip() for f in focus.split(",")] if focus else None
    request = ProfileRequest(entity=entity, focus_areas=focus_areas)
    return await build_company_profile(request, client)


@router.post(
    "/research",
    response_model=DeepResearchResponse,
    dependencies=[Depends(require_action(ActionCost.DEEP_RESEARCH))],
)
async def generate_deep_research(
    request: DeepResearchRequest,
    client: PerplexityFinanceClient = Depends(get_client),
):
    """
    Generate comprehensive deep research report.

    Creates in-depth analysis including:
    - Executive summary
    - Market context and trends
    - Key findings and data
    - Risk assessment
    - Investment implications
    - Conclusions and recommendations

    Uses Perplexity's reasoning model for thorough analysis.

    Args:
        request: DeepResearchRequest with topic, focus_areas, symbols

    Returns:
        DeepResearchResponse with comprehensive report

    Credit Cost: 50 credits
    """
    try:
        result = await client.deep_research(
            topic=request.topic,
            focus_areas=request.focus_areas,
            symbols=request.symbols,
        )

        return DeepResearchResponse(
            topic=request.topic,
            content=result["content"],
            citations=result["citations"],
            focus_areas=request.focus_areas,
            symbols=request.symbols,
            mock=result["mock"],
        )

    except Exception as e:
        logger.error(f"Deep research error for '{request.topic}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate deep research")


@router.get("/health", response_model=HealthResponse)
async def health_check(
    client: PerplexityFinanceClient = Depends(get_client),
):
    """
    Check Perplexity Finance API health.

    Returns configuration status and cache statistics.
    """
    try:
        configured = client.is_configured()
        cache_stats = client.get_cache_stats()

        # Try a quick health check if configured
        status = "healthy"
        if configured:
            is_healthy = await client.health_check()
            status = "healthy" if is_healthy else "degraded"
        else:
            status = "mock_mode"

        return HealthResponse(
            status=status,
            configured=configured,
            cache_stats=cache_stats,
        )

    except Exception as e:
        logger.error(f"Health check failed: {e}", exc_info=True)
        return HealthResponse(
            status="unhealthy",
            configured=False,
            cache_stats={},
        )


@router.post("/cache/clear")
async def clear_cache(
    cache_type: Optional[str] = Query(
        None, description="Cache type to clear (sec, earnings, profile, etc.)"
    ),
    client: PerplexityFinanceClient = Depends(get_client),
):
    """
    Clear Perplexity Finance cache.

    Args:
        cache_type: Optional specific cache type to clear

    Returns:
        Confirmation message
    """
    try:
        client.clear_cache(cache_type)
        return {
            "status": "success",
            "message": f"Cleared {'all' if not cache_type else cache_type} cache",
        }
    except Exception as e:
        logger.error(f"Cache clear error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to clear cache")


# Cleanup on shutdown
@router.on_event("shutdown")
async def shutdown_event():
    """Close client session on shutdown."""
    client = get_perplexity_finance_client()
    await client.close()
    logger.info("Perplexity Finance client closed")
