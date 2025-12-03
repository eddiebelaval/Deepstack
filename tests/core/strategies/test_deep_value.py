from unittest.mock import AsyncMock

import pytest

from core.strategies.deep_value import DeepValueStrategy


@pytest.mark.asyncio
async def test_deep_value_screen_high_score():
    # Mock client
    mock_client = AsyncMock()
    mock_client.get_fundamentals.return_value = {
        "pe_ratio": 8.0,
        "pb_ratio": 0.6,
        "ev_ebitda": 5.0,
        "fcf_yield": 0.12,
        "debt_to_equity": 0.5,
        "current_ratio": 2.0,
        "roe": 0.20,
    }

    strategy = DeepValueStrategy(client=mock_client)

    # Test screen_market
    opportunities = await strategy.screen_market(["TEST"])

    assert len(opportunities) == 1
    opp = opportunities[0]
    assert opp.value_score > 80
    assert opp.conviction == "HIGH"
    assert "Deep discount to book value" in opp.thesis[0]


@pytest.mark.asyncio
async def test_deep_value_screen_low_score():
    # Mock client
    mock_client = AsyncMock()
    mock_client.get_fundamentals.return_value = {
        "pe_ratio": 50.0,
        "pb_ratio": 5.0,
        "ev_ebitda": 20.0,
        "fcf_yield": 0.01,
        "debt_to_equity": 2.0,
        "current_ratio": 0.5,
        "roe": 0.05,
    }

    strategy = DeepValueStrategy(client=mock_client)

    opportunities = await strategy.screen_market(["BAD"])

    # Should not return opportunity because score < 50
    assert len(opportunities) == 0
