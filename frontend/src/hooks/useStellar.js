import { useState, useEffect, useCallback } from 'react';
import { isConnected, getAddress, getNetwork, setAllowed, signTransaction } from '@stellar/freighter-api';
import * as StellarSdk from '@stellar/stellar-sdk';

const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
const RPC_URL = 'https://soroban-testnet.stellar.org';

// Constants for deployed contracts
export const CONTRACT_IDS = {
  MARKET: 'CCBUIXG5G5F6F5F5F5F5F5F5F5F5F5F5F5F5F5F5F5F5F5F5F5F5F5F5', // Replace after deployment
  TOKEN: 'CDBUIXG5G5F6F5F5F5F5F5F5F5F5F5F5F5F5F5F5F5F5F5F5F5F5F5F5'  // Replace after deployment
};

export const useStellar = () => {
  const [account, setAccount] = useState(null);
  const [network, setNetwork] = useState(null);
  const [tokenBalance, setTokenBalance] = useState('0');
  const [connecting, setConnecting] = useState(false);
  const [server] = useState(new StellarSdk.SorobanRpc.Server(RPC_URL));

  const connectWallet = useCallback(async () => {
    if (connecting) return;
    setConnecting(true);
    
    try {
      const connection = await isConnected();
      if (!connection.isConnected) {
        alert("Freighter wallet not detected.");
        setConnecting(false);
        return;
      }

      await setAllowed();
      const addressObj = await getAddress();
      const networkResult = await getNetwork();
      
      setAccount(addressObj.address);
      setNetwork(networkResult.network || networkResult);
      
      // Refresh balance after connect
      await refreshBalance(addressObj.address);

    } catch (error) {
      console.error("Connection failed:", error);
    } finally {
      setConnecting(false);
    }
  }, [connecting]);

  const refreshBalance = useCallback(async (address) => {
    if (!address) return;
    try {
      const contract = new StellarSdk.Contract(CONTRACT_IDS.TOKEN);
      const tx = await server.getLedgerEntries(contract.getFootprint());
      // For simplicity, we'll implement a real call here using simulateTransaction
      const op = contract.call('balance', StellarSdk.nativeToScVal(address, { type: 'address' }));
      const result = await server.simulateTransaction(
        new StellarSdk.TransactionBuilder(
          new StellarSdk.Account(address, '0'),
          { fee: '100', networkPassphrase: NETWORK_PASSPHRASE }
        ).addOperation(op).build()
      );
      
      if (result.result) {
        const balance = StellarSdk.scValToNative(result.result.retval);
        setTokenBalance(StellarSdk.formatAmount(balance, 7)); // Soroban tokens often use 7 decimals
      }
    } catch (e) {
      console.error("Balance refresh failed", e);
    }
  }, [server]);

  useEffect(() => {
    const checkExisting = async () => {
      const connection = await isConnected();
      if (connection.isConnected) {
        const addressObj = await getAddress();
        if (addressObj.address) {
          setAccount(addressObj.address);
          refreshBalance(addressObj.address);
        }
      }
    };
    checkExisting();
  }, [refreshBalance]);

  const mintTokens = async (amount) => {
    if (!account) return;
    const contract = new StellarSdk.Contract(CONTRACT_IDS.TOKEN);
    const amountRaw = BigInt(amount * 1e7); // Assuming 7 decimals
    
    const op = contract.call('mint', 
      StellarSdk.nativeToScVal(account, { type: 'address' }),
      StellarSdk.nativeToScVal(amountRaw, { type: 'i128' })
    );

    return submitSorobanTx(op);
  };

  const submitSorobanTx = async (operation) => {
    const accountInfo = await server.getAccount(account);
    let tx = new StellarSdk.TransactionBuilder(accountInfo, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
    .addOperation(operation)
    .setTimeout(30)
    .build();

    // 1. Simulate
    const simulation = await server.simulateTransaction(tx);
    tx = server.assembleTransaction(tx, simulation);

    // 2. Sign with Freighter
    const signedXdr = await signTransaction(tx.toXDR(), { network: 'TESTNET' });
    const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

    // 3. Send
    const response = await server.sendTransaction(signedTx);
    if (response.status !== 'PENDING') throw new Error("Transaction failed");

    // 4. Poll for result
    let result = await server.getTransaction(response.hash);
    while (result.status === 'NOT_FOUND' || result.status === 'PENDING') {
      await new Promise(r => setTimeout(r, 1000));
      result = await server.getTransaction(response.hash);
    }

    if (result.status === 'SUCCESS') {
      console.log("Transaction confirmed on-chain:", response.hash);
      refreshBalance(account);
      return result;
    } else {
      console.error("Transaction failed on-chain:", result);
      throw new Error("Transaction failed on chain");
    }
  };

  return { 
    account, 
    network, 
    tokenBalance, 
    connectWallet, 
    refreshBalance: () => refreshBalance(account), 
    mintTokens,
    submitSorobanTx,
    connecting 
  };
};
