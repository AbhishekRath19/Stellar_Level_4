import * as StellarSdk from '@stellar/stellar-sdk';
import fetch from 'node-fetch';

const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const server = new StellarSdk.rpc.Server('https://soroban-testnet.stellar.org'); // We'll use Horizon for classic
const horizonServer = new StellarSdk.Horizon.Server(HORIZON_URL);

async function createClassicToken(userPublicKey, assetCode, amount) {
    console.log(`Setting up classic asset ${assetCode} for user ${userPublicKey}...`);

    // 1. Create Issuer Account
    const issuer = StellarSdk.Keypair.random();
    console.log(`Issuer Public Key: ${issuer.publicKey()}`);
    console.log(`Issuer Secret Key: ${issuer.secret()}`);

    // 2. Fund Issuer via Friendbot
    console.log("Funding issuer via Friendbot...");
    await fetch(`https://friendbot.stellar.org?addr=${issuer.publicKey()}`);
    console.log("Issuer funded.");

    // 3. Define the Asset
    const asset = new StellarSdk.Asset(assetCode, issuer.publicKey());

    // 4. Instructions for User
    console.log("\n--- STEPS TO COMPLETE ---");
    console.log(`1. User (${userPublicKey}) must create a Trustline for ${assetCode}:${issuer.publicKey()}`);
    console.log(`2. Issuer (${issuer.publicKey()}) must then send ${amount} tokens to the User.`);
    
    // Note: In a real app, you'd build a transaction with two parts:
    // Part A: User signs ChangeTrust (via Freighter)
    // Part B: Issuer signs Payment (via secret key)
    
    return {
        issuerPublicKey: issuer.publicKey(),
        issuerSecret: issuer.secret(),
        assetCode: assetCode
    };
}

// Example usage:
// createClassicToken('G...', 'MYTOKEN', '1000');
