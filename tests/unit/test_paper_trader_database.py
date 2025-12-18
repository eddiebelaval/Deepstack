"""
Tests for PaperTrader database recovery and persistence.

These tests verify that the paper trading system:
- Correctly loads positions after restart
- Handles corrupted database scenarios
- Performs schema migrations with existing data
- Maintains data integrity across restarts

Phase 3.4 of test coverage improvement plan.
"""

import os
import sqlite3
from datetime import datetime

import pytest

from core.broker.paper_trader import PaperTrader
from core.data.data_storage import SQLiteConnectionPool
from core.exceptions import DatabaseInitializationError


def _reinit_trader_db(trader: PaperTrader, db_path: str) -> None:
    """
    Reinitialize a PaperTrader's database to use a new path.

    This is needed because PaperTrader's __init__ sets up the connection pool
    with the default db_path. To use a test-specific database, we need to:
    1. Set the new db_path
    2. Reinitialize the connection pool for the new path
    3. Initialize the database schema
    """
    trader.db_path = db_path
    trader._db_pool = SQLiteConnectionPool(db_path, pool_size=5)
    trader._init_db()


class MockConfig:
    """Mock config for testing."""


class MockAlpacaClient:
    """Mock Alpaca client that returns predictable prices."""

    async def get_quote(self, symbol: str):
        """Return mock quote data."""
        prices = {
            "AAPL": 150.00,
            "GOOGL": 2800.00,
            "MSFT": 350.00,
            "TSLA": 250.00,
        }
        return {"last": prices.get(symbol, 100.00)}


@pytest.fixture
def mock_config():
    """Create mock config."""
    return MockConfig()


@pytest.fixture
def mock_alpaca():
    """Create mock Alpaca client."""
    return MockAlpacaClient()


@pytest.fixture
def db_path(tmp_path):
    """Create temporary database path."""
    return str(tmp_path / "test_paper.db")


@pytest.fixture
def paper_trader(mock_config, mock_alpaca, db_path):
    """Create PaperTrader with test database."""
    trader = PaperTrader(
        config=mock_config,
        alpaca_client=mock_alpaca,
        enable_risk_systems=False,
        enforce_market_hours=False,
    )
    _reinit_trader_db(trader, db_path)
    return trader


class TestLoadPositionsAfterRestart:
    """Tests for loading positions after simulated restart."""

    @pytest.mark.asyncio
    async def test_positions_persist_after_restart(
        self, mock_config, mock_alpaca, db_path
    ):
        """Positions should be recoverable after trader restart."""
        # Create first trader instance and add positions
        trader1 = PaperTrader(
            config=mock_config,
            alpaca_client=mock_alpaca,
            enable_risk_systems=False,
            enforce_market_hours=False,
        )
        _reinit_trader_db(trader1, db_path)

        # Place some orders
        await trader1.place_market_order("AAPL", 50, "BUY", auto_stop_loss=False)
        await trader1.place_market_order("MSFT", 30, "BUY", auto_stop_loss=False)

        # Verify positions exist
        assert trader1.get_position("AAPL") is not None
        assert trader1.get_position("MSFT") is not None
        aapl_qty = trader1.get_position("AAPL")["quantity"]
        msft_qty = trader1.get_position("MSFT")["quantity"]

        # Simulate restart by creating new trader with same DB
        trader2 = PaperTrader(
            config=mock_config,
            alpaca_client=mock_alpaca,
            enable_risk_systems=False,
            enforce_market_hours=False,
        )
        _reinit_trader_db(trader2, db_path)
        trader2._load_positions()

        # Positions should be recovered
        assert trader2.get_position("AAPL") is not None
        assert trader2.get_position("MSFT") is not None
        assert trader2.get_position("AAPL")["quantity"] == aapl_qty
        assert trader2.get_position("MSFT")["quantity"] == msft_qty

    @pytest.mark.asyncio
    async def test_empty_positions_load(self, mock_config, mock_alpaca, db_path):
        """Empty positions table should load without error."""
        trader = PaperTrader(
            config=mock_config,
            alpaca_client=mock_alpaca,
            enable_risk_systems=False,
            enforce_market_hours=False,
        )
        _reinit_trader_db(trader, db_path)

        # Load from empty database
        trader._load_positions()

        # Should have no positions
        assert len(trader.get_positions()) == 0

    @pytest.mark.asyncio
    async def test_position_values_preserved(self, mock_config, mock_alpaca, db_path):
        """Position values (avg_cost, market_value, etc.) should be preserved."""
        trader1 = PaperTrader(
            config=mock_config,
            alpaca_client=mock_alpaca,
            enable_risk_systems=False,
            enforce_market_hours=False,
        )
        _reinit_trader_db(trader1, db_path)

        # Add position with specific values
        await trader1.place_market_order("AAPL", 100, "BUY", auto_stop_loss=False)
        original_position = trader1.get_position("AAPL")

        # Simulate restart
        trader2 = PaperTrader(
            config=mock_config,
            alpaca_client=mock_alpaca,
            enable_risk_systems=False,
            enforce_market_hours=False,
        )
        _reinit_trader_db(trader2, db_path)
        trader2._load_positions()

        recovered_position = trader2.get_position("AAPL")

        # All key values should match
        assert recovered_position["quantity"] == original_position["quantity"]
        assert recovered_position["avg_cost"] == original_position["avg_cost"]

    @pytest.mark.asyncio
    async def test_multiple_restart_cycles(self, mock_config, mock_alpaca, db_path):
        """Positions should survive multiple restart cycles."""
        symbols = ["AAPL", "MSFT", "GOOGL"]

        # Cycle 1: Create initial positions
        trader = PaperTrader(
            config=mock_config,
            alpaca_client=mock_alpaca,
            enable_risk_systems=False,
            enforce_market_hours=False,
        )
        _reinit_trader_db(trader, db_path)

        for symbol in symbols:
            await trader.place_market_order(symbol, 10, "BUY", auto_stop_loss=False)

        # Cycle 2: Restart and modify
        trader2 = PaperTrader(
            config=mock_config,
            alpaca_client=mock_alpaca,
            enable_risk_systems=False,
            enforce_market_hours=False,
        )
        _reinit_trader_db(trader2, db_path)
        trader2._load_positions()

        # Buy more AAPL
        await trader2.place_market_order("AAPL", 5, "BUY", auto_stop_loss=False)

        # Cycle 3: Final restart and verify
        trader3 = PaperTrader(
            config=mock_config,
            alpaca_client=mock_alpaca,
            enable_risk_systems=False,
            enforce_market_hours=False,
        )
        _reinit_trader_db(trader3, db_path)
        trader3._load_positions()

        # AAPL should have 15 shares, others 10
        assert trader3.get_position("AAPL")["quantity"] == 15
        assert trader3.get_position("MSFT")["quantity"] == 10
        assert trader3.get_position("GOOGL")["quantity"] == 10


class TestCorruptedDatabaseRecovery:
    """Tests for handling corrupted database scenarios."""

    def test_missing_table_recovery(self, mock_config, mock_alpaca, db_path):
        """Should handle missing tables by recreating them."""
        # Create a database with missing tables
        with sqlite3.connect(db_path) as conn:
            # Only create one table, not all
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS positions (
                    symbol TEXT PRIMARY KEY,
                    quantity INTEGER
                )
            """
            )
            conn.commit()

        # Initialize trader - should recreate missing tables
        trader = PaperTrader(
            config=mock_config,
            alpaca_client=mock_alpaca,
            enable_risk_systems=False,
            enforce_market_hours=False,
        )
        _reinit_trader_db(trader, db_path)

        # Should be able to use all tables
        # Verify orders table exists
        with sqlite3.connect(db_path) as conn:
            cursor = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='orders'"
            )
            assert cursor.fetchone() is not None

    def test_database_initialization_error_handling(
        self, mock_config, mock_alpaca, tmp_path
    ):
        """Should raise DatabaseInitializationError on critical failure."""
        # Create an invalid database path (directory instead of file)
        invalid_path = str(tmp_path / "invalid_dir")
        os.makedirs(invalid_path, exist_ok=True)

        trader = PaperTrader(
            config=mock_config,
            alpaca_client=mock_alpaca,
            enable_risk_systems=False,
            enforce_market_hours=False,
        )
        trader.db_path = invalid_path + "/subdir/db.sqlite"  # Parent doesn't exist

        # Should raise DatabaseInitializationError
        with pytest.raises(DatabaseInitializationError):
            trader._init_db()

    def test_empty_database_file(self, mock_config, mock_alpaca, db_path):
        """Should handle empty database file."""
        # Create empty file
        with open(db_path, "w") as f:
            pass

        # Initialize trader - should create proper schema
        trader = PaperTrader(
            config=mock_config,
            alpaca_client=mock_alpaca,
            enable_risk_systems=False,
            enforce_market_hours=False,
        )
        _reinit_trader_db(trader, db_path)

        # Should work normally
        trader._load_positions()
        assert len(trader.get_positions()) == 0

    def test_load_positions_with_invalid_data(self, mock_config, mock_alpaca, db_path):
        """Should handle positions with invalid/null data."""
        # Create database with some invalid data
        with sqlite3.connect(db_path) as conn:
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
            # Insert row with NULL values
            conn.execute(
                """
                INSERT INTO positions (symbol, quantity, avg_cost, market_value,
                                        unrealized_pnl, realized_pnl, updated_at)
                VALUES ('AAPL', 100, NULL, NULL, NULL, NULL, ?)
            """,
                (datetime.now().isoformat(),),
            )
            conn.commit()

        trader = PaperTrader(
            config=mock_config,
            alpaca_client=mock_alpaca,
            enable_risk_systems=False,
            enforce_market_hours=False,
        )
        # Reinit the pool to use test db (don't call _init_db since we're manually creating tables)
        trader.db_path = db_path
        trader._db_pool = SQLiteConnectionPool(db_path, pool_size=5)

        # Create remaining tables
        with sqlite3.connect(db_path) as conn:
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
            conn.commit()

        # Load positions - should handle NULL gracefully
        trader._load_positions()

        # Position should exist but values may be None
        position = trader.get_position("AAPL")
        assert position is not None
        assert position["quantity"] == 100


class TestSchemaMigration:
    """Tests for database schema migration."""

    def test_migration_adds_commission_column(self, mock_config, mock_alpaca, db_path):
        """Migration should add commission column to existing orders table."""
        # Create old schema without commission column - needs all tables
        with sqlite3.connect(db_path) as conn:
            conn.execute(
                """
                CREATE TABLE orders (
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
                    created_at TIMESTAMP,
                    updated_at TIMESTAMP
                )
            """
            )
            # Need trades table too for migration to work
            conn.execute(
                """
                CREATE TABLE trades (
                    trade_id TEXT PRIMARY KEY,
                    symbol TEXT,
                    action TEXT,
                    quantity INTEGER,
                    price REAL,
                    slippage REAL,
                    timestamp TIMESTAMP,
                    order_id TEXT
                )
            """
            )
            conn.execute(
                """
                CREATE TABLE positions (
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
            conn.commit()

        # Initialize trader - should migrate
        trader = PaperTrader(
            config=mock_config,
            alpaca_client=mock_alpaca,
            enable_risk_systems=False,
            enforce_market_hours=False,
        )
        _reinit_trader_db(trader, db_path)

        # Verify commission column exists
        with sqlite3.connect(db_path) as conn:
            cursor = conn.execute("PRAGMA table_info(orders)")
            columns = [row[1] for row in cursor.fetchall()]
            assert "commission" in columns
            assert "slippage" in columns

    def test_migration_preserves_existing_data(self, mock_config, mock_alpaca, db_path):
        """Migration should preserve existing order data."""
        # Create old schema with existing data - needs all tables
        with sqlite3.connect(db_path) as conn:
            conn.execute(
                """
                CREATE TABLE orders (
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
                    created_at TIMESTAMP,
                    updated_at TIMESTAMP
                )
            """
            )
            # Need trades table too for migration to work
            conn.execute(
                """
                CREATE TABLE trades (
                    trade_id TEXT PRIMARY KEY,
                    symbol TEXT,
                    action TEXT,
                    quantity INTEGER,
                    price REAL,
                    slippage REAL,
                    timestamp TIMESTAMP,
                    order_id TEXT
                )
            """
            )
            conn.execute(
                """
                CREATE TABLE positions (
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
            # Insert test order
            conn.execute(
                """
                INSERT INTO orders (order_id, symbol, action, quantity, order_type,
                                    status, filled_quantity, filled_avg_price,
                                    created_at, updated_at)
                VALUES ('test_order_1', 'AAPL', 'BUY', 100, 'MKT', 'FILLED', 100,
                        150.00, ?, ?)
            """,
                (datetime.now(), datetime.now()),
            )
            conn.commit()

        # Initialize trader - should migrate and preserve data
        trader = PaperTrader(
            config=mock_config,
            alpaca_client=mock_alpaca,
            enable_risk_systems=False,
            enforce_market_hours=False,
        )
        _reinit_trader_db(trader, db_path)

        # Verify original data is preserved
        with sqlite3.connect(db_path) as conn:
            cursor = conn.execute(
                "SELECT * FROM orders WHERE order_id = 'test_order_1'"
            )
            row = cursor.fetchone()
            assert row is not None
            # Check symbol (index 1) and quantity (index 3)
            assert row[1] == "AAPL"
            assert row[3] == 100

    def test_no_migration_needed_for_new_schema(
        self, mock_config, mock_alpaca, db_path
    ):
        """No migration should occur if schema is already current."""
        # Create current schema
        trader1 = PaperTrader(
            config=mock_config,
            alpaca_client=mock_alpaca,
            enable_risk_systems=False,
            enforce_market_hours=False,
        )
        _reinit_trader_db(trader1, db_path)

        # Get current schema
        with sqlite3.connect(db_path) as conn:
            cursor = conn.execute("PRAGMA table_info(orders)")
            original_columns = [row[1] for row in cursor.fetchall()]

        # Initialize again - should not change anything
        trader2 = PaperTrader(
            config=mock_config,
            alpaca_client=mock_alpaca,
            enable_risk_systems=False,
            enforce_market_hours=False,
        )
        _reinit_trader_db(trader2, db_path)

        # Schema should be unchanged
        with sqlite3.connect(db_path) as conn:
            cursor = conn.execute("PRAGMA table_info(orders)")
            new_columns = [row[1] for row in cursor.fetchall()]

        assert original_columns == new_columns


class TestDataIntegrity:
    """Tests for data integrity across operations."""

    @pytest.mark.asyncio
    async def test_trade_history_integrity(self, paper_trader):
        """Trade history should maintain integrity across operations."""
        # Execute multiple trades
        await paper_trader.place_market_order("AAPL", 50, "BUY", auto_stop_loss=False)
        await paper_trader.place_market_order("MSFT", 30, "BUY", auto_stop_loss=False)
        await paper_trader.place_market_order("AAPL", 20, "SELL", auto_stop_loss=False)

        # Trade history should have 3 trades
        history = paper_trader.get_trade_history()
        assert len(history) == 3

        # Trades should be in order
        trade_actions = [t["action"] for t in history]
        assert trade_actions == ["BUY", "BUY", "SELL"]

    @pytest.mark.asyncio
    async def test_cash_balance_integrity(self, paper_trader):
        """Cash balance should be consistent with trades."""
        initial_cash = paper_trader.cash

        # Buy AAPL (price ~$150)
        await paper_trader.place_market_order("AAPL", 10, "BUY", auto_stop_loss=False)

        # Cash should decrease by approximately price * quantity (plus slippage)
        expected_decrease = 10 * 150  # Approximate
        actual_decrease = initial_cash - paper_trader.cash

        # Allow for slippage variance
        assert actual_decrease > expected_decrease * 0.95
        assert actual_decrease < expected_decrease * 1.10

    @pytest.mark.asyncio
    async def test_position_update_integrity(self, paper_trader):
        """Position updates should maintain data integrity."""
        # Buy initial position
        await paper_trader.place_market_order("AAPL", 100, "BUY", auto_stop_loss=False)
        initial_avg_cost = paper_trader.get_position("AAPL")["avg_cost"]

        # Buy more at same price - avg cost should stay similar
        await paper_trader.place_market_order("AAPL", 100, "BUY", auto_stop_loss=False)
        new_avg_cost = paper_trader.get_position("AAPL")["avg_cost"]

        # Avg cost should be close (within slippage variance)
        assert abs(new_avg_cost - initial_avg_cost) < initial_avg_cost * 0.05

    @pytest.mark.asyncio
    async def test_portfolio_value_integrity(self, paper_trader):
        """Portfolio value should equal cash + position values."""
        # Place some orders
        await paper_trader.place_market_order("AAPL", 50, "BUY", auto_stop_loss=False)

        # Calculate expected portfolio value
        cash = paper_trader.cash
        position_value = sum(
            pos.get("market_value", pos["quantity"] * pos["avg_cost"])
            for pos in paper_trader.positions.values()
        )
        expected_total = cash + position_value

        # Get actual portfolio value
        actual_total = paper_trader.get_portfolio_value()

        # Should match exactly
        assert abs(actual_total - expected_total) < 0.01


class TestResetPortfolio:
    """Tests for portfolio reset functionality."""

    @pytest.mark.asyncio
    async def test_reset_clears_positions(self, paper_trader):
        """Reset should clear all positions."""
        # Add some positions
        await paper_trader.place_market_order("AAPL", 50, "BUY", auto_stop_loss=False)
        await paper_trader.place_market_order("MSFT", 30, "BUY", auto_stop_loss=False)

        assert len(paper_trader.get_positions()) == 2

        # Reset
        paper_trader.reset_portfolio()

        # Should have no positions
        assert len(paper_trader.get_positions()) == 0

    @pytest.mark.asyncio
    async def test_reset_restores_initial_cash(self, paper_trader):
        """Reset should restore initial cash balance."""
        initial_cash = paper_trader.initial_cash

        # Spend some cash
        await paper_trader.place_market_order("AAPL", 100, "BUY", auto_stop_loss=False)

        assert paper_trader.cash < initial_cash

        # Reset
        paper_trader.reset_portfolio()

        # Cash should be restored
        assert paper_trader.cash == initial_cash

    @pytest.mark.asyncio
    async def test_reset_clears_trade_history(self, paper_trader):
        """Reset should clear trade history."""
        # Add some trades
        await paper_trader.place_market_order("AAPL", 50, "BUY", auto_stop_loss=False)
        await paper_trader.place_market_order("AAPL", 25, "SELL", auto_stop_loss=False)

        assert len(paper_trader.get_trade_history()) > 0

        # Reset
        paper_trader.reset_portfolio()

        # Trade history should be empty
        assert len(paper_trader.get_trade_history()) == 0

    @pytest.mark.asyncio
    async def test_reset_clears_database(self, paper_trader, db_path):
        """Reset should clear database tables."""
        # Add some data
        await paper_trader.place_market_order("AAPL", 50, "BUY", auto_stop_loss=False)

        # Verify data exists
        with sqlite3.connect(db_path) as conn:
            cursor = conn.execute("SELECT COUNT(*) FROM trades")
            assert cursor.fetchone()[0] > 0

        # Reset
        paper_trader.reset_portfolio()

        # Database should be cleared
        with sqlite3.connect(db_path) as conn:
            cursor = conn.execute("SELECT COUNT(*) FROM positions")
            assert cursor.fetchone()[0] == 0
            cursor = conn.execute("SELECT COUNT(*) FROM orders")
            assert cursor.fetchone()[0] == 0
            cursor = conn.execute("SELECT COUNT(*) FROM trades")
            assert cursor.fetchone()[0] == 0
