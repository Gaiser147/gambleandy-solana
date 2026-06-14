const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  const { data, error } = await supabase
    .from('Andy')
    .select('*')
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('Fehler beim Abrufen der Daten:', error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('Keine Payouts gefunden.');
    process.exit(0);
  }

  console.log('=== PAYOUT STATISTIKEN ===\n');

  // Gesamtanzahl
  console.log(`Anzahl Payouts: ${data.length}`);

  // Gesamtsumme (90% an Winner)
  const totalAmount = data.reduce((sum, record) => sum + BigInt(record.amount || 0), 0n);
  console.log(`Gesamt ausgezahlt (90%): ${totalAmount.toString()} Token (${(Number(totalAmount) / 100).toFixed(2)} $PEE)`);

  // Gesamtsumme an Dev Wallet (10%)
  const totalDevAmount = data.reduce((sum, record) => sum + BigInt(record.destination_amount || 0), 0n);
  console.log(`Gesamt an Dev Wallet (10%): ${totalDevAmount.toString()} Token (${(Number(totalDevAmount) / 100).toFixed(2)} $PEE)`);

  // Durchschnitt
  const avgAmount = totalAmount / BigInt(data.length);
  console.log(`Durchschnitt pro Payout: ${avgAmount.toString()} Token (${(Number(avgAmount) / 100).toFixed(2)} $PEE)`);

  // Zeitraum
  const firstPayout = new Date(data[data.length - 1].timestamp);
  const lastPayout = new Date(data[0].timestamp);
  console.log(`\nErster Payout: ${firstPayout.toLocaleString('de-DE')}`);
  console.log(`Letzter Payout: ${lastPayout.toLocaleString('de-DE')}`);

  // Unique Winners
  const uniqueWinners = new Set(data.map(r => r.holder_address));
  console.log(`\nUnique Winners: ${uniqueWinners.size}`);

  // Mehrfachgewinner
  const winnerCounts = {};
  data.forEach(r => {
    winnerCounts[r.holder_address] = (winnerCounts[r.holder_address] || 0) + 1;
  });
  const multiWinners = Object.entries(winnerCounts).filter(([addr, count]) => count > 1);
  if (multiWinners.length > 0) {
    console.log('\nMehrfachgewinner:');
    multiWinners.sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([addr, count]) => {
      console.log(`  ${addr.substring(0, 8)}... - ${count}x`);
    });
  }

  // Letzte 5 Payouts
  console.log('\n=== LETZTE 5 PAYOUTS ===');
  data.slice(0, 5).forEach((record, idx) => {
    const amount = (Number(record.amount) / 100).toFixed(2);
    const date = new Date(record.timestamp).toLocaleString('de-DE');
    const addr = record.holder_address.substring(0, 8);
    console.log(`${idx + 1}. ${addr}... - ${amount} $PEE - ${date}`);
  });

})();
