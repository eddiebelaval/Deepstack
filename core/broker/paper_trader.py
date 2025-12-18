"""
Enhanced Paper Trader - Production-ready simulation for DeepStack testing

Provides realistic order simulation using live market data with full risk
system integration. Tracks virtual portfolio, simulates slippage,
commissions, and maintains comprehensive analytics.

Key Features:
    - Real market data via Alpaca API (no mocks!)
    - Full integration with Kelly Position Sizer, Stop Loss Manager, Circuit Breakers
    - Commission tracking and realistic slippage modeling
    - Performance analytics (Sharpe ratio, max drawdown, win rate)
    - Market hours enforcement
    - Comprehensive trade validation

Integration Pattern:
    1. Check circuit breakers (halt if tripped)
    2. Calculate position size with Kelly
    3. Place market order
    4. Automatically place stop loss
    5. Update performance metrics
"""

import logging
import random
import sqlite3
import uuid
from datetime import datetime, time
from typing import Any, Dict, List, Optional

import pytz

from ..config import Config
from ..data.alpaca_client import AlpacaClient
from ..data.data_storage import SQLiteConnectionPool
from ..exceptions import DatabaseInitializationError
from ..risk.circuit_breaker import CircuitBreaker
from ..risk.kelly_position_sizer import KellyPositionSizer
from ..risk.stop_loss_manager import StopLossManager

logger = logging.getLogger(__name__)


class PaperTrader:
    """
    Enhanced paper trading simulator for DeepStack.

    Simulates:
    - Order fills with volatility-based slippage
    - Commission tracking (per-trade or per-share)
    - Position tracking with P&L
    - Full risk system integration
    - Performance analytics
    - Market hours checking

    Example:
        >>> config = Config()
        >>> alpaca = AlpacaClient(api_key="...", secret_key="...")
        >>> trader = PaperTrader(
        ...     config=config,
        ...     alpaca_client=alpaca,
        ...     enable_risk_systems=True
        ... )
        >>> # Check circuit breakers before trading
        >>> order_id = await trader.place_market_order("AAPL", 100, "BUY")
    """

    def __init__(
        self,
        config: Config,
        alpaca_client: Optional[AlpacaClient] = None,
        kelly_sizer: Optional[KellyPositionSizer] = None,
        stop_manager: Optional[StopLossManager] = None,
        circuit_breaker: Optional[CircuitBreaker] = None,
        enable_risk_systems: bool = True,
        commission_per_trade: float = 0.0,
        commission_per_share: float = 0.0,
        enforce_market_hours: bool = True,
        slippage_volatility_multiplier: float = 1.0,
    ):
        """
        Initialize enhanced paper trader.

        Args:
            config: DeepStack configuration
            alpaca_client: Alpaca client for market data
            kelly_sizer: Kelly position sizer (auto-created if None)
            stop_manager: Stop loss manager (auto-created if None)
            circuit_breaker: Circuit breaker (auto-created if None)
            enable_risk_systems: Enable risk system integration
            commission_per_trade: Fixed commission per trade (default $0)
            commission_per_share: Commission per share (default $0)
            enforce_market_hours: Only allow trades during market hours
            slippage_volatility_multiplier: Slippage multiplier (default 1.0)
        """
        self.config = config
        self.alpaca = alpaca_client
        self.enable_risk_systems = enable_risk_systems
        self.enforce_market_hours = enforce_market_hours
        self.slippage_volatility_multiplier = slippage_volatility_multiplier

        # Commission settings (choose one or use both for blended model)
        self.commission_per_trade = commission_per_trade
        self.commission_per_share = commission_per_share

        # Virtual portfolio
        self.initial_cash = 100000.0  # Start with $100k
        self.cash = self.initial_cash
        self.positions: Dict[str, Dict[str, Any]] = {}
        self.orders: Dict[str, Dict[str, Any]] = {}
        self.trade_history: List[Dict[str, Any]] = []

        # Performance tracking
        self.peak_portfolio_value = self.initial_cash
        self.start_of_day_value = self.initial_cash
        self.daily_returns: List[float] = []
        self.trade_returns: List[float] = []
        self.total_commissions_paid = 0.0

        # Slippage settings (enhanced with volatility-based model)
        self.slippage_bps = 5  # Base 5 basis points slippage
        self.min_slippage = 0.01  # Minimum $0.01 slippage

        # Database for persistence
        self.db_path = "data/paper_trading.db"
        self._init_db()

        # Initialize connection pool for thread-safe database access
        self._db_pool = SQLiteConnectionPool(self.db_path, pool_size=5)

        # Initialize risk systems
        if enable_risk_systems:
            current_balance = self.get_portfolio_value()

            # Kelly Position Sizer
            if kelly_sizer is None:
                self.kelly_sizer = KellyPositionSizer(
                    account_balance=current_balance,
                    max_position_pct=0.25,  # 25% max per position
                    max_total_exposure=1.0,  # 100% max total exposure
                    current_positions=self._get_position_values(),
                )
            else:
                self.kelly_sizer = kelly_sizer

            # Stop Loss Manager
            if stop_manager is None:
                self.stop_manager = StopLossManager(
                    account_balance=current_balance,
                    max_risk_per_trade=0.02,  # 2% max risk per trade
                    default_stop_pct=0.02,  # 2% default stop
                )
            else:
                self.stop_manager = stop_manager

            # Circuit Breaker
            if circuit_breaker is None:
                self.circuit_breaker = CircuitBreaker(
                    initial_portfolio_value=current_balance,
                    daily_loss_limit=0.03,  # 3% daily loss limit
                    max_drawdown_limit=0.10,  # 10% max drawdown
                    consecutive_loss_limit=5,  # 5 consecutive losses
                )
            else:
                self.circuit_breaker = circuit_breaker
        else:
            self.kelly_sizer = None
            self.stop_manager = None
            self.circuit_breaker = None

        # Market hours (NYSE: 9:30 AM - 4:00 PM ET)
        self.market_open_time = time(9, 30)
        self.market_close_time = time(16, 0)
        self.market_timezone = pytz.timezone("America/New_York")

        # Price cache (for fallback when Alpaca unavailable)
        self.price_cache: Dict[str, tuple] = {}  # (price, timestamp)

        logger.info(
            f"Enhanced Paper Trader initialized: "
            f"initial_cash=${self.initial_cash:,.2f}, "
            f"risk_systems={'enabled' if enable_risk_systems else 'disabled'}, "
            f"commission_per_trade=${commission_per_trade:.2f}, "
            f"commission_per_share=${commission_per_share:.4f}"
        )

    def _generate_order_id(self) -> str:
        """Generate a unique order ID.

        Uses UUID4 for guaranteed uniqueness even under high concurrency.
        Format: paper_YYYYMMDD_HHMMSS_<uuid-suffix>
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        # Use first 12 chars of UUID4 for uniqueness without being too long
        unique_suffix = uuid.uuid4().hex[:12]
        return f"paper_{timestamp}_{unique_suffix}"

    def _init_db(self):
        """Initialize SQLite database for paper trading data with migration support."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                # Check if migration needed (existing database)
                cursor = conn.execute(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name='orders'"
                )
                existing_tables = cursor.fetchall()

                if existing_tables:
                    # Database exists - check for migration
                    cursor = conn.execute("PRAGMA table_info(orders)")
                    existing_columns = [row[1] for row in cursor.fetchall()]

                    if "commission" not in existing_columns:
                        logger.info(
                            "Migrating database schema to add commission/slippage tracking..."
                        )
                        # Migrate orders table
                        conn.execute(
                            "ALTER TABLE orders ADD COLUMN commission REAL DEFAULT 0"
                        )
                        conn.execute(
                            "ALTER TABLE orders ADD COLUMN slippage REAL DEFAULT 0"
                        )

                        # Migrate trades table
                        cursor = conn.execute("PRAGMA table_info(trades)")
                        trade_columns = [row[1] for row in cursor.fetchall()]
                        if "commission" not in trade_columns:
                            conn.execute(
                                "ALTER TABLE trades ADD COLUMN commission REAL DEFAULT 0"
                            )
                        if "pnl" not in trade_columns:
                            conn.execute(
                                "ALTER TABLE trades ADD COLUMN pnl REAL DEFAULT 0"
                            )

                        conn.commit()
                        logger.info("Database migration complete")

                # Positions table
                conn.execute(
                    """
                    CREATE TABLE IF NOT EXISTS positions (
                        symbol TEXT PRIMARY KEY,
                        quantity INTEGER,
                        avg_cost REAL,
                        market_value REAL,
                        unrealized_pnl REAL,
                        realized_pnl REAL,
                        updated_at TIMESTAMP
                    )
                """
                )

                # Orders table (enhanced with commission tracking)
                conn.execute(
                    """
                    CREATE TABLE IF NOT EXISTS orders (
                        order_id TEXT PRIMARY KEY,
                        symbol TEXT,
                        action TEXT,
                        quantity INTEGER,
                        order_type TEXT,
                        limit_price REAL,
                        stop_price REAL,
                        status TEXT,
                        filled_quantity INTEGER DEFAULT 0,
                        filled_avg_price REAL,
                        commission REAL DEFAULT 0,
                        slippage REAL DEFAULT 0,
                        created_at TIMESTAMP,
                        updated_at TIMESTAMP
                    )
                """
                )

                # Trades table (enhanced with P&L tracking)
                conn.execute(
                    """
                    CREATE TABLE IF NOT EXISTS trades (
                        trade_id TEXT PRIMARY KEY,
                        symbol TEXT,
                        action TEXT,
                        quantity INTEGER,
                        price REAL,
                        slippage REAL,
                        commission REAL DEFAULT 0,
                        pnl REAL DEFAULT 0,
                        timestamp TIMESTAMP,
                        order_id TEXT
                    )
                """
                )

                # Performance metrics table (new!)
                conn.execute(
                    """
                    CREATE TABLE IF NOT EXISTS performance_snapshots (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp TIMESTAMP,
                        portfolio_value REAL,
                        cash REAL,
                        positions_value REAL,
                        total_pnl REAL,
                        total_commissions REAL,
                        num_positions INTEGER,
                        num_trades INTEGER
                    )
                """
                )

                # Create indexes for common query patterns
                # Index for trades: queries by symbol and timestamp (most common)
                conn.execute(
                    """
                    CREATE INDEX IF NOT EXISTS idx_trades_symbol_timestamp
                    ON trades(symbol, timestamp DESC)
                """
                )

                # Index for trades: queries by timestamp only (for recent trades)
                conn.execute(
                    """
                    CREATE INDEX IF NOT EXISTS idx_trades_timestamp
                    ON trades(timestamp DESC)
                """
                )

                # Index for orders: queries by status (pending orders lookup)
                conn.execute(
                    """
                    CREATE INDEX IF NOT EXISTS idx_orders_status
                    ON orders(status)
                """
                )

                # Index for orders: queries by symbol (symbol-specific order history)
                conn.execute(
                    """
                    CREATE INDEX IF NOT EXISTS idx_orders_symbol
                    ON orders(symbol)
                """
                )

                # Index for orders: queries by created_at (recent orders)
                conn.execute(
                    """
                    CREATE INDEX IF NOT EXISTS idx_orders_created_at
                    ON orders(created_at DESC)
                """
                )

                # Composite index for orders: status + symbol (common filter combo)
                conn.execute(
                    """
                    CREATE INDEX IF NOT EXISTS idx_orders_status_symbol
                    ON orders(status, symbol)
                """
                )

                conn.commit()

            logger.info(
                f"Paper trading database initialized at {self.db_path} "
                f"(with performance indexes)"
            )

        except sqlite3.DatabaseError as e:
            logger.critical(f"Paper trading database initialization failed: {e}")
            raise DatabaseInitializationError(
                message="Failed to initialize paper trading database",
                database=str(self.db_path),
                original_error=str(e),
            )
        except Exception as e:
            logger.critical(
                f"Unexpected error initializing paper trading database: {e}",
                exc_info=True,
            )
            raise DatabaseInitializationError(
                message="Unexpected error during paper trading database initialization",
                database=str(self.db_path),
                original_error=str(e),
            )

    async def check_circuit_breakers(self) -> Dict[str, Any]:
        """
        Check all circuit breakers before trading.

        This MUST be called before every trade to ensure trading is allowed.

        Returns:
            Dict with breaker status:
                {
                    "trading_allowed": bool,
                    "breakers_tripped": List[str],
                    "reasons": List[str],
                    "warnings": List[str],
                }
        """
        if not self.enable_risk_systems or self.circuit_breaker is None:
            return {
                "trading_allowed": True,
                "breakers_tripped": [],
                "reasons": [],
                "warnings": ["Risk systems disabled"],
            }

        current_value = self.get_portfolio_value()

        status = self.circuit_breaker.check_breakers(
            current_portfolio_value=current_value,
            start_of_day_value=self.start_of_day_value,
            recent_trades=self.trade_history[-20:] if self.trade_history else None,
        )

        return status

    async def calculate_position_size(
        self,
        symbol: str,
        win_rate: float = 0.55,
        avg_win: float = 150.0,
        avg_loss: float = 100.0,
        kelly_fraction: float = 0.5,
    ) -> Dict[str, Any]:
        """
        Calculate optimal position size using Kelly Criterion.

        Args:
            symbol: Stock symbol
            win_rate: Historical win rate (0-1)
            avg_win: Average win amount in dollars
            avg_loss: Average loss amount in dollars
            kelly_fraction: Fraction of Kelly to use (default 0.5 for safety)

        Returns:
            Dict with position sizing details from Kelly sizer
        """
        if not self.enable_risk_systems or self.kelly_sizer is None:
            # Fallback: simple 10% of portfolio
            portfolio_value = self.get_portfolio_value()
            return {
                "position_size": portfolio_value * 0.10,
                "shares": None,
                "kelly_pct": 0.10,
                "adjusted_pct": 0.10,
                "win_loss_ratio": avg_win / avg_loss if avg_loss > 0 else 0.0,
                "fractional_kelly": kelly_fraction,
                "rationale": "Risk systems disabled - using 10% of portfolio",
                "warnings": ["Risk systems disabled"],
                "portfolio_heat": 0.0,
            }

        # Get current stock price
        current_price = await self._get_market_price(symbol)
        if not current_price:
            return {
                "position_size": 0.0,
                "shares": 0,
                "kelly_pct": 0.0,
                "adjusted_pct": 0.0,
                "win_loss_ratio": 0.0,
                "fractional_kelly": kelly_fraction,
                "rationale": "Could not get market price",
                "warnings": ["Market price unavailable"],
                "portfolio_heat": 0.0,
            }

        # Update Kelly sizer with current positions
        self.kelly_sizer.update_positions(self._get_position_values())
        self.kelly_sizer.update_account_balance(self.get_portfolio_value())

        # Calculate position size
        return self.kelly_sizer.calculate_position_size(
            win_rate=win_rate,
            avg_win=avg_win,
            avg_loss=avg_loss,
            kelly_fraction=kelly_fraction,
            stock_price=current_price,
            symbol=symbol,
        )

    async def add_manual_position(
        self, symbol: str, quantity: int, avg_cost: float
    ) -> Dict[str, Any]:
        """
        Manually add a position to the portfolio.

        Args:
            symbol: Stock symbol
            quantity: Number of shares
            avg_cost: Average cost per share

        Returns:
            Dict with position details
        """
        if quantity <= 0:
            raise ValueError("Quantity must be positive")
        if avg_cost < 0:
            raise ValueError("Average cost cannot be negative")

        # Get current market price for valuation
        current_price = await self._get_market_price(symbol)
        if not current_price:
            current_price = avg_cost  # Fallback to cost if no price available

        market_value = quantity * current_price
        unrealized_pnl = market_value - (quantity * avg_cost)

        # Create position record
        position = {
            "symbol": symbol,
            "quantity": quantity,
            "avg_cost": avg_cost,
            "market_value": market_value,
            "unrealized_pnl": unrealized_pnl,
            "realized_pnl": 0.0,
            "updated_at": datetime.now(),
        }

        # Save to database
        self._save_position(position)

        logger.info(f"Manual position added: {quantity} {symbol} @ ${avg_cost:.2f}")

        return position

    def _save_position(self, position: Dict[str, Any]):
        """Save position to database."""
        try:
            with self._db_pool.get_connection() as conn:
                conn.execute(
                    """
                    INSERT OR REPLACE INTO positions
                    (symbol, quantity, avg_cost, market_value, unrealized_pnl,
                     realized_pnl, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                    (
                        position["symbol"],
                        position["quantity"],
                        position["avg_cost"],
                        position["market_value"],
                        position["unrealized_pnl"],
                        position["realized_pnl"],
                        position["updated_at"],
                    ),
                )
                conn.commit()
        except Exception as e:
            logger.error(f"Error saving position {position['symbol']}: {e}")
            raise

    async def place_stop_loss(
        self,
        symbol: str,
        entry_price: float,
        position_size: float,
        stop_type: str = "fixed_pct",
        stop_pct: float = 0.02,
    ) -> Optional[Dict[str, Any]]:
        """
        Automatically place stop loss for a position.

        Args:
            symbol: Stock symbol
            entry_price: Entry price for the position
            position_size: Position size in dollars
            stop_type: "fixed_pct", "atr_based", or "trailing"
            stop_pct: Stop loss percentage (for fixed_pct)

        Returns:
            Dict with stop loss details or None if error
        """
        if not self.enable_risk_systems or self.stop_manager is None:
            logger.warning(
                f"Risk systems disabled - cannot place automatic stop for {symbol}"
            )
            return None

        try:
            # Update stop manager with current balance
            self.stop_manager.update_account_balance(self.get_portfolio_value())

            # Calculate stop loss
            stop_data = self.stop_manager.calculate_stop_loss(
                symbol=symbol,
                entry_price=entry_price,
                position_size=position_size,
                position_side="long",  # Assume long for paper trading
                stop_type=stop_type,
                stop_pct=stop_pct,
            )

            # Place the stop order
            stop_price = stop_data["stop_price"]
            shares = stop_data["shares"]

            order_id = await self.place_stop_order(
                symbol=symbol, quantity=shares, action="SELL", stop_price=stop_price
            )

            stop_data["order_id"] = order_id
            logger.info(
                f"Automatic stop loss placed for {symbol}: "
                f"{shares} shares @ ${stop_price:.2f} "
                f"(risk: ${stop_data['risk_amount']:.2f})"
            )

            return stop_data

        except Exception as e:
            logger.error(f"Error placing stop loss for {symbol}: {e}")
            return None

    def is_market_hours(self) -> bool:
        """
        Check if current time is within market hours.

        Returns:
            bool: True if market is open
        """
        if not self.enforce_market_hours:
            return True  # Always allow if enforcement disabled

        now = datetime.now(self.market_timezone)
        current_time = now.time()

        # Check if weekend
        if now.weekday() >= 5:  # Saturday = 5, Sunday = 6
            return False

        # Check if within market hours
        return self.market_open_time <= current_time <= self.market_close_time

    async def place_market_order(
        self,
        symbol: str,
        quantity: int,
        action: str,
        auto_stop_loss: bool = True,
        stop_pct: float = 0.02,
    ) -> Optional[str]:
        """
        Place simulated market order with full risk integration.

        Integration pattern:
        1. Validate inputs (CRITICAL)
        2. Check circuit breakers
        3. Check market hours
        4. Get market price
        5. Calculate slippage and commission
        6. Execute trade
        7. Place automatic stop loss
        8. Update performance metrics

        Args:
            symbol: Stock symbol
            quantity: Number of shares
            action: 'BUY' or 'SELL'
            auto_stop_loss: Automatically place stop loss (default True)
            stop_pct: Stop loss percentage (default 2%)

        Returns:
            Order ID if successful, None otherwise
        """
        # Step 0: CRITICAL INPUT VALIDATION (prevents crashes)
        if not symbol or not isinstance(symbol, str):
            logger.error(f"Invalid symbol: {symbol}")
            return None

        if quantity <= 0:
            logger.error(f"Invalid quantity: {quantity}. Must be > 0")
            return None

        if action not in ("BUY", "SELL"):
            logger.error(f"Invalid action: {action}. Must be 'BUY' or 'SELL'")
            return None

        # Step 1: Check circuit breakers
        if self.enable_risk_systems and self.circuit_breaker:
            breaker_status = await self.check_circuit_breakers()
            if not breaker_status["trading_allowed"]:
                logger.error(
                    f"Order rejected - circuit breakers tripped: {breaker_status['reasons']}"
                )
                return None

        # Step 2: Check market hours
        if not self.is_market_hours():
            logger.error(
                f"Order rejected - market is closed. "
                f"Market hours: {self.market_open_time.strftime('%H:%M')} - "
                f"{self.market_close_time.strftime('%H:%M')} ET"
            )
            return None

        order_id = self._generate_order_id()

        try:
            # Step 3: Get current market price
            current_price = await self._get_market_price(symbol)
            if not current_price:
                logger.error(f"Could not get market price for {symbol}")
                return None

            # Step 4: Calculate slippage
            fill_price = self._calculate_slippage(current_price, action, quantity)

            # Calculate commission
            commission = self._calculate_commission(quantity)

            # Step 5: Create order record
            order = {
                "order_id": order_id,
                "symbol": symbol,
                "action": action,
                "quantity": quantity,
                "order_type": "MKT",
                "status": "FILLED",
                "filled_quantity": quantity,
                "filled_avg_price": fill_price,
                "commission": commission,
                "slippage": abs(fill_price - current_price),
                "created_at": datetime.now(),
                "updated_at": datetime.now(),
            }

            # Save order
            self._save_order(order)

            # Execute the trade
            await self._execute_trade(
                order_id, symbol, action, quantity, fill_price, commission
            )

            # Step 6: Place automatic stop loss (for BUY orders)
            if (
                action == "BUY"
                and auto_stop_loss
                and self.enable_risk_systems
                and self.stop_manager
            ):
                position_value = quantity * fill_price
                await self.place_stop_loss(
                    symbol=symbol,
                    entry_price=fill_price,
                    position_size=position_value,
                    stop_type="fixed_pct",
                    stop_pct=stop_pct,
                )

            # Step 7: Update performance metrics
            self._update_performance_metrics()

            logger.info(
                f"Paper order filled: {action} {quantity} {symbol} @ ${fill_price:.2f} "
                f"(commission: ${commission:.2f}, slippage: ${abs(fill_price - current_price):.4f})"
            )

            return order_id

        except ValueError as e:
            # Expected business logic errors (e.g., insufficient funds)
            logger.warning(f"Paper order rejected: {e}")
            return None  # Caller can handle rejection
        except Exception as e:
            from core.exceptions import OrderExecutionError

            logger.error(f"Error placing paper order: {e}", exc_info=True)
            raise OrderExecutionError(
                message="Paper trading system error",
                symbol=symbol,
                quantity=quantity,
                order_type="MKT",
                side=action,
                reason=str(e),
            )

    async def place_limit_order(
        self, symbol: str, quantity: int, action: str, limit_price: float
    ) -> Optional[str]:
        """
        Place simulated limit order.

        Args:
            symbol: Stock symbol
            quantity: Number of shares
            action: 'BUY' or 'SELL'
            limit_price: Limit price

        Returns:
            Order ID if successful
        """
        # Check circuit breakers
        if self.enable_risk_systems and self.circuit_breaker:
            breaker_status = await self.check_circuit_breakers()
            if not breaker_status["trading_allowed"]:
                logger.error("Order rejected - circuit breakers tripped")
                return None

        # Check market hours
        if not self.is_market_hours():
            logger.error("Order rejected - market is closed")
            return None

        order_id = self._generate_order_id()

        try:
            order = {
                "order_id": order_id,
                "symbol": symbol,
                "action": action,
                "quantity": quantity,
                "order_type": "LMT",
                "limit_price": limit_price,
                "status": "PENDING",
                "filled_quantity": 0,
                "commission": 0,
                "created_at": datetime.now(),
                "updated_at": datetime.now(),
            }

            # For paper trading, immediately check if limit order can be filled
            current_price = await self._get_market_price(symbol)
            if not current_price:
                return None

            # Check if limit order can be filled
            can_fill = (action == "BUY" and current_price <= limit_price) or (
                action == "SELL" and current_price >= limit_price
            )

            if can_fill:
                fill_price = (
                    min(limit_price, current_price)
                    if action == "BUY"
                    else max(limit_price, current_price)
                )
                commission = self._calculate_commission(quantity)

                order.update(
                    {
                        "status": "FILLED",
                        "filled_quantity": quantity,
                        "filled_avg_price": fill_price,
                        "commission": commission,
                        "slippage": 0,  # No slippage on limit orders
                    }
                )

                # Execute the trade
                await self._execute_trade(
                    order_id, symbol, action, quantity, fill_price, commission
                )
                logger.info(
                    f"Paper limit order filled: {action} {quantity} {symbol} @ ${fill_price:.2f}"
                )
            else:
                order["status"] = "CANCELLED"
                logger.info(
                    f"Paper limit order cancelled: {action} {quantity} {symbol} limit ${limit_price:.2f}"
                )

            self._save_order(order)
            return order_id

        except Exception as e:
            logger.error(f"Error placing paper limit order: {e}")
            return None

    async def place_stop_order(
        self, symbol: str, quantity: int, action: str, stop_price: float
    ) -> Optional[str]:
        """
        Place simulated stop order.

        Args:
            symbol: Stock symbol
            quantity: Number of shares
            action: 'BUY' or 'SELL'
            stop_price: Stop price

        Returns:
            Order ID if successful
        """
        # CRITICAL: Add circuit breaker and market hours checks
        if self.enable_risk_systems and self.circuit_breaker:
            breaker_status = await self.check_circuit_breakers()
            if not breaker_status["trading_allowed"]:
                logger.error(
                    f"Stop order rejected - circuit breakers tripped: {breaker_status['reasons']}"
                )
                return None

        if not self.is_market_hours():
            logger.error("Stop order rejected - market is closed")
            return None

        order_id = self._generate_order_id()

        try:
            order = {
                "order_id": order_id,
                "symbol": symbol,
                "action": action,
                "quantity": quantity,
                "order_type": "STP",
                "stop_price": stop_price,
                "status": "PENDING",
                "filled_quantity": 0,
                "commission": 0,
                "created_at": datetime.now(),
                "updated_at": datetime.now(),
            }

            # For paper trading simulation, check if stop should trigger
            current_price = await self._get_market_price(symbol)
            if not current_price:
                return None

            # Check if stop should trigger
            should_trigger = (action == "BUY" and current_price >= stop_price) or (
                action == "SELL" and current_price <= stop_price
            )

            if should_trigger:
                fill_price = self._calculate_slippage(current_price, action, quantity)
                commission = self._calculate_commission(quantity)

                order.update(
                    {
                        "status": "FILLED",
                        "filled_quantity": quantity,
                        "filled_avg_price": fill_price,
                        "commission": commission,
                        "slippage": abs(fill_price - current_price),
                    }
                )

                # Execute the trade
                await self._execute_trade(
                    order_id, symbol, action, quantity, fill_price, commission
                )
                logger.info(
                    f"Paper stop order triggered: {action} {quantity} {symbol} @ ${fill_price:.2f}"
                )
            else:
                order["status"] = "PENDING"

            self._save_order(order)
            return order_id

        except Exception as e:
            logger.error(f"Error placing paper stop order: {e}")
            return None

    async def cancel_order(self, order_id: str) -> bool:
        """
        Cancel a paper order.

        Args:
            order_id: Order ID

        Returns:
            bool: True if cancelled
        """
        try:
            with self._db_pool.get_connection() as conn:
                conn.execute(
                    "UPDATE orders SET status = 'CANCELLED', updated_at = ? "
                    "WHERE order_id = ?",
                    (datetime.now(), order_id),
                )
                conn.commit()

            logger.info(f"Paper order cancelled: {order_id}")
            return True

        except Exception as e:
            logger.error(f"Error cancelling paper order: {e}")
            return False

    async def _execute_trade(
        self,
        order_id: str,
        symbol: str,
        action: str,
        quantity: int,
        price: float,
        commission: float = 0.0,
    ):
        """
        Execute a trade in the virtual portfolio.

        Args:
            order_id: Order ID
            symbol: Stock symbol
            action: 'BUY' or 'SELL'
            quantity: Number of shares
            price: Execution price
            commission: Commission paid
        """
        try:
            trade_value = quantity * price
            total_cost = trade_value + commission  # Add commission to cost

            # Track commission
            self.total_commissions_paid += commission

            if action == "BUY":
                # Check if we have enough cash
                if self.cash < total_cost:
                    raise ValueError(
                        f"Insufficient cash: ${self.cash:.2f} < ${total_cost:.2f}"
                    )

                # Update position
                if symbol in self.positions:
                    existing = self.positions[symbol]
                    total_quantity = existing["quantity"] + quantity
                    # Include commission in cost basis
                    total_cost_basis = (
                        existing["quantity"] * existing["avg_cost"]
                    ) + total_cost
                    new_avg_cost = total_cost_basis / total_quantity

                    self.positions[symbol].update(
                        {
                            "quantity": total_quantity,
                            "avg_cost": new_avg_cost,
                            "updated_at": datetime.now(),
                        }
                    )
                else:
                    self.positions[symbol] = {
                        "quantity": quantity,
                        "avg_cost": total_cost / quantity,  # Include commission
                        "market_value": trade_value,
                        "unrealized_pnl": 0.0,
                        "realized_pnl": 0.0,
                        "updated_at": datetime.now(),
                    }

                self.cash -= total_cost

            else:  # SELL
                if (
                    symbol not in self.positions
                    or self.positions[symbol]["quantity"] < quantity
                ):
                    raise ValueError(f"Insufficient position in {symbol}")

                # Calculate realized P&L
                position = self.positions[symbol]
                proceeds = trade_value - commission  # Subtract commission from proceeds
                cost = position["avg_cost"] * quantity
                realized_pnl = proceeds - cost

                position["realized_pnl"] += realized_pnl

                # Update position
                position["quantity"] -= quantity
                if position["quantity"] == 0:
                    del self.positions[symbol]
                else:
                    position["updated_at"] = datetime.now()

                self.cash += proceeds

                # Record trade P&L for circuit breaker
                if self.circuit_breaker:
                    self.circuit_breaker.record_trade(realized_pnl)

            # Record trade
            # nosec B311 - random used for trade ID uniqueness, not security
            trade = {
                "trade_id": f"trade_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{random.randint(1000, 9999)}",  # nosec B311
                "symbol": symbol,
                "action": action,
                "quantity": quantity,
                "price": price,
                "slippage": 0.0,  # Calculated separately
                "commission": commission,
                "pnl": realized_pnl if action == "SELL" else 0.0,
                "timestamp": datetime.now(),
                "order_id": order_id,
            }

            self.trade_history.append(trade)
            self._save_trade(trade)
            self._save_positions()

            logger.info(
                f"Paper trade executed: {action} {quantity} {symbol} @ ${price:.2f} "
                f"(commission: ${commission:.2f})"
            )

        except Exception as e:
            logger.error(f"Error executing paper trade: {e}")
            raise

    async def _get_market_price(self, symbol: str) -> Optional[float]:
        """
        Get current market price for symbol using Alpaca API.

        Fallback hierarchy:
        1. Alpaca real-time quote
        2. Cached price (if recent)
        3. None (fail-safe)

        Args:
            symbol: Stock symbol

        Returns:
            Current price or None
        """
        # Try Alpaca first
        if self.alpaca:
            try:
                quote = await self.alpaca.get_quote(symbol)
                if quote and quote.get("last"):
                    price = quote["last"]
                    # Cache the price
                    self.price_cache[symbol] = (price, datetime.now())
                    return price
            except Exception as e:
                logger.warning(f"Error getting live price for {symbol}: {e}")

        # Try cache (if recent - within 5 minutes)
        if symbol in self.price_cache:
            price, timestamp = self.price_cache[symbol]
            age = (datetime.now() - timestamp).total_seconds()
            if age < 300:  # 5 minutes
                logger.debug(f"Using cached price for {symbol} (age: {age:.0f}s)")
                return price

        # No price available
        logger.error(
            f"Could not get market price for {symbol} - Alpaca unavailable and no cache"
        )
        return None

    def _calculate_slippage(
        self, market_price: float, action: str, quantity: int
    ) -> float:
        """
        Calculate realistic slippage for paper trading.

        Enhanced model considers:
        - Base slippage (5 bps)
        - Order size impact (larger orders = more slippage)
        - Volatility multiplier
        - Random component for realism

        Args:
            market_price: Current market price
            action: 'BUY' or 'SELL'
            quantity: Order size in shares

        Returns:
            Fill price with slippage
        """
        # Base slippage
        base_slippage_pct = self.slippage_bps / 10000

        # Size impact (logarithmic scaling - larger orders have more impact)
        # For every 100 shares, add 0.5 bps of slippage
        size_impact = (quantity / 100) * 0.5 / 10000
        size_impact = min(size_impact, 0.002)  # Cap at 20 bps

        # Volatility multiplier
        volatility_factor = self.slippage_volatility_multiplier

        # Random component (±50% of base slippage for realism)
        # nosec B311 - random used for simulation realism, not security
        random_factor = random.uniform(0.5, 1.5)  # nosec B311

        # Total slippage
        total_slippage_pct = (
            (base_slippage_pct + size_impact) * volatility_factor * random_factor
        )

        # Convert to dollars
        slippage_amount = max(self.min_slippage, market_price * total_slippage_pct)

        # Apply slippage
        if action == "BUY":
            # Pay slightly more on buys
            return market_price + slippage_amount
        else:
            # Receive slightly less on sells
            return market_price - slippage_amount

    def _calculate_commission(self, quantity: int) -> float:
        """
        Calculate commission for a trade.

        Uses both per-trade and per-share commission (blended model).

        Args:
            quantity: Number of shares

        Returns:
            Total commission
        """
        per_trade = self.commission_per_trade
        per_share = self.commission_per_share * quantity
        return per_trade + per_share

    def _get_position_values(self) -> Dict[str, float]:
        """
        Get position values for Kelly sizer.

        Returns:
            Dict of {symbol: position_value}
        """
        return {
            symbol: pos["quantity"] * pos.get("market_value", pos["avg_cost"])
            for symbol, pos in self.positions.items()
        }

    def _update_performance_metrics(self):
        """Update performance metrics snapshot."""
        try:
            portfolio_value = self.get_portfolio_value()
            positions_value = sum(
                pos.get("market_value", 0) for pos in self.positions.values()
            )
            total_pnl = portfolio_value - self.initial_cash

            # Update peak value for drawdown calculation
            if portfolio_value > self.peak_portfolio_value:
                self.peak_portfolio_value = portfolio_value

            # Save snapshot
            with self._db_pool.get_connection() as conn:
                conn.execute(
                    """
                    INSERT INTO performance_snapshots
                    (timestamp, portfolio_value, cash, positions_value, total_pnl,
                     total_commissions, num_positions, num_trades)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                    (
                        datetime.now(),
                        portfolio_value,
                        self.cash,
                        positions_value,
                        total_pnl,
                        self.total_commissions_paid,
                        len(self.positions),
                        len(self.trade_history),
                    ),
                )
                conn.commit()

        except Exception as e:
            logger.error(f"Error updating performance metrics: {e}")

    def _save_order(self, order: Dict[str, Any]):
        """Save order to database."""
        try:
            with self._db_pool.get_connection() as conn:
                conn.execute(
                    """
                    INSERT OR REPLACE INTO orders
                    (order_id, symbol, action, quantity, order_type, limit_price,
                     stop_price, status, filled_quantity, filled_avg_price,
                     commission, slippage, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                    (
                        order["order_id"],
                        order["symbol"],
                        order["action"],
                        order["quantity"],
                        order["order_type"],
                        order.get("limit_price"),
                        order.get("stop_price"),
                        order["status"],
                        order.get("filled_quantity", 0),
                        order.get("filled_avg_price"),
                        order.get("commission", 0),
                        order.get("slippage", 0),
                        order["created_at"],
                        order["updated_at"],
                    ),
                )
                conn.commit()
        except Exception as e:
            logger.error(f"Error saving order: {e}")

    def _save_trade(self, trade: Dict[str, Any]):
        """Save trade to database."""
        try:
            with self._db_pool.get_connection() as conn:
                conn.execute(
                    """
                    INSERT INTO trades
                    (trade_id, symbol, action, quantity, price, slippage,
                     commission, pnl, timestamp, order_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                    (
                        trade["trade_id"],
                        trade["symbol"],
                        trade["action"],
                        trade["quantity"],
                        trade["price"],
                        trade.get("slippage", 0),
                        trade.get("commission", 0),
                        trade.get("pnl", 0),
                        trade["timestamp"],
                        trade["order_id"],
                    ),
                )
                conn.commit()
        except Exception as e:
            logger.error(f"Error saving trade: {e}")

    def _save_positions(self):
        """Save positions to database."""
        try:
            with self._db_pool.get_connection() as conn:
                # Clear existing positions
                conn.execute("DELETE FROM positions")

                # Insert current positions
                for symbol, position in self.positions.items():
                    conn.execute(
                        """
                        INSERT INTO positions
                        (symbol, quantity, avg_cost, market_value, unrealized_pnl,
                         realized_pnl, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                        (
                            symbol,
                            position["quantity"],
                            position["avg_cost"],
                            position.get("market_value", 0),
                            position.get("unrealized_pnl", 0),
                            position.get("realized_pnl", 0),
                            position.get("updated_at", datetime.now()),
                        ),
                    )
                conn.commit()
        except Exception as e:
            logger.error(f"Error saving positions: {e}")

    def _load_positions(self):
        """Load positions from database."""
        try:
            with self._db_pool.get_connection() as conn:
                rows = conn.execute("SELECT * FROM positions").fetchall()
                for row in rows:
                    symbol = row[0]
                    self.positions[symbol] = {
                        "quantity": row[1],
                        "avg_cost": row[2],
                        "market_value": row[3],
                        "unrealized_pnl": row[4],
                        "realized_pnl": row[5],
                        "updated_at": datetime.fromisoformat(row[6]),
                    }
        except Exception as e:
            logger.error(f"Error loading positions: {e}")

    # Portfolio Query Methods

    def get_positions(self) -> List[Dict[str, Any]]:
        """
        Get current positions.

        Returns:
            List of position dictionaries
        """
        return [{"symbol": symbol, **pos} for symbol, pos in self.positions.items()]

    def get_position(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        Get position for symbol.

        Args:
            symbol: Stock symbol

        Returns:
            Position dictionary or None
        """
        return self.positions.get(symbol)

    def get_portfolio_value(self) -> float:
        """
        Get total portfolio value.

        Returns:
            Total value (cash + positions)
        """
        position_value = sum(
            pos.get("market_value", pos["quantity"] * pos["avg_cost"])
            for pos in self.positions.values()
        )
        return self.cash + position_value

    def get_buying_power(self) -> float:
        """
        Get available buying power (simplified).

        Returns:
            Buying power (cash for paper trading)
        """
        return self.cash

    def get_trade_history(self, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get recent trade history.

        Args:
            limit: Maximum number of trades to return

        Returns:
            List of trade dictionaries
        """
        return self.trade_history[-limit:] if self.trade_history else []

    # Performance Analytics Methods

    def calculate_sharpe_ratio(self, risk_free_rate: float = 0.02) -> Optional[float]:
        """
        Calculate Sharpe ratio for the portfolio.

        Sharpe Ratio = (Mean Return - Risk-Free Rate) / Std Dev of Returns

        Args:
            risk_free_rate: Annual risk-free rate (default 2% = 0.02)

        Returns:
            Sharpe ratio or None if insufficient data
        """
        if len(self.trade_history) < 2:
            return None

        try:
            # Calculate returns from trades
            returns = []
            for trade in self.trade_history:
                if trade.get("pnl"):
                    # Convert P&L to return percentage
                    trade_value = trade["quantity"] * trade["price"]
                    if trade_value > 0:
                        returns.append(trade["pnl"] / trade_value)

            if len(returns) < 2:
                return None

            # Calculate mean and std dev
            import statistics

            mean_return = statistics.mean(returns)
            std_return = statistics.stdev(returns)

            if std_return == 0:
                return None

            # Annualize (assuming daily trades for simplicity)
            # Daily risk-free rate
            daily_rf = risk_free_rate / 252

            # Sharpe ratio
            sharpe = (mean_return - daily_rf) / std_return

            # Annualize Sharpe (sqrt(252) for daily data)
            annualized_sharpe = sharpe * (252**0.5)

            return annualized_sharpe

        except Exception as e:
            logger.error(f"Error calculating Sharpe ratio: {e}")
            return None

    def calculate_max_drawdown(self) -> Dict[str, float]:
        """
        Calculate maximum drawdown from peak.

        Max Drawdown = max((Peak - Trough) / Peak)

        Returns:
            Dict with drawdown details:
                {
                    "max_drawdown_pct": float,
                    "max_drawdown_dollars": float,
                    "peak_value": float,
                    "current_value": float,
                }
        """
        current_value = self.get_portfolio_value()
        drawdown_dollars = self.peak_portfolio_value - current_value
        drawdown_pct = (
            drawdown_dollars / self.peak_portfolio_value
            if self.peak_portfolio_value > 0
            else 0.0
        )

        return {
            "max_drawdown_pct": drawdown_pct,
            "max_drawdown_dollars": drawdown_dollars,
            "peak_value": self.peak_portfolio_value,
            "current_value": current_value,
        }

    def get_trade_statistics(self) -> Dict[str, Any]:
        """
        Get comprehensive trade statistics.

        Returns:
            Dict with trade stats:
                {
                    "total_trades": int,
                    "winning_trades": int,
                    "losing_trades": int,
                    "win_rate": float,
                    "avg_win": float,
                    "avg_loss": float,
                    "largest_win": float,
                    "largest_loss": float,
                    "total_commissions": float,
                    "avg_hold_time": float (seconds),
                }
        """
        if not self.trade_history:
            return {
                "total_trades": 0,
                "winning_trades": 0,
                "losing_trades": 0,
                "win_rate": 0.0,
                "avg_win": 0.0,
                "avg_loss": 0.0,
                "largest_win": 0.0,
                "largest_loss": 0.0,
                "total_commissions": self.total_commissions_paid,
                "avg_hold_time": 0.0,
            }

        # Analyze closed trades (sells only)
        closed_trades = [t for t in self.trade_history if t["action"] == "SELL"]

        if not closed_trades:
            return {
                "total_trades": len(self.trade_history),
                "winning_trades": 0,
                "losing_trades": 0,
                "win_rate": 0.0,
                "avg_win": 0.0,
                "avg_loss": 0.0,
                "largest_win": 0.0,
                "largest_loss": 0.0,
                "total_commissions": self.total_commissions_paid,
                "avg_hold_time": 0.0,
            }

        wins = [t for t in closed_trades if t.get("pnl", 0) > 0]
        losses = [t for t in closed_trades if t.get("pnl", 0) <= 0]

        win_amounts = [t["pnl"] for t in wins]
        loss_amounts = [abs(t["pnl"]) for t in losses]

        return {
            "total_trades": len(self.trade_history),
            "winning_trades": len(wins),
            "losing_trades": len(losses),
            "win_rate": len(wins) / len(closed_trades) if closed_trades else 0.0,
            "avg_win": sum(win_amounts) / len(wins) if wins else 0.0,
            "avg_loss": sum(loss_amounts) / len(losses) if losses else 0.0,
            "largest_win": max(win_amounts) if wins else 0.0,
            "largest_loss": max(loss_amounts) if losses else 0.0,
            "total_commissions": self.total_commissions_paid,
            "avg_hold_time": 0.0,  # Would need position open/close tracking
        }

    def get_performance_summary(self) -> Dict[str, Any]:
        """
        Get comprehensive performance summary.

        Returns:
            Dict with all performance metrics
        """
        portfolio_value = self.get_portfolio_value()
        total_pnl = portfolio_value - self.initial_cash
        total_return_pct = (
            total_pnl / self.initial_cash if self.initial_cash > 0 else 0.0
        )

        drawdown = self.calculate_max_drawdown()
        trade_stats = self.get_trade_statistics()
        sharpe = self.calculate_sharpe_ratio()

        return {
            "portfolio_value": portfolio_value,
            "initial_cash": self.initial_cash,
            "cash": self.cash,
            "positions_value": portfolio_value - self.cash,
            "total_pnl": total_pnl,
            "total_return_pct": total_return_pct,
            "total_commissions": self.total_commissions_paid,
            "num_positions": len(self.positions),
            "num_trades": len(self.trade_history),
            "sharpe_ratio": sharpe,
            "max_drawdown_pct": drawdown["max_drawdown_pct"],
            "max_drawdown_dollars": drawdown["max_drawdown_dollars"],
            "peak_value": drawdown["peak_value"],
            "win_rate": trade_stats["win_rate"],
            "avg_win": trade_stats["avg_win"],
            "avg_loss": trade_stats["avg_loss"],
            "winning_trades": trade_stats["winning_trades"],
            "losing_trades": trade_stats["losing_trades"],
        }

    def reset_portfolio(self):
        """Reset portfolio to initial state (for testing)."""
        self.cash = self.initial_cash
        self.positions.clear()
        self.orders.clear()
        self.trade_history.clear()
        self.peak_portfolio_value = self.initial_cash
        self.start_of_day_value = self.initial_cash
        self.total_commissions_paid = 0.0

        # Clear database
        try:
            with self._db_pool.get_connection() as conn:
                conn.execute("DELETE FROM positions")
                conn.execute("DELETE FROM orders")
                conn.execute("DELETE FROM trades")
                conn.execute("DELETE FROM performance_snapshots")
                conn.commit()
        except Exception as e:
            logger.error(f"Error resetting portfolio: {e}")

        # Reset risk systems
        if self.enable_risk_systems:
            if self.kelly_sizer:
                self.kelly_sizer.update_account_balance(self.initial_cash)
                self.kelly_sizer.update_positions({})
            if self.stop_manager:
                self.stop_manager.update_account_balance(self.initial_cash)
            if self.circuit_breaker:
                self.circuit_breaker.peak_portfolio_value = self.initial_cash
                self.circuit_breaker.start_of_day_value = self.initial_cash
                self.circuit_breaker.consecutive_losses = 0

        logger.info("Paper trading portfolio reset")
