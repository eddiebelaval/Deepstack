"""
DeepSignals API Router for DeepStack Trading System

Provides REST endpoints for market intelligence signals:
- Options flow alerts (sweeps, blocks, unusual volume)
- GEX (Gamma Exposure) data and key levels
- Dark pool / FINRA short volume data
- Insider trading (SEC Form 4)
- Congressional trading disclosures
- IV tracking and percentiles
- Multi-source sentiment aggregation
"""

import logging
import os
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from .credits import ActionCost, free_action

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/signals", tags=["signals"])


# ============== Lazy Client Initialization ==============

# Options chain data source (needed for flow, GEX, sentiment)
_options_client = None


def _get_options_client():
    """Lazy-init Alpaca options client for chain data."""
    global _options_client
    if _options_client is None:
        from ..data.alpaca_options_client import AlpacaOptionsClient

        api_key = os.environ.get("ALPACA_API_KEY", "")
        secret_key = os.environ.get("ALPACA_SECRET_KEY", "")
        feed = os.environ.get("ALPACA_OPTIONS_FEED", "indicative")
        if not api_key or not secret_key:
            return None
        _options_client = AlpacaOptionsClient(
            api_key=api_key, secret_key=secret_key, feed=feed
        )
    return _options_client


_flow_detector = None


def _get_flow_detector():
    """Lazy-init FlowDetector."""
    global _flow_detector
    if _flow_detector is None:
        from ..signals.flow_detector import FlowDetector

        _flow_detector = FlowDetector()
    return _flow_detector


_gex_calculator = None


def _get_gex_calculator():
    """Lazy-init GEXCalculator."""
    global _gex_calculator
    if _gex_calculator is None:
        from ..signals.gex_calculator import GEXCalculator

        _gex_calculator = GEXCalculator()
    return _gex_calculator


_finra_client = None


def _get_finra_client():
    """Lazy-init FINRAClient."""
    global _finra_client
    if _finra_client is None:
        from ..data.finra_client import FINRAClient

        _finra_client = FINRAClient()
    return _finra_client


_sec_client = None


def _get_sec_client():
    """Lazy-init SECEdgarClient."""
    global _sec_client
    if _sec_client is None:
        from ..data.sec_edgar_client import SECEdgarClient

        _sec_client = SECEdgarClient()
    return _sec_client


_quiver_client = None


def _get_quiver_client():
    """Lazy-init QuiverClient."""
    global _quiver_client
    if _quiver_client is None:
        from ..data.quiver_client import QuiverClient

        _quiver_client = QuiverClient()
    return _quiver_client


_iv_tracker = None


def _get_iv_tracker():
    """Lazy-init IVTracker."""
    global _iv_tracker
    if _iv_tracker is None:
        from ..signals.iv_tracker import IVTracker

        _iv_tracker = IVTracker()
    return _iv_tracker


_sentiment_aggregator = None


def _get_sentiment_aggregator():
    """Lazy-init SentimentAggregator with CBOEClient + FlowDetector."""
    global _sentiment_aggregator
    if _sentiment_aggregator is None:
        from ..data.cboe_client import CBOEClient
        from ..signals.sentiment_aggregator import SentimentAggregator

        cboe = CBOEClient()
        flow = _get_flow_detector()
        _sentiment_aggregator = SentimentAggregator(
            cboe_client=cboe, flow_detector=flow
        )
    return _sentiment_aggregator


async def _get_chain_and_spot(symbol: str):
    """Fetch options chain + spot price for a symbol. Returns (contracts, spot)."""
    client = _get_options_client()
    if client is None:
        raise HTTPException(
            status_code=503, detail="Options data source not configured"
        )
    chain = await client.get_option_chain(symbol=symbol, limit=500)
    if chain is None or not chain.contracts:
        raise HTTPException(
            status_code=404, detail=f"No options data found for {symbol}"
        )
    return chain.contracts, chain.underlying_price


# ============== Response Models ==============


class FlowAlertResponse(BaseModel):
    """Single options flow alert."""

    id: str
    symbol: str
    alert_type: str
    option_type: Optional[str] = None
    strike: Optional[float] = None
    expiry: Optional[str] = None
    volume: Optional[int] = None
    open_interest: Optional[int] = None
    volume_oi_ratio: Optional[float] = None
    premium: Optional[float] = None
    confidence: Optional[int] = None
    detected_at: str
    metadata: Optional[dict] = None


class FlowSummaryResponse(BaseModel):
    """Aggregated flow summary for a symbol."""

    symbol: str
    total_alerts: int = 0
    call_flow: float = 0.0
    put_flow: float = 0.0
    net_flow: float = 0.0
    dominant_side: str = "neutral"
    top_strikes: List[dict] = Field(default_factory=list)
    summary_period: str = "24h"


class GEXDataResponse(BaseModel):
    """GEX (Gamma Exposure) data for a symbol."""

    symbol: str
    total_gex: float = 0.0
    call_gex: float = 0.0
    put_gex: float = 0.0
    net_gex: float = 0.0
    gex_by_strike: List[dict] = Field(default_factory=list)
    flip_point: Optional[float] = None
    timestamp: str = ""


class GEXLevelsResponse(BaseModel):
    """Key GEX levels (support/resistance from dealer hedging)."""

    symbol: str
    gamma_flip: Optional[float] = None
    call_wall: Optional[float] = None
    put_wall: Optional[float] = None
    max_gamma_strike: Optional[float] = None
    key_levels: List[dict] = Field(default_factory=list)
    timestamp: str = ""


class DarkPoolEntryResponse(BaseModel):
    """Single dark pool data point."""

    symbol: str
    date: str
    short_volume: int
    short_exempt_volume: int = 0
    total_volume: int
    short_ratio: float
    market: Optional[str] = None


class DarkPoolTopResponse(BaseModel):
    """Top dark pool activity entry."""

    symbol: str
    short_ratio: float
    short_volume: int
    total_volume: int
    date: str


class InsiderTradeResponse(BaseModel):
    """Single insider trade record."""

    id: str
    filer_name: str
    filer_cik: Optional[str] = None
    company: Optional[str] = None
    symbol: str
    filing_date: str
    transaction_type: str
    shares: Optional[float] = None
    price_per_share: Optional[float] = None
    total_value: Optional[float] = None
    ownership_type: Optional[str] = None
    source_url: Optional[str] = None


class CongressTradeResponse(BaseModel):
    """Single congressional trade record."""

    id: str
    politician: str
    party: Optional[str] = None
    chamber: Optional[str] = None
    state: Optional[str] = None
    symbol: str
    company_name: Optional[str] = None
    transaction_type: Optional[str] = None
    transaction_date: Optional[str] = None
    disclosure_date: Optional[str] = None
    amount_min: Optional[float] = None
    amount_max: Optional[float] = None


class SentimentResponse(BaseModel):
    """Sentiment data for a single symbol."""

    symbol: str
    overall_score: float = 0.0
    dark_pool_signal: Optional[str] = None
    insider_signal: Optional[str] = None
    congress_signal: Optional[str] = None
    flow_signal: Optional[str] = None
    components: dict = Field(default_factory=dict)
    timestamp: str = ""


class MarketSentimentResponse(BaseModel):
    """Broad market sentiment overview."""

    overall_score: float = 0.0
    put_call_ratio: Optional[float] = None
    vix_level: Optional[float] = None
    dark_pool_aggregate: Optional[str] = None
    insider_aggregate: Optional[str] = None
    congress_aggregate: Optional[str] = None
    top_bullish: List[str] = Field(default_factory=list)
    top_bearish: List[str] = Field(default_factory=list)
    timestamp: str = ""


class IVDataResponse(BaseModel):
    """Implied volatility data for a symbol."""

    symbol: str
    current_iv: Optional[float] = None
    iv_percentile: Optional[float] = None
    iv_rank: Optional[float] = None
    iv_high_52w: Optional[float] = None
    iv_low_52w: Optional[float] = None
    history: List[dict] = Field(default_factory=list)
    timestamp: str = ""


# ============== API Endpoints ==============


@router.get(
    "/flow",
    response_model=List[FlowAlertResponse],
    dependencies=[Depends(free_action(ActionCost.SIGNALS_FLOW))],
)
async def get_flow_alerts(
    ticker: str = Query(..., description="Stock symbol"),
    limit: int = Query(50, ge=1, le=500, description="Max alerts to return"),
):
    """
    Get recent options flow alerts for a symbol.

    Returns sweeps, blocks, unusual volume, large premium, and P/C imbalances.
    """
    try:
        symbol = ticker.upper()
        contracts, spot_price = await _get_chain_and_spot(symbol)

        detector = _get_flow_detector()
        alerts = detector.detect_unusual_flow(contracts, spot_price)

        result = [
            FlowAlertResponse(
                id=str(uuid.uuid4()),
                symbol=a.symbol,
                alert_type=a.alert_type,
                option_type=a.option_type,
                strike=a.strike,
                expiry=a.expiry,
                volume=a.volume,
                open_interest=a.open_interest,
                volume_oi_ratio=round(a.volume_oi_ratio, 2),
                premium=round(a.estimated_premium, 2),
                confidence=a.confidence,
                detected_at=a.detected_at.isoformat(),
            ).model_dump()
            for a in alerts[:limit]
        ]

        return JSONResponse(
            content=result,
            headers={"Cache-Control": "public, max-age=300"},
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting flow alerts for {ticker}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/flow/summary",
    response_model=FlowSummaryResponse,
    dependencies=[Depends(free_action(ActionCost.SIGNALS_FLOW))],
)
async def get_flow_summary(
    ticker: str = Query(..., description="Stock symbol"),
):
    """
    Get aggregated flow summary for a symbol (call/put flow, net direction).
    """
    try:
        symbol = ticker.upper()
        contracts, spot_price = await _get_chain_and_spot(symbol)

        detector = _get_flow_detector()
        summary = detector.get_flow_summary(contracts, spot_price)

        # Derive dominant side and top strikes from alerts
        dominant = "neutral"
        if summary.bullish_score > 60:
            dominant = "bullish"
        elif summary.bearish_score > 60:
            dominant = "bearish"

        top_strikes = [
            {
                "strike": a.strike,
                "type": a.option_type,
                "volume": a.volume,
                "premium": round(a.estimated_premium, 2),
            }
            for a in summary.top_alerts[:5]
        ]

        return JSONResponse(
            content={
                "symbol": symbol,
                "total_alerts": len(summary.top_alerts),
                "call_flow": float(summary.total_call_volume),
                "put_flow": float(summary.total_put_volume),
                "net_flow": round(summary.net_premium, 2),
                "dominant_side": dominant,
                "top_strikes": top_strikes,
                "summary_period": "24h",
            },
            headers={"Cache-Control": "public, max-age=300"},
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting flow summary for {ticker}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/gex",
    response_model=GEXDataResponse,
    dependencies=[Depends(free_action(ActionCost.SIGNALS_GEX))],
)
async def get_gex_data(
    ticker: str = Query(..., description="Stock symbol"),
):
    """
    Get GEX (Gamma Exposure) data for a symbol.

    Shows dealer gamma exposure by strike, net GEX, and gamma flip point.
    """
    try:
        symbol = ticker.upper()
        contracts, spot_price = await _get_chain_and_spot(symbol)

        calc = _get_gex_calculator()
        total = calc.calculate_total_gex(contracts, spot_price)
        gex_by_strike = calc.calculate_gex_by_strike(contracts, spot_price)

        strike_data = [
            {
                "strike": g.strike,
                "call_gex": round(g.call_gex, 2),
                "put_gex": round(g.put_gex, 2),
                "total_gex": round(g.total_gex, 2),
                "call_oi": g.call_oi,
                "put_oi": g.put_oi,
            }
            for g in gex_by_strike.values()
        ]

        # Sum call/put GEX across all strikes
        call_gex = sum(g.call_gex for g in gex_by_strike.values())
        put_gex = sum(g.put_gex for g in gex_by_strike.values())

        return JSONResponse(
            content={
                "symbol": symbol,
                "total_gex": round(total.total_gex, 2),
                "call_gex": round(call_gex, 2),
                "put_gex": round(put_gex, 2),
                "net_gex": round(total.total_gex, 2),
                "gex_by_strike": strike_data,
                "flip_point": round(total.flip_point, 2) if total.flip_point else None,
                "timestamp": datetime.now().isoformat(),
            },
            headers={"Cache-Control": "public, max-age=300"},
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting GEX data for {ticker}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/gex/levels",
    response_model=GEXLevelsResponse,
    dependencies=[Depends(free_action(ActionCost.SIGNALS_GEX))],
)
async def get_gex_levels(
    ticker: str = Query(..., description="Stock symbol"),
):
    """
    Get key GEX levels: gamma flip, call wall, put wall.

    These represent support/resistance levels derived from dealer hedging flows.
    """
    try:
        symbol = ticker.upper()
        contracts, spot_price = await _get_chain_and_spot(symbol)

        calc = _get_gex_calculator()
        total = calc.calculate_total_gex(contracts, spot_price)
        gex_by_strike = calc.calculate_gex_by_strike(contracts, spot_price)

        # Build key_levels list with the top 5 strikes by absolute GEX
        sorted_strikes = sorted(
            gex_by_strike.values(), key=lambda g: abs(g.total_gex), reverse=True
        )
        key_levels = [
            {
                "strike": g.strike,
                "total_gex": round(g.total_gex, 2),
                "type": "call_wall" if g.total_gex > 0 else "put_wall",
            }
            for g in sorted_strikes[:5]
        ]

        return JSONResponse(
            content={
                "symbol": symbol,
                "gamma_flip": (
                    round(total.flip_point, 2) if total.flip_point else None
                ),
                "call_wall": total.call_wall,
                "put_wall": total.put_wall,
                "max_gamma_strike": total.max_gamma_strike,
                "key_levels": key_levels,
                "timestamp": datetime.now().isoformat(),
            },
            headers={"Cache-Control": "public, max-age=300"},
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting GEX levels for {ticker}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/darkpool",
    response_model=List[DarkPoolEntryResponse],
    dependencies=[Depends(free_action(ActionCost.SIGNALS_DARKPOOL))],
)
async def get_dark_pool_data(
    ticker: str = Query(..., description="Stock symbol"),
    days: int = Query(30, ge=1, le=365, description="Number of days of history"),
):
    """
    Get dark pool / FINRA short volume data for a symbol.

    Daily short volume ratios over the requested time window.
    """
    try:
        symbol = ticker.upper()
        finra = _get_finra_client()
        records = await finra.get_ticker_short_volume(symbol, days=days)

        result = [
            DarkPoolEntryResponse(
                symbol=r.symbol,
                date=r.date.isoformat(),
                short_volume=r.short_volume,
                short_exempt_volume=r.short_exempt_volume,
                total_volume=r.total_volume,
                short_ratio=round(r.short_ratio, 4),
                market=r.market,
            ).model_dump()
            for r in records
        ]

        return JSONResponse(
            content=result,
            headers={"Cache-Control": "public, max-age=3600"},
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting dark pool data for {ticker}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/darkpool/top",
    response_model=List[DarkPoolTopResponse],
    dependencies=[Depends(free_action(ActionCost.SIGNALS_DARKPOOL))],
)
async def get_dark_pool_top(
    limit: int = Query(20, ge=1, le=100, description="Max symbols to return"),
):
    """
    Get top symbols by dark pool short ratio (today's most shorted).
    """
    try:
        finra = _get_finra_client()
        records = await finra.get_top_dark_pool_activity(limit=limit)

        result = [
            DarkPoolTopResponse(
                symbol=r.symbol,
                short_ratio=round(r.short_ratio, 4),
                short_volume=r.short_volume,
                total_volume=r.total_volume,
                date=r.date.isoformat(),
            ).model_dump()
            for r in records
        ]

        return JSONResponse(
            content=result,
            headers={"Cache-Control": "public, max-age=3600"},
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting top dark pool data: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/insider",
    response_model=List[InsiderTradeResponse],
    dependencies=[Depends(free_action(ActionCost.SIGNALS_INSIDER))],
)
async def get_insider_trades(
    ticker: str = Query(..., description="Stock symbol"),
    limit: int = Query(50, ge=1, le=500, description="Max trades to return"),
):
    """
    Get recent insider trades (SEC Form 4 filings) for a symbol.
    """
    try:
        symbol = ticker.upper()
        sec = _get_sec_client()
        trades = await sec.get_insider_trades_by_ticker(symbol, days=90)

        result = [
            InsiderTradeResponse(
                id=str(uuid.uuid4()),
                filer_name=t.filer_name,
                filer_cik=t.filer_cik,
                company=t.company,
                symbol=t.ticker,
                filing_date=t.filing_date,
                transaction_type=t.transaction_type,
                shares=t.shares,
                price_per_share=t.price_per_share,
                total_value=t.total_value,
                ownership_type=t.ownership_type,
                source_url=t.source_url,
            ).model_dump()
            for t in trades[:limit]
        ]

        return JSONResponse(
            content=result,
            headers={"Cache-Control": "public, max-age=3600"},
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting insider trades for {ticker}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/congress",
    response_model=List[CongressTradeResponse],
    dependencies=[Depends(free_action(ActionCost.SIGNALS_CONGRESS))],
)
async def get_congress_trades(
    ticker: str = Query(..., description="Stock symbol"),
    limit: int = Query(50, ge=1, le=500, description="Max trades to return"),
):
    """
    Get recent congressional trading disclosures (STOCK Act) for a symbol.
    """
    try:
        symbol = ticker.upper()
        quiver = _get_quiver_client()
        trades = await quiver.get_congress_trades_by_ticker(symbol)

        result = [
            CongressTradeResponse(
                id=str(uuid.uuid4()),
                politician=t.politician,
                party=t.party,
                chamber=t.chamber,
                state=t.state,
                symbol=t.ticker,
                company_name=t.company_name,
                transaction_type=t.transaction_type,
                transaction_date=t.transaction_date,
                disclosure_date=t.disclosure_date,
                amount_min=t.amount_min,
                amount_max=t.amount_max,
            ).model_dump()
            for t in trades[:limit]
        ]

        return JSONResponse(
            content=result,
            headers={"Cache-Control": "public, max-age=3600"},
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Error getting congress trades for {ticker}: {e}", exc_info=True
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/sentiment/market",
    response_model=MarketSentimentResponse,
    dependencies=[Depends(free_action(ActionCost.SIGNALS_SENTIMENT))],
)
async def get_market_sentiment():
    """
    Get broad market sentiment overview.

    Aggregates CBOE put/call ratios into a market-wide sentiment snapshot.
    """
    try:
        agg = _get_sentiment_aggregator()
        sentiment = await agg.get_market_sentiment()

        # Map sentiment label to a numeric score (-100 to +100)
        label_scores = {
            "extreme_greed": 80.0,
            "greed": 40.0,
            "neutral": 0.0,
            "fear": -40.0,
            "extreme_fear": -80.0,
        }
        score = label_scores.get(sentiment.sentiment_label, 0.0)

        return JSONResponse(
            content={
                "overall_score": score,
                "put_call_ratio": round(sentiment.pcr_total, 3),
                "vix_level": None,
                "dark_pool_aggregate": None,
                "insider_aggregate": None,
                "congress_aggregate": None,
                "top_bullish": [],
                "top_bearish": [],
                "timestamp": sentiment.timestamp.isoformat(),
            },
            headers={"Cache-Control": "public, max-age=300"},
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting market sentiment: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/sentiment",
    response_model=SentimentResponse,
    dependencies=[Depends(free_action(ActionCost.SIGNALS_SENTIMENT))],
)
async def get_symbol_sentiment(
    ticker: str = Query(..., description="Stock symbol"),
):
    """
    Get aggregated sentiment for a specific symbol.

    Combines options flow and put/call ratio signals into a single score.
    """
    try:
        symbol = ticker.upper()
        contracts, spot_price = await _get_chain_and_spot(symbol)

        agg = _get_sentiment_aggregator()
        sentiment = await agg.get_ticker_sentiment(symbol, contracts, spot_price)

        # Derive signal labels from the overall score
        def _score_to_label(score: int) -> str:
            if score > 30:
                return "bullish"
            elif score < -30:
                return "bearish"
            return "neutral"

        flow_label = _score_to_label(
            sentiment.flow_bullish_score - sentiment.flow_bearish_score
        )

        return JSONResponse(
            content={
                "symbol": symbol,
                "overall_score": float(sentiment.overall_sentiment),
                "dark_pool_signal": None,
                "insider_signal": None,
                "congress_signal": None,
                "flow_signal": flow_label,
                "components": {
                    "flow_bullish": sentiment.flow_bullish_score,
                    "flow_bearish": sentiment.flow_bearish_score,
                    "put_call_ratio": sentiment.pcr,
                    "net_premium": sentiment.net_premium,
                    "call_volume": sentiment.call_volume,
                    "put_volume": sentiment.put_volume,
                },
                "timestamp": datetime.now().isoformat(),
            },
            headers={"Cache-Control": "public, max-age=300"},
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting sentiment for {ticker}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/iv",
    response_model=IVDataResponse,
    dependencies=[Depends(free_action(ActionCost.SIGNALS_IV))],
)
async def get_iv_data(
    ticker: str = Query(..., description="Stock symbol"),
):
    """
    Get implied volatility data, percentile, and rank for a symbol.

    IV percentile is calculated from ~252 trading days of history.
    """
    try:
        symbol = ticker.upper()
        tracker = _get_iv_tracker()

        # Fetch metrics and recent history concurrently
        metrics = await tracker.get_iv_percentile(symbol)
        history_records = await tracker.get_iv_history(symbol, days=60)

        history = [
            {"date": r.date, "iv": r.implied_volatility}
            for r in history_records
        ]

        return JSONResponse(
            content={
                "symbol": symbol,
                "current_iv": metrics.current_iv if metrics else None,
                "iv_percentile": metrics.iv_percentile if metrics else None,
                "iv_rank": metrics.iv_rank if metrics else None,
                "iv_high_52w": metrics.iv_high_252 if metrics else None,
                "iv_low_52w": metrics.iv_low_252 if metrics else None,
                "history": history,
                "timestamp": datetime.now().isoformat(),
            },
            headers={"Cache-Control": "public, max-age=300"},
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting IV data for {ticker}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
