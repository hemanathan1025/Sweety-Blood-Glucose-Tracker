// Applies the additive database migration inside a transaction.
require('dotenv').config({ quiet: true });
const { pool } = require('../src/config/db');
const fs = require('node:fs/promises');
const path = require('node:path');

async function migrate() {
  const file = path.join(__dirname, 'migrations', '001_health_record_glucose_range.sql');
  const client = await pool.connect();
  try {
    // Skip only when this constraint is already validated.
    const existing = await client.query(
      "SELECT convalidated FROM pg_constraint WHERE conrelid = 'public.health_records'::regclass AND conname = 'health_records_glucose_range_check'",
    );
    if (existing.rowCount && existing.rows[0].convalidated) {
      console.log('Health-record glucose constraint is already current.');
      return;
    }
    await client.query('BEGIN');
    await client.query(await fs.readFile(file, 'utf8'));
    await client.query('COMMIT');
    console.log('Health-record glucose constraint applied and verified.');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Migration stopped safely. No table or user records were dropped.');
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(async () => {
  console.error('Migration could not connect to the configured database.');
  process.exitCode = 1;
  await pool.end();
});