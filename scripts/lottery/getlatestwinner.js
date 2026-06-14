const fs = require('fs');

// Pfad zur JSON-Datei
const filePath = '/root/new-token/data/paidHolders.json';

// Prüfen, ob die Datei existiert
if (!fs.existsSync(filePath)) {
  console.error(`Die Datei ${filePath} wurde nicht gefunden.`);
  process.exit(1);
}

// Datei einlesen und parsen
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Sicherstellen, dass es Einträge gibt
if (!Array.isArray(data) || data.length === 0) {
  console.error('Die JSON-Datei enthält keine Einträge.');
  process.exit(1);
}

// Den Eintrag mit der höchsten Order ermitteln
const newestRecord = data.reduce((prev, curr) => (curr.order > prev.order ? curr : prev));

// txSignature des neuesten Eintrags ausgeben
console.log(newestRecord.txSignature);
