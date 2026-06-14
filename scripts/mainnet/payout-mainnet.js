const fs = require('fs');
const {
  Connection,
  clusterApiUrl,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  SystemProgram
} = require('@solana/web3.js');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase-Client initialisieren (Credentials aus .env, siehe .env.example)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  // Pfade
  const SELECTED_HOLDER_FILE = '/root/new-token/data/selectedHolder.json';
  const PAID_HOLDERS_FILE = '/root/new-token/data/paidHolders.json';
  const MY_WALLET_FILE = '/root/new-token/keys/bosC6w6dRq6Bt4sahh78PpDNqcecx8Xu6EvzMYdbxrp.json';
  const DESTINATION_WALLET_ADDRESS = new PublicKey("6r3wAzZ25Wzh8rjdtcp4A52chJ177fr7DNCh8hERXMXP");

  // --- Ausgewählten Holder auslesen ---
  if (!fs.existsSync(SELECTED_HOLDER_FILE)) {
    console.error(`Fehler: Datei ${SELECTED_HOLDER_FILE} nicht gefunden.`);
    process.exit(1);
  }
  const { selectedHolder } = JSON.parse(fs.readFileSync(SELECTED_HOLDER_FILE, 'utf8'));
  if (!selectedHolder) {
    console.error("Fehler: Keine gültige Holder-Adresse in selectedHolder.json gefunden.");
    process.exit(1);
  }
  const selectedHolderPubkey = new PublicKey(selectedHolder);

  // --- Wallet laden ---
  if (!fs.existsSync(MY_WALLET_FILE)) {
    console.error(`Fehler: Datei ${MY_WALLET_FILE} nicht gefunden.`);
    process.exit(1);
  }
  const secretKeyArray = JSON.parse(fs.readFileSync(MY_WALLET_FILE, 'utf8'));
  const myWallet = Keypair.fromSecretKey(new Uint8Array(secretKeyArray));

  // --- Verbindung ---
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

  // --- SOL-Saldo abrufen ---
  const solBalance = await connection.getBalance(myWallet.publicKey);
  if (solBalance === 0) {
    console.error("Fehler: SOL-Saldo ist 0.");
    process.exit(1);
  }

  // 90% an Winner, 10% an Destination
  const amount90 = BigInt(solBalance) * 90n / 100n;
  const amount10 = BigInt(solBalance) - amount90;
  console.log(`SOL-Saldo: ${solBalance} Lamports`);
  console.log(`Überweise 90% (${amount90} Lamports) an Gewinner (${selectedHolder}).`);
  console.log(`Überweise 10% (${amount10} Lamports) an Ziel (${DESTINATION_WALLET_ADDRESS.toString()}).`);

  // --- Transaktion für SOL-Transfer ---
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: myWallet.publicKey,
      toPubkey: selectedHolderPubkey,
      lamports: amount90
    }),
    SystemProgram.transfer({
      fromPubkey: myWallet.publicKey,
      toPubkey: DESTINATION_WALLET_ADDRESS,
      lamports: amount10
    })
  );

  let txSignature;
  try {
    txSignature = await sendAndConfirmTransaction(connection, transaction, [myWallet]);
    console.log(`Transaktion erfolgreich. Signatur: ${txSignature}`);
  } catch (error) {
    console.error("Fehler bei der Transaktion:", error);
    process.exit(1);
  }

  // --- Supabase-Insert aktualisiert ---
  const winnerSol = Number(amount90) / 1e9;  // in SOL
  const destSol = Number(amount10) / 1e9;
  const { data, error: supabaseError } = await supabase
    .from('Andy')
    .insert([{ 
      holder_address: selectedHolder,
      tx_signature: txSignature,
      amount_sol: winnerSol,
      timestamp: new Date().toISOString(),
      destination_wallet: DESTINATION_WALLET_ADDRESS.toString(),
      destination_amount_sol: destSol
    }])
    .select();

  if (supabaseError) {
    console.error("Fehler beim Speichern in Supabase:", supabaseError);
    process.exit(1);
  }
  console.log("Daten erfolgreich in Supabase gespeichert:", data);

  // --- Protokollierung in paidHolders.json ---
  let paidHolders = [];
  if (fs.existsSync(PAID_HOLDERS_FILE)) {
    paidHolders = JSON.parse(fs.readFileSync(PAID_HOLDERS_FILE, 'utf8'));
  }
  const record = {
    order: paidHolders.length + 1,
    holder: selectedHolder,
    timestamp: new Date().toISOString(),
    txSignature,
    amount_sol: winnerSol
  };
  paidHolders.push(record);
  fs.writeFileSync(PAID_HOLDERS_FILE, JSON.stringify(paidHolders, null, 2));
  console.log(`Holder ${selectedHolder} als bezahlt registriert (Nr. ${record.order}).`);

  // --- Cleanup ---
  fs.unlinkSync(SELECTED_HOLDER_FILE);
  console.log(`${SELECTED_HOLDER_FILE} wurde gelöscht.`);
})();
