// vrfSelectHolder.js
/**
 * Führt eine verifizierbare Ziehung mittels Switchboard VRF durch
 * und speichert den Gewinner in selectedHolder.json.
 *
 * npm install @solana/web3.js @switchboard-xyz/solana.js fs crypto
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { VrfAccount, VrfClient } from "@switchboard-xyz/solana.js";

// === Konfiguration ===
const NETWORK       = "devnet";                 // oder "mainnet-beta"
const connection    = new Connection(clusterApiUrl(NETWORK), "confirmed");
const HOLDERS_FILE  = "/root/new-token/data/holders.json";
const RANGES_FILE   = "/root/new-token/data/ticketRanges.json";
const SNAPSHOT_DIR  = "/root/new-token/data/snapshots";
const SELECTED_FILE = "/root/new-token/data/selectedHolder.json";
// VRF-Keys & Account (vorher erstellt und gefunded)
const VRF_KEYPAIR   = "/root/new-token/keys/vrfAuthority.json";
const VRF_ACCOUNT   = "/root/new-token/keys/vrfAccount.json";

async function snapshotHolders() {
  if (!fs.existsSync(SNAPSHOT_DIR)) fs.mkdirSync(SNAPSHOT_DIR);
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const dst = path.join(SNAPSHOT_DIR, `holders-${ts}.json`);
  fs.copyFileSync(HOLDERS_FILE, dst);
  console.log(`Snapshot saved to ${dst}`);
}

function hashRanges() {
  const raw = fs.readFileSync(RANGES_FILE);
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  console.log(`Ranges SHA256: ${hash}`);
}

async function requestVrfRandom() {
  // Lade VRF-Authority und VRF-Account
  const vrfKeypair = JSON.parse(fs.readFileSync(VRF_KEYPAIR, "utf8"));
  const vrfAccountData = JSON.parse(fs.readFileSync(VRF_ACCOUNT, "utf8"));
  const vrfAccount = VrfAccount.fromAccountData(vrfAccountData);
  const vrfClient  = new VrfClient(connection, vrfKeypair);

  // Request & Poll
  console.log("Requesting VRF randomness...");
  await vrfClient.requestRandomness(vrfAccount, { authority: vrfKeypair.publicKey });
  let result;
  do {
    await new Promise(r => setTimeout(r, 3000));
    const data = await vrfAccount.loadData(connection);
    result = data.result;
  } while (!result);
  console.log("VRF result:", result.toString());
  return BigInt(result.toString());
}

function pickWinner(randomBigInt) {
  const { totalTickets, ranges } = JSON.parse(fs.readFileSync(RANGES_FILE, "utf8"));
  const r = randomBigInt % BigInt(totalTickets);
  for (const entry of ranges) {
    const start = BigInt(entry.start), end = BigInt(entry.end);
    if (r >= start && r < end) {
      console.log(`Winner ticket ${r} → ${entry.address}`);
      return entry.address;
    }
  }
  throw new Error("No winner found");
}

function saveSelectedHolder(address) {
  fs.writeFileSync(SELECTED_FILE, JSON.stringify({ selectedHolder: address }, null, 2));
  console.log(`Saved winner to ${SELECTED_FILE}`);
}

function cleanupRanges() {
  fs.unlinkSync(RANGES_FILE);
  console.log(`Deleted ${RANGES_FILE}`);
}

(async () => {
  try {
    await snapshotHolders();
    hashRanges();
    const vrfRand = await requestVrfRandom();
    const winner  = pickWinner(vrfRand);
    saveSelectedHolder(winner);
    cleanupRanges();
    console.log("Selection complete.");
  } catch (e) {
    console.error("Error during VRF selection:", e);
    process.exit(1);
  }
})();
