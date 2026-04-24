// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Oracle is Ownable {
    mapping(uint256 => uint256) private _outcomes;
    mapping(uint256 => bool) private _isResolved;
    mapping(address => bool) public isAuthorized;

    event OutcomeSet(uint256 indexed marketId, uint256 winningOption);
    event AuthorizationChanged(address indexed account, bool status);

    modifier onlyAuthorized() {
        require(isAuthorized[msg.sender] || msg.sender == owner(), "Not authorized");
        _;
    }

    constructor() Ownable(msg.sender) {
        isAuthorized[msg.sender] = true;
    }

    function setAuthorization(address account, bool status) external onlyOwner {
        isAuthorized[account] = status;
        emit AuthorizationChanged(account, status);
    }

    function setOutcome(uint256 marketId, uint256 winningOption) external onlyAuthorized {
        require(!_isResolved[marketId], "Market already resolved");
        _outcomes[marketId] = winningOption;
        _isResolved[marketId] = true;
        emit OutcomeSet(marketId, winningOption);
    }

    function getOutcome(uint256 marketId) external view returns (uint256) {
        require(_isResolved[marketId], "Market not yet resolved");
        return _outcomes[marketId];
    }

    function isMarketResolved(uint256 marketId) external view returns (bool) {
        return _isResolved[marketId];
    }
}
