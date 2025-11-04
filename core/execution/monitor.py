"""
Execution Monitor - Real-time monitoring and alerting for order execution

Monitors execution quality and generates alerts for:
- Excessive slippage
- Failed orders
- Slow execution
- VWAP deviation
- Daily execution summary

Key Features:
- Real-time execution tracking
- Alert generation and notification
- Performance metrics dashboard
- Execution quality scoring
- Daily summary reports

Example:
    >>> monitor = ExecutionMonitor(
    ...     slippage_threshold_bps=20.0,
    ...     failed_order_threshold=3
    ... )
    >>> monitor.monitor_execution(execution_result)
    >>> alerts = monitor.get_active_alerts()
    >>> summary = monitor.get_daily_summary()
"""

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class AlertSeverity(Enum):
    """Alert severity levels."""

    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


@dataclass
class ExecutionAlert:
    """Execution alert."""

    alert_id: str
    timestamp: datetime
    severity: AlertSeverity
    alert_type: str
    message: str
    details: Dict[str, Any]
    acknowledged: bool = False


class ExecutionMonitor:
    """
    Real-time execution monitoring and alerting system.

    Monitors:
    - Slippage against thresholds
    - Order failure rates
    - Execution speed
    - VWAP deviation
    - Daily execution volumes

    Generates alerts for anomalies and quality issues.
    """

    def __init__(
        self,
        slippage_threshold_bps: float = 20.0,
        vwap_deviation_threshold: float = 0.01,  # 1%
        failed_order_threshold: int = 3,
        slow_execution_threshold_minutes: int = 120,
    ):
        """
        Initialize execution monitor.

        Args:
            slippage_threshold_bps: Slippage alert threshold (default: 20 bps)
            vwap_deviation_threshold: VWAP deviation threshold (default: 1%)
            failed_order_threshold: Failed order count threshold (default: 3)
            slow_execution_threshold_minutes: Slow execution threshold (default: 120m)
        """
        self.slippage_threshold_bps = slippage_threshold_bps
        self.vwap_deviation_threshold = vwap_deviation_threshold
        self.failed_order_threshold = failed_order_threshold
        self.slow_execution_threshold_minutes = slow_execution_threshold_minutes

        self.alerts: List[ExecutionAlert] = []
        self.executions: List[Dict[str, Any]] = []
        self.daily_stats: Dict[str, Any] = {}

        logger.info(
            f"Execution Monitor initialized: "
            f"slippage_threshold={slippage_threshold_bps}bps, "
            f"failed_order_threshold={failed_order_threshold}"
        )

    def monitor_execution(self, execution_result: Dict[str, Any]):
        """
        Monitor an execution and generate alerts if needed.

        Args:
            execution_result: Execution result dictionary
        """
        self.executions.append(execution_result)

        # Check for slippage alerts
        if "routing_info" in execution_result:
            self._check_slippage_alert(execution_result)

        # Check for VWAP deviation (if VWAP execution)
        if execution_result.get("execution_type") == "VWAP":
            self._check_vwap_deviation_alert(execution_result)

        # Check for failed execution
        if execution_result.get("status") == "FAILED":
            self._check_failed_execution_alert(execution_result)

        # Check for slow execution
        if execution_result.get("duration_minutes"):
            self._check_slow_execution_alert(execution_result)

        # Update daily stats
        self._update_daily_stats(execution_result)

    def _check_slippage_alert(self, execution_result: Dict[str, Any]):
        """
        Check if slippage exceeds threshold.

        Args:
            execution_result: Execution result
        """
        routing_info = execution_result.get("routing_info", {})
        slippage_estimate = routing_info.get("slippage_estimate")

        if not slippage_estimate:
            return

        slippage_bps = slippage_estimate.get("slippage_bps", 0.0)

        if slippage_bps > self.slippage_threshold_bps:
            alert = ExecutionAlert(
                alert_id=f"slippage_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                timestamp=datetime.now(),
                severity=AlertSeverity.WARNING,
                alert_type="EXCESSIVE_SLIPPAGE",
                message=(
                    f"Slippage exceeds threshold: {slippage_bps:.2f}bps "
                    f"> {self.slippage_threshold_bps}bps"
                ),
                details={
                    "execution_id": execution_result.get("execution_id"),
                    "symbol": execution_result.get("symbol"),
                    "slippage_bps": slippage_bps,
                    "threshold_bps": self.slippage_threshold_bps,
                    "slippage_dollars": slippage_estimate.get("slippage_dollars", 0.0),
                },
            )

            self.alerts.append(alert)
            logger.warning(f"ALERT: {alert.message}")

    def _check_vwap_deviation_alert(self, execution_result: Dict[str, Any]):
        """
        Check if VWAP deviation exceeds threshold.

        Args:
            execution_result: Execution result
        """
        vwap_deviation_pct = execution_result.get("vwap_deviation_pct", 0.0)

        if abs(vwap_deviation_pct) > self.vwap_deviation_threshold:
            severity = (
                AlertSeverity.CRITICAL
                if abs(vwap_deviation_pct) > self.vwap_deviation_threshold * 2
                else AlertSeverity.WARNING
            )

            alert = ExecutionAlert(
                alert_id=f"vwap_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                timestamp=datetime.now(),
                severity=severity,
                alert_type="VWAP_DEVIATION",
                message=f"VWAP deviation exceeds threshold: {vwap_deviation_pct:.2%}",
                details={
                    "execution_id": execution_result.get("execution_id"),
                    "symbol": execution_result.get("symbol"),
                    "vwap_deviation_pct": vwap_deviation_pct,
                    "threshold_pct": self.vwap_deviation_threshold,
                    "avg_price": execution_result.get("avg_price"),
                    "vwap_price": execution_result.get("vwap_price"),
                },
            )

            self.alerts.append(alert)
            logger.warning(f"ALERT: {alert.message}")

    def _check_failed_execution_alert(self, execution_result: Dict[str, Any]):
        """
        Check for failed execution.

        Args:
            execution_result: Execution result
        """
        # Count recent failures
        recent_failures = [
            e
            for e in self.executions[-20:]  # Last 20 executions
            if e.get("status") == "FAILED"
        ]

        if len(recent_failures) >= self.failed_order_threshold:
            alert = ExecutionAlert(
                alert_id=f"failed_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                timestamp=datetime.now(),
                severity=AlertSeverity.CRITICAL,
                alert_type="FAILED_ORDERS",
                message=(
                    f"Multiple failed orders: {len(recent_failures)} "
                    "in last 20 executions"
                ),
                details={
                    "failed_count": len(recent_failures),
                    "threshold": self.failed_order_threshold,
                    "recent_failures": recent_failures[-3:],  # Last 3
                },
            )

            self.alerts.append(alert)
            logger.error(f"ALERT: {alert.message}")

    def _check_slow_execution_alert(self, execution_result: Dict[str, Any]):
        """
        Check for slow execution.

        Args:
            execution_result: Execution result
        """
        duration = execution_result.get("duration_minutes", 0)

        if duration > self.slow_execution_threshold_minutes:
            alert = ExecutionAlert(
                alert_id=f"slow_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                timestamp=datetime.now(),
                severity=AlertSeverity.INFO,
                alert_type="SLOW_EXECUTION",
                message=(
                    f"Slow execution: {duration:.1f}m "
                    f"> {self.slow_execution_threshold_minutes}m"
                ),
                details={
                    "execution_id": execution_result.get("execution_id"),
                    "symbol": execution_result.get("symbol"),
                    "duration_minutes": duration,
                    "threshold_minutes": self.slow_execution_threshold_minutes,
                },
            )

            self.alerts.append(alert)
            logger.info(f"ALERT: {alert.message}")

    def _update_daily_stats(self, execution_result: Dict[str, Any]):
        """
        Update daily execution statistics.

        Args:
            execution_result: Execution result
        """
        today = datetime.now().date().isoformat()

        if today not in self.daily_stats:
            self.daily_stats[today] = {
                "total_executions": 0,
                "successful_executions": 0,
                "failed_executions": 0,
                "total_volume": 0,
                "total_value": 0.0,
                "by_strategy": {},
            }

        stats = self.daily_stats[today]
        stats["total_executions"] += 1

        if execution_result.get("status") == "COMPLETED":
            stats["successful_executions"] += 1
        elif execution_result.get("status") == "FAILED":
            stats["failed_executions"] += 1

        # Update volume and value
        quantity = execution_result.get("executed_quantity", 0)
        avg_price = execution_result.get("avg_price", 0)

        stats["total_volume"] += quantity
        stats["total_value"] += quantity * avg_price

        # Update by strategy
        strategy = execution_result.get("execution_type", "UNKNOWN")
        if strategy not in stats["by_strategy"]:
            stats["by_strategy"][strategy] = 0
        stats["by_strategy"][strategy] += 1

    def get_active_alerts(
        self, severity: Optional[AlertSeverity] = None
    ) -> List[ExecutionAlert]:
        """
        Get active (unacknowledged) alerts.

        Args:
            severity: Filter by severity (optional)

        Returns:
            List of active alerts
        """
        active = [a for a in self.alerts if not a.acknowledged]

        if severity:
            active = [a for a in active if a.severity == severity]

        return active

    def acknowledge_alert(self, alert_id: str) -> bool:
        """
        Acknowledge an alert.

        Args:
            alert_id: Alert ID

        Returns:
            bool: True if acknowledged
        """
        for alert in self.alerts:
            if alert.alert_id == alert_id:
                alert.acknowledged = True
                logger.info(f"Alert acknowledged: {alert_id}")
                return True

        return False

    def get_daily_summary(self, date: Optional[str] = None) -> Dict[str, Any]:
        """
        Get daily execution summary.

        Args:
            date: Date string (YYYY-MM-DD), defaults to today

        Returns:
            Dict with daily summary
        """
        if date is None:
            date = datetime.now().date().isoformat()

        stats = self.daily_stats.get(date, {})

        if not stats:
            return {
                "date": date,
                "total_executions": 0,
                "message": "No executions for this date",
            }

        success_rate = (
            stats["successful_executions"] / stats["total_executions"]
            if stats["total_executions"] > 0
            else 0.0
        )

        return {
            "date": date,
            "total_executions": stats["total_executions"],
            "successful_executions": stats["successful_executions"],
            "failed_executions": stats["failed_executions"],
            "success_rate": success_rate,
            "total_volume": stats["total_volume"],
            "total_value": stats["total_value"],
            "by_strategy": stats["by_strategy"],
            "alerts_generated": len(
                [a for a in self.alerts if a.timestamp.date().isoformat() == date]
            ),
        }

    def get_performance_dashboard(self) -> Dict[str, Any]:
        """
        Get comprehensive performance dashboard.

        Returns:
            Dict with performance metrics
        """
        # Get today's summary
        today_summary = self.get_daily_summary()

        # Get recent executions (last 10)
        recent_executions = self.executions[-10:]

        # Calculate success rate over last 50 executions
        recent_50 = self.executions[-50:]
        if recent_50:
            success_count = len(
                [e for e in recent_50 if e.get("status") == "COMPLETED"]
            )
            success_rate_50 = success_count / len(recent_50)
        else:
            success_rate_50 = 0.0

        # Get active alerts by severity
        critical_alerts = self.get_active_alerts(severity=AlertSeverity.CRITICAL)
        warning_alerts = self.get_active_alerts(severity=AlertSeverity.WARNING)
        info_alerts = self.get_active_alerts(severity=AlertSeverity.INFO)

        return {
            "today": today_summary,
            "recent_executions": recent_executions,
            "success_rate_last_50": success_rate_50,
            "active_alerts": {
                "critical": len(critical_alerts),
                "warning": len(warning_alerts),
                "info": len(info_alerts),
                "total": len(critical_alerts) + len(warning_alerts) + len(info_alerts),
            },
            "alerts_detail": {
                "critical": [a.__dict__ for a in critical_alerts[:5]],
                "warning": [a.__dict__ for a in warning_alerts[:5]],
            },
        }

    def get_execution_quality_score(self) -> Dict[str, Any]:
        """
        Calculate overall execution quality score.

        Score based on:
        - Success rate (40%)
        - Slippage control (30%)
        - Speed (20%)
        - Alert rate (10%)

        Returns:
            Dict with quality score and breakdown
        """
        if not self.executions:
            return {
                "quality_score": 0.0,
                "grade": "N/A",
                "message": "No executions to score",
            }

        recent_100 = self.executions[-100:]

        # Success rate (40 points)
        success_count = len([e for e in recent_100 if e.get("status") == "COMPLETED"])
        success_rate = success_count / len(recent_100)
        success_score = success_rate * 40

        # Slippage control (30 points)
        # Award points for low slippage
        slippage_score = 30.0  # Default full score
        # Would adjust based on actual slippage data

        # Speed (20 points)
        # Award points for fast execution
        speed_score = 20.0  # Default full score
        # Would adjust based on actual execution times

        # Alert rate (10 points)
        # Penalize for high alert rate
        alert_rate = len([a for a in self.alerts if not a.acknowledged]) / max(
            len(recent_100), 1
        )
        alert_score = max(0, 10 - (alert_rate * 10))

        total_score = success_score + slippage_score + speed_score + alert_score

        # Assign grade
        if total_score >= 90:
            grade = "A"
        elif total_score >= 80:
            grade = "B"
        elif total_score >= 70:
            grade = "C"
        elif total_score >= 60:
            grade = "D"
        else:
            grade = "F"

        return {
            "quality_score": total_score,
            "grade": grade,
            "breakdown": {
                "success_rate": success_score,
                "slippage_control": slippage_score,
                "speed": speed_score,
                "alert_management": alert_score,
            },
            "recent_executions_analyzed": len(recent_100),
        }

    def clear_old_data(self, days_to_keep: int = 30):
        """
        Clear old execution data and alerts.

        Args:
            days_to_keep: Number of days to keep (default: 30)
        """
        cutoff_date = datetime.now() - timedelta(days=days_to_keep)

        # Clear old executions
        self.executions = [
            e
            for e in self.executions
            if e.get("timestamp", datetime.now()) > cutoff_date
        ]

        # Clear old alerts
        self.alerts = [a for a in self.alerts if a.timestamp > cutoff_date]

        # Clear old daily stats
        cutoff_date_str = cutoff_date.date().isoformat()
        self.daily_stats = {
            date: stats
            for date, stats in self.daily_stats.items()
            if date >= cutoff_date_str
        }

        logger.info(f"Cleared execution data older than {days_to_keep} days")
