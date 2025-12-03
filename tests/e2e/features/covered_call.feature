Feature: Covered Call Options Strategy
  As a trading system
  I want to execute covered call strategies
  So that I can generate additional income

  Background:
    Given the trading system is initialized
    And the portfolio has 100000 dollars in cash
    And options trading is enabled

  Scenario: Execute covered call on existing position
    Given the portfolio holds 100 shares of "AAPL" at 150 dollars
    And "AAPL" is trading at 155 dollars
    When the covered call strategy analyzes "AAPL"
    Then a SELL_CALL signal should be generated
    And the ATM call option should be selected
    And the call should be sold
    And premium should be collected
    And the position should be protected

  Scenario: Handle early assignment on covered call
    Given the portfolio holds 100 shares of "AAPL" at 150 dollars
    And the portfolio has sold calls on "AAPL" at strike 160
    And "AAPL" rallies to 170 dollars
    When assignment occurs
    Then shares should be delivered
    And profit should be realized
    And position should be closed
    And the overall trade should be profitable
