"""
FastAPI server for DeepStack Trading System

Provides REST/WebSocket API for the CLI interface to communicate with
the trading engine, agents, and market data.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

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


class PositionResponse(BaseModel):
    symbol: str
    position: int
    avg_cost: float
    market_value: float
    unrealized_pnl: float
    realized_pnl: float


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
            """Get current quote for symbol."""
            try:
                quote = None
                if self.ibkr_client and self.ibkr_client.connected:
                    quote = await self.ibkr_client.get_quote(symbol)
                elif self.paper_trader:
                    price = await self.paper_trader._get_market_price(symbol)
                    if price is not None:
                        # Provide basic quote fields for paper mode
                        quote = {
                            "symbol": symbol,
                            "bid": price - 0.02,
                            "ask": price + 0.02,
                            "last": price,
                            "volume": 0,
                            "timestamp": datetime.now(),
                        }

                if quote:
                    return QuoteResponse(**quote)
                else:
                    raise QuoteUnavailableError(
                        message=f"Quote not available for {symbol}", symbol=symbol
                    )
            except DeepStackError:
                raise  # Let exception handler handle it
            except HTTPException:
                raise  # Let FastAPI handle HTTPException as-is
            except Exception as e:
                logger.error(f"Error getting quote for {symbol}: {e}", exc_info=True)
                raise QuoteUnavailableError(
                    message=f"Unable to fetch quote for {symbol}", symbol=symbol
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

        # Include options router
        self.app.include_router(options_router)

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
