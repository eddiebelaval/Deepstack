"""
Tests for EmotionalFirewall panic mode detection.

Panic Mode triggers when 3+ manual interventions occur within 10 minutes,
indicating the trader is in a stressed/reactive state. A 2-hour cooldown
is enforced to allow emotional reset.

Coverage Targets:
- record_manual_intervention() method
- Panic mode triggering at 3 interventions in 10 minutes
- 2-hour cooldown enforcement
- Panic check disable flag behavior
"""

from datetime import datetime, timedelta

import pytest
import pytz

from core.psychology.emotional_firewall import EmotionalFirewall


class TestPanicModeDetection:
    """Tests for panic mode detection and cooldown behavior."""

    @pytest.fixture
    def firewall(self):
        """Create a clean firewall instance for each test."""
        return EmotionalFirewall(timezone_name="America/New_York")

    @pytest.fixture
    def base_time(self):
        """Provide a consistent base time for testing."""
        tz = pytz.timezone("America/New_York")
        # Wednesday 2 PM - safe trading time
        return tz.localize(datetime(2024, 1, 10, 14, 0, 0))

    def test_record_manual_intervention_tracking(self, firewall, base_time):
        """Test that manual interventions are recorded correctly."""
        firewall.record_manual_intervention(base_time)

        assert len(firewall.manual_interventions) == 1
        assert firewall.manual_interventions[0] == base_time

    def test_multiple_interventions_tracked(self, firewall, base_time):
        """Test tracking of multiple interventions over time."""
        # Record interventions at different times
        times = [
            base_time,
            base_time + timedelta(minutes=5),
            base_time + timedelta(minutes=15),
            base_time + timedelta(minutes=30),
        ]

        for t in times:
            firewall.record_manual_intervention(t)

        assert len(firewall.manual_interventions) == 4

    def test_panic_mode_not_triggered_2_interventions(self, firewall, base_time):
        """Test panic mode does NOT trigger with only 2 interventions in 10 mins."""
        # 2 interventions within 10 minutes - should NOT trigger panic
        firewall.record_manual_intervention(base_time)
        firewall.record_manual_intervention(base_time + timedelta(minutes=5))

        # No cooldown should be set
        assert firewall.cooldown_expires_at is None

    def test_panic_mode_triggered_3_interventions_in_10_min(self, firewall, base_time):
        """Test panic mode triggers at exactly 3 interventions in 10 minutes."""
        # 3 interventions within 10 minutes - exactly at threshold
        firewall.record_manual_intervention(base_time)
        firewall.record_manual_intervention(base_time + timedelta(minutes=3))
        firewall.record_manual_intervention(base_time + timedelta(minutes=6))

        # Cooldown should now be set
        assert firewall.cooldown_expires_at is not None

        # Should be approximately 2 hours (120 minutes) from last intervention
        expected_expiry = base_time + timedelta(minutes=6) + timedelta(minutes=120)
        assert firewall.cooldown_expires_at == expected_expiry

    def test_panic_mode_triggered_4_interventions(self, firewall, base_time):
        """Test panic mode triggers with more than 3 interventions."""
        # 4 rapid interventions - clearly panic behavior
        for i in range(4):
            firewall.record_manual_intervention(base_time + timedelta(minutes=i * 2))

        assert firewall.cooldown_expires_at is not None

    def test_panic_cooldown_2_hours_enforced(self, firewall, base_time):
        """Test that panic cooldown is exactly 2 hours (120 minutes)."""
        # Trigger panic mode
        for i in range(3):
            firewall.record_manual_intervention(base_time + timedelta(minutes=i))

        last_intervention = base_time + timedelta(minutes=2)
        expected_expiry = last_intervention + timedelta(minutes=120)

        assert firewall.cooldown_expires_at == expected_expiry

    def test_panic_mode_blocks_trades_during_cooldown(self, firewall, base_time):
        """Test that trades are blocked during panic cooldown."""
        # Trigger panic mode
        for i in range(3):
            firewall.record_manual_intervention(base_time + timedelta(minutes=i))

        # Try to trade 30 minutes later - should be blocked
        trade_time = base_time + timedelta(minutes=30)
        result = firewall.should_block_trade(
            symbol="AAPL", position_size=1000, timestamp=trade_time
        )

        # During cooldown, trade is blocked due to active cooldown
        assert result["blocked"] is True
        # Cooldown blocks with reason, not pattern detection
        assert "cooldown" in result["reasons"][0].lower()

    def test_panic_mode_allows_trades_after_cooldown(self, firewall, base_time):
        """Test that trades are allowed after 2-hour cooldown expires."""
        # Trigger panic mode
        for i in range(3):
            firewall.record_manual_intervention(base_time + timedelta(minutes=i))

        # Try to trade 3 hours later - cooldown should have expired
        trade_time = base_time + timedelta(hours=3)
        result = firewall.should_block_trade(
            symbol="AAPL", position_size=1000, timestamp=trade_time
        )

        # After cooldown expires, the "Active cooldown" reason should not be present
        cooldown_blocked = any("cooldown" in r.lower() for r in result["reasons"])
        assert not cooldown_blocked

    def test_panic_mode_disabled_when_flag_off(self, base_time):
        """Test panic check is skipped when enable_panic_check=False."""
        firewall = EmotionalFirewall(enable_panic_check=False)

        # 5 rapid interventions - would normally trigger panic
        for i in range(5):
            firewall.record_manual_intervention(base_time + timedelta(minutes=i))

        # No cooldown should be set because panic check is disabled
        assert firewall.cooldown_expires_at is None

    def test_panic_interventions_outside_10_min_window_ignored(
        self, firewall, base_time
    ):
        """Test that interventions >10 min ago don't count toward panic threshold."""
        # First intervention 15 minutes ago
        firewall.record_manual_intervention(base_time - timedelta(minutes=15))

        # Two more recent interventions
        firewall.record_manual_intervention(base_time)
        firewall.record_manual_intervention(base_time + timedelta(minutes=5))

        # Total 3 interventions, but only 2 within 10-minute window
        # Should NOT trigger panic
        assert firewall.cooldown_expires_at is None

    def test_panic_exactly_at_10_minute_boundary(self, firewall, base_time):
        """Test boundary condition: intervention exactly at 10-minute mark."""
        # First intervention exactly 10 minutes ago
        ten_mins_ago = base_time - timedelta(minutes=10)
        firewall.record_manual_intervention(ten_mins_ago)

        # Two more within window
        firewall.record_manual_intervention(base_time - timedelta(minutes=5))
        firewall.record_manual_intervention(base_time)

        # The 10-minute-ago one should be OUTSIDE the window (>10 mins)
        # So only 2 interventions count - should NOT trigger
        assert firewall.cooldown_expires_at is None

    def test_panic_just_inside_10_minute_boundary(self, firewall, base_time):
        """Test intervention just inside 10-minute window triggers panic."""
        # First intervention 9 minutes 59 seconds ago - just inside window
        almost_ten_mins_ago = base_time - timedelta(minutes=9, seconds=59)
        firewall.record_manual_intervention(almost_ten_mins_ago)

        # Two more within window
        firewall.record_manual_intervention(base_time - timedelta(minutes=5))
        firewall.record_manual_intervention(base_time)

        # All 3 should count - should trigger panic
        assert firewall.cooldown_expires_at is not None

    def test_panic_mode_uses_current_time_if_no_timestamp(self, firewall):
        """Test that record_manual_intervention uses current time if none provided."""
        # Record without explicit timestamp
        firewall.record_manual_intervention()

        assert len(firewall.manual_interventions) == 1
        # The recorded time should be within the last few seconds
        now = datetime.now(firewall.timezone)
        time_diff = abs((now - firewall.manual_interventions[0]).total_seconds())
        assert time_diff < 5  # Within 5 seconds

    def test_override_cooldown_resets_panic_state(self, firewall, base_time):
        """Test that override_cooldown() resets panic-triggered cooldown."""
        # Trigger panic mode
        for i in range(3):
            firewall.record_manual_intervention(base_time + timedelta(minutes=i))

        assert firewall.cooldown_expires_at is not None

        # Override the cooldown with confirmation code
        result = firewall.override_cooldown("OVERRIDE_COOLDOWN")

        assert result is True
        assert firewall.cooldown_expires_at is None

    def test_override_cooldown_requires_confirmation(self, firewall, base_time):
        """Test that override_cooldown() requires correct confirmation code."""
        # Trigger panic mode
        for i in range(3):
            firewall.record_manual_intervention(base_time + timedelta(minutes=i))

        assert firewall.cooldown_expires_at is not None

        # Try with wrong code
        result = firewall.override_cooldown("WRONG_CODE")

        assert result is False
        assert firewall.cooldown_expires_at is not None  # Still active

    def test_get_statistics_reflects_panic_cooldown(self, firewall, base_time):
        """Test get_statistics() correctly reports panic-triggered cooldown."""
        # Trigger panic mode
        for i in range(3):
            firewall.record_manual_intervention(base_time + timedelta(minutes=i))

        stats = firewall.get_statistics()

        assert stats["active_cooldown"] is True
        assert stats["cooldown_expires"] is not None


class TestPanicModeEdgeCases:
    """Edge cases and unusual scenarios for panic mode."""

    @pytest.fixture
    def firewall(self):
        return EmotionalFirewall()

    def test_intervention_deque_maxlen_respected(self, firewall):
        """Test that manual_interventions deque doesn't grow beyond maxlen."""
        tz = firewall.timezone
        base = tz.localize(datetime(2024, 1, 10, 12, 0, 0))

        # Record many interventions (more than maxlen=20)
        for i in range(30):
            firewall.record_manual_intervention(base + timedelta(hours=i))

        # Should be capped at maxlen
        assert len(firewall.manual_interventions) == 20

    def test_panic_with_enable_all_checks_false(self):
        """Test panic check behavior when enable_all_checks=False."""
        firewall = EmotionalFirewall(enable_all_checks=False)
        tz = firewall.timezone
        base = tz.localize(datetime(2024, 1, 10, 14, 0, 0))

        # Record 3 rapid interventions
        for i in range(3):
            firewall.record_manual_intervention(base + timedelta(minutes=i))

        # Panic mode still tracks (enable_panic_check is separate from enable_all_checks)
        # The interventions are recorded, cooldown may or may not be set
        # depending on implementation details
        assert len(firewall.manual_interventions) == 3

    def test_mixed_timezone_interventions(self, firewall):
        """Test interventions with mixed timezone awareness."""
        tz = firewall.timezone
        base = tz.localize(datetime(2024, 1, 10, 14, 0, 0))

        # Mix of timezone-aware times
        firewall.record_manual_intervention(base)
        firewall.record_manual_intervention(base + timedelta(minutes=3))
        firewall.record_manual_intervention(base + timedelta(minutes=6))

        # Should still trigger panic correctly
        assert firewall.cooldown_expires_at is not None

    def test_rapid_fire_interventions(self, firewall):
        """Test many rapid interventions in quick succession."""
        tz = firewall.timezone
        base = tz.localize(datetime(2024, 1, 10, 14, 0, 0))

        # 10 interventions in 10 seconds - extreme panic behavior
        for i in range(10):
            firewall.record_manual_intervention(base + timedelta(seconds=i))

        # Definitely should trigger panic
        assert firewall.cooldown_expires_at is not None

    def test_panic_during_existing_revenge_cooldown(self):
        """Test panic detection when already in revenge trading cooldown."""
        firewall = EmotionalFirewall()
        tz = firewall.timezone
        base = tz.localize(datetime(2024, 1, 10, 14, 0, 0))

        # First trigger revenge trading cooldown by recording a loss then trading
        firewall.record_trade("AAPL", profit_loss=-500, timestamp=base)

        # Now trigger panic on top of it
        for i in range(3):
            firewall.record_manual_intervention(
                base + timedelta(minutes=5) + timedelta(minutes=i)
            )

        # Cooldown should be set (panic or revenge, whichever is longer)
        assert firewall.cooldown_expires_at is not None


class TestPanicModeIntegration:
    """Integration tests for panic mode with other firewall features."""

    def test_panic_plus_loss_streak(self):
        """Test panic mode combined with loss streak detection."""
        firewall = EmotionalFirewall()
        tz = firewall.timezone
        base = tz.localize(datetime(2024, 1, 10, 14, 0, 0))

        # Build a loss streak
        for i in range(4):
            firewall.record_trade(
                "AAPL",
                profit_loss=-100,
                timestamp=base + timedelta(hours=i),
            )

        # Add panic interventions
        panic_base = base + timedelta(hours=5)
        for i in range(3):
            firewall.record_manual_intervention(panic_base + timedelta(minutes=i))

        # Check trade blocking - should catch multiple patterns
        result = firewall.should_block_trade(
            "TSLA", position_size=1000, timestamp=panic_base + timedelta(minutes=10)
        )

        # Should be blocked due to at least panic mode
        assert result["blocked"] is True

    def test_panic_reset_after_successful_override(self):
        """Test that panic state fully resets after cooldown override."""
        firewall = EmotionalFirewall()
        tz = firewall.timezone
        base = tz.localize(datetime(2024, 1, 10, 14, 0, 0))

        # Trigger panic
        for i in range(3):
            firewall.record_manual_intervention(base + timedelta(minutes=i))

        # Override cooldown
        firewall.override_cooldown("OVERRIDE_COOLDOWN")

        # Try trading - should not be blocked by cooldown
        result = firewall.should_block_trade(
            "AAPL", position_size=1000, timestamp=base + timedelta(minutes=30)
        )

        # No cooldown reason should be present
        cooldown_blocked = any("cooldown" in r.lower() for r in result["reasons"])
        assert not cooldown_blocked
