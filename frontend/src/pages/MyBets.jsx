import React, { useState, useEffect } from 'react';
import { Wallet, History, Gift, TrendingUp, Loader2 } from 'lucide-react';
import * as StellarSdk from '@stellar/stellar-sdk';
import { CONTRACT_IDS } from '../hooks/useStellar';

const RPC_URL = 'https://soroban-testnet.stellar.org';

const safeScValToNative = (scVal) => {
  if (scVal === null || scVal === undefined) return null;
  try {
    if (typeof scVal === 'string') {
      return StellarSdk.scValToNative(StellarSdk.xdr.ScVal.fromXDR(scVal, 'base64'));
    }
    if (typeof scVal.switch !== 'function') return scVal;
    return StellarSdk.scValToNative(scVal);
  } catch (e) {
    return scVal;
  }
};

const MyBets = ({ account, refreshBalance, submitSorobanTx }) => {
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [server] = useState(new StellarSdk.rpc.Server(RPC_URL));

  const fetchMyBets = async () => {
    if (!account) return;
    setLoading(true);
    try {
      const marketContract = new StellarSdk.Contract(CONTRACT_IDS.MARKET);
      
      // 1. Get count
      const countOp = marketContract.call('get_count');
      const countResult = await server.simulateTransaction(
        new StellarSdk.TransactionBuilder(
          new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
          { fee: '100', networkPassphrase: 'Test SDF Network ; September 2015' }
        ).addOperation(countOp).setTimeout(StellarSdk.TimeoutInfinite).build()
      );

      if (countResult.result && countResult.result.retval) {
        const count = safeScValToNative(countResult.result.retval);
        const userBetsArr = [];
        const userAddress = StellarSdk.Address.fromString(account);

        // Fetch each market and check user bets
        for (let i = 0; i < count; i++) {
          const mOp = marketContract.call('get_market', StellarSdk.nativeToScVal(i, { type: 'u32' }));
          const mResult = await server.simulateTransaction(
            new StellarSdk.TransactionBuilder(
              new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
              { fee: '100', networkPassphrase: 'Test SDF Network ; September 2015' }
            ).addOperation(mOp).setTimeout(StellarSdk.TimeoutInfinite).build()
          );
          
          if (mResult.result && mResult.result.retval) {
            const data = safeScValToNative(mResult.result.retval);
            const positions = [];
            let totalOnMarket = 0;

            // Check each option
            for (let j = 0; j < data.options.length; j++) {
              const betOp = marketContract.call('get_user_bet', 
                StellarSdk.nativeToScVal(i, { type: 'u32' }),
                userAddress.toScVal(),
                StellarSdk.nativeToScVal(j, { type: 'u32' })
              );
              const betResult = await server.simulateTransaction(
                new StellarSdk.TransactionBuilder(
                  new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
                  { fee: '100', networkPassphrase: 'Test SDF Network ; September 2015' }
                ).addOperation(betOp).setTimeout(StellarSdk.TimeoutInfinite).build()
              );

              if (betResult.result && betResult.result.retval) {
                const amount = safeScValToNative(betResult.result.retval);
                if (amount > 0) {
                  positions.push({ 
                    option: data.options[j].toString(), 
                    amount: (Number(amount) / 10000000).toFixed(2), // Assuming 7 decimals standard
                    optionIndex: j 
                  });
                  totalOnMarket += Number(amount) / 10000000;
                }
              }
            }

            if (positions.length > 0) {
              userBetsArr.push({ 
                id: i, 
                question: data.question.toString(), 
                positions, 
                total: totalOnMarket.toFixed(2),
                resolved: data.resolved,
                winningOption: data.winning_option
              });
            }
          }
        }
        setBets(userBetsArr);
      }
    } catch (error) {
      console.error("Failed to fetch user bets:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyBets();
  }, [account]);

  const handleClaim = async (marketId) => {
    try {
      const marketContract = new StellarSdk.Contract(CONTRACT_IDS.MARKET);
      const claimOp = marketContract.call('claim_winnings',
        StellarSdk.nativeToScVal(parseInt(marketId), { type: 'u32' }),
        StellarSdk.nativeToScVal(account, { type: 'address' })
      );
      await submitSorobanTx(claimOp);
      fetchMyBets();
      refreshBalance();
    } catch (e) {
      console.error(e);
      alert("Claim failed: " + e.message);
    }
  };

  if (!account) return (
    <div className="h-96 flex flex-col items-center justify-center space-y-4">
      <Wallet size={48} className="text-gray-600" />
      <p className="text-gray-500 font-bold uppercase tracking-widest">Connect wallet to see your bets</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8 sm:space-y-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white uppercase italic">Your Positions</h1>
          <p className="text-gray-500 font-medium text-sm sm:text-base">Track your performance on Soroban.</p>
        </div>
        <div className="text-left sm:text-right">
          <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Active Stakes</span>
          <p className="text-2xl font-black text-brand-primary italic">{bets.length}</p>
        </div>
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-brand-primary" size={32} />
          </div>
        ) : bets.length === 0 ? (
          <div className="glass-panel p-12 text-center space-y-4">
            <History size={48} className="mx-auto text-gray-700" />
            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">No activity detected on this account</p>
          </div>
        ) : (
          bets.map((bet) => (
            <div key={bet.id} className="glass-panel p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center gap-6 sm:gap-8 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full gradient-bg opacity-50 group-hover:w-2 transition-all" />
              
              <div className="flex-1 space-y-4 sm:space-y-2">
                <h3 className="text-lg sm:text-xl font-bold text-white uppercase italic tracking-tighter">{bet.question}</h3>
                <div className="flex flex-wrap gap-2">
                  {bet.positions.map((p, idx) => (
                    <span key={idx} className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] font-mono text-gray-400">
                      {p.amount} on <span className="text-brand-accent font-black uppercase">{p.option}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-row sm:items-center justify-between lg:justify-end gap-6 sm:gap-8 shrink-0 pt-4 lg:pt-0 border-t lg:border-none border-white/5">
                <div className="text-left lg:text-right">
                  <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Staked</span>
                  <p className="text-lg sm:text-xl font-black text-white">{bet.total} MTK</p>
                </div>
                
                <div className="flex items-center space-x-3">
                  {bet.resolved ? (
                    <>
                      <span className="px-4 py-2 rounded-xl bg-green-500/10 text-green-500 font-black text-[10px] uppercase tracking-widest border border-green-500/20">
                        Resolved
                      </span>
                      {bet.positions.some(p => p.optionIndex === bet.winningOption) && (
                        <button
                          onClick={() => handleClaim(bet.id)}
                          className="px-6 py-3 rounded-xl bg-brand-primary text-white font-black text-[10px] uppercase tracking-widest hover:bg-brand-primary/80 transition-all shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                        >
                          Claim Winnings
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center space-x-2 text-brand-accent">
                      <TrendingUp size={18} className="animate-pulse" />
                      <span className="text-xs font-black uppercase tracking-widest">Active</span>
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
