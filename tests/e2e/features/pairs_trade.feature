Feature: Pairs Trading Statistical Arbitrage
  As a trading system
  I want to execute pairs trades when spreads diverge
  So that I can profit from mean reversion

  Background:
    Given the trading system is initialized
    And the portfolio has 100000 dollars in cash
    And pairs trading is enabled

  Scenario: Execute long-short pair on spread divergence
    Given "XOM" and "CVX" are a cointegrated pair
    And the spread has diverged 2 standard deviations
    And "XOM" is undervalued relative to "CVX"
    When the pairs trader detects the opportunity
    Then "XOM" should be bought
    And "CVX" should be shorted
    And the spread should be monitored
    And the pair should be balanced dollar-neutral

  Scenario: Exit pair on mean reversion
    Given the portfolio has an open pair with "XOM" long and "CVX" short
    And the spread has reverted to the mean
    When the pairs trader checks the spread
    Then both positions should be closed
    And profit should be realized
    And the trade should be complete
