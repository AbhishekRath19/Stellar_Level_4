export const PREDICTION_MARKET_ABI = [
  "constructor(address _token, address _oracle)",
  "event BetPlaced(uint256 indexed marketId, address indexed user, uint256 optionIndex, uint256 amount)",
  "event MarketCreated(uint256 indexed marketId, string question, uint256 closeTime)",
  "event MarketResolved(uint256 indexed marketId, uint256 winningOption)",
  "event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount)",
  "function claimWinnings(uint256 _marketId)",
  "function createMarket(string _question, string[] _options, uint256 _closeTime, uint256 _resolveTime) returns (uint256)",
  "function getMarketOptions(uint256 _marketId) view returns (string[])",
  "function getMarketTotalBets(uint256 _marketId) view returns (uint256[])",
  "function hasClaimed(uint256, address) view returns (bool)",
  "function marketCount() view returns (uint256)",
  "function marketToken() view returns (address)",
  "function markets(uint256) view returns (string question, uint256 closeTime, uint256 resolveTime, bool resolved, uint256 winningOption, uint256 totalMarketBets)",
  "function oracle() view returns (address)",
  "function placeBet(uint256 _marketId, uint256 _optionIndex, uint256 _amount)",
  "function resolveMarket(uint256 _marketId)",
  "function userBets(uint256, address, uint256) view returns (uint256)"
];

export const MARKET_TOKEN_ABI = [
  "constructor()",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "function TOKEN_PRICE() view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function buyTokens() payable",
  "function decimals() view returns (uint8)",
  "function name() view returns (string)",
  "function owner() view returns (address)",
  "function redeemTokens(uint256 amount)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)"
];

export const ORACLE_ABI = [
  "constructor()",
  "event AuthorizationChanged(address indexed account, bool status)",
  "event OutcomeSet(uint256 indexed marketId, uint256 winningOption)",
  "event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)",
  "function getOutcome(uint256 marketId) view returns (uint256)",
  "function isAuthorized(address) view returns (bool)",
  "function isMarketResolved(uint256 marketId) view returns (bool)",
  "function owner() view returns (address)",
  "function setAuthorization(address account, bool status)",
  "function setOutcome(uint256 marketId, uint256 winningOption)"
];

export const ADDRESSES = {
  PREDICTION_MARKET: "0x0000000000000000000000000000000000000000",
  MARKET_TOKEN: "0x0000000000000000000000000000000000000000",
  ORACLE: "0x0000000000000000000000000000000000000000"
};
