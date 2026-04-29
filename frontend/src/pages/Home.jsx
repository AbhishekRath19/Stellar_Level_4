import React, { useState, useEffect } from 'react';
import MarketCard from '../components/MarketCard';
import { ShoppingCart, TrendingUp, ShieldCheck, Zap, Globe, Coins, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import * as StellarSdk from '@stellar/stellar-sdk';
import { server, NETWORK_PASSPHRASE, TOKEN_CONTRACT_ID, MARKET_CONTRACT_ID } from '../config/stellar';
import { safeScValToNative } from '../hooks/useStellar';

const MOCK_MARKETS = [
  {
    id: 'mock-1',
    question: "Will XLM reach $1.00 by 2026?",
    options: ["Yes", "No"],
    totalBets: ["50000000", "20000000"],
    closeTime: Math.floor(Date.now() / 1000) + 86400 * 10,
    resolved: false,
    isMock: true
  }
];

const Home = ({ account, fundAccount, seedMarkets, submitSorobanTx, onMarketClick, onNavigate, refreshBalance, refreshTrigger }) => {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [buyAmount, setBuyAmount] = useState('');
  const [buyLoading, setBuyLoading] = useState(false);
  const [targetAddress, setTargetAddress] = useState('GBSPOJSZWH67DOIOYH6VI5LCHD2RDUXIGRVWTZV2GPW54BGO5RTBIKIH');

  useEffect(() => {
    fetchMarkets();
  }, [refreshTrigger]);

  const fetchMarkets = async () => {
    setLoading(true);
    try {
      const marketContract = new StellarSdk.Contract(MARKET_CONTRACT_ID);
      const countOp = marketContract.call('get_count');
      const countResult = await server.simulateTransaction(
        new StellarSdk.TransactionBuilder(
          new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
          { fee: '100', networkPassphrase: NETWORK_PASSPHRASE }
        ).addOperation(countOp).setTimeout(StellarSdk.TimeoutInfinite).build()
      );

      if (countResult.result && countResult.result.retval) {
        const count = safeScValToNative(countResult.result.retval);
        if (count === 0) {
          setMarkets(MOCK_MARKETS);
          setLoading(false);
          return;
        }

        const marketPromises = [];
        for (let i = 0; i < count; i++) {
          const mOp = marketContract.call('get_market', StellarSdk.nativeToScVal(i, { type: 'u32' }));
          marketPromises.push(
            server.simulateTransaction(
              new StellarSdk.TransactionBuilder(
                new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
                { fee: '100', networkPassphrase: NETWORK_PASSPHRASE }
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
      console.error("Failed to fetch Soroban markets:", error);
      setMarkets(MOCK_MARKETS);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fixed handleBuyTokens (Mint) Function
   * Follows User Template exactly for Level 4 Submission
   */
  const handleBuyTokens = async (e) => {
    e.preventDefault();
    try {
      console.log("🎯 Starting token purchase...");
      
      if (!account) {
        alert("Please connect your Freighter wallet first");
        return;
      }

      const amount = parseFloat(buyAmount);
      if (!buyAmount || isNaN(amount) || amount <= 0) {
        alert("Please enter a valid amount");
        return;
      }

      setBuyLoading(true);
      console.log(`Attempting to mint ${amount} tokens for ${targetAddress}`);

      // 1. Load account from network
      const sourceAccount = await server.getAccount(account);
      console.log("✅ Account loaded, sequence:", sourceAccount.sequenceNumber());

      // 2. Create contract instance
      const contract = new StellarSdk.Contract(TOKEN_CONTRACT_ID);
      
      // 3. Build contract invocation operation
      // amountRaw is i128 (standard for Soroban tokens)
      const amountRaw = BigInt(Math.floor(amount * 1e7));
      const mintOperation = contract.call(
        'mint',
        StellarSdk.nativeToScVal(targetAddress, { type: 'address' }),
        StellarSdk.nativeToScVal(amountRaw, { type: 'i128' })
      );

      // 4. Build transaction
      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
      .addOperation(mintOperation)
      .setTimeout(30)
      .build();

      console.log("✅ Transaction built");

      // 5. CRITICAL - Prepare transaction for Soroban (simulate + add footprint)
      console.log("🔄 Preparing transaction (simulation)...");
      const preparedTransaction = await server.prepareTransaction(transaction);
      console.log("✅ Transaction prepared successfully");

      // 6. Submit the prepared transaction
      const result = await submitSorobanTx(preparedTransaction);

      console.log("✅ Tokens minted successfully!", result);
      alert(`Successfully minted ${amount} tokens!\nTransaction Hash: ${result.hash}`);

      setBuyAmount('');
      refreshBalance();

    } catch (error) {
      console.error("❌ Minting error:", error);
      alert("Failed to mint tokens: " + (error.message || "Unknown error"));
    } finally {
      setBuyLoading(false);
    }
  };

  return (
    <div className="space-y-24 pb-20">
      {/* Hero Section */}
      <section className="relative pt-12 text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand-primary/10 blur-[150px] -z-10 rounded-full" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-brand-accent">
            <Zap size={12} className="fill-current" />
            <span>Stellar Soroban Network</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none uppercase text-white">
            Predict the <br /> <span className="gradient-text italic">Infinite</span>
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
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Target Wallet</label>
                  <input
                    type="text"
                    value={targetAddress}
                    onChange={(e) => setTargetAddress(e.target.value)}
                    className="w-full h-12 bg-brand-dark/30 border border-white/5 rounded-xl px-4 text-[10px] font-mono text-gray-400 focus:border-brand-primary/50 outline-none transition-all"
                  />
                </div>
              </div>

              <button
                disabled={buyLoading || !buyAmount || !account}
                className="premium-button w-full h-16 text-xs flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {buyLoading ? <Loader2 className="animate-spin" size={16} /> : (account ? 'Initialize Mint' : 'Connect Wallet')}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-10">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Live Feed</h2>
            <button onClick={() => setMarkets([])} className="text-gray-600 text-[10px] uppercase font-black hover:text-white transition-all">Refresh</button>
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 gap-8">
              {[1,2].map(i => <div key={i} className="h-64 glass-panel animate-pulse" />)}
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
