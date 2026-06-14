const fs = require('fs');
const { google } = require('googleapis');

// Lade die Service Account JSON-Datei (Pfad anpassen!)
const KEY_FILE_PATH = '/root/new-token/data/service-account-key.json';

// Google Sheets ID (aus der URL kopieren)
const SHEET_ID = '1Ff24So-1WAt6FAeBgJGGZvgNS881IF-maw2CCyHnAYg';
// Name des Arbeitsblatts (Standard: "Sheet1")
const SHEET_NAME = 'linode_sync';

// Pfad zur JSON-Datei mit den Paid Holders
const JSON_FILE = '/root/new-token/data/paidHolders.json';

// Authentifizierung mit dem Service Account
async function authenticate() {
    const auth = new google.auth.GoogleAuth({
        keyFile: KEY_FILE_PATH,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    return auth.getClient();
}

// Funktion zum Schreiben in Google Sheets
async function addRowToGoogleSheet(rowData) {
    try {
        const authClient = await authenticate();
        const sheets = google.sheets({ version: 'v4', auth: authClient });

        const range = `${SHEET_NAME}!A:E`;
        const request = {
            spreadsheetId: SHEET_ID,
            range: range,
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: [rowData],
            },
        };

        const response = await sheets.spreadsheets.values.append(request);
        console.log("✅ Zeile erfolgreich hinzugefügt:", response.data);
    } catch (error) {
        console.error("❌ Fehler beim Hinzufügen der Zeile:", error);
    }
}

// Hauptfunktion: Neuesten Eintrag aus paidHolders.json finden
async function processLatestHolder() {
    try {
        const jsonData = fs.readFileSync(JSON_FILE, 'utf8');
        const holders = JSON.parse(jsonData);

        if (!holders.length) {
            console.log("Keine Einträge in der Datei gefunden.");
            return;
        }

        // Neuesten Eintrag anhand der höchsten "order" ermitteln
        const latestHolder = holders.reduce((prev, current) => (prev.order > current.order ? prev : current));

        // Erstelle die Zeile für Google Sheets
        const row = [
            latestHolder.order,
            latestHolder.holder,
            latestHolder.amount,
            latestHolder.timestamp,
            latestHolder.txSignature
        ];

        // Zeile in Google Sheets schreiben
        await addRowToGoogleSheet(row);
    } catch (error) {
        console.error("❌ Fehler beim Verarbeiten der Datei:", error);
    }
}

// Skript starten
processLatestHolder();
