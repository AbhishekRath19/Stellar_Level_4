import React, { useState } from 'react';
import { Wallet, PlusCircle, LayoutDashboard, Menu, X, Activity, Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = ({ account, connectWallet, tokenBalance, onNavigate, isOwner, network, connecting }) => {


  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { label: 'Markets', value: 'home', icon: LayoutDashboard },
    { label: 'Swap', value: 'swap', icon: Coins },
    { label: 'Portfolio', value: 'my-bets', icon: Activity },
  ];

  return (
    <nav className="nav-blur px-6 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        {/* Logo */}
        <div 
          className="flex items-center space-x-3 cursor-pointer group" 
          onClick={() => onNavigate('home')}
        >
          <div className="w-11 h-11 premium-button !p-0 flex items-center justify-center !rounded-xl rotate-3 group-hover:rotate-6 transition-transform">
            <LayoutDashboard className="text-white w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tighter leading-none italic uppercase">Predix</span>
            <span className="text-[10px] font-bold tracking-[0.3em] text-brand-primary uppercase">Protocol</span>
          </div>
        </div>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center bg-white/5 px-2 py-1.5 rounded-2xl border border-white/5">
          {navItems.map(item => (
            <button 
              key={item.value} 
              onClick={() => onNavigate(item.value)} 
              className="px-6 py-2 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-white/5 transition-all text-gray-400 hover:text-white"
            >
              {item.label}
            </button>
          ))}
          {isOwner && (
            <button 
              onClick={() => onNavigate('create')} 
              className="px-6 py-2 rounded-xl text-sm font-black uppercase tracking-widest text-brand-accent hover:bg-brand-accent/10 transition-all"
            >
              Admin
            </button>
          )}
        </div>

        {/* Wallet Section */}
        <div className="flex items-center space-x-4">
          {account ? (
            <div className="flex items-center space-x-4 bg-brand-surface border border-white/10 px-4 py-2 rounded-2xl">
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Balance</span>
                <span className="text-xs font-mono font-bold text-brand-accent">{Number(tokenBalance).toFixed(2)} MTK</span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="flex items-center space-x-2 text-sm font-mono font-bold">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>{account.slice(0, 4)}...{account.slice(-4)}</span>
                <span className="text-[9px] bg-brand-primary/20 px-2 py-0.5 rounded text-brand-primary">{network}</span>
              </div>

            </div>
          ) : (
            <button 
              onClick={account ? null : connectWallet}
              disabled={connecting}
              className="premium-button text-[11px] disabled:opacity-50"
            >
              {connecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}

          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden p-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white"
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden mt-4 space-y-2"
          >
            {navItems.map(item => (
              <button
                key={item.value}
                onClick={() => { onNavigate(item.value); setIsOpen(false); }}
                className="w-full flex items-center space-x-4 p-4 rounded-2xl bg-white/5 text-left text-sm font-black uppercase tracking-widest"
              >
                <item.icon size={18} className="text-brand-primary" />
                <span>{item.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
