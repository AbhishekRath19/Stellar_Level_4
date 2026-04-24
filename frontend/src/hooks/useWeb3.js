import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { PREDICTION_MARKET_ABI, MARKET_TOKEN_ABI, ORACLE_ABI, ADDRESSES } from '../contracts/constants';

export const useWeb3 = () => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contracts, setContracts] = useState({
    market: null,
    token: null,
    oracle: null
  });
  const [tokenBalance, setTokenBalance] = useState('0');
  const [isOwner, setIsOwner] = useState(false);

  const connectWallet = useCallback(async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        const browserSigner = await browserProvider.getSigner();
        
        setAccount(accounts[0]);
        setProvider(browserProvider);
        setSigner(browserSigner);

        const marketContract = new ethers.Contract(ADDRESSES.PREDICTION_MARKET, PREDICTION_MARKET_ABI, browserSigner);
        const tokenContract = new ethers.Contract(ADDRESSES.MARKET_TOKEN, MARKET_TOKEN_ABI, browserSigner);
        const oracleContract = new ethers.Contract(ADDRESSES.ORACLE, ORACLE_ABI, browserSigner);

        setContracts({
          market: marketContract,
          token: tokenContract,
          oracle: oracleContract
        });

        // Check if owner
        const owner = await oracleContract.owner();
        setIsOwner(owner.toLowerCase() === accounts[0].toLowerCase());

        // Initial balance fetch
        const balance = await tokenContract.balanceOf(accounts[0]);
        setTokenBalance(ethers.formatEther(balance));

      } catch (error) {
        console.error("Connection failed", error);
      }
    } else {
      alert("Please install MetaMask!");
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    if (contracts.token && account) {
      const balance = await contracts.token.balanceOf(account);
      setTokenBalance(ethers.formatEther(balance));
    }
  }, [contracts.token, account]);

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          connectWallet();
        } else {
          setAccount(null);
          setSigner(null);
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }, [connectWallet]);

  return { account, provider, signer, contracts, tokenBalance, isOwner, connectWallet, refreshBalance };
};
