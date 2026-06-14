require('dotenv').config();
const fs = require('fs').promises;
const axios = require('axios');

// Telegram-Bot-Token & Gruppen-ID aus .env (siehe .env.example)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
// Zielgruppe (Gruppen-ID)
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
// Pfad zur JSON-Datei
const JSON_FILE = '/root/new-token/data/paidHolders.json';
// Pfad zur Template-Datei
const TEMPLATE_FILE = './messageTemplate.txt';
// Bild-URL (ersetze durch den tatsächlichen Link zu deinem Bild)
const IMAGE_URL = 'https://raw.githubusercontent.com/Gaiser147/token-project/refs/heads/main/file-KHWJRvto1viCQ1ruzbaS28%20(1).webp';

// Funktion zum Senden einer Foto-Nachricht via Telegram-Bot
async function sendTelegramPhoto(caption) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
  try {
    const response = await axios.post(url, {
      chat_id: CHAT_ID,
      photo: IMAGE_URL,
      caption: caption,
      parse_mode: "Markdown"
    });
    console.log("Foto-Nachricht gesendet:", response.data);
  } catch (error) {
    console.error("Fehler beim Senden der Foto-Nachricht:", error);
  }
}

// Einfache Template-Funktion, die Platzhalter wie {{variable}} ersetzt
function formatTemplate(template, data) {
  return template.replace(/{{\s*(\w+)\s*}}/g, (match, p1) => {
    return data[p1] || '';
  });
}

// Hauptfunktion: Lese die JSON-Datei und das Template, wähle den neuesten Eintrag aus und sende die Foto-Nachricht
async function processLatestHolder() {
  try {
    // Lese die JSON-Datei ein
    const jsonData = await fs.readFile(JSON_FILE, 'utf8');
    const holders = JSON.parse(jsonData);

    if (!holders.length) {
      console.log("Keine Einträge in der Datei gefunden.");
      return;
    }

    // Finde den Eintrag mit der höchsten "order"
    const latestHolder = holders.reduce((prev, current) => {
      return (prev.order > current.order) ? prev : current;
    });

    // Erstelle den txSignature-Link
    const txSignature = latestHolder.txSignature;
    const txSignatureLink = `https://explorer.solana.com/tx/${txSignature}?cluster=devnet`;

    // Lese die Template-Datei ein
    const template = await fs.readFile(TEMPLATE_FILE, 'utf8');

    // Erstelle ein Daten-Objekt mit den Variablen
    const templateData = {
      holder: latestHolder.holder,
      amount: latestHolder.amount,
      txSignature: txSignature,
      txSignatureLink: txSignatureLink,
      order: latestHolder.order,
      timestamp: latestHolder.timestamp
    };

    // Formatiere die Nachricht mit den Variablen
    const message = formatTemplate(template, templateData);

    // Sende die Foto-Nachricht mit der formatierten Caption
    await sendTelegramPhoto(message);
  } catch (error) {
    console.error("Fehler beim Verarbeiten der Dateien oder beim Senden:", error);
  }
}

// Skript starten
processLatestHolder();
