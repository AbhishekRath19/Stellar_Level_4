import React, { useState, useEffect } from 'react';
import { ArrowLeft, Share2, Info, Trophy, ChevronUp, ShieldCheck, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as StellarSdk from '@stellar/stellar-sdk';
import BetForm from '../components/BetForm';
import OddsDisplay from '../components/OddsDisplay';
import { CONTRACT_IDS } from '../hooks/useStellar';

const RPC_URL = 'https://soroban-testnet.stellar.org';

const MarketDetail = ({ marketId, account, submitSorobanTx, onBack, refreshBalance, refreshTrigger }) => {
  const [market, setMarket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMobileBet, setShowMobileBet] = useState(false);
  const [server] = useState(new StellarSdk.SorobanRpc.Server(RPC_URL));

  useEffect(() => {
    fetchMarketData();
  }, [marketId, refreshTrigger]);

  const fetchMarketData = async () => {
    try {
      const marketContract = new StellarSdk.Contract(CONTRACT_IDS.MARKET);
      
      // Simulate a call to get_market
      const op = marketContract.call('get_market', StellarSdk.nativeToScVal(parseInt(marketId), { type: 'u32' }));
      const result = await server.simulateTransaction(
        new StellarSdk.TransactionBuilder(
          new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'), // Dummy account
          { fee: '100', networkPassphrase: 'Test SDF Network ; September 2015' }
        ).addOperation(op).build()
      );

      if (result.result) {
        const data = StellarSdk.scValToNative(result.result.retval);
        setMarket({
          id: marketId,
          question: data.question.toString(),
          options: data.options.map(o => o.toString()),
          closeTime: Number(data.close_time),
          resolved: data.resolved,
          winningOption: data.winning_option,
          totalBets: data.total_bets.map(b => b.toString())
        });
      }
    } catch (error) {
      console.error("Failed to fetch Soroban market:", error);
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

          <div className="glass-panel p-10 space-y-6">
            <div className="flex items-center space-x-3 text-brand-accent">
              <ShieldCheck size={20} />
              <h3 className="text-lg font-black uppercase tracking-tighter">Soroban Integrity</h3>
            </div>
            <p className="text-gray-500 font-medium leading-relaxed">
              This market is executed on the Stellar network via Soroban smart contracts. 
              Inter-contract calls ensure atomic settlement between the Prediction Market and the MTK Asset.
            </p>
          </div>
        </div>

        <div className="hidden lg:block lg:col-span-5">
          <div className="sticky top-32 space-y-8">
            {!market.resolved && (
              <div className="glass-panel p-2">
                <BetForm 
                  market={market} 
                  marketId={marketId} 
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
