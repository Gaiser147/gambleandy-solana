#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Adresse aus den Kommandozeilenargumenten entnehmen
const address = process.argv[2];
if (!address) {
  console.error("Usage: node script.js [address]");
  process.exit(1);
}

// Befehl zusammenbauen, wobei die Adresse eingesetzt wird
const command = `spl-token transfer pee1EpdW1XtxtmMHcLDrz2zfj8rCUHzzbUv7KNdu1jh 10 ${address} --owner /root/new-token/keys/airJpmGsYFsRPNsxebys2ujMed2UtgjdKKJuKGUkMkW.json --fund-recipient --fee-payer /root/new-token/keys/airJpmGsYFsRPNsxebys2ujMed2UtgjdKKJuKGUkMkW.json --allow-unfunded-recipient | grep -i "Signature:" | awk '{print $2}'`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`Fehler: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Stderr: ${stderr}`);
    return;
  }
  // Signatur extrahieren und trimmen
  const signature = stdout.trim();
  console.log(`Signatur: ${signature}`);

  // JSON-Datei definieren und erstellen/aktualisieren
  const jsonFilePath = '/root/new-token/data/signature.json';
  const data = { signature };

  fs.writeFile(jsonFilePath, JSON.stringify(data, null, 2), (err) => {
    if (err) {
      console.error("Fehler beim Schreiben der JSON-Datei:", err);
    } else {
      console.log(`Die Signatur wurde in ${jsonFilePath} gespeichert.`);
    }
  });
});
