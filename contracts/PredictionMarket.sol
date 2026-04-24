// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Oracle.sol";

contract PredictionMarket {
    struct Market {
        string question;
        string[] options;
        uint256 closeTime;
        uint256 resolveTime;
        uint256[] totalBets; // amount bet on each option
        bool resolved;
        uint256 winningOption;
        uint256 totalMarketBets;
    }

    IERC20 public marketToken;
    Oracle public oracle;
    uint256 public marketCount;
    mapping(uint256 => Market) public markets;
    // marketId => user => optionIndex => amount
    mapping(uint256 => mapping(address => mapping(uint256 => uint256))) public userBets;
    // marketId => user => claimed
    mapping(uint256 => mapping(address => bool)) public hasClaimed;

    event MarketCreated(uint256 indexed marketId, string question, uint256 closeTime);
    event BetPlaced(uint256 indexed marketId, address indexed user, uint256 optionIndex, uint256 amount);
    event MarketResolved(uint256 indexed marketId, uint256 winningOption);
    event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount);

    constructor(address _token, address _oracle) {
        marketToken = IERC20(_token);
        oracle = Oracle(_oracle);
    }

    function createMarket(
        string memory _question,
        string[] memory _options,
        uint256 _closeTime,
        uint256 _resolveTime
    ) external returns (uint256) {
        require(_options.length >= 2, "At least 2 options required");
        require(_closeTime > block.timestamp, "Close time must be in future");
        require(_resolveTime >= _closeTime, "Resolve time must be after close");

        uint256 marketId = marketCount++;
        Market storage market = markets[marketId];
        market.question = _question;
        market.options = _options;
        market.closeTime = _closeTime;
        market.resolveTime = _resolveTime;
        market.totalBets = new uint256[](_options.length);

        emit MarketCreated(marketId, _question, _closeTime);
        return marketId;
    }

    function placeBet(uint256 _marketId, uint256 _optionIndex, uint256 _amount) external {
        Market storage market = markets[_marketId];
        require(block.timestamp < market.closeTime, "Market closed for betting");
        require(_optionIndex < market.options.length, "Invalid option index");
        require(_amount > 0, "Amount must be greater than 0");

        marketToken.transferFrom(msg.sender, address(this), _amount);

        userBets[_marketId][msg.sender][_optionIndex] += _amount;
        market.totalBets[_optionIndex] += _amount;
        market.totalMarketBets += _amount;

        emit BetPlaced(_marketId, msg.sender, _optionIndex, _amount);
    }

    function resolveMarket(uint256 _marketId) external {
        Market storage market = markets[_marketId];
        require(!market.resolved, "Market already resolved");
        require(block.timestamp >= market.resolveTime, "Too early to resolve");

        uint256 outcome = oracle.getOutcome(_marketId);
        require(outcome < market.options.length, "Invalid outcome from oracle");

        market.winningOption = outcome;
        market.resolved = true;

        emit MarketResolved(_marketId, outcome);
    }

    function claimWinnings(uint256 _marketId) external {
        Market storage market = markets[_marketId];
        require(market.resolved, "Market not resolved");
        require(!hasClaimed[_marketId][msg.sender], "Winnings already claimed");

        uint256 userBetOnWinner = userBets[_marketId][msg.sender][market.winningOption];
        require(userBetOnWinner > 0, "No winning bet");

        uint256 totalWinningBets = market.totalBets[market.winningOption];
        
        // Winning = (userBet / totalWinningBets) * totalMarketBets
        uint256 payout = (userBetOnWinner * market.totalMarketBets) / totalWinningBets;

        hasClaimed[_marketId][msg.sender] = true;
        marketToken.transfer(msg.sender, payout);

        emit WinningsClaimed(_marketId, msg.sender, payout);
    }

    function getMarketOptions(uint256 _marketId) external view returns (string[] memory) {
        return markets[_marketId].options;
    }

    function getMarketTotalBets(uint256 _marketId) external view returns (uint256[] memory) {
        return markets[_marketId].totalBets;
    }
}
