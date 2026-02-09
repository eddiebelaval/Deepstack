"""
Shared fixtures for DeepSignals test suite.
"""

from datetime import date
from typing import List, Optional

import pytest

from core.data.alpaca_options_client import OptionContract, OptionType


def make_contract(
    underlying: str = "SPY",
    option_type: OptionType = OptionType.CALL,
    strike: float = 500.0,
    volume: int = 100,
    open_interest: int = 1000,
    last_price: float = 5.0,
    bid: float = 4.90,
    ask: float = 5.10,
    gamma: float = 0.05,
    delta: float = 0.50,
    implied_volatility: float = 0.25,
    expiration_date: Optional[date] = None,
) -> OptionContract:
    """Factory for building OptionContract test fixtures."""
    exp = expiration_date or date(2026, 3, 20)
    type_char = "C" if option_type == OptionType.CALL else "P"
    strike_int = int(strike * 1000)
    occ = f"{underlying}{exp.strftime('%y%m%d')}{type_char}{strike_int:08d}"

    return OptionContract(
        symbol=occ,
        underlying_symbol=underlying,
        option_type=option_type,
        strike_price=strike,
        expiration_date=exp,
        bid=bid,
        ask=ask,
        last_price=last_price,
        volume=volume,
        open_interest=open_interest,
        gamma=gamma,
        delta=delta,
        implied_volatility=implied_volatility,
    )


@pytest.fixture
def spy_call() -> OptionContract:
    """Standard SPY call contract."""
    return make_contract()


@pytest.fixture
def spy_put() -> OptionContract:
    """Standard SPY put contract."""
    return make_contract(option_type=OptionType.PUT, strike=480.0, delta=-0.30)


@pytest.fixture
def high_volume_call() -> OptionContract:
    """Call with high volume relative to OI (10x)."""
    return make_contract(
        volume=10000,
        open_interest=500,
        last_price=3.50,
        bid=3.40,
        ask=3.50,  # price at ask
    )


@pytest.fixture
def large_premium_call() -> OptionContract:
    """Call with > $100k estimated premium."""
    return make_contract(
        volume=5000,
        open_interest=2000,
        last_price=8.00,
        bid=7.90,
        ask=8.10,
    )


@pytest.fixture
def mixed_chain() -> List[OptionContract]:
    """Mixed options chain with various strikes and types."""
    return [
        # Calls
        make_contract(strike=480.0, volume=200, open_interest=5000, gamma=0.03),
        make_contract(strike=490.0, volume=500, open_interest=8000, gamma=0.06),
        make_contract(strike=500.0, volume=1000, open_interest=10000, gamma=0.08),
        make_contract(strike=510.0, volume=300, open_interest=4000, gamma=0.04),
        make_contract(strike=520.0, volume=100, open_interest=2000, gamma=0.02),
        # Puts
        make_contract(
            option_type=OptionType.PUT,
            strike=480.0, volume=800, open_interest=6000, gamma=0.04,
        ),
        make_contract(
            option_type=OptionType.PUT,
            strike=490.0, volume=600, open_interest=7000, gamma=0.06,
        ),
        make_contract(
            option_type=OptionType.PUT,
            strike=500.0, volume=400, open_interest=5000, gamma=0.07,
        ),
        make_contract(
            option_type=OptionType.PUT,
            strike=510.0, volume=200, open_interest=3000, gamma=0.03,
        ),
        make_contract(
            option_type=OptionType.PUT,
            strike=520.0, volume=100, open_interest=1000, gamma=0.01,
        ),
    ]
