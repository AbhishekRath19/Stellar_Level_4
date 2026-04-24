// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MarketToken is ERC20, Ownable {
    uint256 public constant TOKEN_PRICE = 0.001 ether; // 1 token = 0.001 ETH/MATIC

    constructor() ERC20("MarketToken", "MTK") Ownable(msg.sender) {}

    /**
     * @dev Buy tokens by sending ETH/MATIC.
     * 1 Token = 0.001 ETH
     */
    function buyTokens() external payable {
        require(msg.value > 0, "Amount must be greater than 0");
        uint256 amountToMint = (msg.value * 10**decimals()) / TOKEN_PRICE;
        _mint(msg.sender, amountToMint);
    }

    /**
     * @dev Redeem tokens for ETH/MATIC.
     * @param amount The amount of tokens to redeem.
     */
    function redeemTokens(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");

        uint256 ethToReturn = (amount * TOKEN_PRICE) / 10**decimals();
        require(address(this).balance >= ethToReturn, "Insufficient contract balance");

        _burn(msg.sender, amount);
        (bool success, ) = payable(msg.sender).call{value: ethToReturn}("");
        require(success, "Transfer failed");
    }

    // Allow the contract to receive ETH
    receive() external payable {}
}
