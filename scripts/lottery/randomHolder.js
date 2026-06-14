const fs = require("fs");

const HOLDERS_FILE = "/root/new-token/data/holders.json";
const OUTPUT_FILE = "/root/new-token/data/selectedHolder.json";

// Funktion, um einen zufälligen Holder aus der JSON-Datei auszuwählen
function getRandomHolder() {
  // Prüfen, ob die Datei existiert
  if (!fs.existsSync(HOLDERS_FILE)) {
    console.error(`Fehler: Die Datei ${HOLDERS_FILE} existiert nicht.`);
    process.exit(1);
  }

  // Dateiinhalt lesen und parsen
  const data = fs.readFileSync(HOLDERS_FILE, "utf8");
  let holders;
  try {
    holders = JSON.parse(data);
  } catch (error) {
    console.error(`Fehler beim Parsen der Datei ${HOLDERS_FILE}: ${error.message}`);
    process.exit(1);
  }

  // Überprüfen, ob die Datei ein Array mit Holder-Adressen enthält
  if (!Array.isArray(holders) || holders.length === 0) {
    console.error(`Fehler: Die Datei ${HOLDERS_FILE} enthält kein gültiges Array an Holdern.`);
    process.exit(1);
  }

  // Zufälligen Index auswählen
  const randomIndex = Math.floor(Math.random() * holders.length);
  return holders[randomIndex];
}

// Ausgewählten Holder in die Ausgabe-Datei schreiben
function updateSelectedHolderFile(selectedHolder) {
  const outputData = { selectedHolder };
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputData, null, 2));
  console.log(`Ausgewählter Holder (${selectedHolder}) wurde in ${OUTPUT_FILE} gespeichert.`);
}

// Hauptablauf
const selectedHolder = getRandomHolder();
updateSelectedHolderFile(selectedHolder);
