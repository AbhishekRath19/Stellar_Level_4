import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Wallet, History, Gift, TrendingUp } from 'lucide-react';

const MyBets = ({ contracts, account, refreshBalance }) => {
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMyBets = async () => {
    if (!contracts.market || !account) return;
    try {
      const count = await contracts.market.marketCount();
      const userBetsArr = [];
      
      for (let i = 0; i < Number(count); i++) {
        const m = await contracts.market.markets(i);
        const options = await contracts.market.getMarketOptions(i);
        
        let userTotalOnMarket = 0;
        const positions = [];
        
        for (let j = 0; j < options.length; j++) {
          const amount = await contracts.market.userBets(i, account, j);
          if (amount > 0) {
            positions.push({ option: options[j], amount: ethers.formatEther(amount), optionIndex: j });
            userTotalOnMarket += parseFloat(ethers.formatEther(amount));
          }
        }

        if (positions.length > 0) {
          const claimed = await contracts.market.hasClaimed(i, account);
          userBetsArr.push({ 
            id: i, 
            question: m.question, 
            positions, 
            total: userTotalOnMarket,
            resolved: m.resolved,
            winningOption: m.winningOption,
            claimed
          });
        }
      }
      setBets(userBetsArr);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyBets();
  }, [contracts.market, account]);

  const handleClaim = async (marketId) => {
    try {
      const tx = await contracts.market.claimWinnings(marketId);
      await tx.wait();
      fetchMyBets();
      refreshBalance();
    } catch (error) {
      console.error(error);
      alert(error.reason || "Claim failed. Are you sure you won?");
    }
  };

  if (!account) return <div className="h-96 flex flex-col items-center justify-center space-y-4">
    <Wallet size={48} className="text-gray-600" />
    <p className="text-gray-500 font-bold uppercase tracking-widest">Connect wallet to see your bets</p>
  </div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8 sm:space-y-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Your Positions</h1>
          <p className="text-gray-500 font-medium text-sm sm:text-base">Track your performance and claim winnings.</p>
        </div>
        <div className="text-left sm:text-right">
          <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Active Bets</span>
          <p className="text-2xl font-black text-brand-primary">{bets.length}</p>
        </div>
      </div>

      <div className="space-y-6">
        {loading ? (
          [1,2].map(i => <div key={i} className="h-32 glass rounded-3xl animate-pulse" />)
        ) : bets.length === 0 ? (
          <div className="glass p-12 rounded-[2.5rem] text-center space-y-4">
            <History size={48} className="mx-auto text-gray-700" />
            <p className="text-gray-500 font-bold uppercase tracking-widest">No bets found yet</p>
            <button 
              onClick={() => onNavigate('home')}
              className="text-brand-primary text-sm font-black underline"
            >
              Go to Markets
            </button>
          </div>
        ) : (
          bets.map((bet) => (
            <div key={bet.id} className="glass p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] flex flex-col lg:flex-row lg:items-center gap-6 sm:gap-8 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full gradient-bg opacity-50 group-hover:w-2 transition-all" />
              
              <div className="flex-1 space-y-4 sm:space-y-2">
                <h3 className="text-lg sm:text-xl font-bold line-clamp-1">{bet.question}</h3>
                <div className="flex flex-wrap gap-2">
                  {bet.positions.map((p, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] sm:text-xs font-mono text-gray-400">
                      {p.amount} on <span className="text-white font-bold">{p.option}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-row sm:items-center justify-between lg:justify-end gap-6 sm:gap-8 shrink-0 pt-4 lg:pt-0 border-t lg:border-none border-white/5">
                <div className="text-left lg:text-right">
                  <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Investment</span>
                  <p className="text-lg sm:text-xl font-bold">{bet.total} MTK</p>
                </div>
                
                <div className="flex items-center">
                  {bet.resolved ? (
                    bet.claimed ? (
                      <span className="px-6 py-3 rounded-2xl bg-green-500/10 text-green-500 font-bold text-sm border border-green-500/20">
                        Claimed
                      </span>
                    ) : (
                      <button
                        onClick={() => handleClaim(bet.id)}
                        className="flex items-center space-x-2 px-6 py-3 gradient-bg rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 shadow-lg shadow-brand-primary/20 h-[48px]"
                      >
                        <Gift size={18} />
                        <span>Claim</span>
                      </button>
                    )
                  ) : (
                    <div className="flex items-center space-x-2 text-brand-accent">
                      <TrendingUp size={18} />
                      <span className="text-sm font-black uppercase tracking-widest">Live</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>

  );
};

export default MyBets;
