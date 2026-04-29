import React, { useState } from 'react';
import { ArrowDownUp, Zap, Loader2, Coins, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Swap = ({ swapXlmToMtk, swapMtkToXlm, account, refreshBalance, tokenBalance }) => {
  const [fromAmount, setFromAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [direction, setDirection] = useState('xlm_to_mtk'); // 'xlm_to_mtk' or 'mtk_to_xlm'

  const handleSwap = async (e) => {
    e.preventDefault();
    if (!fromAmount || isNaN(fromAmount) || parseFloat(fromAmount) <= 0) return;
    
    setLoading(true);
    try {
      if (direction === 'xlm_to_mtk') {
        await swapXlmToMtk(fromAmount);
        alert(`Successfully swapped ${fromAmount} XLM for ${fromAmount} MTK!`);
      } else {
        await swapMtkToXlm(fromAmount);
        alert(`Successfully swapped ${fromAmount} MTK for ${fromAmount} XLM!`);
      }
      setFromAmount('');
      refreshBalance();
    } catch (error) {
      console.error("Swap failed:", error);
      alert(`Swap failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleDirection = () => {
    setDirection(prev => prev === 'xlm_to_mtk' ? 'mtk_to_xlm' : 'xlm_to_mtk');
  };

  const fromLabel = direction === 'xlm_to_mtk' ? 'XLM' : 'MTK';
  const toLabel = direction === 'xlm_to_mtk' ? 'MTK' : 'XLM';

  return (
    <div className="max-w-xl mx-auto py-12 px-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel p-8 space-y-8 relative overflow-hidden"
      >
        <div className="space-y-2">
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Currency Swap</h1>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">1:1 Fixed Exchange Ratio</p>
        </div>

        <form onSubmit={handleSwap} className="space-y-4">
          <div className="space-y-2">
            <div className="relative group">
              <input
                type="number"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                placeholder="0.00"
                className="w-full h-24 bg-brand-dark/50 border-2 border-white/5 rounded-3xl px-8 text-3xl font-mono text-white focus:border-brand-primary/50 outline-none transition-all"
              />
              <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-end">
                <span className="text-sm font-black text-brand-primary uppercase tracking-widest">{fromLabel}</span>
                {direction === 'mtk_to_xlm' && (
                  <span className="text-[10px] text-gray-500 font-mono">Max: {Number(tokenBalance).toFixed(2)}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-center -my-6 relative z-10">
            <button 
              type="button"
              onClick={toggleDirection}
              className="w-14 h-14 bg-brand-primary rounded-2xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:scale-110 active:scale-95 transition-all border-4 border-brand-dark"
            >
              <ArrowDownUp size={24} />
            </button>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <div className="w-full h-24 bg-brand-dark/30 border-2 border-white/5 rounded-3xl px-8 flex items-center text-3xl font-mono text-gray-400">
                {fromAmount || '0.00'}
              </div>
              <div className="absolute right-6 top-1/2 -translate-y-1/2 text-sm font-black text-brand-accent uppercase tracking-widest">
                {toLabel}
              </div>
            </div>
          </div>

          <div className="p-6 bg-white/5 rounded-2xl space-y-4">
            <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-gray-500">
              <span>Exchange Rate</span>
              <span className="text-white">1 {fromLabel} = 1 {toLabel}</span>
            </div>
            <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-gray-500">
              <span>Slippage</span>
              <span className="text-green-500">0% (Guaranteed)</span>
            </div>
          </div>

          <button
            disabled={loading || !fromAmount || !account}
            className="premium-button w-full h-18 text-sm flex items-center justify-center space-x-3 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>Swapping...</span>
              </>
            ) : (
              <>
                <Zap size={18} className="fill-current" />
                <span>Initialize Swap</span>
              </>
            )}
          </button>
        </form>

        {!account && (
          <p className="text-center text-[10px] font-black uppercase tracking-widest text-brand-accent">
            Connect wallet to perform swap
          </p>
        )}
      </motion.div>
      
      <div className="mt-8 flex items-center justify-center space-x-2 text-[10px] font-black uppercase tracking-widest text-gray-600">
        <ShieldCheck size={14} />
        <span>Secured by Predix Protocol Treasury</span>
      </div>
    </div>
  );
};

export default Swap;
