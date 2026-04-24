import { useEffect } from 'react';
import { toast } from 'sonner';
import { ethers } from 'ethers';

export const useEvents = (contracts, account, onMarketUpdate, refreshBalance) => {
  useEffect(() => {
    if (!contracts.market || !contracts.token) return;

    const handleBetPlaced = (marketId, user, optionIndex, amount) => {
      console.log(`Event: BetPlaced - Market ${marketId}, User ${user}, Option ${optionIndex}, Amount ${amount}`);
      
      // Notify user if it's their bet
      if (account && user.toLowerCase() === account.toLowerCase()) {
        toast.success(`Bet of ${ethers.formatEther(amount)} MTK placed!`, {
          description: `Market #${marketId.toString()}`,
        });
      } else {
        toast.info(`New bet on Market #${marketId.toString()}`, {
          description: `${ethers.formatEther(amount)} MTK placed`,
        });
      }

      // Trigger UI update
      if (onMarketUpdate) onMarketUpdate(Number(marketId));
    };

    const handleMarketResolved = (marketId, winningOption) => {
      console.log(`Event: MarketResolved - Market ${marketId}, Winner ${winningOption}`);
      
      toast.success(`Market #${marketId.toString()} Resolved!`, {
        description: `Winner: Option Index ${winningOption.toString()}`,
        duration: 10000,
      });

      if (onMarketUpdate) onMarketUpdate(Number(marketId));
    };

    const handleWinningsClaimed = (marketId, user, amount) => {
      console.log(`Event: WinningsClaimed - Market ${marketId}, User ${user}, Amount ${amount}`);
      
      if (account && user.toLowerCase() === account.toLowerCase()) {
        toast.success(`Winnings Claimed!`, {
          description: `You received ${ethers.formatEther(amount)} MTK`,
        });
        if (refreshBalance) refreshBalance();
      }
    };

    // Subscribing to events
    contracts.market.on("BetPlaced", handleBetPlaced);
    contracts.market.on("MarketResolved", handleMarketResolved);
    contracts.market.on("WinningsClaimed", handleWinningsClaimed);

    return () => {
      // Unsubscribing on unmount
      contracts.market.off("BetPlaced", handleBetPlaced);
      contracts.market.off("MarketResolved", handleMarketResolved);
      contracts.market.off("WinningsClaimed", handleWinningsClaimed);
    };
  }, [contracts.market, contracts.token, account, onMarketUpdate, refreshBalance]);
};
