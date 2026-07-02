# Gambleandy Solana Lottery

Gambleandy (GANDY) is a Solana Token 2022 token with a built in lottery. Every transfer pays a 10% transfer fee. The collected fees are periodically given to a random token holder through an automated draw.

![Gambleandy Logo](https://raw.githubusercontent.com/Gaiser147/gambleandy/refs/heads/main/gandy_logo.png)
[Website](gambleandy.com) (offline since January 2026)

## How it works

A set of small Node.js scripts runs on a schedule (cron) and passes state through JSON files in the `data/` folder.

1. `gettokenholders.js` fetches the current holders from the Helius API and writes `data/holders.json`
2. `randomHolder.js` picks a random winner and writes `data/selectedHolder.json`
3. `WinnerPayout2.js` sends the payout, then logs it to `data/paidHolders.json` and Supabase
4. `telegram_winnNotify.js` posts the winner to Telegram
5. `sync_google-sheets.js` mirrors the payout history to a Google Sheet

Separately, `fee.js` withdraws the withheld Token 2022 transfer fees on its own schedule, and `getlatestwinner.js` prints the latest winner transaction.

![backend system visualization](https://raw.githubusercontent.com/Gaiser147/gambleandy-solana/refs/heads/main/gandy_aufbau.jpg)

## Repository layout

* `scripts/lottery/` is the live system that cron runs
* `scripts/mainnet/` is the SOL based payout for mainnet (work in progress)
* `scripts/vrf/` is an experimental verifiable random winner selection
* `scripts/token-operations/` holds one time token setup scripts
* `scripts/utilities/` holds helper scripts
* `config/crontab.backup` is a reference copy of the installed crontab
* `messageTemplate.txt` is the Telegram winner message template

## Setup

1. Install dependencies: `yarn install`
2. Copy the environment template: `cp .env.example .env`
3. Fill in your own values in `.env` (Helius, Supabase, Telegram, and the path to your fee authority keypair)
4. Provide your Solana keypair files under `keys/` and your Google service account at `data/service-account-key.json`

All of these are ignored by git and are never committed. Node 20.19 or newer is required.

## Running

Run any stage directly, for example:

    node scripts/lottery/gettokenholders.js

In production these run on a schedule. See `config/crontab.backup`.

## Status

* Devnet: active and automated, pays out in tokens
* Mainnet: token deployed, lottery migration still pending. The mainnet payout script is not production ready and the token to SOL swap is not yet implemented.

## Security

Secrets are loaded from a gitignored `.env` file. Private keypairs live in the gitignored `keys/` folder. No credentials or private keys are committed to this repository. If you fork or redeploy, generate your own keys and credentials.
