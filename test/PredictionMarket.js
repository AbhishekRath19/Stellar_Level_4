import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("PredictionMarket Comprehensive Tests", function () {
  let MarketToken, token, Oracle, oracle, PredictionMarket, market;
  let owner, addr1, addr2, addr3;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();

    MarketToken = await ethers.getContractFactory("MarketToken");
    token = await MarketToken.deploy();

    Oracle = await ethers.getContractFactory("Oracle");
    oracle = await Oracle.deploy();

    PredictionMarket = await ethers.getContractFactory("PredictionMarket");
    market = await PredictionMarket.deploy(await token.getAddress(), await oracle.getAddress());
  });

  describe("Market Creation", function () {
    it("Should create a market with correct parameters", async function () {
      const question = "Will it rain today?";
      const options = ["Yes", "No", "Maybe"];
      const now = (await ethers.provider.getBlock("latest")).timestamp;
      const closeTime = now + 1000;
      const resolveTime = now + 2000;

      await expect(market.createMarket(question, options, closeTime, resolveTime))
        .to.emit(market, "MarketCreated")
        .withArgs(0, question, closeTime);

      const m = await market.markets(0);
      expect(m.question).to.equal(question);
      expect(m.closeTime).to.equal(closeTime);
      expect(m.resolveTime).to.equal(resolveTime);
      expect(m.resolved).to.be.false;
      
      const opt = await market.getMarketOptions(0);
      expect(opt).to.deep.equal(options);
    });

    it("Should fail if resolveTime is before closeTime", async function () {
      const now = (await ethers.provider.getBlock("latest")).timestamp;
      await expect(market.createMarket("Q", ["A", "B"], now + 2000, now + 1000))
        .to.be.revertedWith("Resolve must be after close");
    });
  });

  describe("Betting Logic", function () {
    beforeEach(async function () {
      const now = (await ethers.provider.getBlock("latest")).timestamp;
      await market.createMarket("Test?", ["A", "B"], now + 1000, now + 2000);
      await token.connect(addr1).buyTokens({ value: ethers.parseEther("0.1") }); // 100 tokens
      await token.connect(addr1).approve(await market.getAddress(), ethers.parseEther("100"));
    });

    it("Should allow betting on each option", async function () {
      await market.connect(addr1).placeBet(0, 0, ethers.parseEther("50"));
      await market.connect(addr1).placeBet(0, 1, ethers.parseEther("50"));
      
      const bets = await market.getMarketTotalBets(0);
      expect(bets[0]).to.equal(ethers.parseEther("50"));
      expect(bets[1]).to.equal(ethers.parseEther("50"));
    });

    it("Should fail if betting after close time", async function () {
      await ethers.provider.send("evm_increaseTime", [1001]);
      await ethers.provider.send("evm_mine");
      
      await expect(market.connect(addr1).placeBet(0, 0, ethers.parseEther("10")))
        .to.be.revertedWith("Market closed");
    });

    it("Should fail if balance is insufficient", async function () {
      await expect(market.connect(addr1).placeBet(0, 0, ethers.parseEther("200")))
        .to.be.reverted; // Standard ERC20 revert
    });
  });

  describe("Market Resolution", function () {
    beforeEach(async function () {
      const now = (await ethers.provider.getBlock("latest")).timestamp;
      await market.createMarket("Test?", ["A", "B"], now + 1000, now + 2000);
      await token.connect(addr1).buyTokens({ value: ethers.parseEther("0.1") });
      await token.connect(addr1).approve(await market.getAddress(), ethers.parseEther("100"));
      await market.connect(addr1).placeBet(0, 0, ethers.parseEther("50"));
    });

    it("Should only allow resolution after close time", async function () {
      await expect(market.resolveMarket(0)).to.be.revertedWith("Too early to resolve");
    });

    it("Should only allow resolution if oracle has set outcome", async function () {
      await ethers.provider.send("evm_increaseTime", [1001]);
      await expect(market.resolveMarket(0)).to.be.revertedWith("Not resolved by oracle");
    });

    it("Should correctly resolve and emit event", async function () {
      await ethers.provider.send("evm_increaseTime", [1001]);
      await oracle.setOutcome(0, 0);
      await expect(market.resolveMarket(0))
        .to.emit(market, "MarketResolved")
        .withArgs(0, 0);
      
      const m = await market.markets(0);
      expect(m.resolved).to.be.true;
      expect(m.winningOption).to.equal(0);
    });
  });

  describe("Payout and Claims", function () {
    beforeEach(async function () {
      const now = (await ethers.provider.getBlock("latest")).timestamp;
      await market.createMarket("Test?", ["A", "B"], now + 1000, now + 2000);
      
      // Addr1 bets 100 on A
      // Addr2 bets 300 on B
      await token.connect(addr1).buyTokens({ value: ethers.parseEther("0.1") });
      await token.connect(addr2).buyTokens({ value: ethers.parseEther("0.3") });
      await token.connect(addr1).approve(await market.getAddress(), ethers.parseEther("100"));
      await token.connect(addr2).approve(await market.getAddress(), ethers.parseEther("300"));
      
      await market.connect(addr1).placeBet(0, 0, ethers.parseEther("100"));
      await market.connect(addr2).placeBet(0, 1, ethers.parseEther("300"));
      
      await ethers.provider.send("evm_increaseTime", [1001]);
      await oracle.setOutcome(0, 0); // A wins
      await market.resolveMarket(0);
    });

    it("Should calculate payout correctly (Addr1 wins all)", async function () {
      const initialBal = await token.balanceOf(addr1.address); // 0
      await market.connect(addr1).claimWinnings(0);
      const finalBal = await token.balanceOf(addr1.address);
      
      // Total pool = 100 + 300 = 400
      // Addr1 share = 100/100 * 400 = 400
      expect(finalBal).to.equal(ethers.parseEther("400"));
    });

    it("Should fail if losing user tries to claim", async function () {
      await expect(market.connect(addr2).claimWinnings(0))
        .to.be.revertedWith("No winnings to claim");
    });

    it("Should fail if claiming twice", async function () {
      await market.connect(addr1).claimWinnings(0);
      await expect(market.connect(addr1).claimWinnings(0))
        .to.be.revertedWith("Already claimed");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle market with no bets", async function () {
      const now = (await ethers.provider.getBlock("latest")).timestamp;
      await market.createMarket("Empty?", ["A", "B"], now + 1000, now + 2000);
      await ethers.provider.send("evm_increaseTime", [1001]);
      await oracle.setOutcome(1, 0);
      await market.resolveMarket(1);
      
      // Should not revert but nothing to claim
      await expect(market.connect(addr1).claimWinnings(1))
        .to.be.revertedWith("No winnings to claim");
    });
  });
});
