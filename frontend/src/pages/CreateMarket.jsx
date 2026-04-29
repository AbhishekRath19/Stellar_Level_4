import React, { useState } from 'react';
import { ArrowLeft, Plus, X, ShieldCheck, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import * as StellarSdk from '@stellar/stellar-sdk';
import { server, NETWORK_PASSPHRASE, MARKET_CONTRACT_ID } from '../config/stellar';

const CreateMarket = ({ account, submitSorobanTx, onBack }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);

  const handleAddOption = () => setOptions([...options, '']);
  const handleRemoveOption = (index) => setOptions(options.filter((_, i) => i !== index));
  const handleOptionChange = (index, val) => {
    const newOptions = [...options];
    newOptions[index] = val;
    setOptions(newOptions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!account) return;
    
    setLoading(true);
    try {
      const sourceAccount = await server.getAccount(account);
      const marketContract = new StellarSdk.Contract(MARKET_CONTRACT_ID);
      const closeTime = Math.floor(Date.now() / 1000) + (days * 86400);

      const operation = marketContract.call('create_market',
        StellarSdk.nativeToScVal(account, { type: 'address' }),
        StellarSdk.nativeToScVal(question, { type: 'string' }),
        StellarSdk.nativeToScVal(options.filter(o => o !== '')),
        StellarSdk.nativeToScVal(closeTime, { type: 'u64' })
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
      
      alert("Market created successfully!");
      onBack();
    } catch (error) {
      console.error(error);
      alert("Failed to create market: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-12 py-12">
      <button onClick={onBack} className="flex items-center space-x-3 text-gray-500 hover:text-white transition-all">
        <ArrowLeft size={20} />
        <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
      </button>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-12 space-y-12">
        <div className="space-y-4">
           <h1 className="text-5xl font-black uppercase tracking-tighter text-white">Launch Market</h1>
           <p className="text-gray-500 font-medium">Create a new decentralized prediction event on Soroban.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Market Question</label>
            <input 
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Will it rain in London tomorrow?"
              className="w-full h-16 bg-brand-dark/50 border-2 border-white/5 rounded-2xl px-6 text-lg text-white focus:border-brand-primary/50 outline-none transition-all"
            />
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between ml-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Prediction Options</label>
              <button type="button" onClick={handleAddOption} className="text-brand-primary text-[10px] font-black uppercase tracking-widest flex items-center space-x-2">
                <Plus size={12} /> <span>Add Option</span>
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {options.map((opt, i) => (
                <div key={i} className="relative">
                  <input 
                    value={opt}
                    onChange={(e) => handleOptionChange(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    className="w-full h-14 bg-brand-dark/50 border border-white/5 rounded-xl px-6 text-sm text-white focus:border-brand-primary/50 outline-none transition-all"
                  />
                  {options.length > 2 && (
                    <button type="button" onClick={() => handleRemoveOption(i)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-700 hover:text-red-500 transition-colors">
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            disabled={loading || !account || !question}
            className="premium-button w-full h-18 text-sm flex items-center justify-center space-x-3 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
            <span>{loading ? "Deploying Contract..." : "Launch Market"}</span>
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default CreateMarket;
