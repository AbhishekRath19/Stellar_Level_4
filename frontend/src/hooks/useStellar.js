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
   * CRITICAL: Final submission-ready submitSorobanTx
   * Implements exact Freighter response extraction for Level 4 Bounty
   */
  const submitSorobanTx = async (tx) => {
    try {
      console.log("📤 Starting transaction submission...");
      
      // Step 1: Validate transaction
      if (!tx || typeof tx.toXDR !== 'function') {
        throw new Error("Invalid transaction object provided");
      }

      // Step 2: Convert to XDR before signing
      const unsignedXdr = tx.toXDR();
      console.log("✅ XDR generated (unsigned):", unsignedXdr.substring(0, 50) + "...");

      // Step 3: Sign with Freighter
      console.log("🔐 Requesting signature from Freighter...");
      const signResponse = await signTransaction(unsignedXdr, {
        network: 'TESTNET',
        networkPassphrase: NETWORK_PASSPHRASE,
      });

      console.log("📦 Sign response type:", typeof signResponse);
      console.log("📦 Sign response:", signResponse);

      // Step 4: CRITICAL FIX - Extract XDR from response object
      let signedXdrString;
      
      if (typeof signResponse === 'string') {
        // Old Freighter API - returns string directly
        signedXdrString = signResponse;
        console.log("✅ Using string response (old API)");
      } else if (signResponse && typeof signResponse === 'object') {
        // New Freighter API - check common keys including signedTxXdr
        if (signResponse.signedTxXdr) {
          signedXdrString = signResponse.signedTxXdr;
          console.log("✅ Extracted signedTxXdr from response object");
        } else if (signResponse.signedTransaction) {
          signedXdrString = signResponse.signedTransaction;
          console.log("✅ Extracted signedTransaction from response object");
        } else if (signResponse.xdr) {
          signedXdrString = signResponse.xdr;
          console.log("✅ Extracted xdr from response object");
        } else {
          console.error("❌ Unknown response structure:", signResponse);
          throw new Error("Could not extract signed XDR from Freighter response");
        }
      } else {
        throw new Error(`Unexpected response type: ${typeof signResponse}`);
      }

      // Step 5: Validate we have a string
      if (typeof signedXdrString !== 'string' || signedXdrString.length === 0) {
        throw new Error("Signed XDR is not a valid string");
      }

      console.log("✅ Signed XDR extracted successfully");

      // Step 6: Rebuild transaction from signed XDR
      const signedTransaction = new StellarSdk.Transaction(
        signedXdrString,
        NETWORK_PASSPHRASE
      );

      // Step 7: Submit to Soroban RPC
      console.log("📤 Submitting to Soroban RPC...");
      const response = await server.sendTransaction(signedTransaction);

      console.log("📬 Response status:", response.status);
      console.log("📬 Response hash:", response.hash);

      // Step 8: Poll for Confirmation
      if (response.status === "PENDING" || response.status === "NOT_FOUND") {
        console.log("⏳ Waiting for transaction confirmation...");
        let attempt = 0;
        const maxAttempts = 30; 
        let txResponse;

        while (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          attempt++;
          console.log(`Polling... Attempt ${attempt}/${maxAttempts}`);

          try {
            txResponse = await server.getTransaction(response.hash);
            
            if (txResponse.status === "SUCCESS") {
              console.log("✅ Transaction confirmed on ledger!");
              refreshBalance(account);
              return txResponse;
            } else if (txResponse.status === "FAILED") {
              console.error("❌ Transaction failed:", txResponse);
              throw new Error(`Transaction failed: ${txResponse.resultXdr}`);
            }
          } catch (err) {
            console.log(`⏳ Waiting... (${err.message || 'not ready'})`);
          }
        }
        throw new Error("Transaction confirmation timeout");
      }

      if (response.status === "ERROR") {
        console.error("❌ RPC Error:", response);
        throw new Error(`Transaction error: ${response.errorResultXdr || 'Unknown error'}`);
      }

      return response;

    } catch (error) {
      console.error("❌ Transaction submission failed:", error);
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

  return { 
    account, 
    network, 
    tokenBalance, 
    connectWallet, 
    refreshBalance: () => refreshBalance(account), 
    submitSorobanTx,
    fundAccount,
    connecting 
  };
};
