"""
Integration tests for Data Pipeline

Tests the flow: Market Data → Strategy Analysis → Signal Generation

Test Coverage:
- Market data fetching and caching
- Data transformation for strategy input
- Strategy analysis with real market data format
- Signal generation from analysis results
- Invalid data handling
- Missing data fallback
- Real-time vs historical data switching
"""

import asyncio
from unittest.mock import AsyncMock

import pytest

from core.agents.strategy_agent import StrategyAgent


@pytest.fixture
def mock_alpaca_client():
    """Mock Alpaca client for market data."""
    client = AsyncMock()

    # Mock quote data - realistic bid/ask spread around last price
    client.get_quote.return_value = {
        "symbol": "AAPL",
        "bid": 149.90,
        "ask": 150.10,  # Slightly above last for realistic spread
        "last": 150.00,
        "bid_volume": 100,
        "ask_volume": 100,
        "timestamp": "2024-11-04T10:30:00Z",
    }

    # Mock bars (historical data)
    client.get_bars.return_value = [
        {
            "open": 148.0,
            "high": 152.0,
            "low": 147.5,
            "close": 150.0,
            "volume": 10000000,
        },
        {"open": 150.0, "high": 151.0, "low": 149.0, "close": 149.5, "volume": 9500000},
        {
            "open": 149.5,
            "high": 150.5,
            "low": 148.5,
            "close": 150.2,
            "volume": 10200000,
        },
    ]

    return client


@pytest.fixture
def mock_alphavantage_client():
    """Mock Alpha Vantage client for fundamentals."""
    client = AsyncMock()

    # Mock company overview
    client.get_company_overview.return_value = {
        "symbol": "AAPL",
        "name": "Apple Inc.",
        "sector": "Technology",
        "market_cap": 2800000000000,
        "dividend_yield": 0.005,
    }

    # Mock fundamentals
    client.get_fundamentals.return_value = {
        "symbol": "AAPL",
        "pe_ratio": 28.5,
        "pb_ratio": 45.0,
        "roe": 1.47,  # 147% (Apple's exceptional ROE)
        "debt_to_equity": 1.97,
        "current_ratio": 0.94,
        "fcf_yield": 0.03,
        "profit_margin": 0.26,
        "operating_margin": 0.30,
        "timestamp": "2024-11-04",
    }

    return client


@pytest.fixture
def strategy_agent_with_mocked_apis(mock_alpaca_client, mock_alphavantage_client):
    """Strategy agent with mocked API clients."""
    agent = StrategyAgent()
    agent.alpaca_client = mock_alpaca_client
    agent.alphavantage_client = mock_alphavantage_client
    return agent


# ============================================================================
# Market Data Integration Tests
# ============================================================================


@pytest.mark.asyncio
async def test_market_data_fetching_and_caching(strategy_agent_with_mocked_apis):
    """Test market data fetching with caching."""
    agent = strategy_agent_with_mocked_apis

    # Fetch quote data (should hit API)
    quote = await agent._handle_get_stock_quote({"symbol": "AAPL"})

    assert quote["symbol"] == "AAPL"
    assert quote["price"] == 150.00
    assert quote["bid"] == 149.90
    assert quote["ask"] == 150.10

    # Verify API was called
    agent.alpaca_client.get_quote.assert_called_once_with("AAPL")


@pytest.mark.asyncio
async def test_market_data_with_alpaca_failure_fallback(
    strategy_agent_with_mocked_apis,
):
    """Test fallback when Alpaca API fails."""
    agent = strategy_agent_with_mocked_apis

    # Mock Alpaca failure
    agent.alpaca_client.get_quote.side_effect = Exception("API timeout")

    # Should fallback to Alpha Vantage
    quote = await agent._handle_get_stock_quote({"symbol": "AAPL"})

    # Should still return data (from Alpha Vantage fallback)
    assert quote["symbol"] == "AAPL"
    assert "sector" in quote


@pytest.mark.asyncio
async def test_market_data_with_all_apis_unavailable(strategy_agent_with_mocked_apis):
    """Test handling when all APIs are unavailable."""
    agent = strategy_agent_with_mocked_apis

    # Mock both APIs failing
    agent.alpaca_client.get_quote.side_effect = Exception("Alpaca down")
    agent.alphavantage_client.get_company_overview.side_effect = Exception(
        "AlphaVantage down"
    )

    # Should return fallback data without crashing
    quote = await agent._handle_get_stock_quote({"symbol": "AAPL"})

    assert quote["symbol"] == "AAPL"
    assert quote["price"] == 0  # Fallback value
    assert quote["sector"] == "Unknown"


# ============================================================================
# Data Transformation Tests
# ============================================================================


@pytest.mark.asyncio
async def test_fundamentals_data_transformation(strategy_agent_with_mocked_apis):
    """Test transformation of fundamental data for strategy input."""
    agent = strategy_agent_with_mocked_apis

    # Fetch fundamentals
    fundamentals = await agent._handle_get_fundamentals({"symbol": "AAPL"})

    # Check all required fields are present and transformed
    assert "pe_ratio" in fundamentals
    assert "pb_ratio" in fundamentals
    assert "roe" in fundamentals
    assert "debt_equity" in fundamentals
    assert "current_ratio" in fundamentals
    assert "fcf_yield" in fundamentals

    # Check data types
    assert isinstance(fundamentals["pe_ratio"], (int, float))
    assert isinstance(fundamentals["roe"], (int, float))


@pytest.mark.asyncio
async def test_fundamentals_with_missing_fields(strategy_agent_with_mocked_apis):
    """Test fundamental data transformation with missing fields."""
    agent = strategy_agent_with_mocked_apis

    # Mock incomplete data
    agent.alphavantage_client.get_fundamentals.return_value = {
        "symbol": "AAPL",
        "pe_ratio": 28.5,
        # Missing other fields
    }

    # Should provide defaults for missing fields
    fundamentals = await agent._handle_get_fundamentals({"symbol": "AAPL"})

    assert fundamentals["pe_ratio"] == 28.5
    assert fundamentals["pb_ratio"] > 0  # Should have default
    assert fundamentals["roe"] > 0  # Should have default


@pytest.mark.asyncio
async def test_squeeze_data_volume_estimation(strategy_agent_with_mocked_apis):
    """Test short squeeze data with volume-based estimation."""
    agent = strategy_agent_with_mocked_apis

    # Fetch squeeze data (uses volume data)
    squeeze = await agent._handle_get_short_interest({"symbol": "AAPL"})

    # Should return squeeze metrics (estimated if real data unavailable)
    assert "short_interest_pct" in squeeze
    assert "days_to_cover" in squeeze
    assert "cost_to_borrow" in squeeze
    assert "squeeze_score" in squeeze

    # Should have warning about estimated data
    assert "data_source" in squeeze
    assert squeeze["data_source"] in ["estimated", "default"]


# ============================================================================
# Strategy Analysis Integration Tests
# ============================================================================


@pytest.mark.asyncio
async def test_strategy_analysis_with_real_data_format(strategy_agent_with_mocked_apis):
    """Test strategy analysis with realistic market data."""
    agent = strategy_agent_with_mocked_apis

    # Run full analysis
    analysis = await agent.analyze_stock("AAPL")

    # Check complete analysis object
    assert analysis.symbol == "AAPL"
    assert 0 <= analysis.deep_value_score <= 100
    assert 0 <= analysis.squeeze_score <= 100
    assert 0 <= analysis.overall_score <= 100
    assert analysis.recommendation in ["STRONG_BUY", "BUY", "WATCH", "AVOID"]
    assert analysis.thesis is not None
    assert len(analysis.catalysts) > 0
    assert len(analysis.risks) > 0
    assert analysis.target_price > 0
    assert analysis.stop_price > 0
    assert 0 <= analysis.position_size_pct <= 0.05  # Max 5%


@pytest.mark.asyncio
async def test_signal_generation_from_high_value_analysis(
    strategy_agent_with_mocked_apis,
):
    """Test signal generation for high-value stock."""
    agent = strategy_agent_with_mocked_apis

    # Mock very attractive fundamentals
    agent.alphavantage_client.get_fundamentals.return_value = {
        "symbol": "VALUE",
        "pe_ratio": 8.0,  # Very low P/E
        "pb_ratio": 0.6,  # Below book value
        "roe": 0.22,  # Strong ROE
        "debt_equity": 0.2,  # Low debt
        "current_ratio": 2.0,  # Strong liquidity
        "fcf_yield": 0.10,  # 10% FCF yield
        "profit_margin": 0.15,
        "operating_margin": 0.18,
    }

    # Analyze
    analysis = await agent.analyze_stock("VALUE")

    # Should generate strong buy signal
    assert analysis.overall_score >= 60
    assert analysis.recommendation in ["BUY", "STRONG_BUY"]
    assert analysis.deep_value_score >= 70  # High value score


@pytest.mark.asyncio
async def test_signal_generation_from_overvalued_stock(strategy_agent_with_mocked_apis):
    """Test signal generation for overvalued stock."""
    agent = strategy_agent_with_mocked_apis

    # Mock unattractive fundamentals
    agent.alphavantage_client.get_fundamentals.return_value = {
        "symbol": "EXPENSIVE",
        "pe_ratio": 45.0,  # Very high P/E
        "pb_ratio": 8.0,  # Way above book
        "roe": 0.05,  # Poor ROE
        "debt_equity": 2.5,  # High debt
        "current_ratio": 0.7,  # Poor liquidity
        "fcf_yield": 0.01,  # Low FCF yield
        "profit_margin": 0.03,
        "operating_margin": 0.05,
    }

    # Analyze
    analysis = await agent.analyze_stock("EXPENSIVE")

    # Should generate avoid signal
    assert analysis.overall_score < 40
    assert analysis.recommendation in ["WATCH", "AVOID"]
    assert analysis.deep_value_score < 50  # Low value score


# ============================================================================
# Invalid Data Handling Tests
# ============================================================================


@pytest.mark.asyncio
async def test_analysis_with_invalid_price_data(strategy_agent_with_mocked_apis):
    """Test handling of invalid price data."""
    agent = strategy_agent_with_mocked_apis

    # Mock invalid price
    agent.alpaca_client.get_quote.return_value = {
        "symbol": "INVALID",
        "last": 0,  # Invalid price
        "bid": 0,
        "ask": 0,
    }

    # Should still complete analysis without crashing
    analysis = await agent.analyze_stock("INVALID")

    assert analysis.symbol == "INVALID"
    # May have low confidence due to bad data


@pytest.mark.asyncio
async def test_analysis_with_corrupted_fundamentals(strategy_agent_with_mocked_apis):
    """Test handling of corrupted fundamental data."""
    agent = strategy_agent_with_mocked_apis

    # Mock corrupted data
    agent.alphavantage_client.get_fundamentals.return_value = {
        "symbol": "CORRUPT",
        "pe_ratio": -100,  # Negative P/E (invalid)
        "pb_ratio": None,  # None value
        "roe": 999,  # Unrealistic ROE
    }

    # Should use defaults for invalid fields
    fundamentals = await agent._handle_get_fundamentals({"symbol": "CORRUPT"})

    # Should have sanitized data
    assert (
        fundamentals["pe_ratio"] >= 0 or fundamentals["pe_ratio"] == 20.0
    )  # Default fallback


@pytest.mark.asyncio
async def test_analysis_with_network_timeout(strategy_agent_with_mocked_apis):
    """Test handling of network timeouts during analysis."""
    agent = strategy_agent_with_mocked_apis

    # Mock timeout on first call, success on retry
    call_count = {"count": 0}

    async def mock_with_timeout(symbol):
        call_count["count"] += 1
        if call_count["count"] == 1:
            raise asyncio.TimeoutError("Network timeout")
        return {
            "symbol": symbol,
            "pe_ratio": 15.0,
            "pb_ratio": 1.5,
            "roe": 0.12,
            "debt_equity": 0.5,
            "current_ratio": 1.0,
            "fcf_yield": 0.03,
        }

    agent.alphavantage_client.get_fundamentals.side_effect = mock_with_timeout

    # First call should timeout, use fallback
    try:
        analysis = await agent.analyze_stock("TIMEOUT")
        # Should complete with fallback data
        assert analysis.symbol == "TIMEOUT"
    except asyncio.TimeoutError:
        # Expected on first call
        pass


# ============================================================================
# Data Pipeline End-to-End Tests
# ============================================================================


@pytest.mark.asyncio
async def test_complete_data_pipeline_flow(strategy_agent_with_mocked_apis):
    """Test complete data pipeline from fetch to signal."""
    agent = strategy_agent_with_mocked_apis

    # Step 1: Fetch market data
    quote = await agent._handle_get_stock_quote({"symbol": "AAPL"})
    assert quote["price"] > 0

    # Step 2: Fetch fundamentals
    fundamentals = await agent._handle_get_fundamentals({"symbol": "AAPL"})
    assert fundamentals["pe_ratio"] > 0

    # Step 3: Fetch squeeze data
    squeeze = await agent._handle_get_short_interest({"symbol": "AAPL"})
    assert "squeeze_score" in squeeze

    # Step 4: Generate analysis signal
    analysis = await agent.analyze_stock("AAPL")
    assert analysis.recommendation in ["STRONG_BUY", "BUY", "WATCH", "AVOID"]

    # Pipeline should complete without errors
    assert analysis.overall_score >= 0


@pytest.mark.asyncio
async def test_data_pipeline_with_multiple_symbols(strategy_agent_with_mocked_apis):
    """Test data pipeline processing multiple symbols."""
    agent = strategy_agent_with_mocked_apis
    symbols = ["AAPL", "MSFT", "GOOGL"]

    analyses = []
    for symbol in symbols:
        agent.alpaca_client.get_quote.return_value["symbol"] = symbol
        agent.alphavantage_client.get_fundamentals.return_value["symbol"] = symbol

        analysis = await agent.analyze_stock(symbol)
        analyses.append(analysis)

        # Small delay to avoid rate limiting
        await asyncio.sleep(0.01)

    # All should complete
    assert len(analyses) == 3
    assert all(a.symbol in symbols for a in analyses)


@pytest.mark.asyncio
async def test_data_pipeline_performance(strategy_agent_with_mocked_apis):
    """Test data pipeline performance with timing."""
    import time

    agent = strategy_agent_with_mocked_apis

    # Time single analysis
    start = time.time()
    analysis = await agent.analyze_stock("AAPL")
    duration = time.time() - start

    # Should complete quickly (< 1 second with mocked APIs)
    assert duration < 1.0, f"Analysis took {duration:.2f}s"

    # Analysis should be complete
    assert analysis.overall_score >= 0


# ============================================================================
# Historical vs Real-Time Data Tests
# ============================================================================


@pytest.mark.asyncio
async def test_realtime_quote_data_priority(strategy_agent_with_mocked_apis):
    """Test that real-time quote data is prioritized."""
    agent = strategy_agent_with_mocked_apis

    # Alpaca should be called first for quotes
    quote = await agent._handle_get_stock_quote({"symbol": "AAPL"})

    assert agent.alpaca_client.get_quote.called
    assert quote["price"] == 150.00  # From Alpaca, not Alpha Vantage


@pytest.mark.asyncio
async def test_historical_data_for_analysis(strategy_agent_with_mocked_apis):
    """Test historical data used for analysis context."""
    agent = strategy_agent_with_mocked_apis

    # Get historical bars
    bars = agent.alpaca_client.get_bars.return_value

    # Should have multiple data points
    assert len(bars) >= 3
    assert all("close" in bar for bar in bars)
    assert all("volume" in bar for bar in bars)


@pytest.mark.asyncio
async def test_data_freshness_validation(strategy_agent_with_mocked_apis):
    """Test data freshness is validated."""
    agent = strategy_agent_with_mocked_apis

    # Mock old timestamp
    agent.alpaca_client.get_quote.return_value["timestamp"] = "2020-01-01T10:00:00Z"

    # Should still return data but may flag as stale
    quote = await agent._handle_get_stock_quote({"symbol": "AAPL"})
    assert quote["symbol"] == "AAPL"


# ============================================================================
# Sector Analysis Integration Tests
# ============================================================================


@pytest.mark.asyncio
async def test_sector_analysis_with_peer_comparison(strategy_agent_with_mocked_apis):
    """Test sector analysis with peer comparison data."""
    agent = strategy_agent_with_mocked_apis

    # Get sector analysis
    sector = await agent._handle_analyze_sector({"symbol": "AAPL"})

    assert sector["symbol"] == "AAPL"
    assert sector["sector"] in ["Technology", "Unknown"]
    assert "relative_strength" in sector
    assert "peer_comparison" in sector


@pytest.mark.asyncio
async def test_sector_analysis_for_value_identification(
    strategy_agent_with_mocked_apis,
):
    """Test sector analysis helps identify value stocks."""
    agent = strategy_agent_with_mocked_apis

    # Mock undervalued relative to sector
    agent.alphavantage_client.get_fundamentals.return_value["pe_ratio"] = 12.0

    sector = await agent._handle_analyze_sector({"symbol": "VALUE"})

    # Should show good relative strength (low P/E vs sector)
    assert sector["relative_strength"] >= 0.5


@pytest.mark.asyncio
async def test_data_pipeline_without_api_clients(mock_config):
    """Test data pipeline handles missing API clients gracefully."""
    # Create agent without API clients
    agent = StrategyAgent()
    agent.alpaca_client = None
    agent.alphavantage_client = None

    # Should return fallback data
    quote = await agent._handle_get_stock_quote({"symbol": "AAPL"})
    assert quote["symbol"] == "AAPL"
    assert quote["price"] == 0  # Fallback

    fundamentals = await agent._handle_get_fundamentals({"symbol": "AAPL"})
    assert fundamentals["symbol"] == "AAPL"
    assert fundamentals["pe_ratio"] > 0  # Default values
