import React from 'react';
import { motion } from 'framer-motion';
import { ethers } from 'ethers';


const OddsDisplay = ({ totalBets, options }) => {
  const total = totalBets.reduce((acc, val) => acc + BigInt(val), BigInt(0));
  
  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-black italic uppercase tracking-tighter">Market Odds</h3>
        <div className="px-3 py-1 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black text-gray-500 uppercase tracking-widest">
          Live Analysis
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        {options.map((option, idx) => {
          const betAmount = BigInt(totalBets[idx] || 0);
          const percentage = total === BigInt(0) 
            ? (100 / options.length) 
            : Number((betAmount * BigInt(10000)) / total) / 100;

          return (
            <div key={idx} className="space-y-4">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">{option}</span>
                  <div className="text-xl font-mono font-bold">{percentage.toFixed(2)}%</div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-black text-gray-700 uppercase block tracking-widest">Stake Pool</span>
                  <span className="text-sm font-mono text-gray-500">{ethers.formatEther(betAmount)}</span>
                </div>
              </div>
              
              <div className="h-4 bg-white/5 rounded-lg overflow-hidden border border-white/5 relative">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 1, ease: "circOut" }}
                  className="h-full bg-gradient-to-r from-brand-primary to-brand-accent shadow-[0_0_20px_rgba(99,102,241,0.5)]"
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-6 border-t border-white/5 flex justify-center">
        <p className="text-[9px] font-black text-gray-700 uppercase tracking-[0.4em] animate-pulse">
          Sub-second sync with Polygon Network
        </p>
      </div>
    </div>
  );
};

export default OddsDisplay;
