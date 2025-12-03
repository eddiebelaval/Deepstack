Feature: Circuit Breaker Risk Management
  As a trading system
  I want circuit breakers to halt trading during losses
  So that I can protect capital from catastrophic drawdown

  Background:
    Given the trading system is initialized
    And the portfolio has 100000 dollars in cash
    And circuit breakers are set at 2 percent daily loss limit

  Scenario: Trigger circuit breaker on 2 percent daily loss
    Given the portfolio has lost 2000 dollars today
    When a new trade signal is generated for "TEST"
    Then the circuit breaker should trip
    And all new trades should be blocked
    And an alert should be logged

  Scenario: Allow trading below loss threshold
    Given the portfolio has lost 1500 dollars today
    When a new trade signal is generated for "TEST"
    Then the circuit breaker should remain armed
    And the trade should be allowed to proceed
