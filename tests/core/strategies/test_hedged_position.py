from core.strategies.hedged_position import (
    HedgedPositionConfig,
    HedgedPositionManager,
    PositionType,
)


def test_create_hedged_position():
    manager = HedgedPositionManager()
    config = HedgedPositionConfig(
        symbol="GME",
        entry_price=20.0,
        total_shares=100,
        conviction_pct=0.60,
        tactical_pct=0.40,
    )

    pos = manager.create_position(config)

    assert pos.symbol == "GME"
    assert pos.conviction_pos.shares == 60
    assert pos.tactical_pos.shares == 40
    assert pos.conviction_pos.type == PositionType.CONVICTION
    assert pos.tactical_pos.type == PositionType.TACTICAL
    assert pos.total_value == 2000.0


def test_update_position_value():
    manager = HedgedPositionManager()
    config = HedgedPositionConfig(symbol="GME", entry_price=20.0, total_shares=100)
    manager.create_position(config)

    # Price goes up 50%
    manager.update_price("GME", 30.0)
    pos = manager.get_position("GME")

    assert pos.total_value == 3000.0
    assert pos.total_pnl == 1000.0
    assert pos.conviction_pos.unrealized_pnl == 600.0
    assert pos.tactical_pos.unrealized_pnl == 400.0
