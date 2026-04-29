import * as StellarSdk from '@stellar/stellar-sdk';

// Network configuration
export const NETWORK = 'TESTNET';
export const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;
export const HORIZON_URL = 'https://horizon-testnet.stellar.org';
export const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';

// Contract addresses (Updated with user's specific IDs if they provided them, 
// otherwise keeping current project defaults)
export const MARKET_CONTRACT_ID = 'CDUZWM4LXMHNEWF45XBM5DBQDKBRKGT5SO6NXF7HSYUIDAWV37YQVOPS';
export const TOKEN_CONTRACT_ID = 'CCJBOURAHBBDFHYNVYOAKPC2T3Z5QDBEMBXG4ENNUTENGMZVI2TOYSKJ';

// Initialize Soroban server
// Using rpc.Server which is standard for version 12.3.0
export const server = new StellarSdk.rpc.Server(SOROBAN_RPC_URL);

// Initialize Horizon server (for classic operations)
export const horizonServer = new StellarSdk.Horizon.Server(HORIZON_URL);

// Helper function to check if contract exists
export const verifyContract = async (contractAddress) => {
  try {
    const contract = await server.getLedgerEntries(
        StellarSdk.xdr.LedgerKey.contractData(
            new StellarSdk.xdr.LedgerKeyContractData({
                contract: new StellarSdk.Address(contractAddress).toScAddress(),
                key: StellarSdk.nativeToScVal(0),
                durability: StellarSdk.xdr.ContractDataDurability.persistent()
            })
        )
    );
    console.log("✅ Contract verified:", contractAddress);
    return true;
  } catch (error) {
    console.error("❌ Contract check error:", contractAddress, error);
    return false;
  }
};

export default {
  NETWORK,
  NETWORK_PASSPHRASE,
  HORIZON_URL,
  SOROBAN_RPC_URL,
  MARKET_CONTRACT_ID,
  TOKEN_CONTRACT_ID,
  server,
  horizonServer,
  verifyContract,
};
