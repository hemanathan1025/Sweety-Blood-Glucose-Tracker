// Adds optional demo data without replacing existing rows.
require('dotenv').config({ quiet: true });
const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/db');

const slots = [
  ['Morning', '06:00:00', 96],
  ['After breakfast', '09:00:00', 128],
  ['After lunch', '13:00:00', 116],
  ['After dinner', '19:00:00', 108],
];

function dateBefore(daysAgo) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

async function seed() {
  const email = process.env.SEED_DEMO_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_DEMO_PASSWORD;
  if (!email || !password || password.length < 8) {
    throw new Error('Set SEED_DEMO_EMAIL and an 8-character SEED_DEMO_PASSWORD in the local environment.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let user = await client.query('SELECT id, password_hash FROM users WHERE email = $1', [email]);
    let userId;
    if (user.rowCount) {
      if (!(await bcrypt.compare(password, user.rows[0].password_hash))) {
        throw new Error('The configured demo email already belongs to a different account.');
      }
      userId = user.rows[0].id;
    } else {
      const passwordHash = await bcrypt.hash(password, 12);
      const inserted = await client.query(
        `INSERT INTO users (full_name, email, password_hash)
         VALUES ($1, $2, $3) RETURNING id`,
        ['Sweety Demo User', email, passwordHash],
      );
      userId = inserted.rows[0].id;
    }

    // ON CONFLICT below leaves existing date-and-slot readings unchanged.
    let readingsInserted = 0;
    for (let day = 6; day >= 0; day -= 1) {
      const readingDate = dateBefore(day);
      for (const [timeSlot, time, value] of slots) {
        const measuredAt = new Date(`${readingDate}T${time}Z`);
        const result = await client.query(
          `INSERT INTO health_records
            (user_id, metric_type, value, unit, measured_at, source, reading_date, time_slot)
           VALUES ($1, 'glucose', $2, 'mg/dl', $3, 'manual', $4, $5)
           ON CONFLICT (user_id, reading_date, time_slot) DO NOTHING`,
          [userId, value + (6 - day), measuredAt, readingDate, timeSlot],
        );
        readingsInserted += result.rowCount;
      }
    }
    await client.query('COMMIT');
    console.log(JSON.stringify({ status: 'seeded', readingsInserted }));
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Seed stopped safely. Check local seed settings and the database schema.');
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(async () => {
  console.error('Seed could not connect using the local database configuration.');
  process.exitCode = 1;
  await pool.end();
});