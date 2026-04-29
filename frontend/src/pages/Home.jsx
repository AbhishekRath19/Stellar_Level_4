import React, { useState, useEffect } from 'react';
import MarketCard from '../components/MarketCard';
import { ShoppingCart, TrendingUp, ShieldCheck, Zap, Globe, Coins, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
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

const MOCK_MARKETS = [
  {
    id: 'mock-1',
    question: "Will XLM reach $1.00 by 2026?",
    options: ["Yes", "No"],
    totalBets: ["50000000", "20000000"],
    closeTime: Math.floor(Date.now() / 1000) + 86400 * 10,
    resolved: false,
    isMock: true
  },
  {
    id: 'mock-2',
    question: "Will Soroban flip EVM in developer activity?",
    options: ["Definitely", "Maybe", "Not yet"],
    totalBets: ["10000000", "30000000", "5000000"],
    closeTime: Math.floor(Date.now() / 1000) + 86400 * 5,
    resolved: false,
    isMock: true
  }
];

const Home = ({ account, mintTokens, fundAccount, seedMarkets, issueClassicToken, onMarketClick, onNavigate, refreshBalance, refreshTrigger }) => {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [buyAmount, setBuyAmount] = useState('');
  const [buyLoading, setBuyLoading] = useState(false);
  const [targetAddress, setTargetAddress] = useState('GBSPOJSZWH67DOIOYH6VI5LCHD2RDUXIGRVWTZV2GPW54BGO5RTBIKIH');
  const [classicCode, setClassicCode] = useState('');
  const [classicAmount, setClassicAmount] = useState('');
  const [classicLoading, setClassicLoading] = useState(false);
  const [server] = useState(new StellarSdk.rpc.Server(RPC_URL));

  useEffect(() => {
    fetchMarkets();
  }, [refreshTrigger]);

  const fetchMarkets = async () => {
    setLoading(true);
    try {
      // Check if IDs are placeholders
      if (CONTRACT_IDS.MARKET.startsWith('CDZZY')) {
        console.log("Using mock markets (placeholder IDs detected)");
        setMarkets(MOCK_MARKETS);
        setLoading(false);
        return;
      }

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
        
        if (count === 0) {
          setMarkets(MOCK_MARKETS); // Fallback to mocks if no live markets yet
          setLoading(false);
          return;
        }

        // 2. Fetch each market concurrently
        const marketPromises = [];
        for (let i = 0; i < count; i++) {
          const mOp = marketContract.call('get_market', StellarSdk.nativeToScVal(i, { type: 'u32' }));
          marketPromises.push(
            server.simulateTransaction(
              new StellarSdk.TransactionBuilder(
                new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
                { fee: '100', networkPassphrase: 'Test SDF Network ; September 2015' }
              ).addOperation(mOp).setTimeout(StellarSdk.TimeoutInfinite).build()
            ).then(res => ({ id: i, res }))
          );
        }

        const results = await Promise.all(marketPromises);
        const fetchedMarkets = results
          .filter(r => r.res.result)
          .map(r => {
            const data = safeScValToNative(r.res.result.retval);
            return {
              id: r.id,
              question: data.question.toString(),
              options: data.options.map(o => o.toString()),
              totalBets: data.total_bets.map(b => b.toString()),
              closeTime: Number(data.close_time),
              resolved: data.resolved
            };
          });

        setMarkets(fetchedMarkets);
      } else {
        setMarkets(MOCK_MARKETS);
      }
    } catch (error) {
      console.error("Failed to fetch Soroban markets, showing mocks:", error);
      setMarkets(MOCK_MARKETS);
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    if (!account) return;
    setSeeding(true);
    try {
      await seedMarkets();
      await fetchMarkets();
    } catch (error) {
      console.error(error);
    } finally {
      setSeeding(false);
    }
  };

  const handleBuyTokens = async (e) => {
    e.preventDefault();
    const amount = parseFloat(buyAmount);
    if (!buyAmount || isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount greater than 0");
      return;
    }
    setBuyLoading(true);
    
    try {
      await mintTokens(buyAmount, targetAddress);
      setBuyAmount('');
      refreshBalance();
    } catch (error) {
      console.error("Minting failed:", error);
    } finally {
      setBuyLoading(false);
    }
  };

  const handleIssueClassic = async (e) => {
    e.preventDefault();
    if (!classicCode || !classicAmount || isNaN(classicAmount) || parseFloat(classicAmount) <= 0) {
      alert("Please enter a valid code and amount");
      return;
    }
    
    setClassicLoading(true);
    try {
      const result = await issueClassicToken(classicCode.toUpperCase(), classicAmount);
      alert(`Success! Issued ${classicAmount} ${classicCode.toUpperCase()} to your account.\nIssuer: ${result.issuer}\nTX: ${result.txHash.slice(0, 8)}...`);
      setClassicCode('');
      setClassicAmount('');
    } catch (error) {
      console.error("Classic issuance failed:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setClassicLoading(false);
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
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Target Wallet (Airdrop Mode)</label>
                  <input
                    type="text"
                    value={targetAddress}
                    onChange={(e) => setTargetAddress(e.target.value)}
                    placeholder="G..."
                    className="w-full h-12 bg-brand-dark/30 border border-white/5 rounded-xl px-4 text-[10px] font-mono text-gray-400 focus:border-brand-primary/50 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-3">
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
                
                {account && (
                  <button
                    type="button"
                    onClick={fundAccount}
                    className="w-full py-3 rounded-xl border border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-white hover:border-white/10 transition-all"
                  >
                    Fund XLM (Friendbot)
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Classic Asset Issuance Section */}
          <div className="glass-panel p-8 mt-12">
            <div className="flex items-center justify-between mb-10">
              <div className="space-y-1 text-white">
                <h2 className="text-2xl font-black uppercase tracking-tight">Issue Classic</h2>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Stellar Trustlines</p>
              </div>
              <ShieldCheck className="text-brand-primary" size={32} />
            </div>

            <form onSubmit={handleIssueClassic} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Code</label>
                  <input
                    type="text"
                    value={classicCode}
                    onChange={(e) => setClassicCode(e.target.value)}
                    placeholder="e.g. USDC"
                    maxLength={12}
                    className="w-full h-12 bg-brand-dark/50 border-2 border-white/5 rounded-xl px-4 text-sm font-mono text-white focus:border-brand-primary/50 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Amount</label>
                  <input
                    type="number"
                    value={classicAmount}
                    onChange={(e) => setClassicAmount(e.target.value)}
                    placeholder="0"
                    className="w-full h-12 bg-brand-dark/50 border-2 border-white/5 rounded-xl px-4 text-sm font-mono text-white focus:border-brand-primary/50 outline-none transition-all"
                  />
                </div>
              </div>

              <button
                disabled={classicLoading || !classicCode || !classicAmount || !account}
                className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white hover:bg-brand-primary/20 hover:border-brand-primary/50 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {classicLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span>Processing Trustline...</span>
                  </>
                ) : account ? 'Setup & Issue Asset' : 'Connect Wallet'}
              </button>
              
              <p className="text-[9px] text-center text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
                This will create a temporary issuer, <br /> establish a trustline, and send tokens.
              </p>
            </form>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 text-white">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]" />
              <h2 className="text-3xl font-black uppercase tracking-tighter">Live Feed</h2>
            </div>
            {markets.length === 0 && account && (
               <button 
                onClick={handleSeed}
                disabled={seeding}
                className="flex items-center space-x-2 text-brand-accent text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors"
               >
                 {seeding ? <Loader2 className="animate-spin" size={12} /> : <TrendingUp size={12} />}
                 <span>{seeding ? "Seeding..." : "Seed Initial Markets"}</span>
               </button>
            )}
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 gap-8">
              {[1,2,3,4].map(i => <div key={i} className="h-72 glass-panel animate-pulse" />)}
            </div>
          ) : markets.length === 0 ? (
            <div className="h-80 flex flex-col items-center justify-center glass-panel border-dashed space-y-6">
              <div className="p-5 rounded-full bg-white/5 border border-white/5">
                <Globe size={32} className="text-gray-600" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-gray-500 font-black uppercase tracking-widest text-xs">No active markets found</p>
                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest max-w-[200px]">Be the first to launch a prediction event on Soroban.</p>
              </div>
              <div className="flex space-x-4">
                <button 
                  onClick={() => account ? onNavigate('create') : alert("Connect wallet to launch a market")}
                  className="px-8 py-3 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-[10px] font-black uppercase tracking-[0.2em] hover:bg-brand-primary/20 transition-all"
                >
                  Launch New Market
                </button>
                {account && (
                  <button 
                    onClick={handleSeed}
                    disabled={seeding}
                    className="px-8 py-3 rounded-xl bg-brand-accent/10 border border-brand-accent/20 text-brand-accent text-[10px] font-black uppercase tracking-[0.2em] hover:bg-brand-accent/20 transition-all"
                  >
                    {seeding ? "Seeding..." : "Quick Seed"}
                  </button>
                )}
              </div>
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
