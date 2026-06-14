#!/bin/bash
# Main Lottery Cron Job - Runs every 2 hours
# Updated 2025-10-02: Paths adjusted for new project structure

cd /root/new-token

# 1. Fetch token holders from Helius API
node /root/new-token/scripts/lottery/gettokenholders.js

# 2. Select random winner
node /root/new-token/scripts/lottery/randomHolder.js

# 3. Process winner payout
node /root/new-token/scripts/lottery/WinnerPayout2.js

# 4. Send Telegram notification
node /root/new-token/scripts/lottery/telegram_winnNotify.js

# 5. Sync to Google Sheets
node /root/new-token/scripts/lottery/sync_google-sheets.js
