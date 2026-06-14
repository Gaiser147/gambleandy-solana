const fs = require('fs');
const {
  Connection,
  clusterApiUrl,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction
} = require('@solana/web3.js');
const {
  getAssociatedTokenAddress,
  getAccount,
  createTransferInstruction,
  createTransferCheckedInstruction,
  TOKEN_PROGRAM_ID
} = require('@solana/spl-token');
const { createClient } = require('@supabase/supabase-js'); // Hinzugefügt
require('dotenv').config();

// Supabase-Client initialisieren (Credentials aus .env, siehe .env.example)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  // [Bestehender Code bleibt gleich bis zur Transaktionsbestätigung...]
  // --- Konfiguration und Dateipfade ---
  const SELECTED_HOLDER_FILE = '/root/new-token/data/selectedHolder.json';
  const PAID_HOLDERS_FILE = '/root/new-token/data/paidHolders.json';
  const MY_WALLET_FILE = '/root/new-token/keys/bosC6w6dRq6Bt4sahh78PpDNqcecx8Xu6EvzMYdbxrp.json';
  // Zieladresse für die 10%-Überweisung (hier aus deinem Beispiel)
  const DESTINATION_WALLET_ADDRESS = "6r3wAzZ25Wzh8rjdtcp4A52chJ177fr7DNCh8hERXMXP";

  // Mint-Adresse (wie in deinem CLI-Beispiel)
  const TOKEN_MINT_ADDRESS = "pee1EpdW1XtxtmMHcLDrz2zfj8rCUHzzbUv7KNdu1jh";

  // Verwende den korrekten Token-Programm-ID, der in deinem Token-Account angezeigt wird:
  const CUSTOM_TOKEN_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

  // --- Ausgewählten Holder auslesen ---
  if (!fs.existsSync(SELECTED_HOLDER_FILE)) {
    console.error(`Fehler: Datei ${SELECTED_HOLDER_FILE} nicht gefunden.`);
    process.exit(1);
  }
  const selectedHolderData = JSON.parse(fs.readFileSync(SELECTED_HOLDER_FILE, 'utf8'));
  const selectedHolderAddress = selectedHolderData.selectedHolder;
  if (!selectedHolderAddress) {
    console.error("Fehler: Keine gültige Holder-Adresse in selectedHolder.json gefunden.");
    process.exit(1);
  }
  const selectedHolderPubkey = new PublicKey(selectedHolderAddress);

  // --- Wallet laden ---
  if (!fs.existsSync(MY_WALLET_FILE)) {
    console.error(`Fehler: Datei ${MY_WALLET_FILE} nicht gefunden.`);
    process.exit(1);
  }
  const secretKeyArray = JSON.parse(fs.readFileSync(MY_WALLET_FILE, 'utf8'));
  const myWallet = Keypair.fromSecretKey(new Uint8Array(secretKeyArray));

  // --- Verbindung zum Solana-Netzwerk ---
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  const mintPubkey = new PublicKey(TOKEN_MINT_ADDRESS);
  const destinationWalletPubkey = new PublicKey(DESTINATION_WALLET_ADDRESS);

  // --- Token Account des eigenen Wallets abrufen (per getTokenAccountsByOwner) ---
  const myTokenAccounts = await connection.getTokenAccountsByOwner(myWallet.publicKey, { mint: mintPubkey });
  if (myTokenAccounts.value.length === 0) {
    console.error("Fehler: Kein Token-Account für mein Wallet gefunden.");
    process.exit(1);
  }
  const myTokenAccount = myTokenAccounts.value[0].pubkey;
  console.log("My Token Account:", myTokenAccount.toString());

  // --- Token-Saldo abrufen ---
  const tokenBalanceInfo = await connection.getTokenAccountBalance(myTokenAccount);
  const tokenBalance = BigInt(tokenBalanceInfo.value.amount);
  if (tokenBalance === 0n) {
    console.error("Fehler: Token-Saldo ist 0.");
    process.exit(1);
  }
  // Berechnung der Überweisungsbeträge: 90% an den ausgewählten Holder, 10% an das Ziel-Wallet
  const amount90 = tokenBalance * 90n / 100n;
  const amount10 = tokenBalance - amount90;
  console.log(`Token-Saldo: ${tokenBalance.toString()}`);
  console.log(`Überweise 90% (${amount90.toString()} Token) an den ausgewählten Holder (${selectedHolderAddress})`);
  console.log(`Überweise 10% (${amount10.toString()} Token) an das Ziel-Wallet (${DESTINATION_WALLET_ADDRESS})`);

  // --- Token Account des ausgewählten Holders abrufen ---
  const selectedHolderTokenAccounts = await connection.getTokenAccountsByOwner(selectedHolderPubkey, { mint: mintPubkey });
  if (selectedHolderTokenAccounts.value.length === 0) {
    console.error("Fehler: Kein Token-Account für den ausgewählten Holder gefunden.");
    process.exit(1);
  }
  const selectedHolderTokenAccount = selectedHolderTokenAccounts.value[0].pubkey;
  console.log("Selected Holder Token Account:", selectedHolderTokenAccount.toString());

  // --- Token Account des Ziel-Wallets abrufen ---
  const destinationTokenAccounts = await connection.getTokenAccountsByOwner(destinationWalletPubkey, { mint: mintPubkey });
  if (destinationTokenAccounts.value.length === 0) {
    console.error("Fehler: Kein Token-Account für das Ziel-Wallet gefunden.");
    process.exit(1);
  }
  const destinationTokenAccount = destinationTokenAccounts.value[0].pubkey;
  console.log("Destination Token Account:", destinationTokenAccount.toString());

  // --- Transaktion erstellen mit zwei Transfer-Instructions unter Verwendung von createTransferCheckedInstruction ---
  // Hinweis: In deinem Fall sind die Token-Dezimalstellen 2.
  const transaction = new Transaction();
  const transferInstruction1 = createTransferCheckedInstruction(
    myTokenAccount,                    // Source
    mintPubkey,                        // Mint
    selectedHolderTokenAccount,        // Destination
    myWallet.publicKey,                // Owner
    amount90,                          // Amount (in kleinsten Einheiten)
    2,                                 // Dezimalstellen
    [],                                // Optional: signers (leer)
    CUSTOM_TOKEN_PROGRAM_ID            // Custom Token Programm-ID
  );
  const transferInstruction2 = createTransferCheckedInstruction(
    myTokenAccount,
    mintPubkey,
    destinationTokenAccount,
    myWallet.publicKey,
    amount10,
    2,
    [],
    CUSTOM_TOKEN_PROGRAM_ID
  );
  transaction.add(transferInstruction1, transferInstruction2);

  try {
    txSignature = await sendAndConfirmTransaction(connection, transaction, [myWallet]);
    console.log(`Transaktion erfolgreich. Signatur: ${txSignature}`);
  } catch (error) {
    console.error("Fehler bei der Transaktion:", error);
    process.exit(1);
  }

  // --- Supabase-Insert ---
  const { data, error: supabaseError } = await supabase
    .from('Andy')
    .insert([
      {
        holder_address: selectedHolderAddress,
        tx_signature: txSignature,
        amount: amount90.toString(),
        timestamp: new Date().toISOString(),
        destination_wallet: DESTINATION_WALLET_ADDRESS,
        destination_amount: amount10.toString()
      }
    ])
    .select();

  if (supabaseError) {
    console.error("Fehler beim Speichern in Supabase:", supabaseError);
    process.exit(1);
  }
  console.log("Daten erfolgreich in Supabase gespeichert:", data);

  // --- Restlicher bestehender Code ---
  fs.unlinkSync(SELECTED_HOLDER_FILE);
  console.log(`${SELECTED_HOLDER_FILE} wurde gelöscht.`);

  let paidHolders = [];
  if (fs.existsSync(PAID_HOLDERS_FILE)) {
    paidHolders = JSON.parse(fs.readFileSync(PAID_HOLDERS_FILE, 'utf8'));
  }
  
  const paymentRecord = {
    order: paidHolders.length + 1,
    holder: selectedHolderAddress,
    timestamp: new Date().toISOString(),
    txSignature: txSignature,
    amount: amount90.toString()
  };
  
  paidHolders.push(paymentRecord);
  fs.writeFileSync(PAID_HOLDERS_FILE, JSON.stringify(paidHolders, null, 2));
  console.log(`Holder ${selectedHolderAddress} wurde als bezahlt registriert (Reihenfolge ${paymentRecord.order}).`);
})();
