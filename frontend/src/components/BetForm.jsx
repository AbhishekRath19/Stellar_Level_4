import React, { useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, ArrowRight, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import * as StellarSdk from '@stellar/stellar-sdk';
import { server, NETWORK_PASSPHRASE, TOKEN_CONTRACT_ID, MARKET_CONTRACT_ID } from '../config/stellar';

const BetForm = ({ market, marketId, account, submitSorobanTx, onBetPlaced, transparent = false }) => {
  const isMobile = window.innerWidth < 640;

  const [selectedOption, setSelectedOption] = useState(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const handleBet = async (e) => {
    e.preventDefault();
    if (selectedOption === null || !amount) return;

    setLoading(true);
    try {
      if (marketId.toString().startsWith('mock')) {
        setStatus({ type: 'info', message: 'Simulating transaction for Demo Market...' });
        await new Promise(resolve => setTimeout(resolve, 1500));
        setStatus({ type: 'success', message: 'Demo Position Initialized!' });
        setAmount('');
        onBetPlaced();
        return;
      }

      setStatus({ type: 'info', message: 'Verifying Permissions...' });
      const amountRaw = BigInt(Math.floor(parseFloat(amount) * 1e7)); // 7 decimals for MTK
      const sourceAccount = await server.getAccount(account);
      
      // 1. Approve Market to spend MTK
      console.log("Building approval transaction...");
      const tokenContract = new StellarSdk.Contract(TOKEN_CONTRACT_ID);
      
      const approveTx = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
      .addOperation(tokenContract.call('approve', 
        StellarSdk.nativeToScVal(account, { type: 'address' }), 
        StellarSdk.nativeToScVal(MARKET_CONTRACT_ID, { type: 'address' }),
        StellarSdk.nativeToScVal(amountRaw, { type: 'i128' }),
        StellarSdk.nativeToScVal(9999999, { type: 'u32' }) // Fixed U32 max value
      ))
      .setTimeout(30)
      .build();

      setStatus({ type: 'info', message: 'Preparing Allowance...' });
      const preparedApproveTx = await server.prepareTransaction(approveTx);
      await submitSorobanTx(preparedApproveTx);

      // 2. Refresh account for next transaction (sequence number)
      const updatedAccount = await server.getAccount(account);

      // 3. Place Bet
      console.log("Building bet transaction...");
      const marketContract = new StellarSdk.Contract(MARKET_CONTRACT_ID);
      const betOp = marketContract.call('place_bet',
        StellarSdk.nativeToScVal(account, { type: 'address' }),
        StellarSdk.nativeToScVal(parseInt(marketId), { type: 'u32' }),
        StellarSdk.nativeToScVal(selectedOption, { type: 'u32' }),
        StellarSdk.nativeToScVal(amountRaw, { type: 'i128' })
      );

      const betTx = new StellarSdk.TransactionBuilder(updatedAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
      .addOperation(betOp)
      .setTimeout(30)
      .build();

      setStatus({ type: 'info', message: 'Preparing Position...' });
      const preparedBetTx = await server.prepareTransaction(betTx);
      await submitSorobanTx(preparedBetTx);

      setStatus({ type: 'success', message: 'Position Initialized' });
      setAmount('');
      onBetPlaced();
    } catch (error) {
      console.error("Transaction Error:", error);
      setStatus({ type: 'error', message: error.message || 'Transaction Failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${transparent ? '' : `glass-panel ${isMobile ? 'p-6' : 'p-10'}`} space-y-10`}>
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">Enter Position</h3>
        <Wallet className="text-brand-primary/40" size={24} />
      </div>

      <div className="space-y-4">
        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Select Outcome</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {market.options.map((option, idx) => (
            <motion.button
              key={idx}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => setSelectedOption(idx)}
              className={`px-6 py-4 rounded-2xl border-2 font-black uppercase tracking-widest text-xs transition-all ${
                selectedOption === idx 
                  ? 'border-brand-primary bg-brand-primary/10 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]' 
                  : 'border-white/5 bg-brand-dark/50 text-gray-500 hover:border-white/10'
              }`}
            >
              {option}
            </motion.button>
          ))}
        </div>
      </div>

      <form onSubmit={handleBet} className="space-y-8">
        <div className="space-y-4">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-500">
            <span>Stake Amount</span>
            <span>Asset: MTK</span>
          </div>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full h-18 bg-brand-dark/50 border-2 border-white/5 rounded-2xl px-6 text-xl font-mono text-white focus:border-brand-primary/50 outline-none transition-all"
              required
            />
          </div>
        </div>

        {status && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-5 rounded-2xl flex items-center space-x-4 border ${
              status.type === 'success' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
              status.type === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
              'bg-brand-primary/10 text-brand-primary border-brand-primary/20'
            }`}
          >
            {status.type === 'success' ? <CheckCircle2 size={20} className="shrink-0" /> :
             status.type === 'error' ? <AlertCircle size={20} className="shrink-0" /> :
             <Loader2 size={20} className="shrink-0 animate-spin" />}
            <p className="text-[10px] font-black uppercase tracking-widest">{status.message}</p>
          </motion.div>
        )}

        <button
          type="submit"
          disabled={loading || selectedOption === null || !amount}
          className="premium-button w-full h-18 text-xs flex items-center justify-center space-x-3 disabled:opacity-50 disabled:grayscale"
        >
          {loading ? (
            <span className="italic">Synchronizing...</span>
          ) : (
            <>
              <span>INITIALIZE POSITION</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default BetForm;
