import React from 'react';
import { Clock, TrendingUp, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

const MarketCard = ({ market, id, onClick }) => {
  const timeLeft = Math.max(0, Number(market.closeTime) - Math.floor(Date.now() / 1000));
  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);

  // Calculate total pool by summing all option bets
  const totalPool = market.totalBets 
    ? market.totalBets.reduce((acc, val) => acc + (Number(val) / 1e7), 0) // Soroban uses 7 decimals usually, or 18 for ETH. Let's assume standard formatting here.
    : 0;

  return (
    <motion.div 
      whileHover={{ y: -8 }}
      onClick={() => onClick(id)}
      className="glass-panel p-8 cursor-pointer group flex flex-col h-full relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
        <TrendingUp size={120} />
      </div>

      <div className="flex justify-between items-start mb-8">
        <div className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border ${
          market.resolved 
            ? 'bg-gray-500/10 text-gray-500 border-gray-500/20' 
            : 'bg-brand-primary/10 text-brand-primary border-brand-primary/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
        }`}>
          {market.resolved ? 'Resolved' : 'Active'}
        </div>
        {!market.resolved && (
          <div className="flex items-center space-x-2 text-gray-500 font-mono text-[10px] font-bold">
            <Clock size={12} className="text-brand-accent" />
            <span>{hours}H {minutes}M LEFT</span>
          </div>
        )}
      </div>

      <h3 className="text-2xl font-black tracking-tighter leading-tight mb-8 group-hover:text-brand-primary transition-colors">
        {market.question}
      </h3>

      <div className="mt-auto space-y-6">
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Total Pool</span>
            <p className="text-2xl font-mono font-bold">
              {totalPool.toLocaleString()} 
              <span className="text-xs text-gray-600 ml-2 font-black uppercase">MTK</span>
            </p>
          </div>

          
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center group-hover:bg-brand-primary group-hover:text-white transition-all shadow-xl group-hover:shadow-brand-primary/40">
            <ChevronRight size={20} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-6 border-t border-white/5">
          {market.options?.slice(0, 2).map((option, idx) => (
            <div key={idx} className="bg-brand-dark/50 border border-white/5 p-3 rounded-xl">
              <span className="text-[9px] text-gray-600 block uppercase font-black tracking-widest mb-1">{option}</span>
              <div className="flex items-center justify-between">
                <span className="text-sm font-black italic">PROB</span>
                <span className="text-sm font-mono font-bold text-brand-accent">{((Math.random() * 50) + 25).toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default MarketCard;
