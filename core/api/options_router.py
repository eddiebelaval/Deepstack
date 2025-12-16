"""
Options API Router for DeepStack Trading System

Provides REST endpoints for:
- Options chain data
- Options screening
- Strategy calculation and P&L modeling
- Greeks calculation
"""

import logging
import os
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from ..data.alpaca_options_client import (
    AlpacaOptionsClient,
    OptionContract,
    OptionType,
)
from ..strategies.options.base import OptionLeg, OptionsPosition
from ..strategies.options.greeks import (
    calculate_black_scholes_greeks,
    calculate_position_greeks,
)
from ..strategies.options.pnl_modeling import (
    calculate_pnl_at_expiration,
    find_breakeven_points,
    model_pnl_scenarios,
)
from .credits import ActionCost, require_action

logger = logging.getLogger(__name__)

# Create router with prefix
router = APIRouter(prefix="/api/options", tags=["options"])

# Initialize Alpaca options client (lazy initialization)
_options_client: Optional[AlpacaOptionsClient] = None


def get_options_client() -> AlpacaOptionsClient:
    """Get or create the Alpaca options client."""
    global _options_client
    if _options_client is None:
        api_key = os.environ.get("ALPACA_API_KEY", "")
        secret_key = os.environ.get("ALPACA_SECRET_KEY", "")
        feed = os.environ.get("ALPACA_OPTIONS_FEED", "indicative")

        if not api_key or not secret_key:
            raise HTTPException(
                status_code=500, detail="Alpaca API credentials not configured"
            )

        _options_client = AlpacaOptionsClient(
            api_key=api_key,
            secret_key=secret_key,
            feed=feed,
        )
    return _options_client


# ============== Request/Response Models ==============


class ExpirationResponse(BaseModel):
    """Response for expiration dates."""

    symbol: str
    expirations: List[str]


class OptionContractResponse(BaseModel):
    """Single option contract response."""

    symbol: str
    underlying_symbol: str
    option_type: str
    strike_price: float
    expiration_date: str
    days_to_expiration: int
    bid: Optional[float]
    ask: Optional[float]
    last_price: Optional[float]
    volume: Optional[int]
    open_interest: Optional[int]
    delta: Optional[float]
    gamma: Optional[float]
    theta: Optional[float]
    vega: Optional[float]
    implied_volatility: Optional[float]
    bid_ask_spread: Optional[float]
    bid_ask_spread_pct: Optional[float]
    moneyness: Optional[str]
    underlying_price: Optional[float]


class OptionChainResponse(BaseModel):
    """Options chain response."""

    underlying_symbol: str
    underlying_price: float
    contracts: List[OptionContractResponse]
    expirations: List[str]
    timestamp: str


class ScreenerFilters(BaseModel):
    """Filter criteria for options screening."""

    underlying_symbols: List[str] = Field(default=["SPY"])
    option_types: Optional[List[str]] = None  # ["call", "put"]
    min_dte: int = 0
    max_dte: int = 60
    min_volume: int = 0
    min_open_interest: int = 0
    min_delta: Optional[float] = None
    max_delta: Optional[float] = None
    min_theta: Optional[float] = None
    max_theta: Optional[float] = None
    min_vega: Optional[float] = None
    max_vega: Optional[float] = None
    min_iv: Optional[float] = None
    max_iv: Optional[float] = None
    max_bid_ask_spread_pct: Optional[float] = None
    moneyness: Optional[List[str]] = None  # ["itm", "atm", "otm"]
    sort_by: str = "volume"
    sort_order: str = "desc"
    limit: int = 100


class ScreenerResponse(BaseModel):
    """Screener results response."""

    contracts: List[OptionContractResponse]
    total_count: int
    filters_applied: Dict[str, Any]


class OptionLegRequest(BaseModel):
    """Single option leg for strategy calculation."""

    strike: float
    option_type: str  # "call" or "put"
    action: str  # "buy" or "sell"
    quantity: int = 1
    premium: float


class StrategyCalculationRequest(BaseModel):
    """Request for strategy P&L calculation."""

    symbol: str
    underlying_price: float
    legs: List[OptionLegRequest]
    expiration_date: str  # ISO format date
    volatility: float = 0.30
    risk_free_rate: float = 0.05
    price_range_pct: float = 0.20  # +/- 20% from current
    num_points: int = 100


class PnLPoint(BaseModel):
    """Single P&L data point."""

    price: float
    pnl: float


class GreeksResponse(BaseModel):
    """Greeks values."""

    delta: float
    gamma: float
    theta: float
    vega: float


class StrategyCalculationResponse(BaseModel):
    """Response from strategy calculation."""

    pnl_at_expiration: List[PnLPoint]
    pnl_current: List[PnLPoint]
    greeks: GreeksResponse
    greeks_over_price: List[Dict[str, float]]
    max_profit: float
    max_loss: float
    breakeven_points: List[float]
    risk_reward_ratio: float
    net_debit_credit: float
    strategy_name: str
    probability_of_profit: Optional[float] = None


class GreeksCalculationRequest(BaseModel):
    """Request for Greeks calculation."""

    underlying_price: float
    strike: float
    days_to_expiration: int
    volatility: float = 0.30
    risk_free_rate: float = 0.05
    option_type: str = "call"


# ============== API Endpoints ==============


@router.get(
    "/expirations/{symbol}",
    response_model=ExpirationResponse,
    dependencies=[Depends(require_action(ActionCost.OPTIONS_EXPIRATIONS))],
)
async def get_expirations(symbol: str):
    """
    Get available expiration dates for a symbol.

    Args:
        symbol: Underlying symbol (e.g., 'AAPL', 'SPY')

    Returns:
        List of expiration dates in ISO format
    """
    try:
        client = get_options_client()
        expirations = await client.get_expirations(symbol.upper())

        return ExpirationResponse(
            symbol=symbol.upper(),
            expirations=[exp.isoformat() for exp in expirations],
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting expirations for {symbol}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/chain/{symbol}",
    response_model=OptionChainResponse,
    dependencies=[Depends(require_action(ActionCost.OPTIONS_CHAIN))],
)
async def get_option_chain(
    symbol: str,
    expiration: Optional[str] = Query(
        None, description="Filter by expiration date (YYYY-MM-DD)"
    ),
    option_type: Optional[str] = Query(None, description="Filter by 'call' or 'put'"),
    strike_min: Optional[float] = Query(None, description="Minimum strike price"),
    strike_max: Optional[float] = Query(None, description="Maximum strike price"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum contracts to return"),
):
    """
    Get options chain for a symbol with Greeks and IV.

    Args:
        symbol: Underlying symbol
        expiration: Filter by expiration date
        option_type: Filter by call/put
        strike_min: Minimum strike price
        strike_max: Maximum strike price
        limit: Maximum contracts to return

    Returns:
        OptionChainResponse with contracts and metadata
    """
    try:
        client = get_options_client()

        # Parse expiration date if provided
        exp_date = None
        if expiration:
            try:
                exp_date = date.fromisoformat(expiration)
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid expiration date format: {expiration}",
                )

        # Parse option type
        opt_type = None
        if option_type:
            try:
                opt_type = OptionType(option_type.lower())
            except ValueError:
                raise HTTPException(
                    status_code=400, detail=f"Invalid option type: {option_type}"
                )

        chain = await client.get_option_chain(
            symbol=symbol.upper(),
            expiration=exp_date,
            option_type=opt_type,
            strike_min=strike_min,
            strike_max=strike_max,
            limit=limit,
        )

        if chain is None:
            raise HTTPException(
                status_code=404, detail=f"No options found for {symbol}"
            )

        return OptionChainResponse(
            underlying_symbol=chain.underlying_symbol,
            underlying_price=chain.underlying_price,
            contracts=[OptionContractResponse(**c.to_dict()) for c in chain.contracts],
            expirations=[e.isoformat() for e in chain.expirations],
            timestamp=chain.timestamp.isoformat(),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting option chain for {symbol}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/quote/{contract_symbol}",
    response_model=OptionContractResponse,
    dependencies=[Depends(require_action(ActionCost.OPTIONS_QUOTE))],
)
async def get_option_quote(contract_symbol: str):
    """
    Get real-time quote for a specific option contract.

    Args:
        contract_symbol: OCC format symbol (e.g., 'AAPL240119C00150000')

    Returns:
        Option contract with latest quote
    """
    try:
        client = get_options_client()
        contract = await client.get_option_quote(contract_symbol.upper())

        if contract is None:
            raise HTTPException(
                status_code=404, detail=f"No quote found for {contract_symbol}"
            )

        return OptionContractResponse(**contract.to_dict())
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting quote for {contract_symbol}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/screen",
    response_model=ScreenerResponse,
    dependencies=[Depends(require_action(ActionCost.SCREENER))],
)
async def screen_options(filters: ScreenerFilters):
    """
    Screen options based on filter criteria.

    Filters include:
    - Volume and open interest minimums
    - Greeks ranges (delta, theta, vega)
    - IV range
    - Bid-ask spread limits
    - DTE range
    - Moneyness (ITM, ATM, OTM)

    Returns:
        Filtered and sorted list of option contracts
    """
    try:
        client = get_options_client()
        all_contracts: List[OptionContract] = []

        # Fetch chains for all symbols
        for symbol in filters.underlying_symbols:
            chain = await client.get_option_chain(
                symbol=symbol.upper(),
                limit=500,
            )
            if chain:
                all_contracts.extend(chain.contracts)

        # Apply filters
        filtered = []
        for c in all_contracts:
            # DTE filter
            if c.days_to_expiration < filters.min_dte:
                continue
            if c.days_to_expiration > filters.max_dte:
                continue

            # Option type filter
            if filters.option_types:
                if c.option_type.value not in [t.lower() for t in filters.option_types]:
                    continue

            # Volume filter
            if c.volume is not None and c.volume < filters.min_volume:
                continue

            # Open Interest filter
            if (
                c.open_interest is not None
                and c.open_interest < filters.min_open_interest
            ):
                continue

            # Delta range filter
            if filters.min_delta is not None and c.delta is not None:
                if c.delta < filters.min_delta:
                    continue
            if filters.max_delta is not None and c.delta is not None:
                if c.delta > filters.max_delta:
                    continue

            # IV range filter
            if filters.min_iv is not None and c.implied_volatility is not None:
                if c.implied_volatility < filters.min_iv:
                    continue
            if filters.max_iv is not None and c.implied_volatility is not None:
                if c.implied_volatility > filters.max_iv:
                    continue

            # Bid-ask spread filter
            if (
                filters.max_bid_ask_spread_pct is not None
                and c.bid_ask_spread_pct is not None
            ):
                if c.bid_ask_spread_pct > filters.max_bid_ask_spread_pct:
                    continue

            # Moneyness filter
            if filters.moneyness and c.moneyness:
                if c.moneyness.value not in [m.lower() for m in filters.moneyness]:
                    continue

            filtered.append(c)

        # Sort results
        sort_key_map = {
            "volume": lambda x: x.volume or 0,
            "open_interest": lambda x: x.open_interest or 0,
            "delta": lambda x: abs(x.delta) if x.delta else 0,
            "iv": lambda x: x.implied_volatility or 0,
            "dte": lambda x: x.days_to_expiration,
            "bid_ask_spread": lambda x: x.bid_ask_spread_pct or float("inf"),
        }

        sort_key = sort_key_map.get(filters.sort_by, lambda x: x.volume or 0)
        reverse = filters.sort_order.lower() == "desc"

        filtered.sort(key=sort_key, reverse=reverse)

        # Apply limit
        filtered = filtered[: filters.limit]

        return ScreenerResponse(
            contracts=[OptionContractResponse(**c.to_dict()) for c in filtered],
            total_count=len(filtered),
            filters_applied=filters.model_dump(),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error screening options: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/strategy/calculate",
    response_model=StrategyCalculationResponse,
    dependencies=[Depends(require_action(ActionCost.OPTIONS_STRATEGY))],
)
async def calculate_strategy(request: StrategyCalculationRequest):
    """
    Calculate P&L scenarios and Greeks for an options strategy.

    Takes a list of option legs and calculates:
    - P&L at expiration across price range
    - Current P&L across price range
    - Position Greeks
    - Max profit/loss
    - Breakeven points
    - Risk/reward ratio

    Returns:
        StrategyCalculationResponse with P&L data and metrics
    """
    try:
        # Parse expiration date
        try:
            expiration = datetime.fromisoformat(request.expiration_date)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid expiration date: {request.expiration_date}",
            )

        # Build OptionLeg objects
        legs = []
        for leg_req in request.legs:
            leg = OptionLeg(
                symbol=request.symbol.upper(),
                strike=leg_req.strike,
                expiration=expiration,
                option_type=leg_req.option_type.lower(),
                action=leg_req.action.lower(),
                quantity=leg_req.quantity,
                premium=leg_req.premium,
            )
            legs.append(leg)

        # Calculate entry cost
        entry_cost = sum(
            leg.total_premium() * (1 if leg.action == "buy" else -1) for leg in legs
        )

        # Infer strategy name
        strategy_name = _infer_strategy_name(legs)

        # Create position
        position = OptionsPosition(
            strategy_name=strategy_name,
            legs=legs,
            entry_date=datetime.now(),
            entry_cost=entry_cost,
            max_profit=0,  # Will calculate
            max_loss=0,  # Will calculate
            breakeven_points=[],
        )

        # Generate price range
        min_price = request.underlying_price * (1 - request.price_range_pct)
        max_price = request.underlying_price * (1 + request.price_range_pct)
        price_range = [
            min_price + i * (max_price - min_price) / request.num_points
            for i in range(request.num_points + 1)
        ]

        # Calculate P&L at expiration
        pnl_exp = calculate_pnl_at_expiration(position, price_range)
        pnl_at_expiration = [
            PnLPoint(price=price, pnl=pnl) for price, pnl in pnl_exp.items()
        ]

        # Calculate current P&L
        days_to_exp = max(0, (expiration - datetime.now()).days)
        pnl_current_dict = model_pnl_scenarios(
            position=position,
            price_range=price_range,
            days_to_expiration=days_to_exp,
            volatility=request.volatility,
            risk_free_rate=request.risk_free_rate,
        )
        pnl_current = [
            PnLPoint(price=price, pnl=pnl) for price, pnl in pnl_current_dict.items()
        ]

        # Calculate position Greeks at current price
        greeks = calculate_position_greeks(
            position=position,
            underlying_price=request.underlying_price,
            days_to_expiration=days_to_exp,
            volatility=request.volatility,
            risk_free_rate=request.risk_free_rate,
        )

        # Calculate Greeks over price range (sample every 5th point)
        greeks_over_price = []
        for price in price_range[::5]:
            g = calculate_position_greeks(
                position=position,
                underlying_price=price,
                days_to_expiration=days_to_exp,
                volatility=request.volatility,
                risk_free_rate=request.risk_free_rate,
            )
            greeks_over_price.append(
                {
                    "price": price,
                    "delta": g.delta,
                    "gamma": g.gamma,
                    "theta": g.theta,
                    "vega": g.vega,
                }
            )

        # Calculate breakevens
        breakevens = find_breakeven_points(position, request.volatility)

        # Calculate max profit/loss from expiration P&L
        pnl_values = list(pnl_exp.values())
        max_profit = max(pnl_values) if pnl_values else 0
        max_loss = abs(min(pnl_values)) if pnl_values else 0

        # Risk/reward ratio
        risk_reward = max_profit / max_loss if max_loss > 0 else float("inf")

        return StrategyCalculationResponse(
            pnl_at_expiration=pnl_at_expiration,
            pnl_current=pnl_current,
            greeks=GreeksResponse(
                delta=greeks.delta,
                gamma=greeks.gamma,
                theta=greeks.theta,
                vega=greeks.vega,
            ),
            greeks_over_price=greeks_over_price,
            max_profit=max_profit,
            max_loss=max_loss,
            breakeven_points=breakevens,
            risk_reward_ratio=risk_reward,
            net_debit_credit=entry_cost,
            strategy_name=strategy_name,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating strategy: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/greeks/calculate",
    response_model=GreeksResponse,
    dependencies=[Depends(require_action(ActionCost.OPTIONS_GREEKS))],
)
async def calculate_greeks(request: GreeksCalculationRequest):
    """
    Calculate Greeks for a single option using Black-Scholes.

    Args:
        request: Option parameters (price, strike, DTE, IV, type)

    Returns:
        Delta, Gamma, Theta, Vega
    """
    try:
        result = calculate_black_scholes_greeks(
            underlying_price=request.underlying_price,
            strike=request.strike,
            days_to_expiration=request.days_to_expiration,
            volatility=request.volatility,
            risk_free_rate=request.risk_free_rate,
            option_type=request.option_type.lower(),
        )

        return GreeksResponse(
            delta=result["delta"],
            gamma=result["gamma"],
            theta=result["theta"],
            vega=result["vega"],
        )
    except Exception as e:
        logger.error(f"Error calculating Greeks: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Check options API health."""
    try:
        client = get_options_client()
        healthy = await client.health_check()

        return {
            "status": "healthy" if healthy else "degraded",
            "cache_stats": client.get_cache_stats(),
            "timestamp": datetime.now().isoformat(),
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat(),
        }


def _infer_strategy_name(legs: List[OptionLeg]) -> str:
    """Infer strategy name from leg configuration."""
    if len(legs) == 1:
        leg = legs[0]
        action = "Long" if leg.action == "buy" else "Short"
        opt_type = leg.option_type.capitalize()
        return f"{action} {opt_type}"

    if len(legs) == 2:
        # Check for spreads
        types = {leg.option_type for leg in legs}
        actions = {leg.action for leg in legs}
        strikes = sorted(leg.strike for leg in legs)

        if len(types) == 1 and len(actions) == 2:
            # Vertical spread
            if "call" in types:
                buy_leg = next(leg for leg in legs if leg.action == "buy")
                if buy_leg.strike < strikes[1]:
                    return "Bull Call Spread"
                return "Bear Call Spread"
            else:
                buy_leg = next(leg for leg in legs if leg.action == "buy")
                if buy_leg.strike > strikes[0]:
                    return "Bear Put Spread"
                return "Bull Put Spread"

        if len(types) == 2:
            # Straddle or strangle
            if legs[0].strike == legs[1].strike:
                action = "Long" if all(leg.action == "buy" for leg in legs) else "Short"
                return f"{action} Straddle"
            else:
                action = "Long" if all(leg.action == "buy" for leg in legs) else "Short"
                return f"{action} Strangle"

    if len(legs) == 4:
        # Check for Iron Condor or Iron Butterfly
        call_legs = [leg for leg in legs if leg.option_type == "call"]
        put_legs = [leg for leg in legs if leg.option_type == "put"]

        if len(call_legs) == 2 and len(put_legs) == 2:
            call_strikes = sorted(leg.strike for leg in call_legs)
            put_strikes = sorted(leg.strike for leg in put_legs)

            if call_strikes[0] == put_strikes[1]:
                return "Iron Butterfly"
            return "Iron Condor"

    return "Custom Strategy"
