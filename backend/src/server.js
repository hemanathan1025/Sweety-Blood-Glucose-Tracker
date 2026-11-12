// Starts Express, connects API routes, and shuts the server down cleanly.
const express = require('express');
const cors = require('cors');
const { pool, testConnection } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const healthRecordRoutes = require('./routes/healthRecordRoutes');
const reportRoutes = require('./routes/reportRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();
// Permit configured sites and the local Vite development ports.
const configuredOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const developmentOrigins = process.env.NODE_ENV === 'production' ? [] : [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
];
const origins = new Set([...configuredOrigins, ...developmentOrigins]);

app.disable('x-powered-by');
// Apply CORS before routes so browsers can send preflight checks.
app.use(cors({
  origin(origin, callback) {
    if (!origin || origins.has(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS.'));
  },
}));
app.use(express.json({ limit: '16kb' }));

app.get('/', (req, res) => res.json({ success: true, message: 'Sweety Blood Glucose Tracker API is running.' }));
app.get('/api/health', (req, res) => res.status(200).json({ success: true, status: 'ok' }));
app.get('/api/db', async (req, res) => {
  try {
    await testConnection();
    return res.status(200).json({ success: true, database: 'connected' });
  } catch {
    return res.status(503).json({ success: false, error: { code: 'DATABASE_UNAVAILABLE', message: 'Database connection is unavailable.' } });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/health-records', healthRecordRoutes);
// Alias for clients that refer to the collection as readings.
app.use('/api/readings', healthRecordRoutes);
app.use('/api/reports', reportRoutes);
app.use(notFound);
app.use(errorHandler);

// Check PostgreSQL before accepting API requests.
async function startServer() {
  await testConnection();
  const port = Number(process.env.PORT) || 5000;
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`Sweety API listening on port ${port}.`);
      resolve(server);
    });
    server.once('error', reject);
  });
}

if (require.main === module) {
  let closing = false;
  startServer().then((server) => {
    // Stop HTTP requests before closing the database pool.
    async function shutdown() {
      if (closing) return;
      closing = true;
      server.close(async () => {
        await pool.end();
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10000).unref();
    }
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }).catch(() => {
    console.error('Backend startup failed. Check the local database configuration and service status.');
    process.exitCode = 1;
  });
}

module.exports = { app, startServer };
