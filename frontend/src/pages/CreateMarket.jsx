import React, { useState } from 'react';
import { Plus, X, Calendar, Rocket } from 'lucide-react';
import * as StellarSdk from '@stellar/stellar-sdk';
import { CONTRACT_IDS } from '../hooks/useStellar';

const CreateMarket = ({ submitSorobanTx, onBack }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [closeTime, setCloseTime] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddOption = () => setOptions([...options, '']);
  const handleRemoveOption = (index) => setOptions(options.filter((_, i) => i !== index));
  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question || options.length < 2 || !closeTime) return;

    setLoading(true);
    try {
      const closeTimestamp = Math.floor(new Date(closeTime).getTime() / 1000);
      
      const marketContract = new StellarSdk.Contract(CONTRACT_IDS.MARKET);
      const op = marketContract.call('create_market',
        StellarSdk.nativeToScVal(null, { type: 'address' }), // creator (handled by freighter auth)
        StellarSdk.nativeToScVal(question, { type: 'symbol' }),
        StellarSdk.nativeToScVal(options.filter(o => o !== ''), { type: 'vec' }),
        StellarSdk.nativeToScVal(closeTimestamp, { type: 'u64' })
      );

      await submitSorobanTx(op);
      onBack();
    } catch (error) {
      console.error(error);
      alert(error.message || "Creation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 space-y-8 pb-20">
      <div className="space-y-2">
        <h1 className="text-4xl font-black tracking-tight text-white uppercase">Deploy Market</h1>
        <p className="text-gray-500 font-medium">Initialize a new prediction event on Soroban.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="glass p-8 rounded-[2.5rem] space-y-6 border border-white/5 bg-white/5">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Market Question</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Will XLM cross $1.00 by 2026?"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-brand-primary/50 transition-colors text-lg text-white"
              rows="2"
              required
            />
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Options</label>
            <div className="space-y-3">
              {options.map((option, idx) => (
                <div key={idx} className="flex space-x-3">
                  <input
                    value={option}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-6 py-3 outline-none focus:border-brand-primary/50 transition-colors text-sm text-white"
                    required
                  />
                  {options.length > 2 && (
                    <button 
                      type="button" 
                      onClick={() => handleRemoveOption(idx)}
                      className="p-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddOption}
                className="flex items-center space-x-2 text-brand-primary text-sm font-bold mt-2 hover:text-white transition-colors"
              >
                <Plus size={16} />
                <span>Add Option</span>
              </button>
            </div>
          </div>
        </div>

        <div className="glass p-8 rounded-[2.5rem] space-y-2 border border-white/5 bg-white/5">
          <div className="flex items-center space-x-2 text-gray-500 mb-2">
            <Calendar size={16} />
            <label className="text-[10px] font-black uppercase tracking-widest">Close Time</label>
          </div>
          <input
            type="datetime-local"
            value={closeTime}
            onChange={(e) => setCloseTime(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-brand-primary/50 text-sm text-white"
            required
          />
        </div>

        <button
          disabled={loading}
          className="w-full py-5 gradient-bg rounded-3xl font-black text-lg uppercase tracking-widest flex items-center justify-center space-x-3 hover:opacity-90 transition-all active:scale-[0.99] shadow-2xl shadow-brand-primary/20 text-white"
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Rocket size={20} />
              <span>Launch Market</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default CreateMarket;
