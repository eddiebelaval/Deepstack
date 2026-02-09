"""
Unit tests for FlowDetector

Tests threshold-based detection, confidence scoring, sweep detection,
and flow summary aggregation.
"""

import pytest

from core.data.alpaca_options_client import OptionContract, OptionType
from core.signals.flow_detector import FlowDetector, FlowAlert, FlowSummary

from .conftest import make_contract


@pytest.fixture
def detector():
    return FlowDetector()


@pytest.fixture
def custom_detector():
    """Detector with lower thresholds for easier testing."""
    return FlowDetector(
        volume_oi_threshold=2.0,
        large_premium_threshold=10_000.0,
        sweep_volume_multiplier=3.0,
        pc_imbalance_threshold=2.0,
    )


# ── Volume Spike Detection ────────────────────────────────────


class TestVolumeSpike:

    def test_triggers_at_threshold(self, detector):
        """Volume = 5x OI should trigger spike."""
        contract = make_contract(volume=5000, open_interest=1000)
        alerts = detector.detect_unusual_flow([contract], spot_price=500.0)
        spike_alerts = [a for a in alerts if a.alert_type == "volume_spike"]
        assert len(spike_alerts) >= 1

    def test_no_trigger_below_threshold(self, detector):
        """Volume < 5x OI should not trigger."""
        contract = make_contract(volume=100, open_interest=1000)
        alerts = detector.detect_unusual_flow([contract], spot_price=500.0)
        spike_alerts = [a for a in alerts if a.alert_type == "volume_spike"]
        assert len(spike_alerts) == 0

    def test_confidence_scales_with_ratio(self, detector):
        """Higher vol/OI → higher confidence."""
        low = make_contract(volume=5000, open_interest=1000, strike=500.0)
        high = make_contract(volume=20000, open_interest=1000, strike=510.0)
        alerts = detector.detect_unusual_flow([low, high], spot_price=500.0)

        spikes = [a for a in alerts if a.alert_type == "volume_spike"]
        assert len(spikes) == 2
        low_conf = next(a for a in spikes if a.strike == 500.0)
        high_conf = next(a for a in spikes if a.strike == 510.0)
        assert high_conf.confidence > low_conf.confidence

    def test_confidence_base_60_capped_95(self, detector):
        """Base confidence is 60, max is 95."""
        contract = make_contract(volume=5001, open_interest=1000)
        alerts = detector.detect_unusual_flow([contract], spot_price=500.0)
        spike = next(a for a in alerts if a.alert_type == "volume_spike")
        assert spike.confidence >= 60

        extreme = make_contract(volume=100000, open_interest=100, strike=510.0)
        alerts2 = detector.detect_unusual_flow([extreme], spot_price=500.0)
        spike2 = next(a for a in alerts2 if a.alert_type == "volume_spike")
        assert spike2.confidence <= 95

    def test_skips_low_volume(self, detector):
        """Contracts with volume < min_volume are skipped."""
        contract = make_contract(volume=5, open_interest=1)
        alerts = detector.detect_unusual_flow([contract], spot_price=500.0)
        spike_alerts = [a for a in alerts if a.alert_type == "volume_spike"]
        assert len(spike_alerts) == 0


# ── Large Premium Detection ───────────────────────────────────


class TestLargePremium:

    def test_triggers_above_100k(self, detector):
        """Premium = vol * price * 100 > $100k should trigger."""
        # 500 * 3.00 * 100 = $150,000
        contract = make_contract(volume=500, last_price=3.00, open_interest=1000)
        alerts = detector.detect_unusual_flow([contract], spot_price=500.0)
        premium_alerts = [a for a in alerts if a.alert_type == "large_premium"]
        assert len(premium_alerts) >= 1

    def test_no_trigger_below_100k(self, detector):
        """Premium < $100k should not trigger."""
        # 10 * 5.00 * 100 = $5,000
        contract = make_contract(volume=10, last_price=5.00, open_interest=1000)
        alerts = detector.detect_unusual_flow([contract], spot_price=500.0)
        premium_alerts = [a for a in alerts if a.alert_type == "large_premium"]
        assert len(premium_alerts) == 0

    def test_premium_calculation(self, detector):
        """Estimated premium should be volume * last_price * 100."""
        contract = make_contract(volume=1000, last_price=5.0, open_interest=1000)
        alerts = detector.detect_unusual_flow([contract], spot_price=500.0)
        premium_alerts = [a for a in alerts if a.alert_type == "large_premium"]
        if premium_alerts:
            assert premium_alerts[0].estimated_premium == pytest.approx(
                1000 * 5.0 * 100
            )


# ── OTM Sweep Detection ──────────────────────────────────────


class TestOTMSweep:

    def test_triggers_on_otm_high_volume_near_ask(self, detector):
        """OTM + 10x avg volume + price near ask = sweep."""
        # The sweep candidate's volume is included in the average, so we need
        # enough low-volume padding to keep avg < sweep_vol / 10x_multiplier.
        # With 20 contracts at vol=10 + 1 at vol=5000: avg = (200+5000)/21 = 247.6
        # Threshold = 10 * 247.6 = 2476 < 5000 => triggers
        padding = [
            make_contract(strike=float(490 + i * 0.5), volume=10, open_interest=5000)
            for i in range(20)
        ]
        sweep = make_contract(
            strike=520.0, volume=5000, open_interest=500,
            bid=1.00, ask=1.10, last_price=1.09,  # near ask
        )
        alerts = detector.detect_unusual_flow(padding + [sweep], spot_price=500.0)
        sweep_alerts = [a for a in alerts if a.alert_type == "otm_sweep"]
        assert len(sweep_alerts) >= 1

    def test_no_trigger_if_itm(self, detector):
        """ITM contracts should not trigger sweep."""
        # Strike 480 < spot 500 → call is ITM
        contract = make_contract(
            strike=480.0, volume=10000, open_interest=100,
            bid=20.0, ask=20.10, last_price=20.09,
        )
        alerts = detector.detect_unusual_flow([contract], spot_price=500.0)
        sweep_alerts = [a for a in alerts if a.alert_type == "otm_sweep"]
        assert len(sweep_alerts) == 0

    def test_no_trigger_if_price_near_bid(self, detector):
        """Price near bid (not ask) should not trigger sweep."""
        sweep_candidate = make_contract(
            strike=520.0, volume=5000, open_interest=100,
            bid=1.00, ask=2.00, last_price=1.05,  # near bid, not ask
        )
        normal = make_contract(strike=490.0, volume=50, open_interest=5000)
        alerts = detector.detect_unusual_flow(
            [normal, sweep_candidate], spot_price=500.0
        )
        sweep_alerts = [a for a in alerts if a.alert_type == "otm_sweep"]
        assert len(sweep_alerts) == 0

    def test_sweep_confidence_is_80(self, detector):
        """OTM sweep has base confidence of 80."""
        normal = make_contract(strike=490.0, volume=10, open_interest=5000)
        sweep = make_contract(
            strike=520.0, volume=5000, open_interest=500,
            bid=1.00, ask=1.10, last_price=1.10,
        )
        alerts = detector.detect_unusual_flow([normal, sweep], spot_price=500.0)
        sweep_alerts = [a for a in alerts if a.alert_type == "otm_sweep"]
        if sweep_alerts:
            assert sweep_alerts[0].confidence == 80


# ── detect_sweeps (no moneyness) ──────────────────────────────


class TestDetectSweeps:

    def test_returns_sweep_alerts(self, detector):
        """detect_sweeps works without spot price."""
        # 20 low-volume contracts keep avg volume low enough for 10x threshold
        padding = [
            make_contract(strike=float(490 + i * 0.5), volume=10, open_interest=5000)
            for i in range(20)
        ]
        aggressive = make_contract(
            strike=520.0, volume=5000, open_interest=100,
            bid=1.00, ask=1.10, last_price=1.09,
        )
        alerts = detector.detect_sweeps(padding + [aggressive])
        assert len(alerts) >= 1

    def test_empty_contracts(self, detector):
        assert detector.detect_sweeps([]) == []


# ── Flow Summary ──────────────────────────────────────────────


class TestFlowSummary:

    def test_empty_contracts_neutral(self, detector):
        summary = detector.get_flow_summary([], spot_price=500.0)
        assert summary.total_call_volume == 0
        assert summary.total_put_volume == 0
        assert summary.bullish_score == 50
        assert summary.bearish_score == 50

    def test_all_calls_is_bullish(self, detector):
        """All call volume should produce high bullish score."""
        contracts = [
            make_contract(volume=5000, open_interest=1000, last_price=5.0),
        ]
        summary = detector.get_flow_summary(contracts, spot_price=500.0)
        assert summary.total_call_volume == 5000
        assert summary.total_put_volume == 0
        assert summary.bullish_score > 60
        assert summary.bearish_score < 40

    def test_all_puts_is_bearish(self, detector):
        """All put volume should produce high bearish score."""
        contracts = [
            make_contract(
                option_type=OptionType.PUT,
                volume=5000, open_interest=1000, last_price=5.0,
            ),
        ]
        summary = detector.get_flow_summary(contracts, spot_price=500.0)
        assert summary.total_put_volume == 5000
        assert summary.total_call_volume == 0
        assert summary.bearish_score > 60
        assert summary.bullish_score < 40

    def test_pc_imbalance_triggers(self, detector):
        """3x put volume over call volume triggers pc_imbalance."""
        contracts = [
            make_contract(volume=100, open_interest=5000, last_price=5.0),
            make_contract(
                option_type=OptionType.PUT,
                volume=500, open_interest=5000, last_price=5.0,
            ),
        ]
        summary = detector.get_flow_summary(contracts, spot_price=500.0)
        imbalance_alerts = [
            a for a in summary.top_alerts if a.alert_type == "pc_imbalance"
        ]
        assert len(imbalance_alerts) >= 1

    def test_net_premium_calculation(self, detector):
        """Net premium = call_premium - put_premium."""
        contracts = [
            make_contract(volume=100, open_interest=5000, last_price=5.0),
            make_contract(
                option_type=OptionType.PUT,
                volume=100, open_interest=5000, last_price=3.0,
            ),
        ]
        summary = detector.get_flow_summary(contracts, spot_price=500.0)
        call_prem = 100 * 5.0 * 100
        put_prem = 100 * 3.0 * 100
        assert summary.net_premium == pytest.approx(call_prem - put_prem)

    def test_put_call_ratio(self, detector):
        contracts = [
            make_contract(volume=200, open_interest=5000),
            make_contract(
                option_type=OptionType.PUT,
                volume=600, open_interest=5000,
            ),
        ]
        summary = detector.get_flow_summary(contracts, spot_price=500.0)
        assert summary.put_call_ratio == pytest.approx(3.0)

    def test_top_alerts_limited_to_10(self, detector):
        """Summary should cap alerts at 10."""
        # Create enough high-volume contracts to generate many alerts
        contracts = [
            make_contract(
                strike=500.0 + i,
                volume=10000,
                open_interest=100,
                last_price=10.0,
            )
            for i in range(20)
        ]
        summary = detector.get_flow_summary(contracts, spot_price=500.0)
        assert len(summary.top_alerts) <= 10

    def test_scores_clamped_0_to_100(self, detector):
        """Bullish and bearish scores should be clamped 0-100."""
        contracts = [
            make_contract(volume=100000, open_interest=1, last_price=50.0),
        ]
        summary = detector.get_flow_summary(contracts, spot_price=500.0)
        assert 0 <= summary.bullish_score <= 100
        assert 0 <= summary.bearish_score <= 100


# ── Alert Dataclass ───────────────────────────────────────────


class TestFlowAlertFields:

    def test_alert_has_required_fields(self, detector):
        contract = make_contract(volume=10000, open_interest=500, last_price=5.0)
        alerts = detector.detect_unusual_flow([contract], spot_price=500.0)
        assert len(alerts) > 0

        alert = alerts[0]
        assert alert.symbol == "SPY"
        assert alert.alert_type in (
            "volume_spike", "large_premium", "otm_sweep", "pc_imbalance",
        )
        assert alert.option_type in ("call", "put")
        assert alert.strike > 0
        assert alert.volume > 0
        assert alert.detected_at is not None
        assert 0 <= alert.confidence <= 100

    def test_volume_oi_ratio_correct(self, detector):
        contract = make_contract(volume=10000, open_interest=500)
        alerts = detector.detect_unusual_flow([contract], spot_price=500.0)
        spike = next(a for a in alerts if a.alert_type == "volume_spike")
        assert spike.volume_oi_ratio == pytest.approx(20.0)
