import { useState, useEffect, useCallback } from 'react';
import { isConnected, getAddress, getNetwork, setAllowed, signTransaction } from '@stellar/freighter-api';
import * as StellarSdk from '@stellar/stellar-sdk';
import { server, NETWORK_PASSPHRASE, TOKEN_CONTRACT_ID, MARKET_CONTRACT_ID } from '../config/stellar';

// Helper to safely convert ScVal to Native
export const safeScValToNative = (scVal) => {
  if (scVal === null || scVal === undefined) return null;
  try {
    if (typeof scVal === 'string') {
      const parsed = StellarSdk.xdr.ScVal.fromXDR(scVal, 'base64');
      return StellarSdk.scValToNative(parsed);
    }
    if (scVal && typeof scVal === 'object' && typeof scVal.switch === 'function') {
      return StellarSdk.scValToNative(scVal);
    }
    return scVal;
  } catch (e) {
    return scVal;
  }
};

export const useStellar = () => {
  const [account, setAccount] = useState(null);
  const [network, setNetwork] = useState(null);
  const [tokenBalance, setTokenBalance] = useState('0');
  const [connecting, setConnecting] = useState(false);

  const connectWallet = useCallback(async () => {
    if (connecting) return;
    setConnecting(true);
    try {
      const connection = await isConnected();
      if (!connection.isConnected) {
        alert("Freighter wallet not detected.");
        return;
      }
      await setAllowed();
      const addressObj = await getAddress();
      const networkResult = await getNetwork();
      setAccount(addressObj.address);
      setNetwork(networkResult.network || networkResult);
      await refreshBalance(addressObj.address);
    } catch (error) {
      console.error("Connection failed:", error);
    } finally {
      setConnecting(false);
    }
  }, [connecting]);

  const refreshBalance = useCallback(async (address) => {
    const targetAddress = address || account;
    if (!targetAddress) return;
    try {
      const contract = new StellarSdk.Contract(TOKEN_CONTRACT_ID);
      const op = contract.call('balance', StellarSdk.nativeToScVal(targetAddress, { type: 'address' }));
      
      const sourceAccount = new StellarSdk.Account(targetAddress, '0');
      const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: '100',
        networkPassphrase: NETWORK_PASSPHRASE
      }).addOperation(op).setTimeout(StellarSdk.TimeoutInfinite).build();

      const result = await server.simulateTransaction(tx);
      
      if (result.result && result.result.retval) {
        const balance = safeScValToNative(result.result.retval);
        setTokenBalance((Number(balance) / 10000000).toString());
      }
    } catch (e) {
      console.error("Balance refresh failed", e);
    }
  }, [account]);

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

  /**
   * Fixed submitSorobanTx Function
   * Handles Freighter responses robustly and submits to Soroban RPC
   */
  const submitSorobanTx = async (preparedTransaction) => {
    try {
      console.log("📤 Starting transaction submission...");
      
      if (!preparedTransaction || typeof preparedTransaction.toXDR !== 'function') {
        throw new Error("Invalid transaction object provided");
      }

      // 1. Convert to XDR string BEFORE signing
      const unsignedXdr = preparedTransaction.toXDR('base64');
      console.log("✅ XDR generated (unsigned):", unsignedXdr.substring(0, 50) + "...");

      // 2. Sign with Freighter - returns a BASE64 STRING
      const signedResponse = await signTransaction(unsignedXdr, {
        network: 'TESTNET',
        networkPassphrase: NETWORK_PASSPHRASE,
      });

      // 3. Extract XDR string from response
      let signedXdrString = '';
      
      if (typeof signedResponse === 'string') {
        signedXdrString = signedResponse;
      } else if (signedResponse && typeof signedResponse === 'object') {
        // Check for all common property names used by various versions of Freighter/SDKs
        signedXdrString = signedResponse.signedTransaction || 
                          signedResponse.xdr || 
                          signedResponse.signedTx || 
                          signedResponse.transaction ||
                          '';
        
        // If we still don't have it, but the object itself has a toXDR or toString that looks like XDR
        if (!signedXdrString && typeof signedResponse.toXDR === 'function') {
          signedXdrString = signedResponse.toXDR();
        }
      }

      if (!signedXdrString || typeof signedXdrString !== 'string') {
        console.error("❌ Signed response is invalid:", signedResponse);
        throw new Error(`Expected signed XDR string, but could not extract it from response.`);
      }

      console.log("✅ Transaction signed successfully");

      // 4. Rebuild transaction from signed XDR
      const signedTransaction = StellarSdk.TransactionBuilder.fromXDR(
        signedXdrString,
        NETWORK_PASSPHRASE
      );

      // 5. Submit to Soroban RPC
      console.log("📤 Submitting to Soroban network...");
      const response = await server.sendTransaction(signedTransaction);
      
      if (response.status === "ERROR") {
        console.error("❌ RPC Submission Error:", response);
        throw new Error(`Transaction Submission Failed: ${response.errorResultXdr}`);
      }

      console.log("✅ Transaction hash:", response.hash);

      // 6. Poll for Confirmation
      console.log("⏳ Waiting for transaction confirmation...");
      let getResponse = await server.getTransaction(response.hash);
      let attempts = 0;
      const maxAttempts = 30;

      while ((getResponse.status === "NOT_FOUND" || getResponse.status === "PENDING") && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        getResponse = await server.getTransaction(response.hash);
        attempts++;
        console.log(`Polling... Attempt ${attempts}/${maxAttempts}`);
      }

      if (getResponse.status === "SUCCESS") {
        console.log("✅ Transaction confirmed!");
        refreshBalance(account);
        return getResponse;
      } else {
        console.error("❌ Transaction failed state:", getResponse);
        throw new Error(`Transaction failed with status: ${getResponse.status}`);
      }

    } catch (error) {
      console.error("❌ Transaction submission error:", error);
      throw error;
    }
  };

  const fundAccount = async () => {
    if (!account) return;
    try {
      await fetch(`https://friendbot.stellar.org?addr=${account}`);
      await refreshBalance(account);
      alert("Account funded via Friendbot!");
    } catch (e) {
      alert("Friendbot failed. Please fund manually.");
    }
  };

  const adminMint = async (amount = 100000) => {
    if (!account) throw new Error("Connect wallet first");
    
    const sourceAccount = await server.getAccount(account);
    const contract = new StellarSdk.Contract(TOKEN_CONTRACT_ID);
    const amountRaw = BigInt(Math.floor(parseFloat(amount) * 1e7));
    
    const operation = contract.call('mint', 
      StellarSdk.nativeToScVal(account, { type: 'address' }),
      StellarSdk.nativeToScVal(amountRaw, { type: 'i128' })
    );

    const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: "1000",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
    .addOperation(operation)
    .setTimeout(StellarSdk.TimeoutInfinite)
    .build();

    const prepared = await server.prepareTransaction(tx);
    return submitSorobanTx(prepared);
  };

  return { 
    account, 
    network, 
    tokenBalance, 
    connectWallet, 
    refreshBalance: () => refreshBalance(account), 
    submitSorobanTx,
    fundAccount,
    adminMint,
    connecting 
  };
};
