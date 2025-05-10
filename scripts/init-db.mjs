// scripts/init-db.mjs
/**
 * Creates flights.db with the full schema.
 * Usage:  npm run init-db
 */
import '../lib/db.js';        // importing is enough – db.js runs the schema

console.log('✔ flights.db is ready in /data');
