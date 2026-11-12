// Checks allowed frontend origins and rejects unrelated origins.
const test = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('../src/server');

test('CORS allows the local Vite origins and rejects unrelated origins', async (t) => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
  ];

  for (const origin of allowedOrigins) {
    const response = await fetch(`${base}/api/auth/login`, {
      method: 'OPTIONS',
      headers: {
        Origin: origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
    });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), origin);
  }

  const apiRequest = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { Origin: 'http://127.0.0.1:5174', 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'cors-probe@example.invalid', password: 'not-a-real-password' }),
  });
  assert.equal(apiRequest.status, 401);
  assert.equal(apiRequest.headers.get('access-control-allow-origin'), 'http://127.0.0.1:5174');

  const untrusted = await fetch(`${base}/api/auth/login`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://untrusted.example',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type',
    },
  });
  assert.ok(untrusted.status >= 400);
  assert.equal(untrusted.headers.get('access-control-allow-origin'), null);
});
