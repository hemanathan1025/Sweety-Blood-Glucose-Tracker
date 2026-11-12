// Exercises API flows with temporary accounts and cleans them up.
const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const bcrypt = require('bcryptjs');
const { app } = require('../src/server');
const { pool } = require('../src/config/db');
const { todayInAppTimezone } = require('../src/utils/date');

async function request(base, path, { token, method = 'GET', body } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, body: await response.json() };
}

function previousMonthDate() {
  const [year, month] = todayInAppTimezone().split('-').map(Number);
  return new Date(Date.UTC(year, month - 2, 15)).toISOString().slice(0, 10);
}

test('PostgreSQL-backed auth, health-record CRUD, validation, reports, and ownership', async (t) => {
  const emailOne = `test-${randomUUID()}@example.test`;
  const emailTwo = `test-${randomUUID()}@example.test`;
  const password = 'Integration-test-password-42';
  const userIds = [];
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    if (userIds.length) {
      await pool.query('DELETE FROM health_records WHERE user_id = ANY($1::bigint[])', [userIds]);
      await pool.query('DELETE FROM users WHERE id = ANY($1::bigint[])', [userIds]);
    }
    await pool.end();
  });

  const unauthorized = await request(base, '/api/health-records');
  assert.equal(unauthorized.status, 401);

  const registration = await request(base, '/api/auth/register', {
    method: 'POST', body: { name: 'Integration User One', email: emailOne, password },
  });
  assert.equal(registration.status, 201);
  const firstUser = registration.body.user;
  userIds.push(firstUser.id);
  const hash = await pool.query('SELECT password_hash FROM users WHERE id = $1', [firstUser.id]);
  assert.notEqual(hash.rows[0].password_hash, password);
  assert.equal(await bcrypt.compare(password, hash.rows[0].password_hash), true);

  const duplicateAccount = await request(base, '/api/auth/register', {
    method: 'POST', body: { name: 'Duplicate', email: emailOne, password },
  });
  assert.equal(duplicateAccount.status, 409);

  const login = await request(base, '/api/auth/login', {
    method: 'POST', body: { email: emailOne, password },
  });
  assert.equal(login.status, 200);
  const tokenOne = login.body.token;
  assert.ok(tokenOne);
  const wrongPassword = await request(base, '/api/auth/login', {
    method: 'POST', body: { email: emailOne, password: 'incorrect-password' },
  });
  assert.equal(wrongPassword.status, 401);
  const profile = await request(base, '/api/auth/me', { token: tokenOne });
  assert.equal(profile.status, 200);
  assert.equal(profile.body.user.id, firstUser.id);

  const today = todayInAppTimezone();
  const invalidDatabaseDate = previousMonthDate();
  await assert.rejects(
    pool.query(
      "INSERT INTO health_records (user_id,metric_type,value,unit,measured_at,source,reading_date,time_slot) VALUES ($1,'glucose',$2,'mg/dl',$3,'manual',$4,$5)",
      [firstUser.id, 39, new Date(`${invalidDatabaseDate}T19:00:00Z`), invalidDatabaseDate, 'After dinner'],
    ),
    (error) => error.code === '23514',
  );
  const missingValue = await request(base, '/api/health-records', {
    method: 'POST', token: tokenOne, body: { reading_date: today, time_slot: 'Morning', glucose_value: '' },
  });
  assert.equal(missingValue.status, 400);
  assert.match(missingValue.body.error.message, /Please enter a glucose value\./);

  for (const glucose_value of [39, 601, 100.5]) {
    const invalid = await request(base, '/api/health-records', {
      method: 'POST', token: tokenOne, body: { reading_date: today, time_slot: 'Morning', glucose_value },
    });
    assert.equal(invalid.status, 400);
    assert.match(invalid.body.error.message, /Value must be between 40 and 600 mg\/dl\./);
  }

  const futureDateValue = new Date(`${today}T00:00:00.000Z`);
  futureDateValue.setUTCDate(futureDateValue.getUTCDate() + 1);
  const futureDate = futureDateValue.toISOString().slice(0, 10);
  const future = await request(base, '/api/health-records', {
    method: 'POST', token: tokenOne, body: { reading_date: futureDate, time_slot: 'Morning', glucose_value: 100 },
  });
  assert.equal(future.status, 400);
  assert.equal(future.body.error.message, 'Date cannot be in the future.');

  const futureDaily = await request(base, `/api/reports/daily?date=${futureDate}`, { token: tokenOne });
  assert.equal(futureDaily.status, 400);
  assert.equal(futureDaily.body.error.message, 'Date cannot be in the future.');
  const futureMonthToDate = await request(base, `/api/reports/month-to-date?date=${futureDate}`, { token: tokenOne });
  assert.equal(futureMonthToDate.status, 400);
  assert.equal(futureMonthToDate.body.error.message, 'Date cannot be in the future.');
  const futureMonthly = await request(base, '/api/reports/monthly?date=2027-01-15', { token: tokenOne });
  assert.equal(futureMonthly.status, 200);
  assert.deepEqual(
    { from: futureMonthly.body.data.from, to: futureMonthly.body.data.to },
    { from: '2026-12-01', to: '2026-12-31' },
  );

  const created = await request(base, '/api/health-records', {
    method: 'POST', token: tokenOne, body: { reading_date: today, time_slot: 'Morning', glucose_value: 100 },
  });
  assert.equal(created.status, 201);
  const readingId = created.body.data.id;

  const duplicateSlot = await request(base, '/api/health-records', {
    method: 'POST', token: tokenOne, body: { reading_date: today, time_slot: 'Morning', glucose_value: 101 },
  });
  assert.equal(duplicateSlot.status, 409);
  assert.equal(duplicateSlot.body.error.message, 'You already have a Morning reading for this date.');

  const updated = await request(base, `/api/health-records/${readingId}`, {
    method: 'PUT', token: tokenOne,
    body: { reading_date: today, time_slot: 'Morning', glucose_value: 105 },
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.data.glucose_value, 105);

  for (const [time_slot, glucose_value] of [['After breakfast', 130], ['After lunch', 110], ['After dinner', 90]]) {
    const result = await request(base, '/api/health-records', {
      method: 'POST', token: tokenOne, body: { reading_date: today, time_slot, glucose_value },
    });
    assert.equal(result.status, 201);
  }
  const fifth = await request(base, '/api/health-records', {
    method: 'POST', token: tokenOne, body: { reading_date: today, time_slot: 'Morning', glucose_value: 115 },
  });
  assert.equal(fifth.status, 400);
  assert.equal(fifth.body.error.message, 'You can add only 4 readings per day.');

  const listed = await request(base, '/api/health-records?date=' + today, { token: tokenOne });
  assert.equal(listed.status, 200);
  assert.equal(listed.body.data.total, 4);
  const firstPage = await request(base, '/api/readings?page=1&limit=2', { token: tokenOne });
  const secondPage = await request(base, '/api/readings?page=2&limit=2', { token: tokenOne });
  assert.equal(firstPage.status, 200);
  assert.equal(firstPage.body.data.currentPage, 1);
  assert.equal(firstPage.body.data.limit, 2);
  assert.equal(firstPage.body.data.totalReadings, 4);
  assert.equal(firstPage.body.data.totalPages, 2);
  assert.equal(firstPage.body.data.readings.length, 2);
  assert.equal(secondPage.status, 200);
  assert.equal(secondPage.body.data.currentPage, 2);
  assert.equal(secondPage.body.data.readings.length, 2);
  assert.equal(new Set([...firstPage.body.data.readings, ...secondPage.body.data.readings].map(({ id }) => id)).size, 4);
  assert.equal((await request(base, '/api/readings?page=0', { token: tokenOne })).status, 400);
  assert.equal((await request(base, '/api/readings?limit=invalid', { token: tokenOne })).status, 400);
  const individual = await request(base, `/api/health-records/${readingId}`, { token: tokenOne });
  assert.equal(individual.status, 200);

  const daily = await request(base, `/api/reports/daily?date=${today}`, { token: tokenOne });
  assert.equal(daily.status, 200);
  assert.equal(daily.body.data.total_readings, 4);
  assert.equal(daily.body.data.highest, 130);
  assert.equal(daily.body.data.lowest, 90);
  assert.equal(daily.body.data.average, 108.8);
  assert.equal(daily.body.data.readings.length, 4);
  const monthToDate = await request(base, `/api/reports/month-to-date?date=${today}`, { token: tokenOne });
  assert.equal(monthToDate.body.data.total_readings, 4);

  const previousReading = await request(base, '/api/health-records', {
    method: 'POST', token: tokenOne,
    body: { reading_date: previousMonthDate(), time_slot: 'Morning', glucose_value: 140 },
  });
  assert.equal(previousReading.status, 201);
  const monthly = await request(base, `/api/reports/monthly?date=${today}`, { token: tokenOne });
  assert.equal(monthly.body.data.total_readings, 1);
  assert.equal(monthly.body.data.average, 140);

  const secondRegistration = await request(base, '/api/auth/register', {
    method: 'POST', body: { name: 'Integration User Two', email: emailTwo, password },
  });
  assert.equal(secondRegistration.status, 201);
  userIds.push(secondRegistration.body.user.id);
  const tokenTwo = secondRegistration.body.token;
  const isolatedPage = await request(base, '/api/readings?page=1&limit=2', { token: tokenTwo });
  assert.equal(isolatedPage.status, 200);
  assert.deepEqual(isolatedPage.body.data.readings, []);
  assert.equal(isolatedPage.body.data.totalReadings, 0);
  assert.equal(isolatedPage.body.data.totalPages, 0);
  for (const [method, path, body] of [
    ['GET', `/api/health-records/${readingId}`],
    ['PUT', `/api/health-records/${readingId}`, { reading_date: today, time_slot: 'Morning', glucose_value: 120 }],
    ['DELETE', `/api/health-records/${readingId}`],
  ]) {
    const result = await request(base, path, { method, token: tokenTwo, body });
    assert.equal(result.status, 404);
  }

  const removed = await request(base, `/api/health-records/${previousReading.body.data.id}`, { method: 'DELETE', token: tokenOne });
  assert.equal(removed.status, 200);
  const missing = await request(base, `/api/health-records/${previousReading.body.data.id}`, { token: tokenOne });
  assert.equal(missing.status, 404);
});
