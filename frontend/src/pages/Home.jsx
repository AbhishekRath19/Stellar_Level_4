import React, { useState, useEffect } from 'react';
import MarketCard from '../components/MarketCard';
import { ShoppingCart, TrendingUp, ShieldCheck, Zap, Globe, Coins, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import * as StellarSdk from '@stellar/stellar-sdk';
import { CONTRACT_IDS } from '../hooks/useStellar';

const RPC_URL = 'https://soroban-testnet.stellar.org';

const Home = ({ account, mintTokens, onMarketClick, refreshBalance, refreshTrigger }) => {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buyAmount, setBuyAmount] = useState('');
  const [buyLoading, setBuyLoading] = useState(false);
  const [server] = useState(new StellarSdk.SorobanRpc.Server(RPC_URL));

  useEffect(() => {
    fetchMarkets();
  }, [refreshTrigger]);

  const fetchMarkets = async () => {
    try {
      const marketContract = new StellarSdk.Contract(CONTRACT_IDS.MARKET);
      
      // 1. Get count
      const countOp = marketContract.call('get_count');
      const countResult = await server.simulateTransaction(
        new StellarSdk.TransactionBuilder(
          new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
          { fee: '100', networkPassphrase: 'Test SDF Network ; September 2015' }
        ).addOperation(countOp).build()
      );

      if (countResult.result) {
        const count = StellarSdk.scValToNative(countResult.result.retval);
        const fetchedMarkets = [];

        // 2. Fetch each market (in production we'd use events or a more efficient way)
        for (let i = 0; i < count; i++) {
          const mOp = marketContract.call('get_market', StellarSdk.nativeToScVal(i, { type: 'u32' }));
          const mResult = await server.simulateTransaction(
            new StellarSdk.TransactionBuilder(
              new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
              { fee: '100', networkPassphrase: 'Test SDF Network ; September 2015' }
            ).addOperation(mOp).build()
          );
          
          if (mResult.result) {
            const data = StellarSdk.scValToNative(mResult.result.retval);
            fetchedMarkets.push({
              id: i,
              question: data.question.toString(),
              options: data.options.map(o => o.toString()),
              totalBets: data.total_bets.map(b => b.toString()),
              closeTime: Number(data.close_time),
              resolved: data.resolved
            });
          }
        }
        setMarkets(fetchedMarkets);
      }
    } catch (error) {
      console.error("Failed to fetch Soroban markets:", error);
      // If fails, we keep empty array or show error
    } finally {
      setLoading(false);
    }
  };

  const handleBuyTokens = async (e) => {
    e.preventDefault();
    if (!buyAmount || isNaN(buyAmount)) return;
    setBuyLoading(true);
    
    try {
      await mintTokens(buyAmount);
      setBuyAmount('');
      refreshBalance();
    } catch (error) {
      console.error("Minting failed:", error);
    } finally {
      setBuyLoading(false);
    }
  };

  return (
    <div className="space-y-24 pb-20">
      <section className="relative pt-12 text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand-primary/10 blur-[150px] -z-10 rounded-full" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-brand-accent">
            <Zap size={12} className="fill-current" />
            <span>Stellar Soroban Network</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none uppercase text-white">
            Predict the <br />
            <span className="gradient-text italic">Infinite</span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg text-gray-500 font-medium leading-relaxed">
            High-performance prediction markets. Inter-contract calls, real-time streaming, and near-zero fees on Stellar.
          </p>
        </motion.div>
      </section>

      <div className="grid lg:grid-cols-12 gap-12 max-w-7xl mx-auto px-6">
        <div className="lg:col-span-4">
          <div className="glass-panel p-8 sticky top-32">
            <div className="flex items-center justify-between mb-10">
              <div className="space-y-1 text-white">
                <h2 className="text-2xl font-black uppercase tracking-tight">Mint MTK</h2>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Testnet Bootstrap</p>
              </div>
              <Coins className="text-brand-accent" size={32} />
            </div>

            <form onSubmit={handleBuyTokens} className="space-y-8">
              <div className="space-y-4">
                <div className="relative">
                  <input
                    type="number"
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-16 bg-brand-dark/50 border-2 border-white/5 rounded-2xl px-6 text-xl font-mono text-white focus:border-brand-primary/50 outline-none transition-all"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-1 bg-white/5 rounded-lg text-xs font-black uppercase text-white">MTK</div>
                </div>
              </div>

              <button
                disabled={buyLoading || !buyAmount || !account}
                className="premium-button w-full h-16 text-xs flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {buyLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span>Minting...</span>
                  </>
                ) : account ? 'Initialize Mint' : 'Connect Wallet to Mint'}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 text-white">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]" />
              <h2 className="text-3xl font-black uppercase tracking-tighter">Live Feed</h2>
            </div>
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 gap-8">
              {[1,2,3,4].map(i => <div key={i} className="h-72 glass-panel animate-pulse" />)}
            </div>
          ) : markets.length === 0 ? (
            <div className="h-64 flex items-center justify-center glass-panel border-dashed">
              <p className="text-gray-500 font-black uppercase tracking-widest text-xs">No active markets found</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-8">
              {markets.map((m) => (
                <MarketCard key={m.id} market={m} id={m.id} onClick={onMarketClick} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
