"""
FastAPI server for DeepStack Trading System

Provides REST/WebSocket API for the CLI interface to communicate with
the trading engine, agents, and market data.
"""

import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import stripe
import yfinance as yf
from fastapi import (
    Depends,
    FastAPI,
    HTTPException,
    Request,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from .api.auth import AuthenticatedUser, get_current_user
from .api.options_router import router as options_router
from .api.prediction_markets_router import router as prediction_markets_router
from .broker.ibkr_client import IBKRClient
from .broker.order_manager import OrderManager
from .broker.paper_trader import PaperTrader
from .config import get_config
from .data.alpaca_client import AlpacaClient
from .data.alphavantage_client import AlphaVantageClient
from .data.market_data import MarketDataManager
from .exceptions import (
    AuthenticationError,
    CircuitBreakerTrippedError,
    DataError,
    DeepStackError,
    MarketDataError,
    MissingAPIKeyError,
    OrderError,
    OrderExecutionError,
    QuoteUnavailableError,
    RateLimitError,
    RiskError,
    ValidationError,
    create_error_response,
)
from .strategies.deep_value import DeepValueStrategy
from .strategies.hedged_position import HedgedPositionConfig, HedgedPositionManager

logger = logging.getLogger(__name__)


# Pydantic models for API requests/responses


class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    version: str = "1.0.0"


class QuoteRequest(BaseModel):
    symbol: str


class QuoteResponse(BaseModel):
    symbol: str
    bid: Optional[float]
    ask: Optional[float]
    last: Optional[float]
    volume: Optional[int]
    timestamp: datetime
    source: Optional[str] = None  # Track data source


class PositionResponse(BaseModel):
    symbol: str
    position: int
    avg_cost: float
    market_value: float
    unrealized_pnl: float
    realized_pnl: float


class PositionItemResponse(BaseModel):
    symbol: str
    quantity: float
    avg_cost: float
    current_price: float
    unrealized_pnl: float
    market_value: float


class PositionsListResponse(BaseModel):
    positions: List[PositionItemResponse]
    total_value: float


class OrderRequest(BaseModel):
    symbol: str
    quantity: int
    action: str  # 'BUY' or 'SELL'
    order_type: str = "MKT"  # 'MKT', 'LMT', 'STP'
    limit_price: Optional[float] = None
    stop_price: Optional[float] = None


class OrderResponse(BaseModel):
    order_id: Optional[str]
    status: str
    message: str


class AccountSummaryResponse(BaseModel):
    cash: float
    buying_power: float
    portfolio_value: float
    day_pnl: float
    total_pnl: float


class ErrorResponse(BaseModel):
    """Standardized error response format."""

    success: bool = False
    error: str
    error_code: str
    request_id: str
    timestamp: datetime
    details: Optional[Dict[str, Any]] = None


class HedgedPositionRequest(BaseModel):
    symbol: str
    entry_price: float
    total_shares: int
    conviction_pct: float = 0.60
    tactical_pct: float = 0.40


class ManualPositionRequest(BaseModel):
    symbol: str
    quantity: int
    avg_cost: float


class CheckoutSessionRequest(BaseModel):
    tier: str  # 'pro' or 'elite'
    user_id: str
    user_email: str


class CheckoutSessionResponse(BaseModel):
    url: str


class DeepStackAPIServer:
    """
    FastAPI server for DeepStack trading system.

    Provides endpoints for:
    - Health checks
    - Market data
    - Order placement
    - Position/portfolio queries
    - Real-time updates via WebSocket
    """

    def __init__(self):
        self.config = get_config()
        self.app = FastAPI(title="DeepStack Trading API", version="1.0.0")

        # Initialize components
        self.ibkr_client: Optional[IBKRClient] = None
        self.paper_trader: Optional[PaperTrader] = None
        self.order_manager: Optional[OrderManager] = None
        self.av_client: Optional[AlphaVantageClient] = None
        self.alpaca_client: Optional[AlpacaClient] = None
        self.deep_value_strategy: Optional[DeepValueStrategy] = None
        self.hedged_position_manager: Optional[HedgedPositionManager] = None
        self.market_data_manager: Optional[MarketDataManager] = None

        # WebSocket connections
        self.websocket_connections: List[WebSocket] = []

        self._setup_middleware()
        self._setup_exception_handlers()
        self._setup_routes()
        self._setup_websocket()

        # Initialize trading components synchronously
        self._initialize_components()

        logger.info("DeepStack API Server initialized")

    def _setup_exception_handlers(self):
        """Setup global exception handlers for consistent error responses."""

        @self.app.exception_handler(DeepStackError)
        async def deepstack_error_handler(request: Request, exc: DeepStackError):
            """Handle all custom DeepStack errors."""
            logger.error(f"{exc.error_code}: {exc.message} - {exc.to_dict()}")
            return JSONResponse(
                status_code=self._get_status_code(exc),
                content=create_error_response(exc),
            )

        @self.app.exception_handler(Exception)
        async def generic_error_handler(request: Request, exc: Exception):
            """Handle unexpected errors - hide internal details."""
            request_id = str(uuid.uuid4())
            logger.error(f"Unexpected error [{request_id}]: {exc}", exc_info=True)
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "error": "An unexpected error occurred. Please try again.",
                    "error_code": "INTERNAL_ERROR",
                    "request_id": request_id,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
            )

    def _get_status_code(self, exc: DeepStackError) -> int:
        """Map exception types to HTTP status codes."""
        if isinstance(exc, ValidationError):
            return 400
        elif isinstance(exc, (AuthenticationError, MissingAPIKeyError)):
            return 401
        elif isinstance(exc, (CircuitBreakerTrippedError, RiskError)):
            return 403
        elif isinstance(exc, (QuoteUnavailableError, MarketDataError)):
            return 404
        elif isinstance(exc, RateLimitError):
            return 429
        return 500

    def _setup_middleware(self):
        """Setup CORS and other middleware."""
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=self.config.api.cors_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    def _setup_routes(self):
        """Setup API routes."""

        @self.app.get("/health", response_model=HealthResponse)
        async def health_check():
            """Health check endpoint."""
            return HealthResponse(status="healthy", timestamp=datetime.now())

        @self.app.get("/api/news")
        async def get_news(symbol: Optional[str] = None, limit: int = 10):
            """Get market news."""
            try:
                if not self.alpaca_client:
                    logger.warning("Alpaca client not initialized")
                    return {"news": []}

                articles = await self.alpaca_client.get_news(symbol=symbol, limit=limit)
                return {"news": articles}
            except Exception as e:
                logger.error(f"News error: {e}")
                # Return empty list or error response properly
                # For now returning error response structure compatible with
                # frontend expectations
                return JSONResponse(
                    status_code=500,
                    content={"error": "Failed to fetch news", "details": str(e)},
                )

        @self.app.get("/quote/{symbol}", response_model=QuoteResponse)
        async def get_quote(symbol: str):
            """Get current quote for symbol with Yahoo Finance fallback."""
            quote = None
            source = None

            try:
                # Try IBKR first
                if self.ibkr_client and self.ibkr_client.connected:
                    try:
                        quote = await self.ibkr_client.get_quote(symbol)
                        if quote:
                            source = "ibkr"
                            logger.debug(f"Quote for {symbol} from IBKR")
                    except Exception as e:
                        logger.warning(f"IBKR quote failed for {symbol}: {e}")

                # Try Alpaca via paper trader
                if not quote and self.paper_trader:
                    try:
                        price = await self.paper_trader._get_market_price(symbol)
                        if price is not None:
                            quote = {
                                "symbol": symbol,
                                "bid": price - 0.02,
                                "ask": price + 0.02,
                                "last": price,
                                "volume": 0,
                                "timestamp": datetime.now(),
                            }
                            source = "alpaca"
                            logger.debug(f"Quote for {symbol} from Alpaca")
                    except Exception as e:
                        logger.warning(f"Alpaca quote failed for {symbol}: {e}")

                # Fallback to Yahoo Finance
                if not quote:
                    try:
                        logger.info(f"Falling back to Yahoo Finance for {symbol}")
                        ticker = yf.Ticker(symbol)
                        info = ticker.info

                        if info:
                            # Get current price - try multiple fields
                            current_price = (
                                info.get("currentPrice")
                                or info.get("regularMarketPrice")
                                or info.get("previousClose")
                            )

                            if current_price:
                                quote = {
                                    "symbol": symbol,
                                    "bid": info.get("bid"),
                                    "ask": info.get("ask"),
                                    "last": current_price,
                                    "volume": info.get("regularMarketVolume")
                                    or info.get("volume"),
                                    "timestamp": datetime.now(),
                                }
                                source = "yahoo_finance"
                                logger.info(
                                    f"Yahoo quote {symbol}: ${current_price:.2f}"
                                )
                    except Exception as e:
                        logger.error(f"Yahoo Finance quote failed for {symbol}: {e}")

                # Return quote if we got one
                if quote:
                    quote["source"] = source
                    return QuoteResponse(**quote)
                else:
                    raise QuoteUnavailableError(
                        message=f"Quote not available for {symbol} from any source",
                        symbol=symbol,
                    )

            except DeepStackError:
                raise  # Let exception handler handle it
            except HTTPException:
                raise  # Let FastAPI handle HTTPException as-is
            except Exception as e:
                logger.error(
                    f"Unexpected error getting quote for {symbol}: {e}", exc_info=True
                )
                raise QuoteUnavailableError(
                    message=f"Unable to fetch quote for {symbol}", symbol=symbol
                )

        @self.app.get("/api/market/bars")
        async def get_market_bars(symbol: str, timeframe: str = "1d", limit: int = 100):
            """Get historical market bars."""
            try:
                if not self.market_data_manager:
                    self.market_data_manager = MarketDataManager(self.config)

                # Calculate start/end dates based on limit and timeframe
                # For simplicity, we'll ask for a wide range and let the manager
                # handle it or we could calculate it.
                # MarketDataManager.get_historical_data takes start_date, end_date.

                # Calculate start date based on timeframe to ensure sufficient history
                now = datetime.now()

                # Map timeframe to yfinance-compatible interval
                # yfinance expects: 1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d,
                # 1wk, 1mo, 3mo
                yf_interval = timeframe
                if timeframe in ["1w", "1W"]:
                    yf_interval = "1wk"
                    start_date = now.replace(year=now.year - 10)
                elif timeframe in ["1mo", "1M"]:
                    yf_interval = "1mo"
                    start_date = now.replace(year=now.year - 20)
                elif timeframe in ["1d", "1D"]:
                    yf_interval = "1d"
                    start_date = now.replace(year=now.year - 5)
                elif timeframe in ["4h", "4H"]:
                    yf_interval = "1h"  # yfinance doesn't support 4h, use 1h
                    start_date = now.replace(year=now.year - 2)
                else:
                    # 1h and others
                    yf_interval = "1h"
                    start_date = now.replace(year=now.year - 1)

                end_date = now

                bars = await self.market_data_manager.get_historical_data(
                    symbol, start_date, end_date, yf_interval
                )

                # Format for frontend
                return [
                    {
                        "time": int(bar.timestamp.timestamp()),
                        "open": bar.open,
                        "high": bar.high,
                        "low": bar.low,
                        "close": bar.close,
                        "volume": bar.volume,
                    }
                    for bar in bars
                ]
            except Exception as e:
                logger.error(
                    f"Error getting market bars for {symbol}: {e}", exc_info=True
                )
                raise DataError(message=f"Unable to fetch market bars for {symbol}")

        async def get_positions():
            """Get current positions."""
            try:
                positions = []
                if self.config.trading.mode == "live" and self.ibkr_client:
                    ibkr_positions = await self.ibkr_client.get_positions()
                    positions = [PositionResponse(**pos) for pos in ibkr_positions]
                elif self.config.trading.mode == "paper" and self.paper_trader:
                    paper_positions = self.paper_trader.get_positions()
                    positions = [PositionResponse(**pos) for pos in paper_positions]

                return positions
            except DeepStackError:
                raise  # Let exception handler handle it
            except Exception as e:
                logger.error(f"Error getting positions: {e}", exc_info=True)
                raise DataError(message="Unable to retrieve positions")

        @self.app.get("/account", response_model=AccountSummaryResponse)
        async def get_account_summary(
            user: AuthenticatedUser = Depends(get_current_user),
        ):
            """Get account summary."""
            try:
                summary = AccountSummaryResponse(
                    cash=0.0,
                    buying_power=0.0,
                    portfolio_value=0.0,
                    day_pnl=0.0,
                    total_pnl=0.0,
                )

                if self.config.trading.mode == "live" and self.ibkr_client:
                    account_data = await self.ibkr_client.get_account_summary()
                    summary.cash = float(account_data.get("TotalCashValue", 0))
                    summary.buying_power = await self.ibkr_client.get_buying_power()
                elif self.config.trading.mode == "paper" and self.paper_trader:
                    summary.cash = self.paper_trader.cash
                    summary.buying_power = self.paper_trader.get_buying_power()
                    summary.portfolio_value = self.paper_trader.get_portfolio_value()

                return summary
            except DeepStackError:
                raise  # Let exception handler handle it
            except Exception as e:
                logger.error(f"Error getting account summary: {e}", exc_info=True)
                raise DataError(message="Unable to retrieve account summary")

        @self.app.post("/orders", response_model=OrderResponse)
        async def place_order(
            order: OrderRequest,
            user: AuthenticatedUser = Depends(get_current_user),
        ):
            """Place an order."""
            try:
                if not self.order_manager:
                    raise OrderExecutionError(
                        message="Order manager not initialized",
                        symbol=order.symbol,
                        order_type=order.order_type,
                        side=order.action,
                    )

                order_id = None

                if order.order_type == "MKT":
                    order_id = await self.order_manager.place_market_order(
                        order.symbol, order.quantity, order.action
                    )
                elif order.order_type == "LMT":
                    if order.limit_price is None:
                        raise ValidationError(
                            message="Limit price required for limit orders",
                            field="limit_price",
                        )
                    order_id = await self.order_manager.place_limit_order(
                        order.symbol, order.quantity, order.action, order.limit_price
                    )
                elif order.order_type == "STP":
                    if order.stop_price is None:
                        raise ValidationError(
                            message="Stop price required for stop orders",
                            field="stop_price",
                        )
                    order_id = await self.order_manager.place_stop_order(
                        order.symbol, order.quantity, order.action, order.stop_price
                    )
                else:
                    raise ValidationError(
                        message=f"Unsupported order type: {order.order_type}",
                        field="order_type",
                        value=order.order_type,
                    )

                if order_id:
                    return OrderResponse(
                        order_id=order_id,
                        status="submitted",
                        message=f"Order {order_id} submitted successfully",
                    )
                else:
                    return OrderResponse(
                        order_id=None,
                        status="failed",
                        message="Order submission failed",
                    )

            except DeepStackError:
                raise  # Let exception handler handle it
            except HTTPException:
                raise  # Let FastAPI handle HTTPException as-is
            except Exception as e:
                logger.error(f"Error placing order: {e}", exc_info=True)
                raise OrderExecutionError(
                    message="Unable to process order",
                    symbol=order.symbol,
                    order_type=order.order_type,
                    side=order.action,
                )

        @self.app.delete("/orders/{order_id}")
        async def cancel_order(
            order_id: str,
            user: AuthenticatedUser = Depends(get_current_user),
        ):
            """Cancel an order."""
            try:
                if not self.order_manager:
                    raise OrderExecutionError(
                        message="Order manager not initialized", order_id=order_id
                    )

                success = await self.order_manager.cancel_order(order_id)

                if success:
                    return {"status": "cancelled", "order_id": order_id}
                else:
                    raise OrderError(
                        message=f"Order {order_id} not found or could not be cancelled"
                    )

            except DeepStackError:
                raise  # Let exception handler handle it
            except HTTPException:
                raise  # Let FastAPI handle HTTPException as-is
            except Exception as e:
                logger.error(f"Error cancelling order {order_id}: {e}", exc_info=True)
                raise OrderExecutionError(
                    message="Unable to cancel order", order_id=order_id
                )

        @self.app.get("/strategies/deep-value/screen")
        async def run_deep_value_screen():
            """Run Deep Value screener."""
            try:
                if not self.deep_value_strategy:
                    # Initialize with client if available
                    self.deep_value_strategy = DeepValueStrategy(client=self.av_client)

                # Define universe to screen
                # (e.g., S&P 500 top holdings or user watchlist)
                # For demonstration, we'll use a small list of popular stocks
                universe = [
                    "AAPL",
                    "MSFT",
                    "GOOGL",
                    "AMZN",
                    "TSLA",
                    "NVDA",
                    "META",
                    "BRK.B",
                    "JPM",
                    "JNJ",
                    "GME",
                    "AMC",
                    "INTC",
                    "AMD",
                ]

                opportunities = await self.deep_value_strategy.screen_market(universe)
                return [opp.to_dict() for opp in opportunities]
            except Exception as e:
                logger.error(f"Error running deep value screen: {e}", exc_info=True)
                raise DeepStackError(
                    message="Failed to run deep value screen", error_code="SCREEN_ERROR"
                )

        @self.app.post("/positions/hedged/create")
        async def create_hedged_position(
            request: HedgedPositionRequest,
            user: AuthenticatedUser = Depends(get_current_user),
        ):
            """Create a new hedged position."""
            try:
                if not self.hedged_position_manager:
                    self.hedged_position_manager = HedgedPositionManager()

                config = HedgedPositionConfig(
                    symbol=request.symbol,
                    entry_price=request.entry_price,
                    total_shares=request.total_shares,
                    conviction_pct=request.conviction_pct,
                    tactical_pct=request.tactical_pct,
                )

                position = self.hedged_position_manager.create_position(config)
                return position.to_dict()
            except Exception as e:
                logger.error(f"Error creating hedged position: {e}", exc_info=True)
                raise DeepStackError(
                    message="Failed to create hedged position",
                    error_code="POSITION_ERROR",
                )

        @self.app.get("/positions/hedged/{symbol}")
        async def get_hedged_position(symbol: str):
            """Get details of a hedged position."""
            try:
                if not self.hedged_position_manager:
                    self.hedged_position_manager = HedgedPositionManager()

                position = self.hedged_position_manager.get_position(symbol)
                if position:
                    return position.to_dict()
                else:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Hedged position for {symbol} not found",
                    )
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error getting hedged position: {e}", exc_info=True)
                raise DeepStackError(
                    message="Failed to get hedged position", error_code="POSITION_ERROR"
                )

        @self.app.post("/positions/manual")
        async def add_manual_position(
            request: ManualPositionRequest,
            user: AuthenticatedUser = Depends(get_current_user),
        ):
            """Manually add a position."""
            try:
                if not self.paper_trader:
                    raise DeepStackError(
                        message="Manual positions only available in paper trading mode",
                        error_code="INVALID_MODE",
                    )

                position = await self.paper_trader.add_manual_position(
                    request.symbol, request.quantity, request.avg_cost
                )
                return position
            except ValueError as e:
                raise ValidationError(message=str(e), field="quantity/avg_cost")
            except Exception as e:
                logger.error(f"Error adding manual position: {e}", exc_info=True)
                raise DeepStackError(
                    message="Failed to add manual position", error_code="POSITION_ERROR"
                )

        @self.app.get("/positions", response_model=PositionsListResponse)
        async def get_all_positions(
            user: AuthenticatedUser = Depends(get_current_user),
        ):
            """Get all current positions."""
            try:
                if not self.paper_trader:
                    raise DeepStackError(
                        message="Positions unavailable - paper trader not initialized",
                        error_code="TRADER_NOT_INITIALIZED",
                    )

                # Get positions from paper trader
                positions = self.paper_trader.get_positions()

                if not positions:
                    return PositionsListResponse(positions=[], total_value=0.0)

                # Enrich position data with current prices
                position_items = []
                total_value = 0.0

                for pos in positions:
                    symbol = pos["symbol"]
                    quantity = pos.get("quantity", 0)
                    avg_cost = pos.get("avg_cost", 0.0)

                    # Get current market price
                    current_price = await self.paper_trader._get_market_price(symbol)
                    if current_price is None:
                        # Fallback to average cost if price unavailable
                        current_price = avg_cost

                    # Calculate values
                    market_value = quantity * current_price
                    unrealized_pnl = market_value - (quantity * avg_cost)
                    total_value += market_value

                    position_items.append(
                        PositionItemResponse(
                            symbol=symbol,
                            quantity=quantity,
                            avg_cost=avg_cost,
                            current_price=current_price,
                            unrealized_pnl=unrealized_pnl,
                            market_value=market_value,
                        )
                    )

                return PositionsListResponse(
                    positions=position_items, total_value=total_value
                )

            except DeepStackError:
                raise  # Let exception handler handle it
            except Exception as e:
                logger.error(f"Error getting positions: {e}", exc_info=True)
                raise DataError(message="Unable to retrieve positions")

        # ============================================
        # STRIPE SUBSCRIPTION ENDPOINTS
        # ============================================

        @self.app.post(
            "/api/checkout/create-session", response_model=CheckoutSessionResponse
        )
        async def create_checkout_session(request: CheckoutSessionRequest):
            """
            Create Stripe checkout session for subscription.

            Args:
                request: Checkout session request with tier, user_id, and user_email

            Returns:
                Checkout session URL
            """
            try:
                # Configure Stripe API key
                stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

                if not stripe.api_key:
                    raise DeepStackError(
                        message="Stripe not configured",
                        error_code="STRIPE_NOT_CONFIGURED",
                    )

                # Map tier to Stripe price ID
                price_ids = {
                    "pro": os.getenv("STRIPE_PRICE_PRO"),
                    "elite": os.getenv("STRIPE_PRICE_ELITE"),
                }

                if request.tier not in price_ids:
                    raise ValidationError(
                        message=f"Invalid tier: {request.tier}",
                        field="tier",
                        value=request.tier,
                    )

                price_id = price_ids[request.tier]
                if not price_id:
                    raise DeepStackError(
                        message=(
                            f"Stripe price ID not configured "
                            f"for tier: {request.tier}"
                        ),
                        error_code="STRIPE_PRICE_NOT_CONFIGURED",
                    )

                # Create checkout session
                session = stripe.checkout.Session.create(
                    customer_email=request.user_email,
                    line_items=[{"price": price_id, "quantity": 1}],
                    mode="subscription",
                    success_url=("https://deepstack.trade/app?upgraded=true"),
                    cancel_url="https://deepstack.trade/pricing",
                    metadata={"user_id": request.user_id, "tier": request.tier},
                )

                logger.info(
                    f"Created checkout session for user {request.user_id}, "
                    f"tier {request.tier}"
                )
                return CheckoutSessionResponse(url=session.url)

            except DeepStackError:
                raise
            except Exception as e:
                logger.error(f"Error creating checkout session: {e}", exc_info=True)
                raise DeepStackError(
                    message="Failed to create checkout session",
                    error_code="STRIPE_CHECKOUT_ERROR",
                )

        @self.app.post("/api/webhooks/stripe")
        async def stripe_webhook(request: Request):
            """
            Handle Stripe webhook events for subscription lifecycle.

            Events handled:
            - checkout.session.completed: Create/upgrade subscription
            - customer.subscription.updated: Update subscription status
            - customer.subscription.deleted: Downgrade to free tier
            - invoice.payment_failed: Mark subscription as past_due
            """
            try:
                payload = await request.body()
                sig_header = request.headers.get("stripe-signature")

                stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
                webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

                if not webhook_secret:
                    logger.error("Stripe webhook secret not configured")
                    raise HTTPException(
                        status_code=500, detail="Webhook not configured"
                    )

                # Verify webhook signature
                try:
                    event = stripe.Webhook.construct_event(
                        payload, sig_header, webhook_secret
                    )
                except ValueError as e:
                    logger.error(f"Invalid webhook payload: {e}")
                    raise HTTPException(status_code=400, detail="Invalid payload")
                except stripe.error.SignatureVerificationError as e:
                    logger.error(f"Invalid webhook signature: {e}")
                    raise HTTPException(status_code=400, detail="Invalid signature")

                # Handle different event types
                event_type = event["type"]
                logger.info(f"Received Stripe webhook: {event_type}")

                if event_type == "checkout.session.completed":
                    session = event["data"]["object"]
                    await self._handle_checkout_completed(session)

                elif event_type == "customer.subscription.updated":
                    subscription = event["data"]["object"]
                    await self._handle_subscription_updated(subscription)

                elif event_type == "customer.subscription.deleted":
                    subscription = event["data"]["object"]
                    await self._handle_subscription_deleted(subscription)

                elif event_type == "invoice.payment_failed":
                    invoice = event["data"]["object"]
                    await self._handle_payment_failed(invoice)

                return {"status": "success"}

            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Error handling Stripe webhook: {e}", exc_info=True)
                raise HTTPException(status_code=500, detail="Webhook processing failed")

        # Include options router
        self.app.include_router(options_router)

        # Include prediction markets router
        self.app.include_router(prediction_markets_router)

    async def _handle_checkout_completed(self, session: Dict[str, Any]):
        """
        Handle successful checkout completion.

        Updates user profile with subscription data.
        """
        try:
            from supabase import create_client

            supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

            if not supabase_url or not supabase_key:
                logger.error("Supabase credentials not configured")
                return

            supabase = create_client(supabase_url, supabase_key)

            user_id = session["metadata"]["user_id"]
            tier = session["metadata"]["tier"]
            customer_id = session["customer"]
            subscription_id = session["subscription"]

            # Update user profile
            (
                supabase.table("profiles")
                .update(
                    {
                        "subscription_tier": tier,
                        "stripe_customer_id": customer_id,
                        "stripe_subscription_id": subscription_id,
                        "subscription_status": "active",
                        "subscription_starts_at": datetime.now(
                            timezone.utc
                        ).isoformat(),
                    }
                )
                .eq("id", user_id)
                .execute()
            )

            logger.info(f"Updated subscription for user {user_id} to {tier}")

        except Exception as e:
            logger.error(f"Error handling checkout completion: {e}", exc_info=True)

    async def _handle_subscription_updated(self, subscription: Dict[str, Any]):
        """Handle subscription updates."""
        try:
            from supabase import create_client

            supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

            if not supabase_url or not supabase_key:
                return

            supabase = create_client(supabase_url, supabase_key)

            customer_id = subscription["customer"]
            status = subscription["status"]

            # Update subscription status
            supabase.table("profiles").update({"subscription_status": status}).eq(
                "stripe_customer_id", customer_id
            ).execute()

            logger.info(
                f"Updated subscription status for customer {customer_id} to {status}"
            )

        except Exception as e:
            logger.error(f"Error handling subscription update: {e}", exc_info=True)

    async def _handle_subscription_deleted(self, subscription: Dict[str, Any]):
        """Handle subscription cancellation - downgrade to free."""
        try:
            from supabase import create_client

            supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

            if not supabase_url or not supabase_key:
                return

            supabase = create_client(supabase_url, supabase_key)

            customer_id = subscription["customer"]

            # Downgrade to free tier
            (
                supabase.table("profiles")
                .update(
                    {
                        "subscription_tier": "free",
                        "subscription_status": "canceled",
                        "subscription_ends_at": datetime.now(timezone.utc).isoformat(),
                    }
                )
                .eq("stripe_customer_id", customer_id)
                .execute()
            )

            logger.info(f"Downgraded customer {customer_id} to free tier")

        except Exception as e:
            logger.error(f"Error handling subscription deletion: {e}", exc_info=True)

    async def _handle_payment_failed(self, invoice: Dict[str, Any]):
        """Handle failed payment."""
        try:
            from supabase import create_client

            supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

            if not supabase_url or not supabase_key:
                return

            supabase = create_client(supabase_url, supabase_key)

            customer_id = invoice["customer"]

            # Mark subscription as past_due
            supabase.table("profiles").update({"subscription_status": "past_due"}).eq(
                "stripe_customer_id", customer_id
            ).execute()

            logger.warning(
                f"Payment failed for customer {customer_id}, marked as past_due"
            )

        except Exception as e:
            logger.error(f"Error handling payment failure: {e}", exc_info=True)

    def _setup_websocket(self):
        """Setup WebSocket endpoint for real-time updates."""

        @self.app.websocket("/ws")
        async def websocket_endpoint(websocket: WebSocket):
            """WebSocket endpoint for real-time updates."""
            await websocket.accept()
            self.websocket_connections.append(websocket)

            try:
                while True:
                    # Keep connection alive and listen for messages
                    data = await websocket.receive_text()

                    # Echo back for now - could handle commands later
                    await websocket.send_text(f"Echo: {data}")

            except WebSocketDisconnect:
                if websocket in self.websocket_connections:
                    self.websocket_connections.remove(websocket)
            except Exception as e:
                logger.error(f"WebSocket error: {e}")
                if websocket in self.websocket_connections:
                    self.websocket_connections.remove(websocket)

    async def broadcast_update(self, update_type: str, data: Dict[str, Any]):
        """
        Broadcast update to all connected WebSocket clients.

        Args:
            update_type: Type of update (e.g., 'position', 'quote', 'order')
            data: Update data
        """
        message = {
            "type": update_type,
            "timestamp": datetime.now().isoformat(),
            "data": data,
        }

        disconnected = []
        for websocket in self.websocket_connections:
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.warning(f"WebSocket broadcast failed: {type(e).__name__}: {e}")
                disconnected.append(websocket)

        if disconnected:
            logger.info(
                f"Cleaned up {len(disconnected)} disconnected WebSocket clients"
            )
        # Clean up disconnected clients
        for websocket in disconnected:
            if websocket in self.websocket_connections:
                self.websocket_connections.remove(websocket)

    def _initialize_components(self):
        """Initialize trading components synchronously."""
        try:
            # Initialize IBKR client
            if (
                self.config.trading.mode == "live"
                or self.config.trading.mode == "paper"
            ):
                self.ibkr_client = IBKRClient(self.config)

            # Initialize Alpaca client
            if self.config.alpaca_api_key and self.config.alpaca_secret_key:
                self.alpaca_client = AlpacaClient(
                    api_key=self.config.alpaca_api_key,
                    secret_key=self.config.alpaca_secret_key,
                )

            # Initialize paper trader
            if self.config.trading.mode == "paper":
                self.paper_trader = PaperTrader(self.config, self.ibkr_client)

            # Initialize order manager
            from ..risk.portfolio_risk import PortfolioRisk

            risk_manager = PortfolioRisk(self.config)
            self.order_manager = OrderManager(
                self.config, self.ibkr_client, self.paper_trader, risk_manager
            )

            logger.info("Trading components initialized successfully")

        except Exception as e:
            logger.error(f"Error initializing trading components: {e}")
            # Don't raise - allow server to start even if components fail

    async def initialize_trading_components(self):
        """Initialize trading components (IBKR client, paper trader, etc.)."""
        try:
            # Initialize IBKR client
            if (
                self.config.trading.mode == "live"
                or self.config.trading.mode == "paper"
            ):
                self.ibkr_client = IBKRClient(self.config)
                if self.config.trading.mode == "live":
                    # Only connect for live trading
                    connected = await self.ibkr_client.connect()
                    if not connected:
                        logger.warning("Failed to connect to IBKR for live trading")

            # Initialize paper trader
            if self.config.trading.mode == "paper":
                self.paper_trader = PaperTrader(self.config, self.ibkr_client)

            # Initialize order manager
            from ..risk.portfolio_risk import PortfolioRisk

            risk_manager = PortfolioRisk(self.config)
            self.order_manager = OrderManager(
                self.config, self.ibkr_client, self.paper_trader, risk_manager
            )

            logger.info("Trading components initialized successfully")

        except Exception as e:
            logger.error(f"Error initializing trading components: {e}")
            raise

    async def shutdown(self):
        """Shutdown the server and cleanup connections."""
        logger.info("Shutting down DeepStack API Server")

        # Close WebSocket connections
        for websocket in self.websocket_connections:
            try:
                await websocket.close()
            except Exception:
                pass  # nosec

        # Disconnect IBKR client
        if self.ibkr_client:
            await self.ibkr_client.disconnect()

    def get_app(self) -> FastAPI:
        """Get the FastAPI application instance."""
        return self.app


# Global server instance
_server_instance: Optional[DeepStackAPIServer] = None


def get_server() -> DeepStackAPIServer:
    """Get the global API server instance."""
    global _server_instance
    if _server_instance is None:
        _server_instance = DeepStackAPIServer()
    return _server_instance


def create_app() -> FastAPI:
    """Create and return FastAPI application."""
    server = get_server()
    return server.get_app()


app = create_app()
