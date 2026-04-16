// Dump the form-data JSON that the server would feed into the renderer.
// Usage:
//   node scripts/dump-form-data.js italy 1004
//   node scripts/dump-form-data.js portugal 38
//
// Writes data-<country>-<id>.json in the project root.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const COUNTRIES = require('../countries');
const { mapDbToForm } = require('../lib/db-mapper');

async function main() {
  const [country, idArg] = process.argv.slice(2);
  if (!country || !idArg) {
    console.error('Usage: node scripts/dump-form-data.js <country> <id>');
    process.exit(1);
  }
  const cfg = COUNTRIES[country.toLowerCase()];
  if (!cfg) {
    console.error('Unknown country: ' + country + '. Known: ' + Object.keys(COUNTRIES).join(', '));
    process.exit(1);
  }
  const id = parseInt(idArg, 10);
  if (!Number.isInteger(id) || id <= 0) {
    console.error('Invalid id: ' + idArg);
    process.exit(1);
  }

  const db = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'visadcouk_dataf',
    waitForConnections: true,
    connectionLimit: 2,
  });

  const [travelers] = await db.query('SELECT * FROM travelers WHERE id = ?', [id]);
  if (travelers.length === 0) {
    console.error('Traveler not found: ' + id);
    await db.end();
    process.exit(1);
  }
  const traveler = travelers[0];

  const [questions] = await db.query(
    "SELECT * FROM traveler_questions WHERE record_id = ? AND record_type = 'traveler'",
    [id]
  );
  const tq = questions[0] || {};

  const mapped = mapDbToForm(traveler, tq, cfg);

  const outPath = path.join(__dirname, '..', `data-${cfg.slug}-${id}.json`);
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        country: cfg.slug,
        travelerId: id,
        raw: { travelers: traveler, traveler_questions: tq },
        mapped,
      },
      null,
      2
    )
  );

  console.log('Wrote ' + outPath);
  console.log('Mapped fields: ' + Object.keys(mapped).length);
  await db.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
