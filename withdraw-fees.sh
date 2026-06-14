#!/bin/bash

# Deine Token-Mint-Adresse und Zielkonto (Empfänger)
TOKEN_MINT="6G1QeTfw8z8RxiruGGjj3ioTX3hpptpGwvPNdixGVS2z"
RECIPIENT="bosC6w6dRq6Bt4sahh78PpDNqcecx8Xu6EvzMYdbxrp"
PROGRAM_ID="TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"  # Dein Token Program ID

# Hole alle Token-Accounts, die deinem Wallet gehören
TOKEN_ACCOUNTS=$(spl-token accounts --owner $(solana address) --verbose | grep "$TOKEN_MINT" | awk '{print $1}')

# Durchlaufe alle Accounts und prüfe, ob Fees vorhanden sind
for ACCOUNT in $TOKEN_ACCOUNTS
do
  # Hole Informationen über den Account
  ACCOUNT_INFO=$(spl-token account-info $ACCOUNT)
  
  # Überprüfe, ob der Account Withheld Fees hat
  if echo "$ACCOUNT_INFO" | grep -q "Transfer fees withheld"; then
    # Wenn Fees vorhanden sind, führe den Withdraw-Befehl aus
    echo "Einsammeln der Withheld Fees von Account $ACCOUNT"
    spl-token withdraw-withheld-tokens --program-id $PROGRAM_ID $ACCOUNT --include-mint $TOKEN_MINT $RECIPIENT
  else
    echo "Keine Withheld Fees in Account $ACCOUNT gefunden."
  fi
done
