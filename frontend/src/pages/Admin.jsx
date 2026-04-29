import React, { useState } from 'react';
import { ShieldCheck, Zap, Loader2, Coins } from 'lucide-react';
import { motion } from 'framer-motion';

const Admin = ({ adminMint, account }) => {
  const [loading, setLoading] = useState(false);

  const handleMint = async () => {
    setLoading(true);
    try {
      await adminMint(100000);
      alert("Successfully minted 100,000 MTK to treasury/admin!");
    } catch (error) {
      console.error("Admin mint failed:", error);
      alert(`Minting failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-12 space-y-12 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <ShieldCheck size={120} />
        </div>

        <div className="space-y-4">
          <div className="inline-flex items-center space-x-2 bg-brand-primary/20 border border-brand-primary/30 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-brand-primary">
            <Zap size={12} className="fill-current" />
            <span>Admin Control Panel</span>
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tighter text-white">Treasury Management</h1>
          <p className="text-gray-500 font-medium">Manage the internal currency supply and platform reserves.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white/5 border border-white/10 p-8 rounded-3xl space-y-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-brand-accent/20 rounded-2xl flex items-center justify-center text-brand-accent">
                <Coins size={24} />
              </div>
              <h3 className="text-xl font-bold text-white">Bulk Mint MTK</h3>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Generate 100,000 MTK tokens instantly to ensure the platform has enough liquidity for user swaps and betting rewards.
            </p>
            <button
              onClick={handleMint}
              disabled={loading || !account}
              className="premium-button w-full h-14 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Processing...</span>
                </>
              ) : (
                <span>Mint 100,000 MTK</span>
              )}
            </button>
          </div>

          <div className="bg-white/5 border border-white/10 p-8 rounded-3xl space-y-6 opacity-50">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-500/20 rounded-2xl flex items-center justify-center text-gray-500">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-xl font-bold text-white">Access Control</h3>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Manage platform roles and permissions. Currently locked to the connected account: {account?.slice(0, 8)}...
            </p>
            <div className="h-14 border border-white/10 rounded-2xl flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-gray-600">
              Settings Locked
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Admin;
