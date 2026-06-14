import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import raydium from '@raydium-io/raydium-sdk';

const { RaydiumSDK } = raydium;

// CONFIGURATION
const TOKEN_MINT = new PublicKey(process.env.TOKEN_MINT);
const WALLET_SECRET = JSON.parse(process.env.WALLET_SECRET);
const TOKEN_AMOUNT = parseInt(process.env.TOKEN_AMOUNT);
const SOL_AMOUNT = parseFloat(process.env.SOL_AMOUNT);

async function createPool() {
  const connection = new Connection('https://api.devnet.solana.com');
  const wallet = Keypair.fromSecretKey(Uint8Array.from(WALLET_SECRET));
  
  const raydiumSDK = new RaydiumSDK({ connection, wallet });
  
  // Create Pool
  const { transaction, signers } = await raydiumSDK.amm.createPool({
    baseMint: TOKEN_MINT,
    quoteMint: new PublicKey('So11111111111111111111111111111111111111112'), // SOL
    baseAmount: TOKEN_AMOUNT,
    quoteAmount: SOL_AMOUNT,
  });

  const txid = await connection.sendTransaction(transaction, signers);
  console.log(`Pool created: https://solana.fm/tx/${txid}?cluster=devnet`);
}

createPool().catch(console.error);
