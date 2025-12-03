Feature: Regime Change Portfolio Rebalancing
  As a trading system
  I want to rebalance positions when market regime changes
  So that I can adapt to different market conditions

  Background:
    Given the trading system is initialized
    And the portfolio has 100000 dollars in cash
    And the current regime is BULL

  Scenario: Detect regime change from BULL to defensive
    Given the market shows defensive regime signals
    And VIX is above 28
    And the SMA 50 crosses below SMA 200
    When the regime detector analyzes market conditions
    Then a defensive regime should be detected
    And the confidence should be above 70 percent
    And a rebalance plan should be generated

  Scenario: Minimal rebalancing in stable regime
    Given the market shows BULL regime signals
    And VIX is below 20
    And the SMA 50 is above SMA 200
    When the regime detector analyzes market conditions
    Then a BULL regime should be detected
    And regime should remain unchanged
