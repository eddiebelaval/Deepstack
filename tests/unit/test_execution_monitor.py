"""
Comprehensive tests for ExecutionMonitor.

Tests cover:
- Alert generation (slippage, VWAP, failures, slow execution)
- Alert lifecycle (acknowledgment, expiration, resolution)
- Daily metrics and statistics
- Quality scoring and grading
- Performance dashboard
- Data cleanup
"""

from datetime import datetime, timedelta

import pytest

from core.execution.monitor import (
    AlertSeverity,
    ExecutionMonitor,
)

# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def execution_monitor():
    """Create execution monitor with standard thresholds."""
    return ExecutionMonitor(
        slippage_threshold_bps=20.0,
        vwap_deviation_threshold=0.01,  # 1%
        failed_order_threshold=3,
        slow_execution_threshold_minutes=30,
    )


@pytest.fixture
def sample_execution_result():
    """Create sample execution result."""
    return {
        "execution_id": "exec_123",
        "symbol": "AAPL",
        "status": "COMPLETED",
        "execution_type": "MARKET",
        "executed_quantity": 100,
        "avg_price": 150.0,
        "duration_minutes": 15.0,
        "timestamp": datetime.now(),
        "routing_info": {
            "slippage_estimate": {
                "slippage_bps": 10.0,
                "slippage_dollars": 15.0,
            }
        },
    }


@pytest.fixture
def vwap_execution_result():
    """Create VWAP execution result."""
    return {
        "execution_id": "vwap_456",
        "symbol": "TSLA",
        "status": "COMPLETED",
        "execution_type": "VWAP",
        "executed_quantity": 50,
        "avg_price": 200.0,
        "vwap_price": 199.0,
        "vwap_deviation_pct": 0.005,  # 0.5%
        "duration_minutes": 60.0,
        "timestamp": datetime.now(),
    }


@pytest.fixture
def failed_execution_result():
    """Create failed execution result."""
    return {
        "execution_id": "failed_789",
        "symbol": "MSFT",
        "status": "FAILED",
        "execution_type": "LIMIT",
        "error_message": "Insufficient liquidity",
        "timestamp": datetime.now(),
    }


@pytest.fixture
def slow_execution_result():
    """Create slow execution result."""
    return {
        "execution_id": "slow_999",
        "symbol": "NVDA",
        "status": "COMPLETED",
        "execution_type": "TWAP",
        "executed_quantity": 200,
        "avg_price": 450.0,
        "duration_minutes": 45.0,  # Exceeds 30 min threshold
        "timestamp": datetime.now(),
    }


@pytest.fixture
def monitor_with_history(execution_monitor):
    """Create monitor with execution history."""
    # Add some successful executions
    for i in range(10):
        execution_monitor.monitor_execution(
            {
                "execution_id": f"hist_{i}",
                "symbol": "SPY",
                "status": "COMPLETED",
                "execution_type": "MARKET",
                "executed_quantity": 100,
                "avg_price": 400.0,
                "duration_minutes": 10.0,
                "timestamp": datetime.now(),
                "routing_info": {
                    "slippage_estimate": {
                        "slippage_bps": 5.0,
                        "slippage_dollars": 2.0,
                    }
                },
            }
        )
    return execution_monitor


# ============================================================================
# TestAlertGeneration - Tests for alert triggering logic
# ============================================================================


class TestAlertGeneration:
    """Test alert generation for various conditions."""

    def test_slippage_alert_triggered(self, execution_monitor, sample_execution_result):
        """Test slippage alert triggered when exceeding threshold."""
        # Set slippage above threshold
        sample_execution_result["routing_info"]["slippage_estimate"][
            "slippage_bps"
        ] = 25.0

        execution_monitor.monitor_execution(sample_execution_result)

        # Verify alert was generated
        alerts = execution_monitor.get_active_alerts()
        assert len(alerts) == 1
        assert alerts[0].alert_type == "EXCESSIVE_SLIPPAGE"
        assert alerts[0].severity == AlertSeverity.WARNING
        assert "25.00bps" in alerts[0].message
        assert alerts[0].details["slippage_bps"] == 25.0

    def test_slippage_alert_not_triggered_below_threshold(
        self, execution_monitor, sample_execution_result
    ):
        """Test no slippage alert when below threshold."""
        # Set slippage below threshold (already 10.0 in fixture)
        execution_monitor.monitor_execution(sample_execution_result)

        # Verify no alerts
        alerts = execution_monitor.get_active_alerts()
        assert len(alerts) == 0

    def test_slippage_alert_at_exact_threshold(
        self, execution_monitor, sample_execution_result
    ):
        """Test slippage alert not triggered at exact threshold."""
        # Set slippage exactly at threshold
        sample_execution_result["routing_info"]["slippage_estimate"][
            "slippage_bps"
        ] = 20.0

        execution_monitor.monitor_execution(sample_execution_result)

        # At exact threshold, should not trigger (only > threshold)
        alerts = execution_monitor.get_active_alerts()
        assert len(alerts) == 0

    def test_vwap_deviation_alert_warning(
        self, execution_monitor, vwap_execution_result
    ):
        """Test VWAP deviation warning alert."""
        # Set deviation above threshold but below 2x
        vwap_execution_result["vwap_deviation_pct"] = 0.015  # 1.5%
        vwap_execution_result["duration_minutes"] = 15.0  # Below slow threshold

        execution_monitor.monitor_execution(vwap_execution_result)

        alerts = execution_monitor.get_active_alerts()
        assert len(alerts) == 1
        assert alerts[0].alert_type == "VWAP_DEVIATION"
        assert alerts[0].severity == AlertSeverity.WARNING
        assert alerts[0].details["vwap_deviation_pct"] == 0.015

    def test_vwap_deviation_alert_critical(
        self, execution_monitor, vwap_execution_result
    ):
        """Test VWAP deviation critical alert for large deviation."""
        # Set deviation above 2x threshold (2% > 2 * 1%)
        vwap_execution_result["vwap_deviation_pct"] = 0.025  # 2.5%
        vwap_execution_result["duration_minutes"] = 15.0  # Below slow threshold

        execution_monitor.monitor_execution(vwap_execution_result)

        alerts = execution_monitor.get_active_alerts()
        assert len(alerts) == 1
        assert alerts[0].alert_type == "VWAP_DEVIATION"
        assert alerts[0].severity == AlertSeverity.CRITICAL

    def test_vwap_deviation_negative_value(
        self, execution_monitor, vwap_execution_result
    ):
        """Test VWAP deviation alert with negative deviation."""
        # Negative deviation should use absolute value
        vwap_execution_result["vwap_deviation_pct"] = -0.015  # -1.5%
        vwap_execution_result["duration_minutes"] = 15.0  # Below slow threshold

        execution_monitor.monitor_execution(vwap_execution_result)

        alerts = execution_monitor.get_active_alerts()
        assert len(alerts) == 1
        assert alerts[0].alert_type == "VWAP_DEVIATION"

    def test_failed_order_alert_triggered(self, execution_monitor):
        """Test failed order alert when threshold reached."""
        # Add multiple failed orders
        for i in range(5):
            execution_monitor.monitor_execution(
                {
                    "execution_id": f"fail_{i}",
                    "symbol": "AAPL",
                    "status": "FAILED",
                    "timestamp": datetime.now(),
                }
            )

        # Alert should trigger on 3rd failure (threshold=3)
        alerts = execution_monitor.get_active_alerts()
        assert len(alerts) > 0
        failed_alerts = [a for a in alerts if a.alert_type == "FAILED_ORDERS"]
        assert len(failed_alerts) > 0
        assert failed_alerts[0].severity == AlertSeverity.CRITICAL

    def test_failed_order_alert_threshold_boundary(self, execution_monitor):
        """Test failed order alert at exact threshold."""
        # Add exactly threshold number of failures
        for i in range(3):
            execution_monitor.monitor_execution(
                {
                    "execution_id": f"fail_{i}",
                    "symbol": "AAPL",
                    "status": "FAILED",
                    "timestamp": datetime.now(),
                }
            )

        alerts = execution_monitor.get_active_alerts()
        failed_alerts = [a for a in alerts if a.alert_type == "FAILED_ORDERS"]
        assert len(failed_alerts) == 1

    def test_failed_order_alert_with_successful_interleaved(self, execution_monitor):
        """Test failed order alert with successful orders interleaved."""
        # Add 2 failures, then success, then 2 more failures
        for i in range(2):
            execution_monitor.monitor_execution(
                {"execution_id": f"fail_{i}", "symbol": "AAPL", "status": "FAILED"}
            )

        execution_monitor.monitor_execution(
            {"execution_id": "success_1", "symbol": "AAPL", "status": "COMPLETED"}
        )

        for i in range(2, 4):
            execution_monitor.monitor_execution(
                {"execution_id": f"fail_{i}", "symbol": "AAPL", "status": "FAILED"}
            )

        # Should still have 4 failures in last 20
        alerts = execution_monitor.get_active_alerts()
        failed_alerts = [a for a in alerts if a.alert_type == "FAILED_ORDERS"]
        assert len(failed_alerts) > 0

    def test_slow_execution_alert_triggered(
        self, execution_monitor, slow_execution_result
    ):
        """Test slow execution alert triggered."""
        execution_monitor.monitor_execution(slow_execution_result)

        alerts = execution_monitor.get_active_alerts()
        assert len(alerts) == 1
        assert alerts[0].alert_type == "SLOW_EXECUTION"
        assert alerts[0].severity == AlertSeverity.INFO
        assert alerts[0].details["duration_minutes"] == 45.0

    def test_slow_execution_alert_boundary(
        self, execution_monitor, sample_execution_result
    ):
        """Test slow execution at exact threshold."""
        # Set duration exactly at threshold
        sample_execution_result["duration_minutes"] = 30.0

        execution_monitor.monitor_execution(sample_execution_result)

        # At exact threshold, should not trigger (only > threshold)
        alerts = execution_monitor.get_active_alerts()
        assert len(alerts) == 0

    def test_multiple_alerts_same_execution(self, execution_monitor):
        """Test multiple alerts can be generated from single execution."""
        # Execution with both high slippage and slow execution
        execution = {
            "execution_id": "multi_alert",
            "symbol": "AAPL",
            "status": "COMPLETED",
            "execution_type": "VWAP",
            "duration_minutes": 45.0,  # Slow
            "vwap_deviation_pct": 0.025,  # High VWAP deviation
            "routing_info": {
                "slippage_estimate": {
                    "slippage_bps": 30.0,  # High slippage
                    "slippage_dollars": 50.0,
                }
            },
        }

        execution_monitor.monitor_execution(execution)

        alerts = execution_monitor.get_active_alerts()
        assert len(alerts) == 3  # Slippage, VWAP, Slow

        alert_types = {a.alert_type for a in alerts}
        assert "EXCESSIVE_SLIPPAGE" in alert_types
        assert "VWAP_DEVIATION" in alert_types
        assert "SLOW_EXECUTION" in alert_types

    def test_alert_deduplication_not_implemented(self, execution_monitor):
        """Test that duplicate alerts are created (no deduplication)."""
        # Monitor same execution twice
        execution = {
            "execution_id": "dup_test",
            "symbol": "AAPL",
            "status": "COMPLETED",
            "routing_info": {
                "slippage_estimate": {"slippage_bps": 30.0, "slippage_dollars": 50.0}
            },
        }

        execution_monitor.monitor_execution(execution)
        execution_monitor.monitor_execution(execution)

        alerts = execution_monitor.get_active_alerts()
        # Should have 2 alerts (no deduplication)
        assert len(alerts) == 2

    def test_alert_severity_levels_correct(self, execution_monitor):
        """Test correct severity levels for different alert types."""
        # Slippage - WARNING
        execution_monitor.monitor_execution(
            {
                "execution_id": "slip",
                "symbol": "AAPL",
                "status": "COMPLETED",
                "routing_info": {
                    "slippage_estimate": {
                        "slippage_bps": 30.0,
                        "slippage_dollars": 50.0,
                    }
                },
            }
        )

        # Failed orders - CRITICAL
        for i in range(3):
            execution_monitor.monitor_execution(
                {"execution_id": f"fail_{i}", "symbol": "AAPL", "status": "FAILED"}
            )

        # Slow execution - INFO
        execution_monitor.monitor_execution(
            {
                "execution_id": "slow",
                "symbol": "AAPL",
                "status": "COMPLETED",
                "duration_minutes": 45.0,
            }
        )

        alerts = execution_monitor.get_active_alerts()

        slippage_alerts = [a for a in alerts if a.alert_type == "EXCESSIVE_SLIPPAGE"]
        assert slippage_alerts[0].severity == AlertSeverity.WARNING

        failed_alerts = [a for a in alerts if a.alert_type == "FAILED_ORDERS"]
        assert failed_alerts[0].severity == AlertSeverity.CRITICAL

        slow_alerts = [a for a in alerts if a.alert_type == "SLOW_EXECUTION"]
        assert slow_alerts[0].severity == AlertSeverity.INFO


# ============================================================================
# TestAlertLifecycle - Tests for alert management
# ============================================================================


class TestAlertLifecycle:
    """Test alert lifecycle management."""

    def test_alert_acknowledgment_success(
        self, execution_monitor, sample_execution_result
    ):
        """Test successful alert acknowledgment."""
        # Generate alert
        sample_execution_result["routing_info"]["slippage_estimate"][
            "slippage_bps"
        ] = 30.0
        execution_monitor.monitor_execution(sample_execution_result)

        alerts = execution_monitor.get_active_alerts()
        assert len(alerts) == 1

        alert_id = alerts[0].alert_id

        # Acknowledge alert
        result = execution_monitor.acknowledge_alert(alert_id)
        assert result is True

        # Verify no active alerts
        active_alerts = execution_monitor.get_active_alerts()
        assert len(active_alerts) == 0

        # Verify alert still exists but is acknowledged
        assert alerts[0].acknowledged is True

    def test_alert_acknowledgment_not_found(self, execution_monitor):
        """Test acknowledgment of non-existent alert."""
        result = execution_monitor.acknowledge_alert("non_existent_id")
        assert result is False

    def test_alert_acknowledgment_idempotent(
        self, execution_monitor, sample_execution_result
    ):
        """Test acknowledging same alert multiple times."""
        # Generate alert
        sample_execution_result["routing_info"]["slippage_estimate"][
            "slippage_bps"
        ] = 30.0
        execution_monitor.monitor_execution(sample_execution_result)

        alerts = execution_monitor.get_active_alerts()
        alert_id = alerts[0].alert_id

        # Acknowledge twice
        result1 = execution_monitor.acknowledge_alert(alert_id)
        result2 = execution_monitor.acknowledge_alert(alert_id)

        assert result1 is True
        assert result2 is True  # Still returns True even if already acknowledged

    def test_get_active_alerts_excludes_acknowledged(
        self, execution_monitor, sample_execution_result
    ):
        """Test that acknowledged alerts are excluded from active alerts."""
        # Generate multiple alerts
        for i in range(3):
            sample_execution_result["execution_id"] = f"exec_{i}"
            sample_execution_result["routing_info"]["slippage_estimate"][
                "slippage_bps"
            ] = 30.0
            execution_monitor.monitor_execution(sample_execution_result)

        # Acknowledge first alert
        alerts = execution_monitor.alerts
        execution_monitor.acknowledge_alert(alerts[0].alert_id)

        # Active alerts should only show 2
        active_alerts = execution_monitor.get_active_alerts()
        assert len(active_alerts) == 2

    def test_get_active_alerts_filter_by_severity(
        self, execution_monitor, sample_execution_result
    ):
        """Test filtering active alerts by severity."""
        # Generate WARNING alert (slippage)
        sample_execution_result["routing_info"]["slippage_estimate"][
            "slippage_bps"
        ] = 30.0
        execution_monitor.monitor_execution(sample_execution_result)

        # Generate CRITICAL alert (failed orders)
        for i in range(3):
            execution_monitor.monitor_execution(
                {"execution_id": f"fail_{i}", "symbol": "AAPL", "status": "FAILED"}
            )

        # Get only WARNING alerts
        warning_alerts = execution_monitor.get_active_alerts(
            severity=AlertSeverity.WARNING
        )
        assert len(warning_alerts) == 1
        assert warning_alerts[0].severity == AlertSeverity.WARNING

        # Get only CRITICAL alerts
        critical_alerts = execution_monitor.get_active_alerts(
            severity=AlertSeverity.CRITICAL
        )
        assert len(critical_alerts) >= 1
        assert all(a.severity == AlertSeverity.CRITICAL for a in critical_alerts)

    def test_alert_history_retention(self, execution_monitor, sample_execution_result):
        """Test that all alerts are retained in history."""
        import time

        # Generate and acknowledge multiple alerts (with delays to get unique IDs)
        for i in range(5):
            # Create fresh copy for each iteration
            execution = {
                "execution_id": f"exec_{i}",
                "symbol": "AAPL",
                "status": "COMPLETED",
                "routing_info": {
                    "slippage_estimate": {
                        "slippage_bps": 30.0,
                        "slippage_dollars": 50.0,
                    }
                },
            }
            execution_monitor.monitor_execution(execution)
            time.sleep(
                1.1
            )  # 1+ second delay to ensure unique alert IDs (format: %Y%m%d_%H%M%S)

        # Acknowledge all
        for alert in execution_monitor.alerts[:]:  # Copy list to avoid iteration issues
            execution_monitor.acknowledge_alert(alert.alert_id)

        # All alerts should still be in history
        assert len(execution_monitor.alerts) == 5

        # But none should be active
        assert len(execution_monitor.get_active_alerts()) == 0


# ============================================================================
# TestDailyMetrics - Tests for daily statistics
# ============================================================================


class TestDailyMetrics:
    """Test daily metrics and statistics."""

    def test_daily_summary_calculation(
        self, execution_monitor, sample_execution_result
    ):
        """Test daily summary calculates correctly."""
        # Add multiple executions
        for i in range(10):
            execution = sample_execution_result.copy()
            execution["execution_id"] = f"exec_{i}"
            execution["executed_quantity"] = 100
            execution["avg_price"] = 150.0
            execution_monitor.monitor_execution(execution)

        summary = execution_monitor.get_daily_summary()

        assert summary["total_executions"] == 10
        assert summary["successful_executions"] == 10
        assert summary["failed_executions"] == 0
        assert summary["success_rate"] == 1.0
        assert summary["total_volume"] == 1000  # 10 * 100
        assert summary["total_value"] == 150000.0  # 1000 * 150

    def test_daily_summary_with_failures(self, execution_monitor):
        """Test daily summary with mixed success and failures."""
        # Add 7 successful and 3 failed
        for i in range(7):
            execution_monitor.monitor_execution(
                {
                    "execution_id": f"success_{i}",
                    "symbol": "AAPL",
                    "status": "COMPLETED",
                    "executed_quantity": 100,
                    "avg_price": 150.0,
                }
            )

        for i in range(3):
            execution_monitor.monitor_execution(
                {"execution_id": f"fail_{i}", "symbol": "AAPL", "status": "FAILED"}
            )

        summary = execution_monitor.get_daily_summary()

        assert summary["total_executions"] == 10
        assert summary["successful_executions"] == 7
        assert summary["failed_executions"] == 3
        assert summary["success_rate"] == 0.7

    def test_daily_summary_empty_day(self, execution_monitor):
        """Test daily summary for day with no executions."""
        summary = execution_monitor.get_daily_summary()

        assert summary["total_executions"] == 0
        assert "message" in summary
        assert "No executions" in summary["message"]

    def test_daily_summary_specific_date(self, execution_monitor):
        """Test getting summary for specific date."""
        # Get summary for yesterday
        yesterday = (datetime.now() - timedelta(days=1)).date().isoformat()
        summary = execution_monitor.get_daily_summary(date=yesterday)

        assert summary["date"] == yesterday
        assert summary["total_executions"] == 0

    def test_metrics_aggregation_by_strategy(self, execution_monitor):
        """Test metrics aggregated by execution strategy."""
        strategies = ["MARKET", "LIMIT", "VWAP", "TWAP"]

        for i, strategy in enumerate(strategies):
            for j in range(i + 1):  # Different counts per strategy
                execution_monitor.monitor_execution(
                    {
                        "execution_id": f"{strategy}_{j}",
                        "symbol": "AAPL",
                        "status": "COMPLETED",
                        "execution_type": strategy,
                        "executed_quantity": 100,
                        "avg_price": 150.0,
                    }
                )

        summary = execution_monitor.get_daily_summary()

        assert summary["by_strategy"]["MARKET"] == 1
        assert summary["by_strategy"]["LIMIT"] == 2
        assert summary["by_strategy"]["VWAP"] == 3
        assert summary["by_strategy"]["TWAP"] == 4

    def test_metrics_include_alert_count(
        self, execution_monitor, sample_execution_result
    ):
        """Test daily summary includes alert count."""
        # Generate some alerts
        for i in range(3):
            sample_execution_result["execution_id"] = f"exec_{i}"
            sample_execution_result["routing_info"]["slippage_estimate"][
                "slippage_bps"
            ] = 30.0
            execution_monitor.monitor_execution(sample_execution_result)

        summary = execution_monitor.get_daily_summary()

        assert summary["alerts_generated"] == 3

    def test_clear_old_data(self, execution_monitor, sample_execution_result):
        """Test clearing old execution data."""
        # Add some executions
        for i in range(10):
            execution = sample_execution_result.copy()
            execution["execution_id"] = f"exec_{i}"
            execution_monitor.monitor_execution(execution)

        # Generate some alerts
        sample_execution_result["routing_info"]["slippage_estimate"][
            "slippage_bps"
        ] = 30.0
        execution_monitor.monitor_execution(sample_execution_result)

        # Clear data with 0 days retention
        execution_monitor.clear_old_data(days_to_keep=0)

        # Most data should be cleared
        # Note: Executions without timestamp field may still remain
        assert len(execution_monitor.get_active_alerts()) == 0


# ============================================================================
# TestQualityScoring - Tests for execution quality scoring
# ============================================================================


class TestQualityScoring:
    """Test execution quality scoring system."""

    def test_quality_score_perfect_execution(self, execution_monitor):
        """Test quality score for perfect execution."""
        # Add 100 perfect executions
        for i in range(100):
            execution_monitor.monitor_execution(
                {
                    "execution_id": f"perfect_{i}",
                    "symbol": "AAPL",
                    "status": "COMPLETED",
                    "executed_quantity": 100,
                    "avg_price": 150.0,
                    "routing_info": {
                        "slippage_estimate": {
                            "slippage_bps": 5.0,
                            "slippage_dollars": 7.5,
                        }
                    },
                }
            )

        score_data = execution_monitor.get_execution_quality_score()

        # Perfect executions: 100% success, no alerts
        assert score_data["quality_score"] >= 90  # Should be A grade
        assert score_data["grade"] == "A"
        assert score_data["breakdown"]["success_rate"] == 40.0  # Full 40 points

    def test_quality_score_poor_execution(self, execution_monitor):
        """Test quality score for poor execution."""
        # Add 50 successful and 50 failed executions
        for i in range(50):
            execution_monitor.monitor_execution(
                {
                    "execution_id": f"success_{i}",
                    "symbol": "AAPL",
                    "status": "COMPLETED",
                }
            )

        for i in range(50):
            execution_monitor.monitor_execution(
                {"execution_id": f"fail_{i}", "symbol": "AAPL", "status": "FAILED"}
            )

        score_data = execution_monitor.get_execution_quality_score()

        # 50% success rate = 20 points (half of 40)
        assert score_data["breakdown"]["success_rate"] == 20.0
        assert score_data["quality_score"] < 80  # Should not be A or B

    def test_quality_score_with_alerts(
        self, execution_monitor, sample_execution_result
    ):
        """Test quality score penalized by alerts."""
        # Add successful executions
        for i in range(50):
            execution = sample_execution_result.copy()
            execution["execution_id"] = f"exec_{i}"
            execution_monitor.monitor_execution(execution)

        # Add executions with high slippage (generate alerts)
        for i in range(50):
            execution = sample_execution_result.copy()
            execution["execution_id"] = f"alert_{i}"
            execution["routing_info"]["slippage_estimate"]["slippage_bps"] = 30.0
            execution_monitor.monitor_execution(execution)

        score_data = execution_monitor.get_execution_quality_score()

        # Alert score should be reduced
        assert score_data["breakdown"]["alert_management"] < 10.0

    def test_quality_grade_A(self, execution_monitor):
        """Test grade A assignment (90+)."""
        # Add 100 perfect executions
        for i in range(100):
            execution_monitor.monitor_execution(
                {
                    "execution_id": f"exec_{i}",
                    "symbol": "AAPL",
                    "status": "COMPLETED",
                }
            )

        score_data = execution_monitor.get_execution_quality_score()
        assert score_data["quality_score"] >= 90
        assert score_data["grade"] == "A"

    def test_quality_grade_B(self, execution_monitor):
        """Test grade B assignment (80-89)."""
        # With default slippage=30 and speed=20, need lower success rate
        # 75% success gives 30 points, + 30 + 20 + ~4 = 84 (B grade)
        for i in range(75):
            execution_monitor.monitor_execution(
                {
                    "execution_id": f"success_{i}",
                    "symbol": "AAPL",
                    "status": "COMPLETED",
                }
            )

        for i in range(25):
            execution_monitor.monitor_execution(
                {"execution_id": f"fail_{i}", "symbol": "AAPL", "status": "FAILED"}
            )

        score_data = execution_monitor.get_execution_quality_score()
        # Success rate: 0.75 * 40 = 30
        # Default slippage: 30
        # Default speed: 20
        # Alert score: ~4-6 (some failed order alerts)
        # Total: ~84-86 (B grade)
        assert 80 <= score_data["quality_score"] < 90
        assert score_data["grade"] == "B"

    def test_quality_grade_C(self, execution_monitor):
        """Test grade C assignment (70-79)."""
        # 55% success gives 22 points, + 30 + 20 - alerts = ~70-79
        for i in range(55):
            execution_monitor.monitor_execution(
                {
                    "execution_id": f"success_{i}",
                    "symbol": "AAPL",
                    "status": "COMPLETED",
                }
            )

        # Add failed orders to trigger failure alerts
        for i in range(45):
            execution_monitor.monitor_execution(
                {"execution_id": f"fail_{i}", "symbol": "AAPL", "status": "FAILED"}
            )

        score_data = execution_monitor.get_execution_quality_score()
        # Success rate: 0.55 * 40 = 22
        # Default: 30 + 20 = 50
        # Alert penalties reduce score
        # Total: should be 70-79
        assert 70 <= score_data["quality_score"] < 80
        assert score_data["grade"] == "C"

    def test_quality_grade_F(self, execution_monitor):
        """Test grade F assignment (<60)."""
        # Very poor success rate (15%) to ensure F grade
        # 15% * 40 = 6 points, + 30 + 20 - alerts = ~50-59
        for i in range(15):
            execution_monitor.monitor_execution(
                {
                    "execution_id": f"success_{i}",
                    "symbol": "AAPL",
                    "status": "COMPLETED",
                }
            )

        # Add massive failures to trigger many alerts
        for i in range(85):
            execution_monitor.monitor_execution(
                {"execution_id": f"fail_{i}", "symbol": "AAPL", "status": "FAILED"}
            )

        score_data = execution_monitor.get_execution_quality_score()
        # Success rate: 0.15 * 40 = 6
        # Default: 30 + 20 = 50
        # Many failures will generate alerts, reducing alert score significantly
        # Total should be < 60
        assert score_data["quality_score"] < 60
        assert score_data["grade"] == "F"

    def test_quality_score_no_executions(self, execution_monitor):
        """Test quality score with no executions."""
        score_data = execution_monitor.get_execution_quality_score()

        assert score_data["quality_score"] == 0.0
        assert score_data["grade"] == "N/A"
        assert "No executions" in score_data["message"]

    def test_quality_score_recent_100_only(self, execution_monitor):
        """Test quality score only considers recent 100 executions."""
        # Add 150 executions - 100 bad, then 50 good
        for i in range(100):
            execution_monitor.monitor_execution(
                {"execution_id": f"bad_{i}", "symbol": "AAPL", "status": "FAILED"}
            )

        for i in range(50):
            execution_monitor.monitor_execution(
                {
                    "execution_id": f"good_{i}",
                    "symbol": "AAPL",
                    "status": "COMPLETED",
                }
            )

        score_data = execution_monitor.get_execution_quality_score()

        # Should only analyze last 100 executions
        assert score_data["recent_executions_analyzed"] == 100

        # Last 100 = 50 bad + 50 good = 50% success rate
        # Success score should be ~20 (0.5 * 40)
        assert score_data["breakdown"]["success_rate"] == 20.0


# ============================================================================
# TestPerformanceDashboard - Tests for dashboard data
# ============================================================================


class TestPerformanceDashboard:
    """Test performance dashboard functionality."""

    def test_dashboard_includes_today_summary(
        self, execution_monitor, sample_execution_result
    ):
        """Test dashboard includes today's summary."""
        execution_monitor.monitor_execution(sample_execution_result)

        dashboard = execution_monitor.get_performance_dashboard()

        assert "today" in dashboard
        assert dashboard["today"]["total_executions"] == 1

    def test_dashboard_recent_executions(
        self, execution_monitor, sample_execution_result
    ):
        """Test dashboard shows recent executions."""
        # Add 15 executions
        for i in range(15):
            execution = sample_execution_result.copy()
            execution["execution_id"] = f"exec_{i}"
            execution_monitor.monitor_execution(execution)

        dashboard = execution_monitor.get_performance_dashboard()

        # Should show only last 10
        assert len(dashboard["recent_executions"]) == 10
        assert dashboard["recent_executions"][-1]["execution_id"] == "exec_14"

    def test_dashboard_success_rate_calculation(self, execution_monitor):
        """Test dashboard success rate over last 50 executions."""
        # Add 60 executions - 40 success, 20 failure
        for i in range(40):
            execution_monitor.monitor_execution(
                {
                    "execution_id": f"success_{i}",
                    "symbol": "AAPL",
                    "status": "COMPLETED",
                }
            )

        for i in range(20):
            execution_monitor.monitor_execution(
                {"execution_id": f"fail_{i}", "symbol": "AAPL", "status": "FAILED"}
            )

        dashboard = execution_monitor.get_performance_dashboard()

        # Last 50: 30 success, 20 failure
        # Success rate = 30/50 = 0.6
        assert abs(dashboard["success_rate_last_50"] - 0.6) < 0.01

    def test_dashboard_active_alerts_by_severity(
        self, execution_monitor, sample_execution_result
    ):
        """Test dashboard categorizes alerts by severity."""
        # Generate WARNING alert
        sample_execution_result["routing_info"]["slippage_estimate"][
            "slippage_bps"
        ] = 30.0
        execution_monitor.monitor_execution(sample_execution_result)

        # Generate CRITICAL alert
        for i in range(3):
            execution_monitor.monitor_execution(
                {"execution_id": f"fail_{i}", "symbol": "AAPL", "status": "FAILED"}
            )

        # Generate INFO alert
        execution_monitor.monitor_execution(
            {
                "execution_id": "slow",
                "symbol": "AAPL",
                "status": "COMPLETED",
                "duration_minutes": 45.0,
            }
        )

        dashboard = execution_monitor.get_performance_dashboard()

        assert dashboard["active_alerts"]["warning"] >= 1
        assert dashboard["active_alerts"]["critical"] >= 1
        assert dashboard["active_alerts"]["info"] >= 1
        assert dashboard["active_alerts"]["total"] >= 3

    def test_dashboard_alerts_detail_limited(
        self, execution_monitor, sample_execution_result
    ):
        """Test dashboard limits alert details to 5 per severity."""
        # Generate 10 WARNING alerts
        for i in range(10):
            execution = sample_execution_result.copy()
            execution["execution_id"] = f"exec_{i}"
            execution["routing_info"]["slippage_estimate"]["slippage_bps"] = 30.0
            execution_monitor.monitor_execution(execution)

        dashboard = execution_monitor.get_performance_dashboard()

        # Should only show 5 in details
        assert len(dashboard["alerts_detail"]["warning"]) <= 5


# ============================================================================
# TestEdgeCases - Tests for edge cases and error handling
# ============================================================================


class TestEdgeCases:
    """Test edge cases and error conditions."""

    def test_monitor_execution_without_routing_info(self, execution_monitor):
        """Test monitoring execution without routing info."""
        execution = {
            "execution_id": "no_routing",
            "symbol": "AAPL",
            "status": "COMPLETED",
        }

        # Should not crash
        execution_monitor.monitor_execution(execution)
        assert len(execution_monitor.executions) == 1

    def test_monitor_execution_without_duration(self, execution_monitor):
        """Test monitoring execution without duration."""
        execution = {
            "execution_id": "no_duration",
            "symbol": "AAPL",
            "status": "COMPLETED",
        }

        # Should not crash
        execution_monitor.monitor_execution(execution)
        assert len(execution_monitor.executions) == 1

    def test_vwap_alert_without_execution_type(self, execution_monitor):
        """Test VWAP deviation check skipped without execution_type."""
        execution = {
            "execution_id": "no_type",
            "symbol": "AAPL",
            "status": "COMPLETED",
            "vwap_deviation_pct": 0.05,  # High deviation but no VWAP type
        }

        execution_monitor.monitor_execution(execution)

        # Should not generate VWAP alert
        alerts = execution_monitor.get_active_alerts()
        vwap_alerts = [a for a in alerts if a.alert_type == "VWAP_DEVIATION"]
        assert len(vwap_alerts) == 0

    def test_zero_quantity_execution(self, execution_monitor):
        """Test execution with zero quantity."""
        execution = {
            "execution_id": "zero_qty",
            "symbol": "AAPL",
            "status": "COMPLETED",
            "executed_quantity": 0,
            "avg_price": 150.0,
        }

        execution_monitor.monitor_execution(execution)

        summary = execution_monitor.get_daily_summary()
        assert summary["total_volume"] == 0
        assert summary["total_value"] == 0.0

    def test_missing_slippage_estimate(self, execution_monitor):
        """Test execution with routing_info but no slippage_estimate."""
        execution = {
            "execution_id": "no_slippage",
            "symbol": "AAPL",
            "status": "COMPLETED",
            "routing_info": {},  # No slippage_estimate
        }

        # Should not crash
        execution_monitor.monitor_execution(execution)
        assert len(execution_monitor.get_active_alerts()) == 0

    def test_alert_with_special_characters_in_symbol(self, execution_monitor):
        """Test alert generation with special characters in symbol."""
        execution = {
            "execution_id": "special",
            "symbol": "BRK.B",  # Symbol with dot
            "status": "COMPLETED",
            "routing_info": {
                "slippage_estimate": {"slippage_bps": 30.0, "slippage_dollars": 50.0}
            },
        }

        execution_monitor.monitor_execution(execution)

        alerts = execution_monitor.get_active_alerts()
        assert len(alerts) == 1
        assert alerts[0].details["symbol"] == "BRK.B"


# ============================================================================
# TestInitialization - Tests for monitor initialization
# ============================================================================


class TestInitialization:
    """Test ExecutionMonitor initialization."""

    def test_default_initialization(self):
        """Test monitor with default parameters."""
        monitor = ExecutionMonitor()

        assert monitor.slippage_threshold_bps == 20.0
        assert monitor.vwap_deviation_threshold == 0.01
        assert monitor.failed_order_threshold == 3
        assert monitor.slow_execution_threshold_minutes == 120

    def test_custom_thresholds(self):
        """Test monitor with custom thresholds."""
        monitor = ExecutionMonitor(
            slippage_threshold_bps=15.0,
            vwap_deviation_threshold=0.02,
            failed_order_threshold=5,
            slow_execution_threshold_minutes=60,
        )

        assert monitor.slippage_threshold_bps == 15.0
        assert monitor.vwap_deviation_threshold == 0.02
        assert monitor.failed_order_threshold == 5
        assert monitor.slow_execution_threshold_minutes == 60

    def test_empty_collections_on_init(self):
        """Test collections are empty on initialization."""
        monitor = ExecutionMonitor()

        assert len(monitor.alerts) == 0
        assert len(monitor.executions) == 0
        assert len(monitor.daily_stats) == 0
