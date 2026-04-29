import React, { useState, useEffect } from 'react';
import { ArrowLeft, Share2, Info, Trophy, ChevronUp, ShieldCheck, TrendingUp, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as StellarSdk from '@stellar/stellar-sdk';
import BetForm from '../components/BetForm';
import OddsDisplay from '../components/OddsDisplay';
import { server, NETWORK_PASSPHRASE, MARKET_CONTRACT_ID, TOKEN_CONTRACT_ID } from '../config/stellar';
import { safeScValToNative } from '../hooks/useStellar';

const MarketDetail = ({ marketId, account, submitSorobanTx, onBack, refreshBalance, refreshTrigger }) => {
  const [market, setMarket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userPositions, setUserPositions] = useState([]);
  const [userBet, setUserBet] = useState(0); 
  const [showMobileBet, setShowMobileBet] = useState(false);

  useEffect(() => {
    fetchMarketData();
  }, [marketId, refreshTrigger]);

  const fetchMarketData = async () => {
    try {
      if (marketId.toString().startsWith('mock')) {
        const mock = {
          'mock-1': {
            id: 'mock-1', question: "Will XLM reach $1.00 by 2026?", options: ["Yes", "No"],
            totalBets: ["50000000", "20000000"], closeTime: Math.floor(Date.now() / 1000) + 86400 * 10,
            resolved: false, winningOption: 0
          },
          'mock-2': {
            id: 'mock-2', question: "Will Soroban adoption double in Q3?", options: ["Yes", "No"],
            totalBets: ["150000000", "80000000"], closeTime: Math.floor(Date.now() / 1000) + 86400 * 30,
            resolved: false, winningOption: 0
          },
          'mock-3': {
            id: 'mock-3', question: "Will Stellar launch a new major partnership?", options: ["Yes", "No"],
            totalBets: ["300000000", "50000000"], closeTime: Math.floor(Date.now() / 1000) + 86400 * 5,
            resolved: false, winningOption: 0
          }
        };
        setMarket(mock[marketId] || mock['mock-1']);
        setLoading(false);
        return;
      }

      const marketContract = new StellarSdk.Contract(MARKET_CONTRACT_ID);
      const mOp = marketContract.call('get_market', StellarSdk.nativeToScVal(marketId, { type: 'u32' }));
      const result = await server.simulateTransaction(
        new StellarSdk.TransactionBuilder(
          new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0'),
          { fee: '100', networkPassphrase: NETWORK_PASSPHRASE }
        ).addOperation(mOp).setTimeout(StellarSdk.TimeoutInfinite).build()
      );

      if (result.result) {
        const data = safeScValToNative(result.result.retval);
        setMarket({
          id: marketId,
          question: data.question.toString(),
          options: data.options.map(o => o.toString()),
          totalBets: data.total_bets.map(b => b.toString()),
          closeTime: Number(data.close_time),
          resolved: data.resolved,
          winningOption: data.winning_option
        });

        if (account) {
          const posOp = marketContract.call('get_position', 
            StellarSdk.nativeToScVal(marketId, { type: 'u32' }),
            StellarSdk.nativeToScVal(account, { type: 'address' })
          );
          const posRes = await server.simulateTransaction(
            new StellarSdk.TransactionBuilder(
              new StellarSdk.Account(account, '0'),
              { fee: '100', networkPassphrase: NETWORK_PASSPHRASE }
            ).addOperation(posOp).setTimeout(StellarSdk.TimeoutInfinite).build()
          );
          if (posRes.result) {
            const posData = safeScValToNative(posRes.result.retval);
            setUserPositions(posData.map(p => p.toString()));
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceBet = async (optionIndex, amount) => {
    if (!account) return;
    try {
      console.log("Preparing bet...");
      const sourceAccount = await server.getAccount(account);
      const marketContract = new StellarSdk.Contract(MARKET_CONTRACT_ID);
      const amountRaw = BigInt(Math.floor(amount * 1e7));
      
      const operation = marketContract.call('place_bet',
        StellarSdk.nativeToScVal(marketId, { type: 'u32' }),
        StellarSdk.nativeToScVal(account, { type: 'address' }),
        StellarSdk.nativeToScVal(optionIndex, { type: 'u32' }),
        StellarSdk.nativeToScVal(amountRaw, { type: 'i128' })
      );

      const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
      .addOperation(operation)
      .setTimeout(30)
      .build();

      const prepared = await server.prepareTransaction(tx);
      await submitSorobanTx(prepared);
      
      refreshBalance();
      fetchMarketData();
    } catch (error) {
      console.error("Bet placement failed:", error);
      alert(error.message);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-brand-primary" size={48} /></div>;

  if (!market) return <div className="h-screen flex items-center justify-center"><div className="text-white text-xl">Market not found</div></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      <button onClick={onBack} className="group flex items-center space-x-3 text-gray-500 hover:text-white transition-all">
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-[10px] font-black uppercase tracking-widest">Back to Markets</span>
      </button>

      <div className="grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-10">
          <div className="space-y-6">
             <div className="flex items-center space-x-3 text-brand-accent">
                <TrendingUp size={16} />
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Live Prediction</span>
             </div>
             <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white leading-none">
                {market.question}
             </h1>
          </div>

          <OddsDisplay 
            options={market.options} 
            totalBets={market.totalBets} 
            resolved={market.resolved}
            winningOption={market.winningOption}
          />
        </div>

        <div className="lg:col-span-4">
           <div className="glass-panel p-8 sticky top-32 space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black uppercase tracking-tight text-white">Place Position</h3>
                <ShieldCheck className="text-brand-primary" size={24} />
              </div>
              <BetForm 
                market={market}
                marketId={marketId}
                account={account}
                submitSorobanTx={submitSorobanTx}
                onBetPlaced={() => {
                  refreshBalance();
                  fetchMarketData();
                }}
              />
           </div>
        </div>
      </div>
    </div>
  );
};

export default MarketDetail;
