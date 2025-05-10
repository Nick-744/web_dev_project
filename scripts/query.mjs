// ------------------------------ scripts/query.mjs --------------------------
/**
 * Simple CLI helper – run arbitrary SQL commands against flights.db:
 *
 *   npm run sql -- "SELECT * FROM ticket WHERE class = 'economy' LIMIT 5"
 *
 * Results are printed as an ASCII table without external dependencies.
 * ------------------------------------------------------------------------- */

import { db } from '../lib/db.js';

/* 1. Get raw SQL from CLI ------------------------------------------------- */
const sql = process.argv.slice(2).join(' ').trim();
if (!sql) {
  console.error('\nUsage:   npm run sql -- "<SQL query>"\n');
  process.exit(1);
}

/* 2. Execute Safely ------------------------------------------------------- */
let rows;
try {
  const stmt = db.prepare(sql);
  rows = sql.match(/^\s*(SELECT|PRAGMA)/i) ? stmt.all() : stmt.run();
} catch (err) {
  console.error(`\n✖ SQL error: ${err.message}\n`);
  process.exit(1);
}

/* 3. ASCII Table Renderer ------------------------------------------------- */
if (Array.isArray(rows)) {
  if (rows.length === 0) {
    console.log('\n(no rows)\n');
    process.exit(0);
  }

  const headers = Object.keys(rows[0]);
  const columnWidths = headers.map(h => Math.max(h.length, ...rows.map(r => String(r[h]).length)));

  const separator = '+' + columnWidths.map(w => '-'.repeat(w + 2)).join('+') + '+';

  // Print Header
  console.log('\n' + separator);
  console.log('| ' + headers.map((h, i) => h.padEnd(columnWidths[i])).join(' | ') + ' |');
  console.log(separator);

  // Print Rows
  rows.forEach(row => {
    console.log('| ' + headers.map((h, i) => String(row[h]).padEnd(columnWidths[i])).join(' | ') + ' |');
  });

  console.log(separator + '\n');
} else {
  console.log(`\n✔ Query OK, changes = ${rows.changes}\n`);
}
