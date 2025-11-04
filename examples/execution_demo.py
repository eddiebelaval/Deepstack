"""
Execution Module Demo - Production Order Execution

Demonstrates advanced execution algorithms:
- TWAP (Time-Weighted Average Price)
- VWAP (Volume-Weighted Average Price)
- Smart order routing
- Slippage modeling
- Execution monitoring

Run this to see the execution system in action!
"""

import asyncio
import logging

from core.broker.order_manager import OrderManager
from core.broker.paper_trader import PaperTrader
from core.config import Config
from core.execution.monitor import ExecutionMonitor
from core.execution.router import ExecutionRouter
from core.execution.slippage import SlippageModel
from core.execution.twap import TWAPExecutor
from core.execution.vwap import VWAPExecutor

# Setup logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


async def demo_twap_execution():
    """Demonstrate TWAP execution."""
    logger.info("=" * 80)
    logger.info("TWAP EXECUTION DEMO")
    logger.info("=" * 80)

    # Setup
    config = Config.from_env()
    paper_trader = PaperTrader(config=config, enable_risk_systems=False)
    order_manager = OrderManager(config=config, paper_trader=paper_trader)

    # Create TWAP executor
    twap = TWAPExecutor(
        order_manager=order_manager,
        default_time_window=5,  # 5 minutes for demo
        default_num_slices=5,
        timing_randomization=10,
    )

    logger.info("Executing TWAP order: BUY 500 AAPL over 5 minutes in 5 slices...")

    try:
        result = await twap.execute(
            symbol="AAPL",
            total_quantity=500,
            action="BUY",
            time_window_minutes=5,
            num_slices=5,
            randomize_timing=True,
        )

        logger.info("\n" + "=" * 80)
        logger.info("TWAP EXECUTION RESULTS")
        logger.info("=" * 80)
        logger.info(f"Execution ID: {result['execution_id']}")
        logger.info(f"Symbol: {result['symbol']}")
        logger.info(f"Total Quantity: {result['total_quantity']}")
        logger.info(f"Executed Quantity: {result['executed_quantity']}")
        logger.info(f"Average Price: ${result['avg_price']:.2f}")
        logger.info(f"Total Cost: ${result['total_cost']:,.2f}")
        logger.info(
            f"Slices Executed: {result['slices_executed']}/{result['total_slices']}"
        )
        logger.info(f"Duration: {result['duration_minutes']:.2f} minutes")
        logger.info(f"Status: {result['status']}")

        # Show slice details
        logger.info("\nSlice Details:")
        for slice_obj in result["slices"]:
            logger.info(
                f"  Slice {slice_obj.slice_id}: {slice_obj.quantity} shares @ "
                f"${slice_obj.fill_price:.2f} - {slice_obj.status}"
            )

        return result

    except Exception as e:
        logger.error(f"TWAP execution failed: {e}")
        return None


async def demo_vwap_execution():
    """Demonstrate VWAP execution."""
    logger.info("\n" + "=" * 80)
    logger.info("VWAP EXECUTION DEMO")
    logger.info("=" * 80)

    # Setup
    config = Config.from_env()
    paper_trader = PaperTrader(config=config, enable_risk_systems=False)
    order_manager = OrderManager(config=config, paper_trader=paper_trader)

    # Create VWAP executor
    vwap = VWAPExecutor(order_manager=order_manager, vwap_deviation_threshold=0.01)

    logger.info("Executing VWAP order: BUY 2000 AAPL using volume profile...")

    try:
        result = await vwap.execute(
            symbol="AAPL",
            total_quantity=2000,
            action="BUY",
            time_window_minutes=60,  # 1 hour window
        )

        logger.info("\n" + "=" * 80)
        logger.info("VWAP EXECUTION RESULTS")
        logger.info("=" * 80)
        logger.info(f"Execution ID: {result['execution_id']}")
        logger.info(f"Symbol: {result['symbol']}")
        logger.info(f"Total Quantity: {result['total_quantity']}")
        logger.info(f"Executed Quantity: {result['executed_quantity']}")
        logger.info(f"Average Price: ${result['avg_price']:.2f}")
        logger.info(f"VWAP Price: ${result['vwap_price']:.2f}")
        logger.info(f"VWAP Deviation: {result['vwap_deviation_pct']:.2%}")
        logger.info(f"Total Cost: ${result['total_cost']:,.2f}")
        logger.info(
            f"Slices Executed: {result['slices_executed']}/{result['total_slices']}"
        )
        logger.info(f"Duration: {result['duration_minutes']:.2f} minutes")

        # Show slice details
        logger.info("\nVolume-Weighted Slice Details:")
        for slice_obj in result["slices"][:5]:  # Show first 5
            logger.info(
                f"  Slice {slice_obj.slice_id}: {slice_obj.quantity} shares "
                f"(volume: {slice_obj.expected_volume_pct:.1%}) @ "
                f"${slice_obj.fill_price:.2f} - {slice_obj.status}"
            )

        return result

    except Exception as e:
        logger.error(f"VWAP execution failed: {e}")
        return None


def demo_slippage_modeling():
    """Demonstrate slippage modeling."""
    logger.info("\n" + "=" * 80)
    logger.info("SLIPPAGE MODELING DEMO")
    logger.info("=" * 80)

    slippage_model = SlippageModel(
        base_spread_bps=5.0, impact_coefficient=0.1, urgency_multiplier=1.5
    )

    # Estimate slippage for different order sizes
    order_sizes = [100, 1000, 10000]
    current_price = 150.0
    avg_daily_volume = 100_000_000

    logger.info(f"Estimating slippage for AAPL @ ${current_price:.2f}")
    logger.info(f"Average Daily Volume: {avg_daily_volume:,}")
    logger.info("")

    for quantity in order_sizes:
        # Market order estimate
        market_estimate = slippage_model.estimate_slippage(
            symbol="AAPL",
            quantity=quantity,
            action="BUY",
            current_price=current_price,
            avg_daily_volume=avg_daily_volume,
            volatility=0.30,  # 30% annualized volatility
            order_type="MARKET",
        )

        logger.info(f"Order Size: {quantity} shares (${quantity * current_price:,.0f})")
        logger.info("  Market Order:")
        logger.info(f"    Total Slippage: {market_estimate.slippage_bps:.2f} bps")
        logger.info(f"    Slippage Cost: ${market_estimate.slippage_dollars:.2f}")
        logger.info(f"    Expected Fill: ${market_estimate.estimated_fill_price:.2f}")
        logger.info("    Components:")
        for component, value in market_estimate.components.items():
            logger.info(f"      {component}: {value:.2f} bps")

        # Limit order estimate
        limit_estimate = slippage_model.estimate_slippage(
            symbol="AAPL",
            quantity=quantity,
            action="BUY",
            current_price=current_price,
            avg_daily_volume=avg_daily_volume,
            volatility=0.30,
            order_type="LIMIT",
        )

        logger.info("  Limit Order:")
        logger.info(f"    Total Slippage: {limit_estimate.slippage_bps:.2f} bps")
        logger.info(f"    Slippage Cost: ${limit_estimate.slippage_dollars:.2f}")
        logger.info("")

    # Record some actual slippage
    logger.info("Recording actual slippage data...")
    slippage_model.record_actual_slippage("AAPL", 1000, "BUY", 150.0, 150.12)
    slippage_model.record_actual_slippage("AAPL", 500, "SELL", 150.0, 149.92)
    slippage_model.record_actual_slippage("AAPL", 2000, "BUY", 150.0, 150.18)

    # Get statistics
    stats = slippage_model.get_slippage_statistics()
    logger.info("\nSlippage Statistics:")
    logger.info(f"  Total Trades: {stats['total_trades']}")
    logger.info(f"  Average Slippage: {stats['avg_slippage_bps']:.2f} bps")
    logger.info(f"  Max Slippage: {stats['max_slippage_bps']:.2f} bps")
    logger.info(f"  Total Slippage Cost: ${stats['total_slippage_cost']:.2f}")

    return slippage_model


async def demo_smart_routing():
    """Demonstrate smart order routing."""
    logger.info("\n" + "=" * 80)
    logger.info("SMART ORDER ROUTING DEMO")
    logger.info("=" * 80)

    # Setup
    config = Config.from_env()
    paper_trader = PaperTrader(config=config, enable_risk_systems=False)
    order_manager = OrderManager(config=config, paper_trader=paper_trader)

    # Create router
    router = ExecutionRouter(
        order_manager=order_manager,
        small_order_threshold=10_000,
        large_order_threshold=100_000,
    )

    # Test different order sizes
    test_orders = [
        {"symbol": "AAPL", "quantity": 50, "urgency": "IMMEDIATE", "price": 150.0},
        {"symbol": "MSFT", "quantity": 500, "urgency": "NORMAL", "price": 300.0},
        {
            "symbol": "GOOGL",
            "quantity": 5000,
            "urgency": "NORMAL",
            "price": 120.0,
            "volume": 20_000_000,
        },
    ]

    results = []
    for order in test_orders:
        logger.info(
            f"\nRouting order: {order['urgency']} BUY {order['quantity']} "
            f"{order['symbol']} @ ${order['price']:.2f}"
        )

        result = await router.route_order(
            symbol=order["symbol"],
            quantity=order["quantity"],
            action="BUY",
            current_price=order["price"],
            urgency=order["urgency"],
            avg_daily_volume=order.get("volume"),
        )

        logger.info(f"  → Routed to: {result['execution_type']}")
        logger.info(f"  → Avg Price: ${result.get('avg_price', 0):.2f}")

        results.append(result)

    # Show routing statistics
    logger.info("\n" + "=" * 80)
    logger.info("ROUTING STATISTICS")
    logger.info("=" * 80)

    stats = router.get_execution_statistics()
    logger.info(f"Total Executions: {stats['total_executions']}")
    logger.info("By Strategy:")
    for strategy, count in stats["by_strategy"].items():
        logger.info(f"  {strategy}: {count}")

    return results


def demo_execution_monitoring(execution_results):
    """Demonstrate execution monitoring."""
    logger.info("\n" + "=" * 80)
    logger.info("EXECUTION MONITORING DEMO")
    logger.info("=" * 80)

    monitor = ExecutionMonitor(
        slippage_threshold_bps=20.0,
        vwap_deviation_threshold=0.01,
        failed_order_threshold=3,
    )

    # Monitor all executions
    for result in execution_results:
        monitor.monitor_execution(result)

    # Get active alerts
    active_alerts = monitor.get_active_alerts()
    logger.info(f"\nActive Alerts: {len(active_alerts)}")
    for alert in active_alerts:
        logger.info(f"  [{alert.severity.value}] {alert.alert_type}: {alert.message}")

    # Get daily summary
    summary = monitor.get_daily_summary()
    logger.info("\n" + "=" * 80)
    logger.info("DAILY EXECUTION SUMMARY")
    logger.info("=" * 80)
    logger.info(f"Date: {summary['date']}")
    logger.info(f"Total Executions: {summary['total_executions']}")
    logger.info(f"Successful: {summary['successful_executions']}")
    logger.info(f"Failed: {summary['failed_executions']}")
    logger.info(f"Success Rate: {summary['success_rate']:.1%}")
    logger.info(f"Total Volume: {summary['total_volume']:,} shares")
    logger.info(f"Total Value: ${summary['total_value']:,.2f}")

    # Get execution quality score
    quality = monitor.get_execution_quality_score()
    logger.info("\n" + "=" * 80)
    logger.info("EXECUTION QUALITY SCORE")
    logger.info("=" * 80)
    logger.info(f"Quality Score: {quality['quality_score']:.1f}/100")
    logger.info(f"Grade: {quality['grade']}")
    logger.info("Breakdown:")
    for component, score in quality["breakdown"].items():
        logger.info(f"  {component}: {score:.1f}")

    return monitor


async def main():
    """Run all execution demos."""
    logger.info("\n")
    logger.info("*" * 80)
    logger.info("*" + " " * 78 + "*")
    logger.info("*" + " " * 20 + "DEEPSTACK EXECUTION MODULE DEMO" + " " * 27 + "*")
    logger.info("*" + " " * 78 + "*")
    logger.info("*" * 80)
    logger.info("\n")

    execution_results = []

    # 1. TWAP Demo
    twap_result = await demo_twap_execution()
    if twap_result:
        execution_results.append(twap_result)

    # 2. VWAP Demo
    vwap_result = await demo_vwap_execution()
    if vwap_result:
        execution_results.append(vwap_result)

    # 3. Slippage Modeling Demo
    demo_slippage_modeling()

    # 4. Smart Routing Demo
    routing_results = await demo_smart_routing()
    execution_results.extend(routing_results)

    # 5. Execution Monitoring Demo
    demo_execution_monitoring(execution_results)

    logger.info("\n")
    logger.info("*" * 80)
    logger.info("*" + " " * 78 + "*")
    logger.info("*" + " " * 30 + "DEMO COMPLETE!" + " " * 33 + "*")
    logger.info("*" + " " * 78 + "*")
    logger.info("*" * 80)
    logger.info("\n")

    logger.info("The execution module is ready for production deployment!")
    logger.info("\nKey Features Demonstrated:")
    logger.info("  ✓ TWAP execution with time-based slicing")
    logger.info("  ✓ VWAP execution with volume-based slicing")
    logger.info("  ✓ Slippage modeling and estimation")
    logger.info("  ✓ Smart order routing based on size and urgency")
    logger.info("  ✓ Real-time execution monitoring and alerting")
    logger.info("  ✓ Performance metrics and quality scoring")
    logger.info("\nReady to minimize market impact and optimize execution!")


if __name__ == "__main__":
    asyncio.run(main())
