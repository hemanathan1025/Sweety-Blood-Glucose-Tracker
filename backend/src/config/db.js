// Loads local database settings and creates the shared PostgreSQL pool.
const path = require('node:path');
const { Pool } = require('pg');

require('dotenv').config({
  path: path.resolve(__dirname, '../../.env'),
  quiet: true,
});

// Fail early if a required database setting is missing or invalid.
const required = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missing = required.filter((name) => !process.env[name]);
const port = Number(process.env.DB_PORT);
if (missing.length || !Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('Database configuration is incomplete or invalid. Check backend/.env.');
}

const pool = new Pool({
  host: process.env.DB_HOST,
  port,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: Number(process.env.DB_POOL_MAX) || 10,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error.code || 'UNKNOWN');
});

async function testConnection() {
  const result = await pool.query('SELECT 1 AS connected');
  return result.rows[0].connected === 1;
}

module.exports = { pool, testConnection };