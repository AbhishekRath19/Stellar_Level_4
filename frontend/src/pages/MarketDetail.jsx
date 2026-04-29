import React, { useState, useEffect } from 'react';
import { ArrowLeft, Share2, Info, Trophy, ChevronUp, ShieldCheck, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as StellarSdk from '@stellar/stellar-sdk';
import BetForm from '../components/BetForm';
import OddsDisplay from '../components/OddsDisplay';
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

const MarketDetail = ({ marketId, account, submitSorobanTx, onBack, refreshBalance, refreshTrigger }) => {
  const [market, setMarket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userPositions, setUserPositions] = useState([]);
  const [userBet, setUserBet] = useState(0); // This will hold the winnable amount if resolved
  const [showMobileBet, setShowMobileBet] = useState(false);
  const [server] = useState(new StellarSdk.rpc.Server(RPC_URL));

  useEffect(() => {
    fetchMarketData();
  }, [marketId, refreshTrigger]);

  const fetchMarketData = async () => {
    try {
      // 1. Handle Mock Markets
      if (marketId.toString().startsWith('mock')) {
        const mock = {
          'mock-1': {
            id: 'mock-1',
            question: "Will XLM reach $1.00 by 2026?",
            options: ["Yes", "No"],
            totalBets: ["50000000", "20000000"],
            closeTime: Math.floor(Date.now() / 1000) + 86400 * 10,
            resolved: false,
            winningOption: 0
          },
          'mock-2': {
            id: 'mock-2',
            question: "Will Soroban flip EVM in developer activity?",
            options: ["Definitely", "Maybe", "Not yet"],
            totalBets: ["10000000", "30000000", "5000000"],
            closeTime: Math.floor(Date.now() / 1000) + 86400 * 5,
            resolved: false,
            winningOption: 0
          }
        }[marketId];

        if (mock) {
          setMarket(mock);
          setLoading(false);
          return;
        }
      }

      // 2. Handle On-chain Markets
      const marketContract = new StellarSdk.Contract(CONTRACT_IDS.MARKET);
      
      const op = marketContract.call('get_market', StellarSdk.nativeToScVal(parseInt(marketId), { type: 'u32' }));
      const result = await server.simulateTransaction(
        new StellarSdk.TransactionBuilder(
          new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
          { fee: '100', networkPassphrase: 'Test SDF Network ; September 2015' }
        ).addOperation(op).setTimeout(StellarSdk.TimeoutInfinite).build()
      );

      if (result.result && result.result.retval) {
        const data = safeScValToNative(result.result.retval);
        setMarket({
          id: marketId,
          question: data.question.toString(),
          options: data.options.map(o => o.toString()),
          closeTime: Number(data.close_time),
          resolved: data.resolved,
          winningOption: data.winning_option,
          totalBets: data.total_bets.map(b => b.toString()),
          creator: data.creator.toString()
        });

        if (account) {
          const posPromises = data.options.map((_, idx) => {
            const betOp = marketContract.call('get_user_bet', 
              StellarSdk.nativeToScVal(parseInt(marketId), { type: 'u32' }),
              StellarSdk.nativeToScVal(account, { type: 'address' }),
              StellarSdk.nativeToScVal(idx, { type: 'u32' })
            );
            return server.simulateTransaction(
              new StellarSdk.TransactionBuilder(
                new StellarSdk.Account(account, '0'),
                { fee: '100', networkPassphrase: 'Test SDF Network ; September 2015' }
              ).addOperation(betOp).setTimeout(StellarSdk.TimeoutInfinite).build()
            ).then(res => ({ idx, res }));
          });

          const posResults = await Promise.all(posPromises);
          const activePositions = posResults
            .map(r => ({
              idx: r.idx,
              amount: r.res.result && r.res.result.retval ? Number(safeScValToNative(r.res.result.retval)) / 1e7 : 0
            }))
            .filter(p => p.amount > 0);
          
          setUserPositions(activePositions);
          
          if (data.resolved) {
            const winner = activePositions.find(p => p.idx === data.winning_option);
            setUserBet(winner ? winner.amount : 0);
          }
        }
      } else {
        throw new Error("Market data not found on-chain");
      }
    } catch (error) {
      console.error("Failed to fetch Soroban market:", error);
      alert("Synchronization Error: This market does not exist on the current network. Please deploy contracts and seed real markets.");
      onBack();
    } finally {
      setLoading(false);
    }
  };

  if (loading || !market) return (
    <div className="h-[80vh] flex flex-col items-center justify-center space-y-6">
      <div className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin shadow-[0_0_20px_#6366f1]" />
      <p className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-500 animate-pulse">Synchronizing Protocol</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-6 space-y-16 pb-32">
      <motion.button 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={onBack}
        className="flex items-center space-x-3 text-gray-500 hover:text-white transition-colors group"
      >
        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all">
          <ArrowLeft size={18} />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Protocol Index</span>
      </motion.button>

      <div className="grid lg:grid-cols-12 gap-16">
        <div className="lg:col-span-7 space-y-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center space-x-4">
              <span className="px-4 py-1.5 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-[10px] font-black text-brand-primary uppercase tracking-widest">
                Market ID: #{marketId}
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">Soroban Verified</span>
            </div>
            
            <h1 className="text-4xl sm:text-6xl font-black tracking-tighter leading-none uppercase text-white">
              {market.question}
            </h1>

            <div className="flex flex-wrap gap-6 pt-4">
              <div className="flex items-center space-x-3 bg-white/5 px-5 py-2.5 rounded-2xl border border-white/5">
                <div className={`w-2 h-2 ${market.resolved ? 'bg-gray-500' : 'bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]'} rounded-full`} />
                <span className="text-xs font-black uppercase tracking-widest text-gray-300">
                  {market.resolved ? 'Completed' : 'Accepting Positions'}
                </span>
              </div>
            </div>
          </motion.div>

          <div className="glass-panel p-10 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-10 opacity-[0.03] rotate-12 text-white">
               <TrendingUp size={150} />
             </div>
             <OddsDisplay totalBets={market.totalBets} options={market.options} />
          </div>

          {market.resolved && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="premium-button !bg-none bg-brand-surface border border-brand-accent/30 p-10 rounded-[3rem] flex items-center justify-between shadow-[0_0_50px_rgba(6,182,212,0.1)]"
            >
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-accent">Official Resolution</span>
                <p className="text-4xl font-black italic uppercase text-white">{market.options[market.winningOption]}</p>
              </div>
              <div className="w-20 h-20 rounded-[2rem] bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center">
                <Trophy className="text-brand-accent" size={40} />
              </div>
            </motion.div>
          )}

          {market.resolved && userBet > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel p-10 border-green-500/20 bg-green-500/5 space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-green-400">Winning Position Detected</p>
                  <p className="text-2xl font-black text-white">{userBet.toFixed(2)} MTK (Base)</p>
                </div>
                <button
                  onClick={async () => {
                    try {
                      const marketContract = new StellarSdk.Contract(CONTRACT_IDS.MARKET);
                      const claimOp = marketContract.call('claim_winnings',
                        StellarSdk.nativeToScVal(parseInt(marketId), { type: 'u32' }),
                        StellarSdk.nativeToScVal(account, { type: 'address' })
                      );
                      await submitSorobanTx(claimOp);
                      fetchMarketData();
                      refreshBalance();
                    } catch (e) {
                      console.error(e);
                      alert("Claim failed: " + e.message);
                    }
                  }}
                  className="px-8 py-4 rounded-2xl bg-green-500 text-black text-xs font-black uppercase tracking-widest hover:bg-green-400 transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                >
                  Claim Rewards
                </button>
              </div>
            </motion.div>
          )}

          <div className="glass-panel p-10 space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 text-brand-primary">
                <ShieldCheck size={20} />
                <h3 className="text-sm font-black uppercase tracking-widest">Protocol Integrity</h3>
              </div>
              {userPositions.length > 0 && (
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Your Holdings</span>
              )}
            </div>

            {userPositions.length > 0 ? (
              <div className="grid gap-4">
                {userPositions.map((pos) => (
                  <div key={pos.idx} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                    <span className="text-xs font-black uppercase text-gray-400">{market.options[pos.idx]}</span>
                    <span className="text-xs font-mono font-bold text-white">{pos.amount.toFixed(2)} MTK</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] font-medium text-gray-600 leading-relaxed uppercase tracking-widest text-center py-4">
                No active positions found for this account.
              </p>
            )}
          </div>

          {account && !market.resolved && market.creator === account && (
            <div className="glass-panel p-10 space-y-6 border-brand-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 text-brand-primary">
                  <Trophy size={20} />
                  <h3 className="text-lg font-black uppercase tracking-tighter">Creator Resolution</h3>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Admin Only</span>
              </div>
              <p className="text-gray-500 font-medium leading-relaxed text-sm">
                As the creator, you have the authority to resolve this market. Select the winning outcome to trigger atomic payout distribution.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {market.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={async () => {
                      try {
                        const marketContract = new StellarSdk.Contract(CONTRACT_IDS.MARKET);
                        const resolveOp = marketContract.call('resolve_market', 
                          StellarSdk.nativeToScVal(parseInt(marketId), { type: 'u32' }),
                          StellarSdk.nativeToScVal(idx, { type: 'u32' })
                        );
                        await submitSorobanTx(resolveOp);
                        fetchMarketData();
                      } catch (e) {
                        console.error(e);
                        alert("Resolution failed: " + e.message);
                      }
                    }}
                    className="px-6 py-3 rounded-xl border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:border-brand-primary/50 transition-all"
                  >
                    Resolve as: {option}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="hidden lg:block lg:col-span-5">
          <div className="sticky top-32 space-y-8">
            {!market.resolved && (
              <div className="glass-panel p-2">
                <BetForm 
                  market={market} 
                  marketId={marketId} 
                  account={account}
                  submitSorobanTx={submitSorobanTx}
                  onBetPlaced={() => {
                    fetchMarketData();
                    refreshBalance();
                  }} 
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showMobileBet && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileBet(false)}
              className="fixed inset-0 bg-brand-dark/80 backdrop-blur-md z-[60]"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="fixed bottom-0 left-0 right-0 z-[70] bg-brand-surface rounded-t-[4rem] border-t border-white/10 p-10"
            >
              <BetForm 
                market={market} 
                marketId={marketId} 
                account={account}
                submitSorobanTx={submitSorobanTx}
                transparent={true}
                onBetPlaced={() => {
                  fetchMarketData();
                  refreshBalance();
                  setShowMobileBet(false);
                }} 
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MarketDetail;
