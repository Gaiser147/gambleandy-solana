require("dotenv").config();
const fs = require("fs");

// Helius RPC endpoint — API key is loaded from .env (see .env.example)
const url = `https://devnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;

const findHolders = async () => {
  let page = 1;
  let allOwners = new Set();
  
  // Definiere die auszuschließenden Adressen
  const excludeAddresses = new Set([
    "bosC6w6dRq6Bt4sahh78PpDNqcecx8Xu6EvzMYdbxrp", // linode sol cli
    "3tfwBFQdKkrfGUxaRJkcmx8qQ14yQJxYtxSX9ghLdbd6", // wiwi dev (gehackt)
    "airJpmGsYFsRPNsxebys2ujMed2UtgjdKKJuKGUkMkW", // airdrop wallet
    "BY8bcEGphHfZQxnTmmty3d71SV8qinq8R59j47zTGcs"
  ]);

  while (true) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "getTokenAccounts",
        id: "helius-test",
        params: {
          page: page,
          limit: 1000,
          displayOptions: {},
          mint: "pee1EpdW1XtxtmMHcLDrz2zfj8rCUHzzbUv7KNdu1jh",
        },
      }),
    });

    // Prüfe, ob es einen Fehler in der Antwort gibt
    if (!response.ok) {
      console.log(`Error: ${response.status}, ${response.statusText}`);
      break;
    }

    const data = await response.json();

    if (!data.result || data.result.token_accounts.length === 0) {
      console.log(`No more results. Total pages: ${page - 1}`);
      break;
    }
    console.log(`Processing results from page ${page}`);
    
    // Füge nur die Accounts hinzu, die nicht in der Exclude-Liste stehen
    data.result.token_accounts.forEach((account) => {
      if (!excludeAddresses.has(account.owner)) {
        allOwners.add(account.owner);
      }
    });
    page++;
  }

  fs.writeFileSync(
    "/root/new-token/data/holders.json",
    JSON.stringify(Array.from(allOwners), null, 2)
  );
};

findHolders();
