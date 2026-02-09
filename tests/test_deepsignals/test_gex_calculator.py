"""
Unit tests for GEXCalculator

Tests GEX formula, key levels, flip point, and edge cases.
"""

import pytest

from core.data.alpaca_options_client import OptionContract, OptionType
from core.signals.gex_calculator import GEXCalculator, GEXData, GEXLevels, TotalGEX

from .conftest import make_contract


# ── Fixtures ──────────────────────────────────────────────────


@pytest.fixture
def calc():
    return GEXCalculator()


# ── GEX Formula Tests ─────────────────────────────────────────


class TestCalculateGexByStrike:
    """Test per-strike GEX calculation."""

    def test_single_call_gex_formula(self, calc):
        """Call GEX = gamma * OI * 100 * spot (positive)."""
        contract = make_contract(
            strike=500.0, gamma=0.05, open_interest=1000
        )
        result = calc.calculate_gex_by_strike([contract], spot_price=500.0)

        assert 500.0 in result
        gex = result[500.0]
        expected = 0.05 * 1000 * 100 * 500.0  # 250,000
        assert gex.call_gex == pytest.approx(expected)
        assert gex.put_gex == 0.0
        assert gex.total_gex == pytest.approx(expected)

    def test_single_put_gex_formula(self, calc):
        """Put GEX = gamma * OI * 100 * spot * -1 (negative)."""
        contract = make_contract(
            option_type=OptionType.PUT,
            strike=480.0, gamma=0.04, open_interest=2000,
        )
        result = calc.calculate_gex_by_strike([contract], spot_price=500.0)

        assert 480.0 in result
        gex = result[480.0]
        expected_put = 0.04 * 2000 * 100 * 500.0 * -1  # -400,000
        assert gex.put_gex == pytest.approx(expected_put)
        assert gex.call_gex == 0.0
        assert gex.total_gex == pytest.approx(expected_put)

    def test_call_and_put_same_strike(self, calc):
        """Call + Put at same strike should net out."""
        contracts = [
            make_contract(strike=500.0, gamma=0.05, open_interest=1000),
            make_contract(
                option_type=OptionType.PUT,
                strike=500.0, gamma=0.05, open_interest=1000,
            ),
        ]
        result = calc.calculate_gex_by_strike(contracts, spot_price=500.0)

        gex = result[500.0]
        call_gex = 0.05 * 1000 * 100 * 500.0
        put_gex = -call_gex
        assert gex.total_gex == pytest.approx(call_gex + put_gex)
        assert gex.total_gex == pytest.approx(0.0)

    def test_multiple_strikes_sorted(self, calc, mixed_chain):
        """Output should have strikes in ascending order."""
        result = calc.calculate_gex_by_strike(mixed_chain, spot_price=500.0)
        strikes = list(result.keys())
        assert strikes == sorted(strikes)

    def test_tracks_oi_by_type(self, calc):
        """call_oi and put_oi should be tracked separately."""
        contracts = [
            make_contract(strike=500.0, gamma=0.05, open_interest=1000),
            make_contract(
                option_type=OptionType.PUT,
                strike=500.0, gamma=0.05, open_interest=2000,
            ),
        ]
        result = calc.calculate_gex_by_strike(contracts, spot_price=500.0)
        assert result[500.0].call_oi == 1000
        assert result[500.0].put_oi == 2000


class TestEdgeCases:
    """Test edge cases and invalid inputs."""

    def test_empty_contracts(self, calc):
        result = calc.calculate_gex_by_strike([], spot_price=500.0)
        assert result == {}

    def test_zero_spot_price(self, calc):
        contract = make_contract()
        result = calc.calculate_gex_by_strike([contract], spot_price=0.0)
        assert result == {}

    def test_negative_spot_price(self, calc):
        contract = make_contract()
        result = calc.calculate_gex_by_strike([contract], spot_price=-100.0)
        assert result == {}

    def test_contract_with_no_gamma(self, calc):
        """Contracts with gamma=None or gamma=0 should be skipped."""
        contracts = [
            make_contract(strike=500.0, gamma=None),
            make_contract(strike=510.0, gamma=0),
            make_contract(strike=520.0, gamma=0.05, open_interest=1000),
        ]
        result = calc.calculate_gex_by_strike(contracts, spot_price=500.0)
        assert 500.0 not in result
        assert 510.0 not in result
        assert 520.0 in result

    def test_contract_with_no_oi(self, calc):
        """Contracts with OI=None or OI=0 should be skipped."""
        contracts = [
            make_contract(strike=500.0, open_interest=None),
            make_contract(strike=510.0, open_interest=0),
            make_contract(strike=520.0, gamma=0.05, open_interest=100),
        ]
        result = calc.calculate_gex_by_strike(contracts, spot_price=500.0)
        assert 500.0 not in result
        assert 510.0 not in result
        assert 520.0 in result


# ── Key Levels Tests ──────────────────────────────────────────


class TestGetKeyLevels:
    """Test max gamma, put wall, call wall identification."""

    def test_max_gamma_is_highest_absolute_gex(self, calc, mixed_chain):
        gex_by_strike = calc.calculate_gex_by_strike(mixed_chain, spot_price=500.0)
        levels = calc.get_key_levels(gex_by_strike)

        # Find expected max gamma manually
        expected = max(gex_by_strike.values(), key=lambda g: abs(g.total_gex))
        assert levels.max_gamma_strike == expected.strike

    def test_call_wall_is_most_positive(self, calc, mixed_chain):
        gex_by_strike = calc.calculate_gex_by_strike(mixed_chain, spot_price=500.0)
        levels = calc.get_key_levels(gex_by_strike)

        expected = max(gex_by_strike.values(), key=lambda g: g.total_gex)
        assert levels.call_wall == expected.strike

    def test_put_wall_is_most_negative(self, calc, mixed_chain):
        gex_by_strike = calc.calculate_gex_by_strike(mixed_chain, spot_price=500.0)
        levels = calc.get_key_levels(gex_by_strike)

        expected = min(gex_by_strike.values(), key=lambda g: g.total_gex)
        assert levels.put_wall == expected.strike

    def test_empty_raises_value_error(self, calc):
        with pytest.raises(ValueError, match="No GEX data"):
            calc.get_key_levels({})


# ── Flip Point Tests ──────────────────────────────────────────


class TestFindGexFlipPoint:
    """Test GEX zero-crossing interpolation."""

    def test_sign_change_interpolation(self, calc):
        """Should interpolate between strikes where GEX changes sign."""
        gex_data = {
            490.0: GEXData(strike=490.0, call_gex=0, put_gex=-200000,
                           total_gex=-200000, call_oi=0, put_oi=0),
            500.0: GEXData(strike=500.0, call_gex=300000, put_gex=0,
                           total_gex=300000, call_oi=0, put_oi=0),
        }
        flip = calc.find_gex_flip_point(gex_data)
        assert flip is not None
        # -200000 to +300000: ratio = 200000/500000 = 0.4
        # flip = 490 + 0.4 * 10 = 494.0
        assert flip == pytest.approx(494.0)

    def test_no_sign_change(self, calc):
        """All positive GEX should return None."""
        gex_data = {
            490.0: GEXData(strike=490.0, call_gex=100000, put_gex=0,
                           total_gex=100000, call_oi=0, put_oi=0),
            500.0: GEXData(strike=500.0, call_gex=200000, put_gex=0,
                           total_gex=200000, call_oi=0, put_oi=0),
        }
        assert calc.find_gex_flip_point(gex_data) is None

    def test_empty_returns_none(self, calc):
        assert calc.find_gex_flip_point({}) is None

    def test_single_strike_returns_none(self, calc):
        gex_data = {
            500.0: GEXData(strike=500.0, call_gex=100000, put_gex=0,
                           total_gex=100000, call_oi=0, put_oi=0),
        }
        assert calc.find_gex_flip_point(gex_data) is None

    def test_multiple_crossings_returns_closest_to_mid(self, calc):
        """With multiple zero-crossings, return the one closest to mid-range."""
        gex_data = {
            480.0: GEXData(strike=480.0, call_gex=0, put_gex=-100,
                           total_gex=-100, call_oi=0, put_oi=0),
            490.0: GEXData(strike=490.0, call_gex=100, put_gex=0,
                           total_gex=100, call_oi=0, put_oi=0),
            500.0: GEXData(strike=500.0, call_gex=0, put_gex=-100,
                           total_gex=-100, call_oi=0, put_oi=0),
            510.0: GEXData(strike=510.0, call_gex=100, put_gex=0,
                           total_gex=100, call_oi=0, put_oi=0),
        }
        flip = calc.find_gex_flip_point(gex_data)
        # Mid-range = (480+510)/2 = 495
        # Crossing 1: between 480-490 = ~485
        # Crossing 2: between 490-500 = ~495
        # Crossing 3: between 500-510 = ~505
        # Closest to 495 = crossing 2
        assert flip is not None
        assert 490.0 <= flip <= 500.0


# ── Total GEX / Regime Tests ─────────────────────────────────


class TestCalculateTotalGex:
    """Test the main entry point."""

    def test_long_gamma_regime(self, calc):
        """Net positive GEX → long_gamma."""
        contracts = [
            make_contract(strike=500.0, gamma=0.08, open_interest=5000),
        ]
        result = calc.calculate_total_gex(contracts, spot_price=500.0)
        assert result.total_gex > 0
        assert result.regime == "long_gamma"

    def test_short_gamma_regime(self, calc):
        """Net negative GEX → short_gamma."""
        contracts = [
            make_contract(
                option_type=OptionType.PUT,
                strike=500.0, gamma=0.08, open_interest=5000,
            ),
        ]
        result = calc.calculate_total_gex(contracts, spot_price=500.0)
        assert result.total_gex < 0
        assert result.regime == "short_gamma"

    def test_empty_contracts_returns_defaults(self, calc):
        result = calc.calculate_total_gex([], spot_price=500.0)
        assert result.total_gex == 0.0
        assert result.regime == "short_gamma"
        assert result.flip_point is None
        assert result.max_gamma_strike == 0.0

    def test_returns_levels(self, calc, mixed_chain):
        result = calc.calculate_total_gex(mixed_chain, spot_price=500.0)
        assert result.max_gamma_strike > 0
        assert result.put_wall > 0
        assert result.call_wall > 0
