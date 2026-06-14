// ============================================
// TRANSFER FEE WITHDRAWAL SCRIPT
// ============================================
/**
 * This script withdraws accumulated transfer fees from Token-22 token accounts.
 *
 * USAGE:
 *   node fee.js
 *
 * FUNCTIONALITY:
 *   1. Fetches all token accounts for the specified mint
 *   2. Identifies accounts with withheld transfer fees
 *   3. Withdraws accumulated fees to the recipient account
 *
 * AUTOMATION:
 *   Typically run via cron (cron_fetch_fees.sh) every 10 minutes
 *
 * DEPENDENCIES:
 *   - @solana/web3.js - Solana blockchain interaction
 *   - @solana/spl-token - SPL Token-22 operations
 */

import "dotenv/config";
import fs from "fs";
import { Connection, PublicKey, Keypair, clusterApiUrl } from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  unpackAccount,
  getTransferFeeAmount,
  withdrawWithheldTokensFromAccounts,
} from "@solana/spl-token";

// ============================================
// CONFIGURATION
// ============================================

// RPC connection to Solana devnet using Helius API (key from .env, see .env.example)
const connection = new Connection(`https://devnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`, "confirmed");

// Token mint address (Token-22 with transfer fee extension)
const mint = new PublicKey("pee1EpdW1XtxtmMHcLDrz2zfj8rCUHzzbUv7KNdu1jh");

// Authority keypair that can withdraw withheld fees.
// Loaded from a keypair file referenced by FEE_AUTHORITY_KEYPAIR in .env (never hardcoded).
const withdrawAuthority = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(process.env.FEE_AUTHORITY_KEYPAIR, "utf8")))
);

// Recipient address where withdrawn fees are sent (dev wallet for lottery pool)
const recipient = new PublicKey("6G1QeTfw8z8RxiruGGjj3ioTX3hpptpGwvPNdixGVS2z");


// ============================================
// FETCH ALL TOKEN ACCOUNTS
// ============================================

/**
 * Query all accounts in the Token-22 program that hold this token.
 * Uses memcmp filter to only get accounts for our specific mint.
 */
const allAccounts = await connection.getProgramAccounts(TOKEN_2022_PROGRAM_ID, {
  commitment: "confirmed",
  filters: [{ memcmp: { offset: 0, bytes: mint.toBase58() } }], // Filter by mint address
});

// Array to collect accounts that have withheld fees ready for withdrawal
const accountsToWithdrawFrom = [];

// ============================================
// IDENTIFY ACCOUNTS WITH WITHHELD FEES
// ============================================

/**
 * Loop through all token accounts and check for withheld transfer fees.
 * Only collect accounts that:
 *   1. Have a withheld amount > 0
 *   2. Are NOT on the Ed25519 curve (to avoid signature verification issues)
 */
for (const accountInfo of allAccounts) {
  // Unpack the token account data to access extension information
  const account = unpackAccount(accountInfo.pubkey, accountInfo.account, TOKEN_2022_PROGRAM_ID);

  // Extract transfer fee extension data (if present)
  const transferFeeAmount = getTransferFeeAmount(account);

  // Check if the account has withheld fees
  if (transferFeeAmount && transferFeeAmount.withheldAmount > BigInt(0)) {
    const info = await connection.getAccountInfo(accountInfo.pubkey);

    /**
     * Ed25519 Curve Check:
     * Some accounts (like program-derived addresses) are NOT on the Ed25519 curve.
     * Attempting to withdraw from these accounts would fail with signature errors.
     * We filter them out by checking if the owner is the System Program.
     *
     * Owner "11111111111111111111111111111111" = System Program (curve-based account)
     * Any other owner = Token-22 program account (not on curve)
     */
    if (info && info.owner.toBase58() !== "11111111111111111111111111111111") {
      accountsToWithdrawFrom.push(accountInfo.pubkey);
    }
  }
}

// ============================================
// WITHDRAW ACCUMULATED FEES
// ============================================

/**
 * If eligible accounts with fees were found, execute withdrawal transaction.
 * All fees are consolidated and sent to the recipient account.
 */
if (accountsToWithdrawFrom.length > 0) {
  const withdrawTx = await withdrawWithheldTokensFromAccounts(
    connection,                  // RPC connection
    withdrawAuthority,           // Payer of transaction fees
    mint,                        // Token mint address
    recipient,                   // Destination account for withdrawn fees
    withdrawAuthority,           // Authority with permission to withdraw fees
    [],                          // Additional signing accounts (none needed)
    accountsToWithdrawFrom,      // Source accounts to withdraw from
    undefined,                   // Confirmation options (use default)
    TOKEN_2022_PROGRAM_ID        // SPL Token-22 program ID
  );

  console.log("Withdrawal successful:", withdrawTx);
  console.log(`Withdrew from ${accountsToWithdrawFrom.length} accounts`);
} else {
  console.log("No eligible accounts found for withdrawal.");
  console.log("This is normal if no transfers have occurred since last withdrawal.");
}
