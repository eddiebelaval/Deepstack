Feature: Complete Deep Value Trade Execution
  As a trading system
  I want to execute a complete deep value trade workflow
  So that I can validate end-to-end functionality

  Background:
    Given the trading system is initialized
    And the portfolio has 100000 dollars in cash
    And circuit breakers are armed
    And the market is open

  Scenario: Execute deep value trade with strong fundamentals
    Given "VALUE" stock has PE ratio 8.0 and PB ratio 0.6
    And "VALUE" is trading at 50.00 dollars
    When the strategy agent analyzes "VALUE"
    Then a BUY signal should be generated
    And the position size should be calculated
    And the order should be executed
    And a stop loss should be placed
    And the position should appear in the portfolio

  Scenario: Reject trade when circuit breaker trips
    Given the portfolio has lost 3 percent today
    And "VALUE" stock has PE ratio 8.0 and PB ratio 0.6
    When the strategy agent analyzes "VALUE"
    Then the circuit breaker should trip
    And no order should be executed

  Scenario: Calculate appropriate position size based on Kelly criterion
    Given "VALUE" stock has PE ratio 8.0 and PB ratio 0.6
    And "VALUE" is trading at 50.00 dollars
    When the strategy agent analyzes "VALUE" with 70 percent confidence
    Then the Kelly position size should not exceed 20 percent of portfolio
    And the position size should reflect the confidence level
