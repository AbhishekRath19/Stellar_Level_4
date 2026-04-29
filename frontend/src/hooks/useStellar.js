import { useState, useEffect, useCallback } from 'react';
import { isConnected, getAddress, getNetwork, setAllowed, signTransaction } from '@stellar/freighter-api';
import * as StellarSdk from '@stellar/stellar-sdk';

const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
const RPC_URL = 'https://soroban-testnet.stellar.org';

// Constants for deployed contracts
export const CONTRACT_IDS = {
  MARKET: 'CDUZWM4LXMHNEWF45XBM5DBQDKBRKGT5SO6NXF7HSYUIDAWV37YQVOPS',
  TOKEN: 'CCJBOURAHBBDFHYNVYOAKPC2T3Z5QDBEMBXG4ENNUTENGMZVI2TOYSKJ'
};

// Helper to safely convert ScVal to Native, handling both objects and XDR strings
const safeScValToNative = (scVal) => {
  if (scVal === null || scVal === undefined) return null;
  try {
    // If it's a string, it's likely Base64 XDR
    if (typeof scVal === 'string') {
      try {
        const parsed = StellarSdk.xdr.ScVal.fromXDR(scVal, 'base64');
        return StellarSdk.scValToNative(parsed);
      } catch (e) {
        return scVal; // Return as-is if parsing fails
      }
    }
    // If it's an object, check for the switch method required by scValToNative
    if (scVal && typeof scVal === 'object' && typeof scVal.switch === 'function') {
      return StellarSdk.scValToNative(scVal);
    }
    return scVal;
  } catch (e) {
    console.warn("Safe conversion fallback:", e);
    return scVal;
  }
};

export const useStellar = () => {
  const [account, setAccount] = useState(null);
  const [network, setNetwork] = useState(null);
  const [tokenBalance, setTokenBalance] = useState('0');
  const [connecting, setConnecting] = useState(false);
  const [server] = useState(new StellarSdk.rpc.Server(RPC_URL));

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
    const targetAddress = address || account;
    if (!targetAddress) return;
    try {
      const contract = new StellarSdk.Contract(CONTRACT_IDS.TOKEN);
      // Simulate balance call to get current state

      // For simplicity, we'll implement a real call here using simulateTransaction
      const op = contract.call('balance', StellarSdk.nativeToScVal(address, { type: 'address' }));
      const result = await server.simulateTransaction(
        new StellarSdk.TransactionBuilder(
          new StellarSdk.Account(address, '0'),
          { fee: '100', networkPassphrase: NETWORK_PASSPHRASE }
        ).addOperation(op).setTimeout(StellarSdk.TimeoutInfinite).build()
      );
      
      if (result.result && result.result.retval) {
        const balance = safeScValToNative(result.result.retval);
        setTokenBalance((Number(balance) / 10000000).toString());
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

  const mintTokens = async (amount, toAddress = null) => {
    const target = toAddress || account;
    if (!target) return;
    const contract = new StellarSdk.Contract(CONTRACT_IDS.TOKEN);
    const amountRaw = BigInt(Math.floor(parseFloat(amount) * 1e7));
    
    const op = contract.call('mint', 
      StellarSdk.nativeToScVal(target, { type: 'address' }),
      StellarSdk.nativeToScVal(amountRaw, { type: 'i128' })
    );

    return submitSorobanTx(op);
  };

  const submitSorobanTx = async (operation) => {
    if (!account) throw new Error("Wallet not connected");
    
    try {
      // 1. Build initial skeleton transaction
      const accountInfo = await server.getAccount(account);
      const tx = new StellarSdk.TransactionBuilder(accountInfo, {
        fee: "1000", // Initial fee for preparation
        networkPassphrase: NETWORK_PASSPHRASE,
      })
      .addOperation(operation)
      .setTimeout(StellarSdk.TimeoutInfinite)
      .build();

      // 2. Prepare Transaction (Calculates real fees and footprint)
      let preparedTx;
      try {
        preparedTx = await server.prepareTransaction(tx);
      } catch (simError) {
        console.error("Preparation failed:", simError);
        throw new Error(`Transaction Preparation Failed: ${simError.message || "Unknown Error"}`);
      }

      // 3. Sign with Wallet
      const unsignedXdr = preparedTx.toXDR('base64');
      let signedXdrResponse;
      try {
        signedXdrResponse = await signTransaction(unsignedXdr, {
          network: 'TESTNET',
          networkPassphrase: NETWORK_PASSPHRASE,
        });
      } catch (signErr) {
        throw new Error("Signing rejected: " + signErr.message);
      }

      if (!signedXdrResponse) throw new Error("Wallet returned no signature");

      // 4. Submit to Network (Direct RPC to bypass SDK crashes)
      // Robustly extract and clean the XDR string
      let finalXdr = signedXdrResponse;
      if (typeof signedXdrResponse === 'object' && signedXdrResponse !== null) {
        // Freighter can return { xdr: "..." } or { signedTransaction: "..." }
        finalXdr = signedXdrResponse.xdr || signedXdrResponse.signedTransaction || signedXdrResponse;
      }
      
      // Professional-grade Base64 conversion if it's binary
      if (typeof finalXdr !== 'string' && finalXdr !== null) {
        try {
          // Use Buffer if available, otherwise fallback to native methods
          if (typeof Buffer !== 'undefined') {
            finalXdr = Buffer.from(finalXdr).toString('base64');
          } else {
            const bytes = new Uint8Array(finalXdr);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            finalXdr = btoa(binary);
          }
        } catch (e) {
          console.error("Binary to Base64 conversion failed:", e);
        }
      }
      
      if (typeof finalXdr !== 'string') {
        console.error("Final XDR is not a string:", finalXdr);
        throw new Error(`The signed XDR is invalid: ${typeof finalXdr}`);
      }

      finalXdr = finalXdr.trim().replace(/[\r\n]/g, '');

      // Verify XDR is valid before sending
      try {
        StellarSdk.TransactionBuilder.fromXDR(finalXdr, NETWORK_PASSPHRASE);
      } catch (e) {
        console.error("The signed XDR is invalid or unrecognized:", finalXdr);
        throw new Error("Invalid XDR generated after signing: " + e.message);
      }

      const rpcResponse = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'sendTransaction',
          params: { transaction: finalXdr }
        })
      });
      
      const rpcData = await rpcResponse.json();
      if (rpcData.error) {
        console.error("RPC Send Error:", rpcData.error);
        throw new Error(`RPC Error: ${rpcData.error.message} (Data: ${JSON.stringify(rpcData.error.data)})`);
      }
      
      const response = rpcData.result;
      if (response.status === 'ERROR') {
        console.error("TX Logic Error:", response);
        throw new Error(`TX Rejected: ${response.errorResultXdr || "Check console for details"}`);
      }

      // 5. Poll for Confirmation
      let result;
      while (true) {
        const pollResponse = await fetch(RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now() + 1,
            method: 'getTransaction',
            params: { hash: response.hash }
          })
        });
        
        const pollData = await pollResponse.json();
        result = pollData.result;
        
        if (result && result.status !== 'NOT_FOUND' && result.status !== 'PENDING') break;
        await new Promise(r => setTimeout(r, 2000));
      }

      if (result.status === 'SUCCESS') {
        console.log("Success!", response.hash);
        refreshBalance(account);
        return result;
      } else {
        throw new Error(`On-Chain Error: ${result.status}`);
      }
    } catch (error) {
      console.error("Soroban Error:", error);
      alert(error.message || "Transaction failed");
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
      console.error(e);
      alert("Friendbot failed. Please fund manually.");
    }
  };

  const seedMarkets = async () => {
    if (!account) return;
    const marketsToSeed = [
      {
        question: "Will Stellar (XLM) flip Ripple (XRP) in Market Cap by EOY 2026?",
        options: ["Yes", "No", "Equal"],
        closeTime: Math.floor(Date.now() / 1000) + 86400 * 30 // 30 days
      },
      {
        question: "Will Soroban handle over 1M transactions per day by July 2026?",
        options: ["Yes", "No"],
        closeTime: Math.floor(Date.now() / 1000) + 86400 * 15 // 15 days
      },
      {
        question: "Which DeFi protocol will dominate Stellar in 2026?",
        options: ["Predix", "Soroswap", "LumenSwap", "Other"],
        closeTime: Math.floor(Date.now() / 1000) + 86400 * 60 // 60 days
      }
    ];

    const marketContract = new StellarSdk.Contract(CONTRACT_IDS.MARKET);
    
    for (const m of marketsToSeed) {
      const op = marketContract.call('create_market',
        StellarSdk.nativeToScVal(account, { type: 'address' }),
        StellarSdk.nativeToScVal(m.question, { type: 'string' }),
        StellarSdk.nativeToScVal(m.options), // Simplified: nativeToScVal handles arrays of primitives automatically
        StellarSdk.nativeToScVal(m.closeTime, { type: 'u64' })
      );
      await submitSorobanTx(op);
    }
    alert("Markets seeded successfully!");
  };

  const issueClassicToken = async (assetCode, amount) => {
    if (!account) throw new Error("Connect wallet first");
    
    try {
      // 1. Generate a temporary issuer for this session
      const issuer = StellarSdk.Keypair.random();
      const asset = new StellarSdk.Asset(assetCode, issuer.publicKey());
      
      console.log("Issuer created:", issuer.publicKey());
      
      // 2. Fund the issuer so it can exist on ledger
      await fetch(`https://friendbot.stellar.org?addr=${issuer.publicKey()}`);
      
      // 3. User creates Trustline (via Freighter)
      const userAccountInfo = await server.getAccount(account);
      const trustTx = new StellarSdk.TransactionBuilder(userAccountInfo, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
      .addOperation(StellarSdk.Operation.changeTrust({ asset }))
      .setTimeout(StellarSdk.TimeoutInfinite)
      .build();

      const signedTrustXdr = await signTransaction(trustTx.toXDR(), { 
        network: 'TESTNET',
        networkPassphrase: NETWORK_PASSPHRASE
      });
      
      // Extract XDR from Freighter response
      let finalTrustXdr = typeof signedTrustXdr === 'object' ? signedTrustXdr.xdr || signedTrustXdr.signedTransaction || signedTrustXdr : signedTrustXdr;
      
      // Submit Trustline
      await submitSorobanTx(finalTrustXdr);
      console.log("Trustline established!");

      // 4. Issuer sends tokens to User
      // We need to wait a bit for the trustline to clear on ledger
      await new Promise(r => setTimeout(r, 2000));
      
      const issuerAccountInfo = await server.getAccount(issuer.publicKey());
      const paymentTx = new StellarSdk.TransactionBuilder(issuerAccountInfo, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
      .addOperation(StellarSdk.Operation.payment({
        destination: account,
        asset: asset,
        amount: amount.toString()
      }))
      .setTimeout(StellarSdk.TimeoutInfinite)
      .build();

      paymentTx.sign(issuer);
      
      // Submit payment using the direct RPC method we built
      const rpcResponse = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'sendTransaction',
          params: { transaction: paymentTx.toXDR() }
        })
      });
      
      const rpcData = await rpcResponse.json();
      console.log("Issuance complete:", rpcData);
      return { asset, issuer: issuer.publicKey(), txHash: rpcData.result?.hash };
      
    } catch (err) {
      console.error("Classic issuance failed:", err);
      throw err;
    }
  };

  const adminMint = async (amount = 100000) => {
    if (!account) throw new Error("Connect wallet first");
    console.log(`Admin Minting ${amount} MTK...`);
    return mintTokens(amount);
  };

  const swapXlmToMtk = async (amount) => {
    if (!account) throw new Error("Connect wallet first");
    
    // In a real production app, this would involve sending XLM to a treasury.
    // For this Level 4 implementation, we will simulate the swap by minting MTK 
    // to the user in exchange for their XLM (handled via a Payment + Mint transaction).
    
    // 1. Build a transaction that sends XLM to a treasury and mints MTK
    // For simplicity in this demo, we'll just mint MTK 1:1.
    console.log(`Swapping ${amount} XLM to MTK...`);
    return mintTokens(amount); 
  };

  const swapMtkToXlm = async (amount) => {
    if (!account) throw new Error("Connect wallet first");
    
    // 1:1 Swap back to XLM
    // This would typically burn MTK and send XLM from a treasury.
    // Since we don't have a backend treasury for this demo, we'll simulate the success.
    console.log(`Swapping ${amount} MTK to XLM...`);
    
    // Simulate burning tokens (transfer to a null address or treasury)
    const tokenContract = new StellarSdk.Contract(CONTRACT_IDS.TOKEN);
    const amountRaw = BigInt(Math.floor(parseFloat(amount) * 1e7));
    
    const op = tokenContract.call('transfer',
      StellarSdk.nativeToScVal(account, { type: 'address' }),
      StellarSdk.nativeToScVal('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', { type: 'address' }),
      StellarSdk.nativeToScVal(amountRaw, { type: 'i128' })
    );
    
    await submitSorobanTx(op);
    return true;
  };

  const setupMtkTrustline = async () => {
    // If MTK was a classic asset, we'd need this.
    // For the Soroban contract, we'll just ensure the user is aware of the token.
    console.log("Setting up MTK Trustline (Soroban Optimization)...");
    return true; 
  };

  return { 
    account, 
    network, 
    tokenBalance, 
    connectWallet, 
    refreshBalance: () => refreshBalance(account), 
    mintTokens,
    submitSorobanTx,
    fundAccount,
    seedMarkets,
    issueClassicToken,
    swapXlmToMtk,
    swapMtkToXlm,
    adminMint,
    setupMtkTrustline,
    connecting 
  };
};
