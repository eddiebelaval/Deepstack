"""
Prediction Markets API Router for DeepStack Trading System

Provides REST endpoints for:
- Trending prediction markets from Kalshi and Polymarket
- Market search across platforms
- Market detail and history
- Category discovery
- AI-powered market analysis
"""

import logging
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from ..analysis.prediction_market_analyzer import (
    MarketAnalysis,
    PredictionMarketAnalyzer,
)
from ..data.prediction_markets import (
    Platform,
    PredictionMarket,
    PredictionMarketManager,
)
from .credits import ActionCost, require_action

logger = logging.getLogger(__name__)

# Create router with prefix
router = APIRouter(prefix="/api/predictions", tags=["predictions"])

# Global manager instance (lazy initialization)
_manager: Optional[PredictionMarketManager] = None
_analyzer: Optional[PredictionMarketAnalyzer] = None


def get_manager() -> PredictionMarketManager:
    """Get or create the prediction market manager."""
    global _manager
    if _manager is None:
        _manager = PredictionMarketManager()
    return _manager


def get_analyzer() -> PredictionMarketAnalyzer:
    """Get or create the prediction market analyzer."""
    global _analyzer
    if _analyzer is None:
        _analyzer = PredictionMarketAnalyzer(manager=get_manager())
    return _analyzer


# ============== Response Models ==============


class TrendingMarketsResponse(BaseModel):
    """Response for trending markets."""

    markets: List[PredictionMarket]
    count: int


class SearchMarketsResponse(BaseModel):
    """Response for market search."""

    markets: List[PredictionMarket]
    query: str
    count: int


class MarketDetailResponse(BaseModel):
    """Response for single market detail."""

    market: PredictionMarket


class HistoryPoint(BaseModel):
    """Single historical data point."""

    timestamp: str
    price: float
    volume: Optional[float] = None


class MarketHistoryResponse(BaseModel):
    """Response for market history."""

    platform: str
    market_id: str
    history: List[HistoryPoint]


class CategoriesResponse(BaseModel):
    """Response for available categories."""

    kalshi: List[str]
    polymarket: List[str]


class AnalysisRequest(BaseModel):
    """Request body for market analysis."""

    platform: str
    market_id: str
    analysis_types: List[str] = ["inefficiency", "momentum"]
    thesis_symbol: Optional[str] = None
    thesis_hypothesis: Optional[str] = None


class MarketAnalysisResponse(BaseModel):
    """Response for market analysis."""

    market_id: str
    platform: str
    analyses: List[MarketAnalysis]
    summary: Dict


# ============== API Endpoints ==============


@router.get(
    "/trending",
    response_model=TrendingMarketsResponse,
    dependencies=[Depends(require_action(ActionCost.PREDICTION_MARKETS_LIST))],
)
async def get_trending(
    limit: int = Query(20, ge=1, le=100, description="Max markets to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    category: Optional[str] = Query(None, description="Filter by category"),
    source: Optional[str] = Query(
        None, description="Filter by platform (kalshi, polymarket)"
    ),
):
    """
    Get trending prediction markets from Kalshi and Polymarket.

    Returns markets sorted by volume (24h if available, otherwise total volume).

    Args:
        limit: Maximum number of markets to return (1-100)
        offset: Pagination offset for infinite scroll
        category: Optional category filter
        source: Optional platform filter (kalshi, polymarket)

    Returns:
        List of trending prediction markets
    """
    try:
        manager = get_manager()
        markets = await manager.get_trending_markets(
            limit=limit, offset=offset, category=category, source=source
        )

        return TrendingMarketsResponse(markets=markets, count=len(markets))

    except Exception as e:
        logger.error(f"Error getting trending markets: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch trending markets")


@router.get(
    "/new",
    response_model=TrendingMarketsResponse,
    dependencies=[Depends(require_action(ActionCost.PREDICTION_MARKETS_LIST))],
)
async def get_new_markets(
    limit: int = Query(20, ge=1, le=100, description="Max markets to return"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    category: Optional[str] = Query(None, description="Filter by category"),
    source: Optional[str] = Query(
        None, description="Filter by platform (kalshi, polymarket)"
    ),
):
    """
    Get newly created/opened prediction markets from Kalshi and Polymarket.

    Returns markets sorted by creation date (newest first).

    Args:
        limit: Maximum number of markets to return (1-100)
        offset: Pagination offset for infinite scroll
        category: Optional category filter
        source: Optional platform filter (kalshi, polymarket)

    Returns:
        List of recently created prediction markets
    """
    try:
        manager = get_manager()
        markets = await manager.get_new_markets(
            limit=limit, offset=offset, category=category, source=source
        )

        return TrendingMarketsResponse(markets=markets, count=len(markets))

    except Exception as e:
        logger.error(f"Error getting new markets: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch new markets")


@router.get(
    "/search",
    response_model=SearchMarketsResponse,
    dependencies=[Depends(require_action(ActionCost.PREDICTION_MARKETS_LIST))],
)
async def search_markets(
    q: str = Query(..., min_length=2, description="Search query"),
):
    """
    Search prediction markets across Kalshi and Polymarket.

    Searches market titles and descriptions for matches.

    Args:
        q: Search query string (minimum 2 characters)

    Returns:
        List of matching prediction markets
    """
    try:
        manager = get_manager()
        markets = await manager.search(q)

        return SearchMarketsResponse(markets=markets, query=q, count=len(markets))

    except Exception as e:
        logger.error(f"Error searching markets: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to search markets")


@router.get(
    "/market/{platform}/{market_id}",
    response_model=MarketDetailResponse,
    dependencies=[Depends(require_action(ActionCost.PREDICTION_MARKETS_DETAIL))],
)
async def get_market(
    platform: str,
    market_id: str,
):
    """
    Get detailed information for a specific market.

    Args:
        platform: Platform name ('kalshi' or 'polymarket')
        market_id: Market identifier (ticker for Kalshi, condition_id for Polymarket)

    Returns:
        Detailed market information

    Example:
        GET /api/predictions/market/kalshi/FED-25JAN-T0.625
        GET /api/predictions/market/polymarket/0x123abc...
    """
    try:
        # Validate platform
        try:
            platform_enum = Platform(platform.lower())
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Invalid platform: {platform}. " "Must be 'kalshi' or 'polymarket'"
                ),
            )

        manager = get_manager()
        market = await manager.get_market_detail(platform_enum, market_id)

        if market is None:
            raise HTTPException(
                status_code=404,
                detail=f"Market not found: {market_id} on {platform}",
            )

        return MarketDetailResponse(market=market)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Error getting market detail for {platform}/{market_id}: {e}",
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail="Failed to fetch market details")


@router.get(
    "/market/{platform}/{market_id}/history",
    response_model=MarketHistoryResponse,
    dependencies=[Depends(require_action(ActionCost.PREDICTION_MARKETS_DETAIL))],
)
async def get_market_history(
    platform: str,
    market_id: str,
    timeframe: str = Query("1d", description="Timeframe (1h, 1d, 1w)"),
):
    """
    Get historical price data for a market.

    Args:
        platform: Platform name ('kalshi' or 'polymarket')
        market_id: Market identifier
        timeframe: Time interval (1h, 1d, 1w)

    Returns:
        Historical price and volume data

    Note:
        - Kalshi: Returns trade history
        - Polymarket: Returns price snapshots
    """
    try:
        # Validate platform
        try:
            platform_enum = Platform(platform.lower())
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid platform: {platform}",
            )

        manager = get_manager()
        history_points: List[HistoryPoint] = []

        if platform_enum == Platform.KALSHI:
            # Fetch Kalshi market history
            raw_history = await manager.kalshi.get_market_history(market_id, limit=100)
            if raw_history:
                for point in raw_history:
                    history_points.append(
                        HistoryPoint(
                            timestamp=point.get("ts", ""),
                            price=point.get("yes_price", 0) / 100.0,  # Convert cents
                            volume=point.get("volume"),
                        )
                    )

        elif platform_enum == Platform.POLYMARKET:
            # Map timeframe to fidelity (seconds)
            fidelity_map = {"1h": 3600, "1d": 86400, "1w": 604800}
            fidelity = fidelity_map.get(timeframe, 86400)

            # Fetch Polymarket price history
            raw_history = await manager.polymarket.get_prices_history(
                market_id, fidelity=fidelity
            )
            if raw_history:
                for point in raw_history:
                    history_points.append(
                        HistoryPoint(
                            timestamp=point.get("t", ""),
                            price=point.get("p", 0),
                        )
                    )

        return MarketHistoryResponse(
            platform=platform,
            market_id=market_id,
            history=history_points,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Error getting market history for {platform}/{market_id}: {e}",
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail="Failed to fetch market history")


@router.get("/categories", response_model=CategoriesResponse)
async def get_categories():
    """
    Get available market categories across platforms.

    Returns:
        Dictionary of categories per platform
    """
    try:
        manager = get_manager()
        categories = await manager.get_categories()

        return CategoriesResponse(
            kalshi=categories.get("kalshi", []),
            polymarket=categories.get("polymarket", []),
        )

    except Exception as e:
        logger.error(f"Error getting categories: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch categories")


@router.post(
    "/analyze",
    response_model=MarketAnalysisResponse,
    dependencies=[Depends(require_action(ActionCost.PREDICTION_MARKETS_ANALYZE))],
)
async def analyze_market(request: AnalysisRequest) -> MarketAnalysisResponse:
    """
    Run AI-powered analysis on a prediction market.

    Provides multiple types of analysis:
    - **inefficiency**: Detect price inefficiencies (large moves, positioning)
    - **momentum**: Analyze price trends and volume patterns
    - **contrarian**: Identify extreme positioning and mean reversion
    - **thesis_correlation**: Correlate to a trading thesis (requires extras)

    Args:
        request: Analysis request containing:
            - platform: 'kalshi' or 'polymarket'
            - market_id: Market identifier
            - analysis_types: List of analysis types to run
            - thesis_symbol: Optional stock symbol for thesis correlation
            - thesis_hypothesis: Optional thesis description

    Returns:
        MarketAnalysisResponse with individual analyses and summary

    Example:
        POST /api/predictions/analyze
        {
            "platform": "kalshi",
            "market_id": "FED-25JAN-T0.625",
            "analysis_types": ["inefficiency", "momentum", "contrarian"],
            "thesis_symbol": "TLT",
            "thesis_hypothesis": "Fed will cut rates, bullish for bonds"
        }
    """
    try:
        # Validate platform
        try:
            Platform(request.platform.lower())
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Invalid platform: {request.platform}. "
                    "Must be 'kalshi' or 'polymarket'"
                ),
            )

        # Validate analysis types
        valid_types = {"inefficiency", "momentum", "contrarian", "thesis_correlation"}
        requested_types = set(request.analysis_types)
        invalid_types = requested_types - valid_types
        if invalid_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid analysis types: {invalid_types}. "
                f"Valid types: {valid_types}",
            )

        # Check thesis correlation requirements
        if "thesis_correlation" in requested_types:
            if not request.thesis_symbol or not request.thesis_hypothesis:
                raise HTTPException(
                    status_code=400,
                    detail="thesis_correlation requires both "
                    "thesis_symbol and thesis_hypothesis",
                )

        analyzer = get_analyzer()
        analyses: List[MarketAnalysis] = []

        # Run requested analyses
        if "inefficiency" in requested_types:
            result = await analyzer.analyze_inefficiency(
                request.market_id, request.platform
            )
            analyses.append(result)

        if "momentum" in requested_types:
            result = await analyzer.analyze_momentum(
                request.market_id, request.platform
            )
            analyses.append(result)

        if "contrarian" in requested_types:
            result = await analyzer.analyze_contrarian(
                request.market_id, request.platform
            )
            analyses.append(result)

        if "thesis_correlation" in requested_types:
            result = await analyzer.correlate_to_thesis(
                request.market_id,
                request.platform,
                request.thesis_symbol,
                request.thesis_hypothesis,
            )
            analyses.append(result)

        # Generate summary
        avg_score = sum(a.score for a in analyses) / len(analyses) if analyses else 0
        signals = [a.signal for a in analyses]
        bullish_count = signals.count("bullish")
        bearish_count = signals.count("bearish")

        if bullish_count > bearish_count:
            consensus = "bullish"
        elif bearish_count > bullish_count:
            consensus = "bearish"
        else:
            consensus = "neutral"

        summary = {
            "average_score": round(avg_score, 1),
            "consensus_signal": consensus,
            "bullish_signals": bullish_count,
            "bearish_signals": bearish_count,
            "neutral_signals": len(signals) - bullish_count - bearish_count,
            "analyses_run": len(analyses),
        }

        logger.info(
            f"Analysis completed for {request.platform}/{request.market_id}: "
            f"avg_score={avg_score:.1f}, consensus={consensus}"
        )

        return MarketAnalysisResponse(
            market_id=request.market_id,
            platform=request.platform,
            analyses=analyses,
            summary=summary,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Error analyzing market {request.platform}/{request.market_id}: {e}",
            exc_info=True,
        )
        raise HTTPException(status_code=500, detail="Failed to analyze market")


@router.get(
    "/analyze/{platform}/{market_id}",
    dependencies=[Depends(require_action(ActionCost.PREDICTION_MARKETS_ANALYZE))],
)
async def analyze_market_quick(
    platform: str,
    market_id: str,
    types: str = Query(
        "inefficiency,momentum", description="Comma-separated analysis types"
    ),
) -> MarketAnalysisResponse:
    """
    Quick GET endpoint for market analysis.

    This is a convenience endpoint that accepts parameters via URL/query string.
    For full functionality including thesis correlation, use POST.

    Args:
        platform: 'kalshi' or 'polymarket'
        market_id: Market identifier
        types: Comma-separated list of analysis types

    Example::

        GET /api/predictions/analyze/kalshi/FED-25JAN
            ?types=inefficiency,momentum,contrarian
    """
    analysis_types = [t.strip() for t in types.split(",")]

    request = AnalysisRequest(
        platform=platform,
        market_id=market_id,
        analysis_types=analysis_types,
    )

    return await analyze_market(request)


@router.get("/health")
async def health_check():
    """Check prediction markets API health."""
    try:
        manager = get_manager()

        # Try to fetch a small amount of data to verify connectivity
        markets = await manager.get_trending_markets(limit=1)

        return {
            "status": "healthy" if markets else "degraded",
            "platforms": ["kalshi", "polymarket"],
            "markets_available": len(markets) > 0,
        }

    except Exception as e:
        logger.error(f"Health check failed: {e}", exc_info=True)
        return {
            "status": "unhealthy",
            "error": str(e),
        }


# Cleanup on shutdown
@router.on_event("shutdown")
async def shutdown_event():
    """Close all client sessions on shutdown."""
    global _manager, _analyzer  # noqa: F824
    if _analyzer:
        await _analyzer.close()
        _analyzer = None
        logger.info("Prediction market analyzer closed")
    if _manager:
        await _manager.close()
        _manager = None
        logger.info("Prediction market manager closed")
