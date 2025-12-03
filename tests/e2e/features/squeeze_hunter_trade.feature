Feature: Squeeze Hunter Trade Execution
  As a trading system
  I want to detect and execute short squeeze opportunities
  So that I can capitalize on rapid price movements

  Background:
    Given the trading system is initialized
    And the portfolio has 100000 dollars in cash
    And the market is open

  Scenario: Execute squeeze trade with high short interest
    Given "SQUZ" stock has 45 percent short interest
    And "SQUZ" has 8 days to cover
    And "SQUZ" has increasing volume trend
    And "SQUZ" is trading at 25.00 dollars
    When the squeeze hunter analyzes "SQUZ"
    Then a STRONG_BUY signal should be generated
    And the squeeze score should be above 75
    And a position should be opened
    And a tight trailing stop should be placed

  Scenario: Reject squeeze trade with low volume
    Given "LOWV" stock has 35 percent short interest
    And "LOWV" has 2 days to cover
    And "LOWV" has decreasing volume trend
    And "LOWV" is trading at 30.00 dollars
    When the squeeze hunter analyzes "LOWV"
    Then the squeeze score should be below 60
    And no position should be opened
