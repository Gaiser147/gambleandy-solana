// assignTickets.js

import fs from "fs";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";

// === Konfiguration ===
const HOLDERS_FILE = "/root/new-token/data/holders.json";        // Deine Liste mit Adressen
const MINT_ADDRESS = "pee1EpdW1XtxtmMHcLDrz2zfj8rCUHzzbUv7KNdu1jh";   // Ersetze durch deinen Mint-Pubkey
const OUTPUT_FILE  = "/root/new-token/data/ticketRanges.json";   // Ausgabe-Datei

// Verbindung zu Devnet (bei Bedarf auf mainnet-beta ändern)
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

async function main() {
  // 1) Holder-Liste laden
  const holders = JSON.parse(fs.readFileSync(HOLDERS_FILE, "utf8"));

  // 2) Balances abfragen
  const mintPubkey = new PublicKey(MINT_ADDRESS);
  const balances = [];

  for (const addr of holders) {
    const ownerPubkey = new PublicKey(addr);
    const resp = await connection.getTokenAccountsByOwner(ownerPubkey, {
      mint: mintPubkey,
    });

    // Summe aller Teil-Accounts via getTokenAccountBalance
    let sum = 0n;
    for (const { pubkey } of resp.value) {
      const bal = await connection.getTokenAccountBalance(pubkey);
      sum += BigInt(bal.value.amount);
    }

    balances.push({ address: addr, tokens: sum });
    console.log(`Holder ${addr} → ${sum} Token`);
  }

  // 3) Cumulative Ticket-Ranges berechnen
  const ranges = [];
  let cumulative = 0n;

  for (const entry of balances) {
    const start = cumulative;
    const end   = cumulative + entry.tokens; // exklusiv
    ranges.push({
      address: entry.address,
      tokens:  entry.tokens.toString(),
      start:   start.toString(),
      end:     end.toString()
    });
    cumulative = end;
  }

  console.log(`\nTotal Tickets: ${cumulative.toString()}`);

  // 4) Ergebnis speichern
  const output = {
    totalTickets: cumulative.toString(),
    ranges
  };
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`Ticket-Ranges saved to ${OUTPUT_FILE}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
