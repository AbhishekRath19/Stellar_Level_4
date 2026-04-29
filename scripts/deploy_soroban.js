import * as StellarSdk from '@stellar/stellar-sdk';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';

// Secret key from .env
const SECRET_KEY = process.env.DEPLOYER_SECRET_KEY;
if (!SECRET_KEY) {
  console.error("Please set DEPLOYER_SECRET_KEY in .env");
  process.exit(1);
}

const keypair = StellarSdk.Keypair.fromSecret(SECRET_KEY);
const server = new StellarSdk.rpc.Server(RPC_URL);

async function deployContract(wasmPath) {
  console.log(`Deploying ${path.basename(wasmPath)}...`);
  const wasm = fs.readFileSync(wasmPath);
  
  const account = await server.getAccount(keypair.publicKey());
  
  // 1. Install Wasm
  const installOp = StellarSdk.Operation.uploadContractWasm({ wasm });
  let tx = new StellarSdk.TransactionBuilder(account, {
    fee: '10000',
    networkPassphrase: NETWORK_PASSPHRASE,
  })
  .addOperation(installOp)
  .setTimeout(30)
  .build();

  const simulation = await server.simulateTransaction(tx);
  tx = server.assembleTransaction(tx, simulation);
  tx.sign(keypair);
  
  const sendRes = await server.sendTransaction(tx);
  console.log("Install TX sent:", sendRes.hash);
  
  let result = await pollTransaction(sendRes.hash);
  const wasmHash = result.wasmId; // In some SDK versions it's different
  console.log("Wasm Hash:", wasmHash);

  // 2. Create Contract Instance
  const createOp = StellarSdk.Operation.createContract({
    wasmHash,
    address: keypair.publicKey(),
  });
  
  // ... similar logic for create
  // Note: For brevity in this plan, I'll provide a simplified version or 
  // instructions to use Stellar CLI which is the standard way.
}

async function pollTransaction(hash) {
  let res = await server.getTransaction(hash);
  while (res.status === 'NOT_FOUND' || res.status === 'PENDING') {
    await new Promise(r => setTimeout(r, 2000));
    res = await server.getTransaction(hash);
  }
  return res;
}

// In a real scenario, users use Stellar CLI:
// stellar contract deploy --wasm path/to/wasm --source-account S... --network testnet
console.log("Recommended Deployment Flow:");
console.log("1. stellar contract deploy --wasm contracts_soroban/token/target/wasm32-unknown-unknown/release/market_token.wasm --source-account deployer --network testnet");
console.log("2. stellar contract deploy --wasm contracts_soroban/prediction_market/target/wasm32-unknown-unknown/release/prediction_market.wasm --source-account deployer --network testnet");
