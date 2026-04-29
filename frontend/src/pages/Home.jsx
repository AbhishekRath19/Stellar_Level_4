import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, TrendingUp, Shield, Zap, ArrowRight, ExternalLink, RefreshCw, Layers } from 'lucide-react';
import { useStellar } from '../hooks/useStellar';
import * as StellarSdk from '@stellar/stellar-sdk';
import { server, NETWORK_PASSPHRASE, TOKEN_CONTRACT_ID } from '../config/stellar';
import { useSorobanEvents } from '../hooks/useSorobanEvents';

const Home = () => {
  const { account, tokenBalance, connectWallet, submitSorobanTx, connecting, fundAccount } = useStellar();
  const [amount, setAmount] = useState('');
  const [minting, setMinting] = useState(false);
  const { events } = useSorobanEvents(TOKEN_CONTRACT_ID);

  const handleBuyTokens = async () => {
    try {
      console.log("🎯 Starting token purchase...");
      
      if (!account) {
        alert("Please connect your Freighter wallet first");
        connectWallet();
        return;
      }

      const tokenAmount = parseFloat(amount);
      if (!tokenAmount || tokenAmount <= 0) {
        alert("Please enter a valid amount");
        return;
      }

      setMinting(true);
      console.log(`Attempting to mint ${tokenAmount} tokens for ${account}`);

      // Step 1: Load account
      console.log("📖 Loading account...");
      const sourceAccount = await server.getAccount(account);
      console.log("✅ Account loaded, sequence:", sourceAccount.sequenceNumber());

      // Step 2: Create contract instance
      const contract = new StellarSdk.Contract(TOKEN_CONTRACT_ID);
      const amountRaw = BigInt(Math.floor(tokenAmount * 1e7));

      // Step 3: Build operation
      const operation = contract.call(
        'mint',
        new StellarSdk.Address(account).toScVal(),
        StellarSdk.nativeToScVal(amountRaw, { type: 'i128' })
      );

      // Step 4: Build transaction
      console.log("🔨 Building transaction...");
      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      console.log("✅ Transaction built");

      // Step 5: Prepare transaction (simulation + resource footprint)
      console.log("🔄 Preparing transaction (simulation)...");
      const preparedTransaction = await server.prepareTransaction(transaction);
      console.log("✅ Transaction prepared successfully");

      // Step 6: Submit
      const result = await submitSorobanTx(preparedTransaction);

      // Step 7: Success
      console.log("✅ SUCCESS! Tokens minted:", result);
      alert(`Successfully minted ${tokenAmount} tokens!\n\nTransaction Hash: ${result.hash}`);
      setAmount('');

    } catch (error) {
      console.error("❌ Minting error:", error);
      alert(`Failed to mint tokens: ${error.message || "Unknown error"}`);
    } finally {
      setMinting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="relative mb-20">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_45%_at_50%_50%,rgba(59,130,246,0.1)_0%,transparent_100%)]" />
        <div className="text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6"
          >
            Predict the <span className="text-blue-500">Future</span> of Markets
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-slate-400 max-w-2xl mx-auto mb-10"
          >
            Stellar Prediction is a decentralized platform where your insights turn into earnings. 
            Trade on outcomes and earn rewards in MTK tokens.
          </motion.p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Minting Card */}
        <div className="lg:col-span-4">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                <Coins className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Mint MTK</h3>
                <p className="text-sm text-slate-400">Get platform tokens</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800">
                <div className="text-sm text-slate-500 mb-1">Your Balance</div>
                <div className="text-3xl font-bold text-white">{tokenBalance} MTK</div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 ml-1">Amount</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    disabled={minting}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl py-4 px-6 text-white text-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all disabled:opacity-50"
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 font-medium">MTK</div>
                </div>
              </div>

              {!account ? (
                <button 
                  onClick={connectWallet}
                  disabled={connecting}
                  className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  {connecting ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Connect Wallet"}
                </button>
              ) : (
                <div className="space-y-3">
                  <button 
                    onClick={handleBuyTokens}
                    disabled={minting}
                    className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                  >
                    {minting ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Mint Tokens"}
                  </button>
                  <button 
                    onClick={fundAccount}
                    className="w-full py-3 px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-2xl transition-all flex items-center justify-center gap-2"
                  >
                    Get Test XLM (Friendbot)
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Live Feed & Info */}
        <div className="lg:col-span-8 space-y-8">
          {/* Live Events */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl h-[400px] flex flex-col"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-green-500" />
                </div>
                <h3 className="text-xl font-bold text-white">Live Activity</h3>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-green-500">Live</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-800">
              <AnimatePresence initial={false}>
                {events.length > 0 ? (
                  events.map((event) => (
                    <motion.div 
                      key={event.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 flex items-center justify-between group hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-500 text-xs">
                          {event.ledger}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">{event.type}</div>
                          <div className="text-xs text-slate-500 font-mono">
                            {event.contractId.substring(0, 10)}...
                          </div>
                        </div>
                      </div>
                      <a 
                        href={`https://stellar.expert/explorer/testnet/ledger/${event.ledger}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-white transition-all"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </motion.div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
                    <Layers className="w-12 h-12 opacity-20" />
                    <p>No activity recorded yet</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Stats/Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-3xl bg-slate-900/30 border border-slate-800/50">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
                <Shield className="w-5 h-5 text-purple-500" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Secure Trading</h4>
              <p className="text-sm text-slate-400">All predictions are handled by immutable Soroban smart contracts on the Stellar network.</p>
            </div>
            <div className="p-6 rounded-3xl bg-slate-900/30 border border-slate-800/50">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center mb-4">
                <TrendingUp className="w-5 h-5 text-orange-500" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Deep Liquidity</h4>
              <p className="text-sm text-slate-400">Advanced automated market makers ensure you can always enter or exit your positions.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
