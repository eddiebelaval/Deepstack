Feature: Tax Loss Harvesting Optimization
  As a trading system
  I want to harvest tax losses strategically
  So that I can generate 3-5 percent annual tax alpha

  Background:
    Given the trading system is initialized
    And the portfolio has 100000 dollars in cash
    And the tax loss harvester is enabled

  Scenario: Harvest loss and identify opportunity
    Given the portfolio holds 100 shares of "LOSER" at 150 dollar cost basis
    And "LOSER" is currently trading at 140 dollars
    And "ALTERN" is a suitable alternative at 145 dollars
    When the tax loss harvester scans opportunities
    Then a harvest opportunity should be identified for "LOSER"
    And the unrealized loss should be 1000 dollars
    And the tax benefit should be calculated
    And wash sale rules should be respected

  Scenario: Skip harvest when below minimum threshold
    Given the portfolio holds 10 shares of "SMALL" at 100 dollar cost basis
    And "SMALL" is currently trading at 98 dollars
    When the tax loss harvester scans opportunities
    Then no harvest opportunity should be identified
    And the reason should be below threshold
