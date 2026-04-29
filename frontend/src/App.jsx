import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import MarketDetail from './pages/MarketDetail';
import MyBets from './pages/MyBets';
import CreateMarket from './pages/CreateMarket';
import { useStellar } from './hooks/useStellar';
import { Toaster } from 'sonner';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedMarketId, setSelectedMarketId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { account, network, tokenBalance, connectWallet, refreshBalance, mintTokens, submitSorobanTx, fundAccount, seedMarkets, connecting } = useStellar();

  const handleMarketClick = (id) => {
    setSelectedMarketId(id);
    setCurrentPage('detail');
  };

  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <Home 
            account={account}
            mintTokens={mintTokens}
            fundAccount={fundAccount}
            seedMarkets={seedMarkets}
            onMarketClick={handleMarketClick} 
            onNavigate={setCurrentPage}
            refreshBalance={refreshBalance} 
            refreshTrigger={refreshTrigger}
          />
        );
      case 'detail':
        return (
          <MarketDetail 
            marketId={selectedMarketId} 
            account={account}
            submitSorobanTx={submitSorobanTx}
            onBack={() => setCurrentPage('home')} 
            refreshBalance={refreshBalance}
            refreshTrigger={refreshTrigger}
          />
        );
      case 'my-bets':
        return <MyBets account={account} submitSorobanTx={submitSorobanTx} refreshBalance={refreshBalance} />;
      case 'create':
        return <CreateMarket account={account} submitSorobanTx={submitSorobanTx} onBack={() => {
          triggerRefresh();
          setCurrentPage('home');
        }} />;
      default:
        return <Home account={account} mintTokens={mintTokens} onMarketClick={handleMarketClick} refreshBalance={refreshBalance} />;
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark text-white font-sans selection:bg-brand-primary selection:text-white">
      <Navbar 
        account={account} 
        connectWallet={connectWallet} 
        tokenBalance={tokenBalance} 
        onNavigate={setCurrentPage}
        network={network}
        connecting={connecting}
        isOwner={!!account}
      />

      <main className="pt-32 pb-20 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="animate-in fade-in duration-500">
          {renderPage()}
        </div>
      </main>

      <Toaster 
        theme="dark" 
        position="bottom-right" 
        toastOptions={{
          style: {
            background: 'rgba(22, 22, 26, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#fff',
            backdropFilter: 'blur(12px)',
            borderRadius: '1.5rem',
          }
        }}
      />

      {/* Background Decor */}
      <div className="fixed top-0 right-0 -z-10 w-[50vw] h-[50vw] bg-brand-primary/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-0 left-0 -z-10 w-[30vw] h-[30vw] bg-brand-secondary/5 blur-[100px] rounded-full pointer-events-none" />
    </div>
  );
}

export default App;
